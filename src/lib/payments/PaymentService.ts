/**
 * PaymentService
 *
 * Ponto de entrada único para processar pagamentos.
 * Implementa:
 *   - Seleção automática do gateway por prioridade
 *   - Fallback automático para o próximo gateway em caso de falha
 *   - Registro de tentativas (PaymentAttempt)
 *   - Persistência de transações (localStorage + Supabase fallback)
 *   - Polling de status para Pix
 */

import { supabase } from '../supabase';
import { GatewayConfigService } from './GatewayConfigService';
import { PaymentFactory } from './PaymentFactory';
import {
  PaymentMethodType,
  PixRequest, CardRequest, BoletoRequest, CryptoRequest,
  ProcessPaymentInput, ProcessPaymentOutcome,
  Transaction, PaymentAttempt,
  GatewayName, PaymentStatusResponse,
} from '../../types/payments';
import { generateId } from './utils';

const TX_STORAGE_KEY = 'amr_transactions';
const ATTEMPTS_STORAGE_KEY = 'amr_payment_attempts';

// ─── Local storage helpers ─────────────────────────────────────────────────────
function saveTransaction(tx: Transaction): void {
  const all: Transaction[] = JSON.parse(localStorage.getItem(TX_STORAGE_KEY) ?? '[]');
  const idx = all.findIndex(t => t.id === tx.id);
  if (idx >= 0) all[idx] = tx; else all.unshift(tx);
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(all));
}

function saveAttempt(attempt: PaymentAttempt): void {
  const all: PaymentAttempt[] = JSON.parse(localStorage.getItem(ATTEMPTS_STORAGE_KEY) ?? '[]');
  all.unshift(attempt);
  localStorage.setItem(ATTEMPTS_STORAGE_KEY, JSON.stringify(all.slice(0, 200)));
}

async function persistTransactionToSupabase(tx: Transaction): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('transactions').upsert({
      id: tx.id,
      order_id: tx.orderId,
      gateway: tx.gateway,
      gateway_transaction_id: tx.gatewayTransactionId,
      method: tx.method,
      status: tx.status,
      amount: tx.amount,
      fee: tx.fee,
      net_amount: tx.netAmount,
      currency: tx.currency,
      pix_qr_code_image: tx.pixQrCodeImage,
      pix_copy_paste: tx.pixCopyPaste,
      pix_expiration: tx.pixExpiration,
      boleto_url: tx.boletoUrl,
      boleto_barcode: tx.boletoBarcode,
      boleto_expiration: tx.boletoExpiration,
      crypto_address: tx.cryptoAddress,
      crypto_amount: tx.cryptoAmount,
      crypto_currency: tx.cryptoCurrency,
      crypto_expiration: tx.cryptoExpiration,
      installments: tx.installments,
      is_demo: tx.isDemo,
      created_at: tx.createdAt,
      updated_at: tx.updatedAt,
    });
  } catch (err) {
    console.warn('[PaymentService] Supabase transaction persist falhou:', err);
  }
}

