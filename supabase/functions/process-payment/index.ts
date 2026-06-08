/**
 * Supabase Edge Function: process-payment
 *
 * Recebe requisições do frontend e processa pagamentos nos gateways.
 * Chaves SECRETAS ficam nas variáveis de ambiente desta Edge Function — NUNCA no frontend.
 *
 * Deploy:
 *   supabase functions deploy process-payment --no-verify-jwt
 *
 * Variáveis de ambiente (configurar no Supabase Dashboard > Functions):
 *   MP_ACCESS_TOKEN          → Mercado Pago Access Token
 *   PAGARME_SECRET_KEY       → Pagar.me Secret Key
 *   EFI_CLIENT_ID            → Efí Bank Client ID
 *   EFI_CLIENT_SECRET        → Efí Bank Client Secret
 *   ASAAS_API_KEY            → Asaas API Key
 *   STRIPE_SECRET_KEY        → Stripe Secret Key
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Gateway Handlers ──────────────────────────────────────────────────────────

async function processMercadoPago(method: string, body: Record<string, unknown>) {
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado.');

  const baseUrl = 'https://api.mercadopago.com';

  if (method === 'pix') {
    const response = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${body.orderId}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: body.amount,
        payment_method_id: 'pix',
        payer: {
          email: (body.customer as any)?.email,
          first_name: (body.customer as any)?.name?.split(' ')[0],
          last_name: (body.customer as any)?.name?.split(' ').slice(1).join(' '),
          identification: { type: 'CPF', number: (body.customer as any)?.cpf?.replace(/\D/g, '') },
        },
        date_of_expiration: new Date(Date.now() + 15 * 60_000).toISOString(),
        description: body.description ?? `Pedido ${body.orderId}`,
        external_reference: body.orderId,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Erro MercadoPago');
    return {
      transactionId: String(data.id),
      gateway: 'mercadopago',
      qrCodeImage: data.point_of_interaction?.transaction_data?.qr_code_base64
        ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
        : `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.point_of_interaction?.transaction_data?.qr_code)}&size=220x220`,
      copyPaste: data.point_of_interaction?.transaction_data?.qr_code,
      expiresAt: data.date_of_expiration,
      status: 'pending',
      isDemo: false,
    };
  }

  if (method === 'card') {
    const response = await fetch(`${baseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${body.orderId}-card-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: body.amount,
        token: body.cardToken,
        installments: body.installments,
        payment_method_id: 'visa', // detectado via token
        payer: { email: (body.customer as any)?.email },
        external_reference: body.orderId,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message ?? 'Erro MercadoPago');
    return {
      transactionId: String(data.id),
      gateway: 'mercadopago',
      status: data.status === 'approved' ? 'paid' : data.status,
      authorizationCode: data.authorization_code,
      installments: data.installments,
      amount: data.transaction_amount,
      isDemo: false,
    };
  }

  throw new Error(`Método ${method} não suportado pelo handler MercadoPago.`);
}

async function processStripe(method: string, body: Record<string, unknown>) {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY não configurado.');

  const baseUrl = 'https://api.stripe.com/v1';
  const headers = {
    'Authorization': `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  if (method === 'card') {
    const params = new URLSearchParams({
      amount: String(Math.round((body.amount as number) * 100)),
      currency: 'brl',
      payment_method: body.cardToken as string,
      confirm: 'true',
      metadata: JSON.stringify({ order_id: body.orderId }),
    });
    const response = await fetch(`${baseUrl}/payment_intents`, {
      method: 'POST',
      headers,
      body: params,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? 'Erro Stripe');
    return {
      transactionId: data.id,
      gateway: 'stripe',
      status: data.status === 'succeeded' ? 'paid' : data.status,
      authorizationCode: data.id,
      installments: body.installments,
      amount: body.amount,
      isDemo: false,
    };
  }

  throw new Error(`Método ${method} não implementado para Stripe nesta Edge Function.`);
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { gateway, method, ...rest } = body;

    let result;
    switch (gateway) {
      case 'mercadopago': result = await processMercadoPago(method, rest); break;
      case 'stripe':      result = await processStripe(method, rest);      break;
      // TODO: Implementar handlers para pagarme, efi, asaas
      case 'pagarme':
        throw new Error('Pagar.me: handler não implementado ainda. Configure MP_ACCESS_TOKEN e use MercadoPago.');
      case 'efi':
        throw new Error('Efí Bank: handler não implementado ainda.');
      case 'asaas':
        throw new Error('Asaas: handler não implementado ainda.');
      default:
        throw new Error(`Gateway desconhecido: ${gateway}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[process-payment]', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
