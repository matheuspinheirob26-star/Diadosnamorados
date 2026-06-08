/**
 * Stripe Provider
 *
 * Gateway internacional com suporte a cartão de crédito/débito global.
 * Stripe.js / Stripe Elements usados client-side para tokenização segura (PCI-DSS compliant).
 * Criação de PaymentIntent e confirmação via Supabase Edge Function (secret key no servidor).
 *
 * Documentação: https://stripe.com/docs
 */

import { supabase } from '../../../supabase';
import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, pixCodeGenerator, boletoCodeGenerator, qrCodeUrl } from '../../utils';

export class StripeProvider implements PaymentProvider {
  readonly name: GatewayName = 'stripe';
  readonly isDemo: boolean;
  private publishableKey: string;

  constructor(publishableKey = '') {
    this.publishableKey = publishableKey;
    this.isDemo = !publishableKey || !publishableKey.startsWith('pk_');
  }

  /** Stripe suporta Pix via Payment Methods API */
  async createPixPayment(req: PixRequest): Promise<PixResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'stripe', method: 'pix', ...req },
        });
        if (error) throw error;
        return data as PixResponse;
      } catch (err) {
        console.warn('[Stripe] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('str');
    const pixCode = pixCodeGenerator({ orderId: req.orderId, amount: req.amount, txId });
    return {
      transactionId: txId,
      gateway: 'stripe',
      qrCodeImage: qrCodeUrl(pixCode),
      copyPaste: pixCode,
      expiresAt: new Date(Date.now() + (req.expirationMinutes ?? 15) * 60_000).toISOString(),
      status: 'pending',
      isDemo: true,
    };
  }

  async createCardPayment(req: CardRequest): Promise<CardResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'stripe', method: 'card', ...req },
        });
        if (error) throw error;
        return data as CardResponse;
      } catch (err) {
        console.warn('[Stripe] Edge Function falhou, usando demo:', err);
      }
    }
    return {
      transactionId: generateId('str'),
      gateway: 'stripe',
      status: 'paid',
      authorizationCode: `pi_${Math.random().toString(36).substring(2, 14)}`,
      installments: req.installments,
      amount: req.amount,
      isDemo: true,
    };
  }

  /** Stripe suporta Boleto no Brasil via Payment Methods API */
  async createBoletoPayment(req: BoletoRequest): Promise<BoletoResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'stripe', method: 'boleto', ...req },
        });
        if (error) throw error;
        return data as BoletoResponse;
      } catch (err) {
        console.warn('[Stripe] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('str');
    return {
      transactionId: txId,
      gateway: 'stripe',
      barcode: boletoCodeGenerator(req.amount, req.orderId),
      pdfUrl: `https://stripe.com/pay/${txId}`,
      expiresAt: new Date(Date.now() + (req.expirationDays ?? 3) * 86_400_000).toISOString(),
      status: 'pending',
      isDemo: true,
    };
  }

  async createCryptoPayment(_req: CryptoRequest): Promise<CryptoResponse> {
    throw new Error('Stripe não suporta criptomoedas diretamente. Use o provider Crypto.');
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          body: { gateway: 'stripe', transactionId },
        });
        if (error) throw error;
        return data as PaymentStatusResponse;
      } catch { /* fallback */ }
    }
    return { transactionId, orderId: '', gateway: 'stripe', status: 'pending', amount: 0 };
  }

  async refundPayment(transactionId: string): Promise<void> {
    console.info(`[Stripe${this.isDemo ? ' DEMO' : ''}] Reembolso: ${transactionId}`);
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[Stripe${this.isDemo ? ' DEMO' : ''}] Cancelamento: ${transactionId}`);
  }
}
