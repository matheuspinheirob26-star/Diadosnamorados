import React, { createContext, useContext, useState, useEffect } from 'react';
import { Campaign, CampaignType } from '../types';

const CAMPAIGNS: Record<CampaignType, Campaign> = {
  namorados: {
    id: 'namorados',
    name: 'Dia dos Namorados',
    emoji: '❤️',
    headline: 'Presentes que transformam momentos em memórias.',
    subheadline: 'Encontre o presente perfeito para surpreender quem você ama neste Dia dos Namorados.',
    bgGradient: 'radial-gradient(circle at top right, #3A1217 0%, #0A0A0A 65%)',
    primaryColor: 'wine-600',
    accentColor: 'gold-500',
    badgeText: '❤️ Especial Dia dos Namorados'
  },
  maes: {
    id: 'maes',
    name: 'Dia das Mães',
    emoji: '🌸',
    headline: 'O amor mais puro merece o presente mais extraordinário.',
    subheadline: 'Celebre aquela que te deu tudo com nossa coleção exclusiva de joias, bolsas e perfumes premium.',
    bgGradient: 'radial-gradient(circle at top right, #3C1C2D 0%, #0A0A0A 65%)',
    primaryColor: 'pink-500',
    accentColor: 'gold-400',
    badgeText: '🌸 Coleção Dia das Mães'
  },
  pais: {
    id: 'pais',
    name: 'Dia dos Pais',
    emoji: '👔',
    headline: 'Para quem é sua maior referência de força e elegância.',
    subheadline: 'Kits masculinos finos com relógios imperiais, couro Saffiano e perfumaria de nicho.',
    bgGradient: 'radial-gradient(circle at top right, #132435 0%, #0A0A0A 65%)',
    primaryColor: 'slate-500',
    accentColor: 'gold-500',
    badgeText: '👔 Elegância Dia dos Pais'
  },
  natal: {
    id: 'natal',
    name: 'Natal',
    emoji: '🎄',
    headline: 'A magia de presentear quem torna seu ano inesquecível.',
    subheadline: 'Embalagens artesanais luxuosas e experiências memoráveis para celebrar a melhor época do ano.',
    bgGradient: 'radial-gradient(circle at top right, #11281A 0%, #0A0A0A 65%)',
    primaryColor: 'emerald-600',
    accentColor: 'gold-400',
    badgeText: '🎄 Boas Festas & Luxo'
  },
  blackfriday: {
    id: 'blackfriday',
    name: 'Black Friday',
    emoji: '⚡',
    headline: 'O luxo absoluto com condições sem precedentes.',
    subheadline: 'Nossos maiores ícones em edições estritamente limitadas com condições exclusivas e envio prioritário.',
    bgGradient: 'radial-gradient(circle at top right, #222222 0%, #0A0A0A 65%)',
    primaryColor: 'neutral-600',
    accentColor: 'amber-500',
    badgeText: '⚡ Black Gold: Edição Limitada'
  },
  aniversarios: {
    id: 'aniversarios',
    name: 'Aniversários & Datas',
    emoji: '🎁',
    headline: 'Celebre novos ciclos com presentes dignos de grandes histórias.',
    subheadline: 'Kits comemorativos sofisticados e cartões personalizados prontos para emocionar em qualquer data.',
    bgGradient: 'radial-gradient(circle at top right, #1C1936 0%, #0A0A0A 65%)',
    primaryColor: 'indigo-500',
    accentColor: 'gold-500',
    badgeText: '🎁 Presentes Especiais'
  }
};

interface CampaignContextProps {
  currentCampaign: Campaign;
  setCampaign: (type: CampaignType) => void;
  allCampaigns: Campaign[];
}

const CampaignContext = createContext<CampaignContextProps | undefined>(undefined);

export const CampaignProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa a partir do localStorage ou o default 'namorados'
  const [activeCampaignType, setActiveCampaignType] = useState<CampaignType>(() => {
    const stored = localStorage.getItem('amr_active_campaign');
    if (stored && stored in CAMPAIGNS) {
      return stored as CampaignType;
    }
    return 'namorados';
  });

  const setCampaign = (type: CampaignType) => {
    setActiveCampaignType(type);
    localStorage.setItem('amr_active_campaign', type);
  };

  const currentCampaign = CAMPAIGNS[activeCampaignType];
  const allCampaigns = Object.values(CAMPAIGNS);

  // Efeito para aplicar dinamicamente o gradiente de fundo no body
  useEffect(() => {
    document.body.style.backgroundImage = currentCampaign.bgGradient;
    return () => {
      document.body.style.backgroundImage = '';
    };
  }, [currentCampaign]);

  return (
    <CampaignContext.Provider value={{ currentCampaign, setCampaign, allCampaigns }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign deve ser utilizado sob um CampaignProvider');
  }
  return context;
};
