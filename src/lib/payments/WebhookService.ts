/**
 * WebhookService
 *
 * Normaliza payloads de webhook de diferentes gateways para um formato padrão.
 * Registra eventos em localStorage (e Supabase quando disponível).
 *
 * Em produção, os webhooks chegam pela Supabase Edge Function `webhooks-payments`
 * e são processados aqui no front-end após serem armazenados no banco.
 */

import { supabase } from '../supabase';
import { WebhookEvent, WebhookEventType, GatewayName } from '../../types/payments';
import { PaymentService } from './PaymentService';
import { generateId } from './utils';

const WEBHOOK_STORAGE_KEY = 'amr_webhook_events';

// ─── Storage helpers ──────────────────────────────────────────────────────────
function saveWebhookEvent(event: WebhookEvent): void {
  const all: WebhookEvent[] = JSON.parse(localStorage.getItem(WEBHOOK_STORAGE_KEY) ?? '[]');
  all.unshift(event);
  localStorage.setItem(WEBHOOK_STORAGE_KEY, JSON.stringify(all.slice(0, 500)));
}

async function persistToSupabase(event: WebhookEvent): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('webhook_events').insert({
      id: event.id,
      gateway: event.gateway,
      event_type: event.eventType,
      transaction_id: event.transactionId,
      order_id: event.orderId,
      amount: event.amount,
      payload: event.payload,
      processed: event.processed,
      received_at: event.receivedAt,
    });
  } catch (err) {
    console.warn('[WebhookService] Supabase persist falhou:', err);
  }
}

// ─── Gateway-specific normalizers ─────────────────────────────────────────────
type RawPayload = Record<string, any>;

function normalizeMercadoPago(raw: RawPayload): Partial<WebhookEvent> {
  const action = raw.action ?? raw.type ?? '';
  const data = raw.data ?? {};
  const eventTypeMap: Record<string, WebhookEventType> = {
    'payment.created':  'payment.approved',
    'payment.updated':  raw.data?.status === 'approved' ? 'payment.approved' : 'payment.failed',
    'chargebacks':      'chargeback.opened',
  };
  return {
    gateway: 'mercadopago',
    eventType: eventTypeMap[action] ?? 'payment.failed',
    transactionId: String(data.id ?? ''),
    amount: data.transaction_amount,
    payload: raw,
  };
}

function normalizePagarme(raw: RawPayload): Partial<WebhookEvent> {
  const eventTypeMap: Record<string, WebhookEventType> = {
    'order.paid':           'payment.approved',
    'order.payment_failed': 'payment.failed',
    'order.canceled':       'payment.cancelled',
    'refund.created':       'refund.created',
    'chargeback.created':   'chargeback.opened',
  };
  return {
    gateway: 'pagarme',
    eventType: eventTypeMap[raw.type] ?? 'payment.failed',
    transactionId: raw.data?.order?.id ?? '',
    amount: raw.data?.order?.amount ? raw.data.order.amount / 100 : undefined,
    payload: raw,
  };
}

function normalizeEfi(raw: RawPayload): Partial<WebhookEvent> {
  const pix = raw.pix?.[0] ?? {};
  return {
    gateway: 'efi',
    eventType: pix.status === 'CONCLUIDA' ? 'payment.approved' : 'payment.failed',
    transactionId: pix.txid ?? '',
    amount: pix.valor ? parseFloat(pix.valor) : undefined,
    payload: raw,
  };
}

function normalizeAsaas(raw: RawPayload): Partial<WebhookEvent> {
  const eventTypeMap: Record<string, WebhookEventType> = {
    'PAYMENT_RECEIVED':     'payment.approved',
    'PAYMENT_CONFIRMED':    'payment.approved',
    'PAYMENT_OVERDUE':      'payment.expired',
    'PAYMENT_REFUNDED':     'refund.completed',
    'CHARGEBACK_REQUESTED': 'chargeback.opened',
    'CHARGEBACK_DISPUTE':   'chargeback.resolved',
  };
  return {
    gateway: 'asaas',
    eventType: eventTypeMap[raw.event] ?? 'payment.failed',
    transactionId: raw.payment?.id ?? '',
    amount: raw.payment?.value,
    payload: raw,
  };
}