// ─── Main Service ──────────────────────────────────────────────────────────────
export const PaymentService = {
  /**
   * Processa um pagamento.
   * Tenta cada gateway habilitado em ordem de prioridade.
   * Em caso de falha, passa para o próximo (fallback automático).
   */
  async process(input: ProcessPaymentInput): Promise<ProcessPaymentOutcome> {
    const attempts: PaymentAttempt[] = [];
    const configs = await GatewayConfigService.getEnabled();
    const providers = PaymentFactory.createAll(configs);
    const candidates = PaymentFactory.getSupportingProviders(providers, input.method);

    if (candidates.length === 0) {
      return {
        success: false,
        error: 'Nenhum gateway de pagamento habilitado para este método.',
        attempts,
      };
    }

    for (const provider of candidates) {
      const startedAt = Date.now();
      const attempt: PaymentAttempt = {
        id: generateId('atm'),
        orderId: input.orderId,
        gateway: provider.name,
        method: input.method,
        status: 'success',
        responseTimeMs: 0,
        createdAt: new Date().toISOString(),
      };

      try {
        let result: any;
        const tx: Partial<Transaction> = {
          id: generateId('tx'),
          orderId: input.orderId,
          gateway: provider.name,
          method: input.method,
          currency: 'BRL',
          fee: 0,
          netAmount: 0,
          isDemo: provider.isDemo,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // ── Processar por método ──────────────────────────────────────────────
        if (input.method === 'pix') {
          const res = await provider.createPixPayment(input as PixRequest);
          result = { method: 'pix', ...res };
          tx.gatewayTransactionId = res.transactionId;
          tx.status = res.status;
          tx.amount = (input as PixRequest).amount;
          tx.pixQrCodeImage = res.qrCodeImage;
          tx.pixCopyPaste = res.copyPaste;
          tx.pixExpiration = res.expiresAt;
          tx.fee = estimateFee('pix', tx.amount!, provider.name);
          tx.netAmount = tx.amount! - tx.fee;
        } else if (input.method === 'card') {
          const res = await provider.createCardPayment(input as CardRequest);
          result = { method: 'card', ...res };
          tx.gatewayTransactionId = res.transactionId;
          tx.status = res.status;
          tx.amount = (input as CardRequest).amount;
          tx.installments = (input as CardRequest).installments;
          tx.fee = estimateFee('card', tx.amount!, provider.name);
          tx.netAmount = tx.amount! - tx.fee;
        } else if (input.method === 'boleto') {
          const res = await provider.createBoletoPayment(input as BoletoRequest);
          result = { method: 'boleto', ...res };
          tx.gatewayTransactionId = res.transactionId;
          tx.status = res.status;
          tx.amount = (input as BoletoRequest).amount;
          tx.boletoBarcode = res.barcode;
          tx.boletoUrl = res.pdfUrl;
          tx.boletoExpiration = res.expiresAt;
          tx.fee = estimateFee('boleto', tx.amount!, provider.name);
          tx.netAmount = tx.amount! - tx.fee;
        } else if (input.method === 'crypto') {
          const res = await provider.createCryptoPayment(input as CryptoRequest);
          result = { method: 'crypto', ...res };
          tx.gatewayTransactionId = res.transactionId;
          tx.status = res.status;
          tx.amount = (input as CryptoRequest).amountBRL;
          tx.cryptoAddress = res.walletAddress;
          tx.cryptoAmount = res.cryptoAmount;
          tx.cryptoCurrency = res.currency;
          tx.cryptoExpiration = res.expiresAt;
          tx.fee = 0;
          tx.netAmount = tx.amount;
        }

        const fullTx = tx as Transaction;
        attempt.responseTimeMs = Date.now() - startedAt;
        saveAttempt(attempt);
        saveTransaction(fullTx);
        await persistTransactionToSupabase(fullTx);

        return { success: true, result, transaction: fullTx, attempts };

      } catch (err: any) {
        attempt.status = candidates.indexOf(provider) < candidates.length - 1
          ? 'fallback_triggered'
          : 'failed';
        attempt.errorMessage = err?.message ?? 'Erro desconhecido';
        attempt.responseTimeMs = Date.now() - startedAt;
        attempts.push(attempt);
        saveAttempt(attempt);

        console.warn(
          `[PaymentService] Gateway ${provider.name} falhou. ${attempt.status === 'fallback_triggered' ? 'Tentando próximo...' : 'Todos os gateways falharam.'}`,
          err
        );
      }
    }

    return {
      success: false,
      error: 'Todos os gateways falharam ao processar o pagamento. Tente novamente ou use outro método.',
      attempts,
    };
  },

  /**
   * Consulta o status de uma transação.
   * Usado para polling de Pix.
   */
  async getStatus(transactionId: string, gateway: GatewayName): Promise<PaymentStatusResponse | null> {
    try {
      const configs = await GatewayConfigService.getEnabled();
      const config = configs.find(c => c.gateway === gateway);
      if (!config) return null;

      const provider = PaymentFactory.createProvider(config);
      return await provider.getPaymentStatus(transactionId);
    } catch (err) {
      console.warn('[PaymentService] getStatus falhou:', err);
      return null;
    }
  },

  /** Lista todas as transações do localStorage */
  getTransactions(): Transaction[] {
    try {
      return JSON.parse(localStorage.getItem(TX_STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  },

  /** Lista tentativas de pagamento */
  getAttempts(): PaymentAttempt[] {
    try {
      return JSON.parse(localStorage.getItem(ATTEMPTS_STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  },

  /** Atualiza status de uma transação no localStorage */
  updateTransactionStatus(transactionId: string, status: Transaction['status']): void {
    const all = PaymentService.getTransactions();
    const idx = all.findIndex(t => t.gatewayTransactionId === transactionId || t.id === transactionId);
    if (idx >= 0) {
      all[idx].status = status;
      all[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(all));
    }
  },
};

// ─── Fee Estimation ─────────────────────────────────────────────────────────────
function estimateFee(method: PaymentMethodType, amount: number, gateway: GatewayName): number {
  // Taxas aproximadas de mercado (para demonstração)
  const feeTable: Record<GatewayName, Record<PaymentMethodType, number>> = {
    mercadopago: { pix: 0.0099, card: 0.0399, boleto: 0.0149, crypto: 0 },
    pagarme:     { pix: 0.0089, card: 0.0369, boleto: 0.0139, crypto: 0 },
    efi:         { pix: 0.0070, card: 0.0340, boleto: 0.0120, crypto: 0 },
    asaas:       { pix: 0.0099, card: 0.0390, boleto: 0.0149, crypto: 0 },
    stripe:      { pix: 0.0130, card: 0.0430, boleto: 0.0180, crypto: 0 },
    crypto:      { pix: 0,      card: 0,      boleto: 0,      crypto: 0.01 },
  };
  const rate = feeTable[gateway]?.[method] ?? 0.04;
  return parseFloat((amount * rate).toFixed(2));
}
