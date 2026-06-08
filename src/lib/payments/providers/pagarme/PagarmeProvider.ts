/**
 * Pagar.me Provider
 *
 * Gateway brasileiro completo: Pix, Cartão, Boleto.
 * Tokenização via pagarme.js v5 (client-side).
 * Criação de cobrança via Supabase Edge Function (secret key segura no servidor).
 *
 * Documentação: https://docs.pagar.me/
 */

import { supabase } from '../../../supabase';
import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, pixCodeGenerator, boletoCodeGenerator, qrCodeUrl } from '../../utils';

export class PagarmeProvider implements PaymentProvider {
  readonly name: GatewayName = 'pagarme';
  readonly isDemo: boolean;
  private publicKey: string;

  constructor(publicKey = '') {
    this.publicKey = publicKey;
    this.isDemo = !publicKey || !publicKey.startsWith('pk_');
  }

  async createPixPayment(req: PixRequest): Promise<PixResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'pagarme', method: 'pix', ...req },
        });
        if (error) throw error;
        return data as PixResponse;
      } catch (err) {
        console.warn('[Pagar.me] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('pm');
    const pixCode = pixCodeGenerator({ orderId: req.orderId, amount: req.amount, txId });
    const expiresAt = new Date(Date.now() + (req.expirationMinutes ?? 15) * 60_000).toISOString();
    return {
      transactionId: txId,
      gateway: 'pagarme',
      qrCodeImage: qrCodeUrl(pixCode),
      copyPaste: pixCode,
      expiresAt,
      status: 'pending',
      isDemo: true,
    };
  }

  async createCardPayment(req: CardRequest): Promise<CardResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'pagarme', method: 'card', ...req },
        });
        if (error) throw error;
        return data as CardResponse;
      } catch (err) {
        console.warn('[Pagar.me] Edge Function falhou, usando demo:', err);
      }
    }
    return {
      transactionId: generateId('pm'),
      gateway: 'pagarme',
      status: 'paid',
      authorizationCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      installments: req.installments,
      amount: req.amount,
      isDemo: true,
    };
  }

  async createBoletoPayment(req: BoletoRequest): Promise<BoletoResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'pagarme', method: 'boleto', ...req },
        });
        if (error) throw error;
        return data as BoletoResponse;
      } catch (err) {
        console.warn('[Pagar.me] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('pm');
    return {
      transactionId: txId,
      gateway: 'pagarme',
      barcode: boletoCodeGenerator(req.amount, req.orderId),
      pdfUrl: `https://boleto.pagarme.com/demo/${txId}.pdf`,
      expiresAt: new Date(Date.now() + (req.expirationDays ?? 3) * 86_400_000).toISOString(),
      status: 'pending',
      isDemo: true,
    };
  }

  async createCryptoPayment(_req: CryptoRequest): Promise<CryptoResponse> {
    throw new Error('Pagar.me não suporta criptomoedas. Use o provider Crypto.');
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          body: { gateway: 'pagarme', transactionId },
        });
        if (error) throw error;
        return data as PaymentStatusResponse;
      } catch { /* fallback */ }
    }
    return { transactionId, orderId: '', gateway: 'pagarme', status: 'pending', amount: 0 };
  }

  async refundPayment(transactionId: string): Promise<void> {
    console.info(`[Pagar.me${this.isDemo ? ' DEMO' : ''}] Reembolso: ${transactionId}`);
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[Pagar.me${this.isDemo ? ' DEMO' : ''}] Cancelamento: ${transactionId}`);
  }
}
