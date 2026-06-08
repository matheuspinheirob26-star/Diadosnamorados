import { supabase } from './supabase';
import { StorefrontConfig, DEFAULT_STOREFRONT_CONFIG } from '../types/storefront';

const LOCAL_STORAGE_KEY = 'amr_storefront_config';

export class StorefrontService {
  /**
   * Obtém a configuração atual (tenta DB, cai pro LocalStorage, e por fim defaults).
   */
  static async getConfig(): Promise<StorefrontConfig> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('storefront_configs')
          .select('config')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.warn('Erro ao buscar storefront config no Supabase', error);
        }

        if (data && data.config) {
          return { ...DEFAULT_STOREFRONT_CONFIG, ...data.config };
        }
      } catch (err) {
        console.warn('Falha no Supabase ao buscar storefront config:', err);
      }
    }

    // Fallback: LocalStorage
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        return { ...DEFAULT_STOREFRONT_CONFIG, ...JSON.parse(local) };
      }
    } catch (e) {
      console.warn('Erro ao ler do localStorage', e);
    }

    return DEFAULT_STOREFRONT_CONFIG;
  }

  /**
   * Salva a configuração atual (Supabase + LocalStorage) e dispara evento para atualização em tempo real.
   */
  static async updateConfig(config: StorefrontConfig): Promise<boolean> {
    let success = false;

    if (supabase) {
      try {
        // Assume que existe apenas 1 linha de configuração global
        const { error } = await supabase
          .from('storefront_configs')
          .upsert({ id: 1, config }, { onConflict: 'id' });

        if (error) {
          console.warn('Erro ao salvar no Supabase', error);
        } else {
          success = true;
        }
      } catch (err) {
        console.warn('Falha no Supabase ao salvar storefront config:', err);
      }
    }

    // Salvar sempre no localStorage como fallback para acesso rápido/offline
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
      success = true;
    } catch (e) {
      console.warn('Erro ao salvar no localStorage', e);
    }

    // Disparar evento para a vitrine ser recarregada sem F5 (se a aba pública estiver aberta)
    window.dispatchEvent(new Event('storefrontConfigUpdated'));

    return success;
  }
}
