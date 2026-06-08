/**
 * Efí Bank (Gerencianet) Provider
 *
 * Líder brasileiro em Pix via API oficial do Banco Central.
 * Foco em Pix — boleto e cartão também suportados.
 * Client ID público é seguro no front; Client Secret vai na Edge Function.
 *
 * Documentação: https://dev.efipay.com.br/
 */

import { supabase } from '../../../supabase';
import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, pixCodeGenerator, boletoCodeGenerator, qrCodeUrl } from '../../utils';

export class EfiProvider implements PaymentProvider {
  readonly name: GatewayName = 'efi';
  readonly isDemo: boolean;
  private clientId: string;

  constructor(clientId = '') {
    this.clientId = clientId;
    this.isDemo = !clientId || clientId.length < 10;
  }

  async createPixPayment(req: PixRequest): Promise<PixResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'efi', method: 'pix', ...req },
        });
        if (error) throw error;
        return data as PixResponse;
      } catch (err) {
        console.warn('[Efí] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('efi');
    const pixCode = pixCodeGenerator({ orderId: req.orderId, amount: req.amount, txId });
    return {
      transactionId: txId,
      gateway: 'efi',
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
          body: { gateway: 'efi', method: 'card', ...req },
        });
        if (error) throw error;
        return data as CardResponse;
      } catch (err) {
        console.warn('[Efí] Edge Function falhou, usando demo:', err);
      }
    }
    return {
      transactionId: generateId('efi'),
      gateway: 'efi',
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
          body: { gateway: 'efi', method: 'boleto', ...req },
        });
        if (error) throw error;
        return data as BoletoResponse;
      } catch (err) {
        console.warn('[Efí] Edge Function falhou, usando demo:', err);
      }
    }
    const txId = generateId('efi');
    return {
      transactionId: txId,
      gateway: 'efi',
      barcode: boletoCodeGenerator(req.amount, req.orderId),
      pdfUrl: `https://efipay.com.br/boleto/demo/${txId}.pdf`,
      expiresAt: new Date(Date.now() + (req.expirationDays ?? 3) * 86_400_000).toISOString(),
      status: 'pending',
      isDemo: true,
    };
  }

  async createCryptoPayment(_req: CryptoRequest): Promise<CryptoResponse> {
    throw new Error('Efí Bank não suporta criptomoedas. Use o provider Crypto.');
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          body: { gateway: 'efi', transactionId },
        });
        if (error) throw error;
        return data as PaymentStatusResponse;
      } catch { /* fallback */ }
    }
    return { transactionId, orderId: '', gateway: 'efi', status: 'pending', amount: 0 };
  }

  async refundPayment(transactionId: string): Promise<void> {
    console.info(`[Efí${this.isDemo ? ' DEMO' : ''}] Reembolso: ${transactionId}`);
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[Efí${this.isDemo ? ' DEMO' : ''}] Cancelamento: ${transactionId}`);
  }
}
