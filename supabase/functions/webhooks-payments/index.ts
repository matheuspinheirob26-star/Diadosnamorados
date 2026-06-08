/**
 * Supabase Edge Function: webhooks-payments
 *
 * Endpoint unificado para receber webhooks de todos os gateways.
 * URL pública para configurar nos painéis dos gateways:
 *   https://SEU_PROJETO.supabase.co/functions/v1/webhooks-payments
 *
 * Uso por gateway:
 *   MercadoPago  → POST /webhooks-payments?gateway=mercadopago
 *   Pagar.me     → POST /webhooks-payments?gateway=pagarme
 *   Efí Bank     → POST /webhooks-payments?gateway=efi
 *   Asaas        → POST /webhooks-payments?gateway=asaas
 *   Stripe       → POST /webhooks-payments?gateway=stripe
 *   Cripto       → POST /webhooks-payments?gateway=crypto
 *
 * Deploy:
 *   supabase functions deploy webhooks-payments --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Normalizers (mesma lógica do WebhookService frontend) ────────────────────

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
      eventType = statusMap[payload.data?.status ?? ''] ?? 'payment.failed';
      transactionId = String(payload.data?.id ?? '');
      orderId = payload.data?.external_reference ?? '';
      amount = payload.data?.transaction_amount;
      break;
    }
    case 'pagarme': {
      const map: Record<string, string> = {
        'order.paid': 'payment.approved', 'order.payment_failed': 'payment.failed',
        'order.canceled': 'payment.cancelled', 'refund.created': 'refund.created',
      };
      eventType = map[payload.type] ?? 'payment.failed';
      transactionId = payload.data?.order?.id ?? '';
      amount = payload.data?.order?.amount ? payload.data.order.amount / 100 : undefined;
      break;
    }
    case 'efi': {
      const pix = payload.pix?.[0] ?? {};
      eventType = pix.status === 'CONCLUIDA' ? 'payment.approved' : 'payment.failed';
      transactionId = pix.txid ?? '';
      amount = pix.valor ? parseFloat(pix.valor) : undefined;
      break;
    }
    case 'asaas': {
      const map: Record<string, string> = {
        'PAYMENT_RECEIVED': 'payment.approved', 'PAYMENT_CONFIRMED': 'payment.approved',
        'PAYMENT_OVERDUE': 'payment.expired', 'PAYMENT_REFUNDED': 'refund.completed',
        'CHARGEBACK_REQUESTED': 'chargeback.opened',
      };
      eventType = map[payload.event] ?? 'payment.failed';
      transactionId = payload.payment?.id ?? '';
      amount = payload.payment?.value;
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

// ─── Status updater ────────────────────────────────────────────────────────────

async function updateTransactionStatus(
  supabase: any,
  transactionId: string,
  eventType: string
) {
  const statusMap: Record<string, string> = {
    'payment.approved': 'paid',
    'payment.failed':   'failed',
    'payment.expired':  'expired',
    'payment.cancelled':'cancelled',
    'refund.completed': 'refunded',
  };
  const newStatus = statusMap[eventType];
  if (!newStatus || !transactionId) return;

  await supabase
    .from('transactions')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('gateway_transaction_id', transactionId);

  // Atualizar pedido vinculado
  if (newStatus === 'paid') {
    const { data: tx } = await supabase
      .from('transactions')
      .select('order_id')
      .eq('gateway_transaction_id', transactionId)
      .single();

    if (tx?.order_id) {
      await supabase
        .from('orders')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
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
    const payload = await req.json();

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { eventType, transactionId, orderId, amount } = normalizeEvent(gateway, payload);

    // Salvar evento
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

    // Atualizar status da transação e pedido
    await updateTransactionStatus(supabase, transactionId, eventType);

    // Marcar como processado
    await supabase
      .from('webhook_events')
      .update({ processed: true })
      .eq('transaction_id', transactionId)
      .eq('gateway', gateway);

    return new Response(JSON.stringify({ received: true, eventType, transactionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[webhooks-payments]', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
