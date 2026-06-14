/**
 * Supabase Edge Function: webhooks-payments
 *
 * Endpoint unificado de alta segurança para receber e processar webhooks de pagamento.
 * Implementa validação de assinatura criptográfica (Stripe/MercadoPago) e proteção contra Replay Attacks.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Stripe Signature Verification ─────────────────────────────────────────────
async function verifyStripeSignature(rawBody: string, signatureHeader: string, webhookSecret: string): Promise<boolean> {
  try {
    const parts = signatureHeader.split(",");
    const timestamp = parts.find(p => p.startsWith("t="))?.substring(2);
    const signature = parts.find(p => p.startsWith("v1="))?.substring(3);
    if (!timestamp || !signature) return false;

    // Prevenir replay attack limitando a janela de tempo a 5 minutos (300 segundos)
    const diff = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (diff > 300) return false;

    const signedPayload = `${timestamp}.${rawBody}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signed = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(signedPayload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signed))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return expectedSignature === signature;
  } catch (err) {
    console.error("[Stripe Signature Check] Erro:", err);
    return false;
  }
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeEvent(gateway: string, payload: Record<string, any>) {
  let eventType = 'payment.failed';
  let transactionId = '';
  let orderId = '';
  let amount: number | undefined;

  switch (gateway) {
    case 'mercadopago': {
      const statusMap: Record<string, string> = {
        approved: 'payment.approved', rejected: 'payment.failed',
        cancelled: 'payment.cancelled', refunded: 'refund.completed',
      };
      eventType = statusMap[payload.status ?? ''] ?? 'payment.failed';
      transactionId = String(payload.id ?? '');
      orderId = payload.external_reference ?? '';
      amount = payload.transaction_amount;
      break;
    }
    case 'stripe': {
      const map: Record<string, string> = {
        'payment_intent.succeeded': 'payment.approved',
        'payment_intent.payment_failed': 'payment.failed',
        'payment_intent.canceled': 'payment.cancelled',
        'charge.dispute.created': 'chargeback.opened',
        'charge.refunded': 'refund.completed',
      };
      eventType = map[payload.type] ?? 'payment.failed';
      transactionId = payload.data?.object?.id ?? '';
      amount = payload.data?.object?.amount ? payload.data.object.amount / 100 : undefined;
      orderId = payload.data?.object?.metadata?.order_id ?? '';
      break;
    }
  }

  return { eventType, transactionId, orderId, amount };
}

// ─── Status Updater ────────────────────────────────────────────────────────────

async function updateTransactionStatus(supabase: any, transactionId: string, eventType: string) {
  const statusMap: Record<string, string> = {
    'payment.approved': 'paid',
    'payment.failed':   'failed',
    'payment.expired':  'expired',
    'payment.cancelled':'cancelled',
    'refund.completed': 'refunded',
  };
  const newStatus = statusMap[eventType];
  if (!newStatus || !transactionId) return;

  // Atualizar transação no Supabase
  await supabase
    .from('transactions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('gateway_transaction_id', transactionId);

  // Atualizar pedido vinculado
  if (newStatus === 'paid' || newStatus === 'refunded') {
    const { data: tx } = await supabase
      .from('transactions')
      .select('order_id')
      .eq('gateway_transaction_id', transactionId)
      .maybeSingle();

    if (tx?.order_id) {
      const dbStatus = newStatus === 'paid' ? 'paid' : 'refunded';
      await supabase
        .from('orders')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', tx.order_id);
    }
  }
}

// ─── Serve ────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const gateway = url.searchParams.get('gateway') ?? 'unknown';

    // Ler corpo bruto da requisição para validação de assinatura
    const rawBody = await req.text();
    let payload = JSON.parse(rawBody);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. VALIDACAO CRIPTOGRAFICA DE ASSINATURA (Fase 5)
    if (gateway === 'stripe') {
      const sigHeader = req.headers.get('stripe-signature');
      const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
      if (!sigHeader || !webhookSecret) {
        return new Response(JSON.stringify({ error: 'Assinatura Stripe ou Secret ausente.' }), { status: 400, headers: corsHeaders });
      }
      const isValid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Assinatura Stripe inválida.' }), { status: 401, headers: corsHeaders });
      }
    } 
    else if (gateway === 'mercadopago') {
      // Mercado Pago envia um payload simples com a propriedade action e data.id
      // Consultamos a API oficial deles para certificar que o evento de fato existe
      const mpEventId = payload.data?.id || payload.id;
      const mpTopic = payload.type || payload.topic;

      if (!mpEventId || mpTopic !== 'payment') {
        // Ignorar tópicos não relacionados a pagamentos
        return new Response(JSON.stringify({ received: true, message: 'Ignored topic' }), { headers: corsHeaders });
      }

      try {
        // Consultar evento na API oficial do Mercado Pago para obter o payload autêntico (Ajuste 6)
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!mpAccessToken) {
          throw new Error('MP_ACCESS_TOKEN não configurado no servidor.');
        }
        const verifyRes = await fetch(`https://api.mercadopago.com/v1/payments/${mpEventId}`, {
          headers: { Authorization: `Bearer ${mpAccessToken}` }
        });
        if (!verifyRes.ok) {
          throw new Error(`Erro de autenticidade da API MercadoPago: ${verifyRes.statusText}`);
        }
        payload = await verifyRes.json();
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 401, headers: corsHeaders });
      }
    } else {
      // Rejeitar gateways não homologados em modo de alta segurança
      return new Response(JSON.stringify({ error: 'Gateway não suportado para webhooks.' }), { status: 400, headers: corsHeaders });
    }

    // 2. EXTRAIR ID DO EVENTO E PREVENIR REPLAY ATTACK (Ajuste 6)
    const eventId = gateway === 'stripe' ? payload.id : String(payload.id);
    if (!eventId) {
      return new Response(JSON.stringify({ error: 'ID do evento não localizado no payload.' }), { status: 400, headers: corsHeaders });
    }

    // Verificar se já processamos este evento anteriormente
    const { data: alreadyProcessed, error: checkError } = await supabase
      .from('processed_webhooks')
      .select('event_id')
      .eq('gateway', gateway)
      .eq('event_id', eventId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (alreadyProcessed) {
      // Retorna sucesso de forma silenciosa para o gateway para evitar reenvios de eventos que já processamos
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. PROCESSAR EVENTO
    const { eventType, transactionId, orderId, amount } = normalizeEvent(gateway, payload);

    // Salvar evento no log de histórico
    await supabase.from('webhook_events').insert({
      gateway,
      event_type: eventType,
      transaction_id: transactionId,
      order_id: orderId || null,
      amount: amount ?? null,
      payload,
      processed: false,
      received_at: new Date().toISOString(),
    });

    // Atualizar status das transações e pedidos correspondentes
    await updateTransactionStatus(supabase, transactionId, eventType);

    // Marcar webhook original como processado
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('transaction_id', transactionId)
      .eq('gateway', gateway);

    // 4. REGISTRAR EVENTO PROCESSADO PARA EVITAR REPLAY ATTACKS FUTUROS
    await supabase.from('processed_webhooks').insert({
      gateway,
      event_id: eventId,
      processed_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ received: true, eventType, transactionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[webhooks-payments] Erro crítico:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
