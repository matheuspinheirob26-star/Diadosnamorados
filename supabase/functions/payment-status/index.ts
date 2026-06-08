/**
 * Supabase Edge Function: payment-status
 *
 * Consulta o status de uma transação em qualquer gateway.
 * Usado para polling de Pix até confirmação de pagamento.
 *
 * Deploy:
 *   supabase functions deploy payment-status --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getMercadoPagoStatus(transactionId: string) {
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado.');

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${transactionId}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  const data = await response.json();

  const statusMap: Record<string, string> = {
    pending:     'pending',
    in_process:  'processing',
    approved:    'paid',
    rejected:    'failed',
    cancelled:   'cancelled',
    refunded:    'refunded',
    expired:     'expired',
  };

  return {
    transactionId: String(data.id),
    orderId: data.external_reference ?? '',
    gateway: 'mercadopago',
    status: statusMap[data.status] ?? 'pending',
    paidAt: data.status === 'approved' ? data.date_approved : undefined,
    amount: data.transaction_amount,
  };
}

async function getStripeStatus(transactionId: string) {
  const secretKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!secretKey) throw new Error('STRIPE_SECRET_KEY não configurado.');

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${transactionId}`, {
    headers: { 'Authorization': `Bearer ${secretKey}` },
  });
  const data = await response.json();

  const statusMap: Record<string, string> = {
    succeeded:          'paid',
    processing:         'processing',
    requires_payment_method: 'failed',
    canceled:           'cancelled',
  };

  return {
    transactionId: data.id,
    orderId: data.metadata?.order_id ?? '',
    gateway: 'stripe',
    status: statusMap[data.status] ?? 'pending',
    amount: data.amount ? data.amount / 100 : 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { gateway, transactionId } = await req.json();

    let result;
    switch (gateway) {
      case 'mercadopago': result = await getMercadoPagoStatus(transactionId); break;
      case 'stripe':      result = await getStripeStatus(transactionId);      break;
      default:
        // Para gateways sem handler real, retornar pending (modo demo)
        result = { transactionId, orderId: '', gateway, status: 'pending', amount: 0 };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