function normalizeStripe(raw: RawPayload): Partial<WebhookEvent> {
  const typeMap: Record<string, WebhookEventType> = {
    'payment_intent.succeeded':        'payment.approved',
    'payment_intent.payment_failed':   'payment.failed',
    'payment_intent.canceled':         'payment.cancelled',
    'charge.dispute.created':          'chargeback.opened',
    'charge.dispute.closed':           'chargeback.resolved',
    'charge.refunded':                 'refund.completed',
  };
  return {
    gateway: 'stripe',
    eventType: typeMap[raw.type] ?? 'payment.failed',
    transactionId: raw.data?.object?.id ?? '',
    amount: raw.data?.object?.amount ? raw.data.object.amount / 100 : undefined,
    payload: raw,
  };
}

// ─── Main Service ──────────────────────────────────────────────────────────────
export const WebhookService = {
  /**
   * Processa um payload de webhook cru de qualquer gateway.
   * Normaliza, persiste e atualiza o status do pedido.
   */
  async process(gateway: GatewayName, rawPayload: RawPayload): Promise<WebhookEvent> {
    let normalized: Partial<WebhookEvent> = { payload: rawPayload };

    switch (gateway) {
      case 'mercadopago': normalized = normalizeMercadoPago(rawPayload); break;
      case 'pagarme':     normalized = normalizePagarme(rawPayload);     break;
      case 'efi':         normalized = normalizeEfi(rawPayload);         break;
      case 'asaas':       normalized = normalizeAsaas(rawPayload);       break;
      case 'stripe':      normalized = normalizeStripe(rawPayload);      break;
      case 'crypto':
        normalized = {
          gateway: 'crypto',
          eventType: rawPayload.confirmed ? 'payment.approved' : 'payment.failed',
          transactionId: rawPayload.txid ?? '',
          amount: rawPayload.amount,
          payload: rawPayload,
        };
        break;
    }

    const event: WebhookEvent = {
      id: generateId('wh'),
      gateway,
      eventType: normalized.eventType ?? 'payment.failed',
      transactionId: normalized.transactionId ?? '',
      orderId: normalized.orderId,
      amount: normalized.amount,
      payload: rawPayload,
      processed: false,
      receivedAt: new Date().toISOString(),
    };

    saveWebhookEvent(event);
    await persistToSupabase(event);

    // Atualizar status da transação local
    if (event.transactionId) {
      const statusMap: Partial<Record<WebhookEventType, Transaction['status']>> = {
        'payment.approved': 'paid',
        'payment.failed':   'failed',
        'payment.expired':  'expired',
        'payment.cancelled':'cancelled',
        'refund.created':   'refunded',
        'refund.completed': 'refunded',
      };
      const newStatus = statusMap[event.eventType];
      if (newStatus) {
        PaymentService.updateTransactionStatus(event.transactionId, newStatus);
      }
    }

    event.processed = true;
    return event;
  },

  /** Retorna histórico de webhooks */
  getHistory(): WebhookEvent[] {
    try {
      return JSON.parse(localStorage.getItem(WEBHOOK_STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  },

  /** Simula um evento de pagamento aprovado (útil para testes em modo demo) */
  async simulateApproval(transactionId: string, gateway: GatewayName, amount: number): Promise<WebhookEvent> {
    return this.process(gateway, {
      type: 'payment.approved',
      data: { id: transactionId, transaction_amount: amount, status: 'approved' },
      simulated: true,
    });
  },
};

// Importação local para evitar circular — usar apenas Transaction['status']
type Transaction = import('../../types/payments').Transaction;
