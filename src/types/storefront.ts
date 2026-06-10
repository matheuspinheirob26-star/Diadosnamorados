export interface StorefrontConfig {
  // Tema
  defaultTheme: 'light' | 'dark' | 'system';
  allowUserThemeToggle: boolean;

  // Cores
  primaryColor: string;
  secondaryColor: string;

  // Imagens
  logoLight: string;
  logoDark: string;
  favicon: string;
  heroBannerDesktop: string;
  heroBannerMobile: string;
  heroImage: string; // Imagem principal solta (caso não use banner full)
  heroBadge: string; // Badge sazonal exibido acima do título (ex: ❤️ Especial Dia dos Namorados)

  // Textos (Identidade e Hero)
  storeName: string;
  slogan: string;
  heroTitle: string;
  heroSubtitle: string;
  heroButtonText: string;
  heroButtonLink: string;

  // Contatos & Redes Sociais
  whatsapp: string;
  supportEmail: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  youtubeUrl: string;
  storeAddress: string;

  // Header / Footer Text
  footerText: string;
  shippingBarText: string;
  minFreeShippingValue: number;

  // Pop-up / Cupom
  popupText: string;
  popupCoupon: string;

  // Pixels & Tracking
  metaPixel: string;
  googleTagManager: string;
  googleAnalytics: string;
  tiktokPixel: string;
}

export const DEFAULT_STOREFRONT_CONFIG: StorefrontConfig = {
  defaultTheme: 'dark',
  allowUserThemeToggle: true,

  primaryColor: '#AA0000', // Changed from #C59A48
  secondaryColor: '#973641', // Vinho Amour & Co.
  
  logoLight: '',
  logoDark: '',
  favicon: '',
  heroBannerDesktop: '',
  heroBannerMobile: '',
  heroImage: '',
  heroBadge: '✨ ❤️ ESPECIAL DIA DOS NAMORADOS',

  storeName: 'Amour & Co.',
  slogan: 'Presentes de Luxo',
  heroTitle: 'Presentes Inesquecíveis',
  heroSubtitle: 'Descubra a arte de presentear com luxo e sofisticação.',
  heroButtonText: 'GARANTIR PRESENTE',
  heroButtonLink: 'catalog',

  whatsapp: '+5511999999999',
  supportEmail: 'concierge@amour.com',
  instagramUrl: 'https://instagram.com/amour',
  facebookUrl: 'https://facebook.com/amour',
  tiktokUrl: '',
  youtubeUrl: '',
  storeAddress: 'Av. Brigadeiro Faria Lima, 2232 - São Paulo, SP',

  footerText: '© 2024 Amour & Co. Todos os direitos reservados. CNPJ: 00.000.000/0001-00',
  shippingBarText: 'Frete Grátis para todo o Brasil',
  minFreeShippingValue: 290,

  popupText: 'Receba 10% de desconto na primeira compra!',
  popupCoupon: 'BEMVINDO10',

  metaPixel: '',
  googleTagManager: '',
  googleAnalytics: '',
  tiktokPixel: '',
};
