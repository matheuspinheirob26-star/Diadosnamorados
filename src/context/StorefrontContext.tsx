import React, { createContext, useContext, useState, useEffect } from 'react';
import { StorefrontConfig, DEFAULT_STOREFRONT_CONFIG } from '../types/storefront';
import { StorefrontService } from '../lib/StorefrontService';

interface StorefrontContextProps {
  config: StorefrontConfig;
  previewConfig: StorefrontConfig | null;
  setPreviewConfig: (cfg: StorefrontConfig | null) => void;
  updateConfig: (newConfig: StorefrontConfig) => Promise<boolean>;
  isLoading: boolean;
}

const StorefrontContext = createContext<StorefrontContextProps | undefined>(undefined);

export const StorefrontProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<StorefrontConfig>(DEFAULT_STOREFRONT_CONFIG);
  const [previewConfig, setPreviewConfig] = useState<StorefrontConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega configurações iniciais
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      const fetchedConfig = await StorefrontService.getConfig();
      setConfig(fetchedConfig);
      applyThemeColors(fetchedConfig);
      setIsLoading(false);
    };

    loadConfig();

    // Atualização em tempo real (mesma aba ou abas sincronizadas se implementado)
    const handleUpdate = async () => {
      const updatedConfig = await StorefrontService.getConfig();
      setConfig(updatedConfig);
      applyThemeColors(updatedConfig);
    };

    window.addEventListener('storefrontConfigUpdated', handleUpdate);
    return () => window.removeEventListener('storefrontConfigUpdated', handleUpdate);
  }, []);

  // Aplica as cores primárias/secundárias globalmente
  const applyThemeColors = (cfg: StorefrontConfig) => {
    if (cfg.primaryColor) {
      document.documentElement.style.setProperty('--color-gold-500', cfg.primaryColor);
    }
    if (cfg.secondaryColor) {
      document.documentElement.style.setProperty('--color-wine-500', cfg.secondaryColor);
    }
  };

  // Observar mudanças no previewConfig para aplicar cores em tempo real
  useEffect(() => {
    if (previewConfig) {
      applyThemeColors(previewConfig);
    } else {
      applyThemeColors(config);
    }
  }, [previewConfig, config]);

  const handleUpdateConfig = async (newConfig: StorefrontConfig): Promise<boolean> => {
    // Optimistic update para preview rápido
    setConfig(newConfig);
    applyThemeColors(newConfig);
    
    // Persist
    return await StorefrontService.updateConfig(newConfig);
  };

  return (
    <StorefrontContext.Provider value={{ 
      config: previewConfig || config, 
      previewConfig, 
      setPreviewConfig, 
      updateConfig: handleUpdateConfig, 
      isLoading 
    }}>
      {children}
    </StorefrontContext.Provider>
  );
};

export const useStorefront = () => {
  const context = useContext(StorefrontContext);
  if (context === undefined) {
    throw new Error('useStorefront must be used within a StorefrontProvider');
  }
  return context;
};
