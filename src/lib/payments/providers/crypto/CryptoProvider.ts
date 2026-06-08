/**
 * Crypto Provider
 *
 * Exibe endereço de carteira estático para recebimento manual em:
 *   - Bitcoin (BTC)
 *   - Ethereum (ETH)
 *   - USDT TRC20 (Tron Network)
 *   - USDT ERC20 (Ethereum Network)
 *
 * Fase 1: Endereço estático configurado no painel admin. Zero processamento automático.
 *
 * Fase 2 (TODO): Integrar com NOWPayments, Coinbase Commerce ou OpenNode para:
 *   - Geração de endereço único por pedido
 *   - Confirmação automática na blockchain
 *   - Conversão BRL → Crypto em tempo real
 *
 * Taxas de câmbio simuladas (DEMO) — para produção, integrar com CoinGecko API.
 */

import { PaymentProvider } from '../../PaymentProvider';
import {
  GatewayName, PixRequest, PixResponse, CardRequest, CardResponse,
  BoletoRequest, BoletoResponse, CryptoRequest, CryptoResponse,
  CryptoCurrency, PaymentStatusResponse,
} from '../../../../types/payments';
import { generateId, qrCodeUrl } from '../../utils';

// Taxas de câmbio simuladas (BRL por unidade de cripto)
const MOCK_EXCHANGE_RATES: Record<CryptoCurrency, number> = {
  BTC: 580_000,      // ~1 BTC = R$ 580.000
  ETH: 18_500,       // ~1 ETH = R$ 18.500
  USDT_TRC20: 5.70,  // ~1 USDT = R$ 5.70
  USDT_ERC20: 5.70,
};

const CURRENCY_LABELS: Record<CryptoCurrency, string> = {
  BTC: 'Bitcoin (BTC)',
  ETH: 'Ethereum (ETH)',
  USDT_TRC20: 'USDT TRC20 (Tron)',
  USDT_ERC20: 'USDT ERC20 (Ethereum)',
};

const CRYPTO_DECIMALS: Record<CryptoCurrency, number> = {
  BTC: 8,
  ETH: 6,
  USDT_TRC20: 2,
  USDT_ERC20: 2,
};

export interface CryptoWallets {
  BTC?: string;
  ETH?: string;
  USDT_TRC20?: string;
  USDT_ERC20?: string;
}

export class CryptoProvider implements PaymentProvider {
  readonly name: GatewayName = 'crypto';
  readonly isDemo: boolean;
  private wallets: CryptoWallets;

  constructor(wallets: CryptoWallets = {}) {
    this.wallets = wallets;
    this.isDemo = Object.values(wallets).every(w => !w || w.trim() === '');
  }

  /** Crypto não suporta Pix */
  async createPixPayment(_req: PixRequest): Promise<PixResponse> {
    throw new Error('Crypto provider não suporta Pix.');
  }

  /** Crypto não suporta cartão */
  async createCardPayment(_req: CardRequest): Promise<CardResponse> {
    throw new Error('Crypto provider não suporta cartão.');
  }

  /** Crypto não suporta boleto */
  async createBoletoPayment(_req: BoletoRequest): Promise<BoletoResponse> {
    throw new Error('Crypto provider não suporta boleto.');
  }

  async createCryptoPayment(req: CryptoRequest): Promise<CryptoResponse> {
    const walletAddress = (this.wallets as Record<CryptoCurrency, string | undefined>)[req.currency] ?? this.getDemoWallet(req.currency);
    const rate = MOCK_EXCHANGE_RATES[req.currency];
    const cryptoAmount = parseFloat((req.amountBRL / rate).toFixed(CRYPTO_DECIMALS[req.currency]));

    // TODO Fase 2: Para geração de endereço único por pedido, integrar com:
    // NOWPayments: https://nowpayments.io/
    // Coinbase Commerce: https://commerce.coinbase.com/
    // OpenNode: https://www.opennode.com/

    const paymentUri = this.buildPaymentUri(req.currency, walletAddress, cryptoAmount, req.orderId);
    const txId = generateId('crt');

    return {
      transactionId: txId,
      gateway: 'crypto',
      walletAddress,
      cryptoAmount,
      currency: req.currency,
      exchangeRate: rate,
      qrCodeImage: qrCodeUrl(paymentUri),
      expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(), // 60 minutos
      status: 'pending',
      isDemo: this.isDemo,
      // TODO: paymentUrl para NOWPayments/Coinbase checkout
    };
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    // TODO Fase 2: verificar confirmação na blockchain via NOWPayments/Coinbase API
    console.info(`[Crypto] Status check (blockchain não implementado ainda): ${transactionId}`);
    return { transactionId, orderId: '', gateway: 'crypto', status: 'pending', amount: 0 };
  }

  async refundPayment(_transactionId: string): Promise<void> {
    // Reembolso em cripto requer transação manual para a carteira do cliente
    throw new Error('Reembolso em criptomoeda deve ser processado manualmente.');
  }

  async cancelPayment(transactionId: string): Promise<void> {
    console.info(`[Crypto] Cancelamento registrado localmente: ${transactionId}`);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private getDemoWallet(currency: CryptoCurrency): string {
    const demos: Record<CryptoCurrency, string> = {
      BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      ETH: '0x742d35Cc6634C0532925a3b8D4C2E5d5dD2B4A6',
      USDT_TRC20: 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
      USDT_ERC20: '0x742d35Cc6634C0532925a3b8D4C2E5d5dD2B4A6',
    };
    return demos[currency];
  }

  private buildPaymentUri(currency: CryptoCurrency, address: string, amount: number, label: string): string {
    switch (currency) {
      case 'BTC':
        return `bitcoin:${address}?amount=${amount}&label=${encodeURIComponent(label)}`;
      case 'ETH':
      case 'USDT_ERC20':
        return `ethereum:${address}?amount=${amount}`;
      case 'USDT_TRC20':
        return `tron:${address}?amount=${amount}`;
      default:
        return address;
    }
  }

  /** Helper público para exibir label de uma moeda */
  static getCurrencyLabel(currency: CryptoCurrency): string {
    return CURRENCY_LABELS[currency];
  }

  /** Helper público para taxa de câmbio mock */
  static getExchangeRate(currency: CryptoCurrency): number {
    return MOCK_EXCHANGE_RATES[currency];
  }
}
