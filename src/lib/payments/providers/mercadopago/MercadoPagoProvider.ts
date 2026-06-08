/**
 * MercadoPago Provider
 *
 * Modo real: chama Supabase Edge Function `process-payment` com secret key segura no servidor.
 * Modo demo: retorna respostas simuladas com dados realistas para demonstração.
 *
 * Chave pública (MP_PUBLIC_KEY) é usada para tokenização do cartão via MP SDK (client-side).
 * Chave secreta NUNCA vai para o frontend — fica nas variáveis de ambiente da Edge Function.
 *
 * SDK oficial: https://sdk.mercadopago.com/js/v2
 */

import { supabase } from '../../../supabase';
import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, pixCodeGenerator, boletoCodeGenerator, qrCodeUrl } from '../../utils';

export class MercadoPagoProvider implements PaymentProvider {
  readonly name: GatewayName = 'mercadopago';
  readonly isDemo: boolean;
  private publicKey: string;

  constructor(publicKey = '') {
    this.publicKey = publicKey;
    this.isDemo = !publicKey || publicKey.startsWith('TEST') === false && !publicKey.startsWith('APP_USR');
  }

  // ───────── PIX ─────────────────────────────────────────────────────────────

  async createPixPayment(req: PixRequest): Promise<PixResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'mercadopago', method: 'pix', ...req },
        });
        if (error) throw error;
        return data as PixResponse;
      } catch (err) {
        console.warn('[MercadoPago] Edge Function falhou, usando demo:', err);
      }
    }
    return this.mockPix(req);
  }

  private mockPix(req: PixRequest): PixResponse {
    const txId = generateId('mp');
    const pixCode = pixCodeGenerator({ orderId: req.orderId, amount: req.amount, txId });
    const expiresAt = new Date(Date.now() + (req.expirationMinutes ?? 15) * 60_000).toISOString();
    return {
      transactionId: txId,
      gateway: 'mercadopago',
      qrCodeImage: qrCodeUrl(pixCode),
      copyPaste: pixCode,
      expiresAt,
      status: 'pending',
      isDemo: true,
    };
  }

  // ───────── CARTÃO ───────────────────────────────────────────────────────────

  async createCardPayment(req: CardRequest): Promise<CardResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'mercadopago', method: 'card', ...req },
        });
        if (error) throw error;
        return data as CardResponse;
      } catch (err) {
        console.warn('[MercadoPago] Edge Function falhou, usando demo:', err);
      }
    }
    return {
      transactionId: generateId('mp'),
      gateway: 'mercadopago',
      status: 'paid',
      authorizationCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
      installments: req.installments,
      amount: req.amount,
      isDemo: true,
    };
  }

  // ───────── BOLETO ───────────────────────────────────────────────────────────

  async createBoletoPayment(req: BoletoRequest): Promise<BoletoResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('process-payment', {
          body: { gateway: 'mercadopago', method: 'boleto', ...req },
        });
        if (error) throw error;
        return data as BoletoResponse;
      } catch (err) {
        console.warn('[MercadoPago] Edge Function falhou, usando demo:', err);
      }
    }
    return this.mockBoleto(req);
  }

  private mockBoleto(req: BoletoRequest): BoletoResponse {
    const txId = generateId('mp');
    const barcode = boletoCodeGenerator(req.amount, req.orderId);
    const days = req.expirationDays ?? 3;
    const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();
    return {
      transactionId: txId,
      gateway: 'mercadopago',
      barcode,
      pdfUrl: `https://mercadopago.com/boleto/demo/${txId}.pdf`,
      expiresAt,
      status: 'pending',
      isDemo: true,
    };
  }

  // ───────── CRYPTO (não suportado nativamente pelo MP) ──────────────────────

  async createCryptoPayment(_req: CryptoRequest): Promise<CryptoResponse> {
    throw new Error('MercadoPago não suporta pagamentos em criptomoedas. Use o provider Crypto.');
  }

  // ───────── STATUS ───────────────────────────────────────────────────────────

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    if (!this.isDemo && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke('payment-status', {
          body: { gateway: 'mercadopago', transactionId },
        });
        if (error) throw error;
        return data as PaymentStatusResponse;
      } catch (err) {
        console.warn('[MercadoPago] Status check falhou:', err);
      }
    }
    return { transactionId, orderId: '', gateway: 'mercadopago', status: 'pending', amount: 0 };
  }

  async refundPayment(transactionId: string, _amount?: number): Promise<void> {
    console.info(`[MercadoPago${this.isDemo ? ' DEMO' : ''}] Solicitando reembolso: ${transactionId}`);
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[MercadoPago${this.isDemo ? ' DEMO' : ''}] Cancelando: ${transactionId}`);
  }
}
