/**
 * PaymentFactory
 *
 * Instancia o PaymentProvider correto baseado na configuração do gateway.
 * Desacopla completamente o PaymentService dos providers concretos.
 */

import { GatewayName } from '../../types/payments';
import { GatewayConfig } from '../../types/payments';
import { PaymentProvider } from './PaymentProvider';
import { MercadoPagoProvider } from './providers/mercadopago/MercadoPagoProvider';
import { PagarmeProvider } from './providers/pagarme/PagarmeProvider';
import { EfiProvider } from './providers/efi/EfiProvider';
import { AsaasProvider } from './providers/asaas/AsaasProvider';
import { StripeProvider } from './providers/stripe/StripeProvider';
import { CryptoProvider } from './providers/crypto/CryptoProvider';

export class PaymentFactory {
  /**
   * Instancia o provider correto para um dado gateway config.
   * Se as chaves não estiverem configuradas, o provider opera em modo demo automático.
   */
  static createProvider(config: GatewayConfig): PaymentProvider {
    switch (config.gateway) {
      case 'mercadopago':
        return new MercadoPagoProvider(config.publicKey ?? '');

      case 'pagarme':
        return new PagarmeProvider(config.publicKey ?? '');

      case 'efi':
        return new EfiProvider(config.clientId ?? '');

      case 'asaas':
        return new AsaasProvider(config.publicKey ?? '');

      case 'stripe':
        return new StripeProvider(config.publicKey ?? '');

      case 'crypto':
        return new CryptoProvider({
          BTC: config.walletBTC,
          ETH: config.walletETH,
          USDT_TRC20: config.walletUSDT_TRC20,
          USDT_ERC20: config.walletUSDT_ERC20,
        });

      default:
        throw new Error(`Gateway desconhecido: ${config.gateway}`);
    }
  }

  /**
   * Cria todos os providers habilitados em ordem de prioridade.
   * Útil para o PaymentService montar a lista de fallback.
   */
  static createAll(configs: GatewayConfig[]): Map<GatewayName, PaymentProvider> {
    const map = new Map<GatewayName, PaymentProvider>();
    configs
      .filter(c => c.enabled)
      .sort((a, b) => a.priority - b.priority)
      .forEach(config => {
        try {
          map.set(config.gateway, PaymentFactory.createProvider(config));
        } catch (err) {
          console.warn(`[PaymentFactory] Falha ao criar provider ${config.gateway}:`, err);
        }
      });
    return map;
  }

  /** Retorna providers que suportam um método de pagamento específico */
  static getSupportingProviders(
    providers: Map<GatewayName, PaymentProvider>,
    method: 'pix' | 'card' | 'boleto' | 'crypto'
  ): PaymentProvider[] {
    const all = Array.from(providers.values());

    if (method === 'crypto') {
      return all.filter(p => p.name === 'crypto');
    }

    // Cripto não suporta Pix/Card/Boleto
    return all.filter(p => p.name !== 'crypto');
  }
}
