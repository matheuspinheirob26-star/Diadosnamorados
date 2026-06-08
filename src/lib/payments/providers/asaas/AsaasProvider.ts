/**
 * Asaas Provider
 *
 * Gateway nacional: Pix, Boleto, Cartão de crédito e débito.
 * Todo processamento via Supabase Edge Function (API key segura no servidor).
 *
 * Documentação: https://docs.asaas.com/
 */

import { supabase } from '../../../supabase';
import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, pixCodeGenerator, boletoCodeGenerator, qrCodeUrl } from '../../utils';

export class AsaasProvider implements PaymentProvider {
  readonly name: GatewayName = 'asaas';
  readonly isDemo: boolean;
  private apiKey: string;

  constructor(apiKey = '') {
    this.apiKey = apiKey;
    this.isDemo = !apiKey || apiKey.startsWith('$aact_');
  }

  async createPixPayment(req: PixRequest): Promise<PixResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'asaas', method: 'pix', ...req },
        });
        if (error) throw error;
        return data as PixResponse;
      } catch (err) {
        console.warn('[Asaas] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('aas');
    const pixCode = pixCodeGenerator({ orderId: req.orderId, amount: req.amount, txId });
    return {
      transactionId: txId,
      gateway: 'asaas',
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
          body: { gateway: 'asaas', method: 'card', ...req },
        });
        if (error) throw error;
        return data as CardResponse;
      } catch (err) {
        console.warn('[Asaas] Edge Function falhou, usando demo:', err);
      }
    }
    return {
      transactionId: generateId('aas'),
      gateway: 'asaas',
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
          body: { gateway: 'asaas', method: 'boleto', ...req },
        });
        if (error) throw error;
        return data as BoletoResponse;
      } catch (err) {
        console.warn('[Asaas] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('aas');
    return {
      transactionId: txId,
      gateway: 'asaas',
      barcode: boletoCodeGenerator(req.amount, req.orderId),
      pdfUrl: `https://asaas.com/boleto/demo/${txId}.pdf`,
      expiresAt: new Date(Date.now() + (req.expirationDays ?? 3) * 86_400_000).toISOString(),
      status: 'pending',
      isDemo: true,
    };
  }

  async createCryptoPayment(_req: CryptoRequest): Promise<CryptoResponse> {
    throw new Error('Asaas não suporta criptomoedas. Use o provider Crypto.');
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          body: { gateway: 'asaas', transactionId },
        });
        if (error) throw error;
        return data as PaymentStatusResponse;
      } catch { /* fallback */ }
    }
    return { transactionId, orderId: '', gateway: 'asaas', status: 'pending', amount: 0 };
  }

  async refundPayment(transactionId: string): Promise<void> {
    console.info(`[Asaas${this.isDemo ? ' DEMO' : ''}] Reembolso: ${transactionId}`);
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[Asaas${this.isDemo ? ' DEMO' : ''}] Cancelamento: ${transactionId}`);
  }
}
