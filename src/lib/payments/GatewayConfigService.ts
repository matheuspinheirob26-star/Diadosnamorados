/**
 * GatewayConfigService
 *
 * Responsável por ler, salvar e gerenciar as configurações de todos os gateways.
 * Armazenamento: Supabase DB (tabela gateway_configs) com fallback automático em localStorage.
 *
 * SEGURANÇA: Apenas chaves públicas/IDs de cliente são armazenadas no front-end.
 *            Chaves secretas ficam nas variáveis de ambiente das Supabase Edge Functions.
 */

import { supabase } from '../supabase';
import { GatewayConfig, GatewayConfigUpdate, GatewayName } from '../../types/payments';

const STORAGE_KEY = 'amr_gateway_configs';

// Configurações padrão (modo demo — sem chaves reais)
const DEFAULT_CONFIGS: GatewayConfig[] = [
  {
    id: 'gw_mercadopago',
    gateway: 'mercadopago',
    label: 'Mercado Pago',
    enabled: true,
    priority: 1,
    publicKey: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gw_pagarme',
    gateway: 'pagarme',
    label: 'Pagar.me',
    enabled: true,
    priority: 2,
    publicKey: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gw_efi',
    gateway: 'efi',
    label: 'Efí Bank',
    enabled: true,
    priority: 3,
    clientId: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gw_asaas',
    gateway: 'asaas',
    label: 'Asaas',
    enabled: false,
    priority: 4,
    publicKey: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gw_stripe',
    gateway: 'stripe',
    label: 'Stripe',
    enabled: true,
    priority: 5,
    publicKey: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'gw_crypto',
    gateway: 'crypto',
    label: 'Criptomoedas',
    enabled: true,
    priority: 6,
    walletBTC: '',
    walletETH: '',
    walletUSDT_TRC20: '',
    walletUSDT_ERC20: '',
    isDemo: true,
    updatedAt: new Date().toISOString(),
  },
];

// ─── Helpers localStorage ──────────────────────────────────────────────────────
function loadLocal(): GatewayConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIGS;
    const saved: GatewayConfig[] = JSON.parse(raw);
    // Mesclar com defaults para garantir novos gateways apareçam
    const savedMap = new Map(saved.map(c => [c.gateway, c]));
    return DEFAULT_CONFIGS.map(def => savedMap.get(def.gateway) ?? def);
  } catch {
    return DEFAULT_CONFIGS;
  }
}

function saveLocal(configs: GatewayConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

function computeIsDemo(config: GatewayConfig): boolean {
  if (config.gateway === 'crypto') {
    return !config.walletBTC && !config.walletETH && !config.walletUSDT_TRC20 && !config.walletUSDT_ERC20;
  }
  if (config.gateway === 'efi') {
    return !config.clientId || config.clientId.trim().length < 10;
  }
  return !config.publicKey || config.publicKey.trim().length < 5;
}

// ─── Service ───────────────────────────────────────────────────────────────────
export const GatewayConfigService = {
  /**
   * Retorna todas as configurações ordenadas por prioridade.
   * Tenta Supabase primeiro, cai em localStorage.
   */
  async getAll(): Promise<GatewayConfig[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('gateway_configs')
          .select('*')
          .order('priority', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
          const configs: GatewayConfig[] = data.map((row: any) => ({
            id: row.id,
            gateway: row.gateway as GatewayName,
            label: row.label,
            enabled: row.enabled,
            priority: row.priority,
            publicKey: row.config?.publicKey ?? '',
            clientId: row.config?.clientId ?? '',
            walletBTC: row.config?.walletBTC ?? '',
            walletETH: row.config?.walletETH ?? '',
            walletUSDT_TRC20: row.config?.walletUSDT_TRC20 ?? '',
            walletUSDT_ERC20: row.config?.walletUSDT_ERC20 ?? '',
            isDemo: false,
            updatedAt: row.updated_at,
          })).map(c => ({ ...c, isDemo: computeIsDemo(c) }));
          saveLocal(configs); // cache local
          return configs;
        }
      } catch (err) {
        console.warn('[GatewayConfigService] Supabase falhou, usando localStorage:', err);
      }
    }
    return loadLocal();
  },

  /** Retorna apenas os gateways habilitados, por prioridade */
  async getEnabled(): Promise<GatewayConfig[]> {
    const all = await this.getAll();
    return all.filter(c => c.enabled).sort((a, b) => a.priority - b.priority);
  },

  /** Retorna config de um gateway específico */
  async getByGateway(gateway: GatewayName): Promise<GatewayConfig | undefined> {
    const all = await this.getAll();
    return all.find(c => c.gateway === gateway);
  },

  /**
   * Salva configurações de um gateway.
   * Persiste em Supabase e localStorage.
   */
  async update(gateway: GatewayName, update: GatewayConfigUpdate): Promise<void> {
    const all = loadLocal();
    const idx = all.findIndex(c => c.gateway === gateway);

    if (idx === -1) return;

    const updated: GatewayConfig = {
      ...all[idx],
      ...update,
      updatedAt: new Date().toISOString(),
    };
    updated.isDemo = computeIsDemo(updated);
    all[idx] = updated;
    saveLocal(all);

    // Tentar persistir no Supabase
    if (supabase) {
      try {
        await supabase.from('gateway_configs').upsert({
          id: updated.id,
          gateway: updated.gateway,
          label: updated.label,
          enabled: updated.enabled,
          priority: updated.priority,
          config: {
            publicKey: updated.publicKey,
            clientId: updated.clientId,
            walletBTC: updated.walletBTC,
            walletETH: updated.walletETH,
            walletUSDT_TRC20: updated.walletUSDT_TRC20,
            walletUSDT_ERC20: updated.walletUSDT_ERC20,
          },
          updated_at: updated.updatedAt,
        });
      } catch (err) {
        console.warn('[GatewayConfigService] Supabase upsert falhou:', err);
      }
    }
  },

  /** Reordena prioridades de todos os gateways */
  async reorder(orderedGateways: GatewayName[]): Promise<void> {
    const all = loadLocal();
    orderedGateways.forEach((gw, idx) => {
      const cfg = all.find(c => c.gateway === gw);
      if (cfg) cfg.priority = idx + 1;
    });
    saveLocal(all);
  },
};
