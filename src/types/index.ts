export interface ProductVariation {
  id: string;
  type: 'tamanho' | 'cor' | 'modelo' | 'fragrancia' | 'embalagem';
  name: string;
  priceAddition: number;
  stock: number;
  sku: string;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  images: string[];
  video?: string;
  category: string;
  gender: 'masculino' | 'feminino' | 'unissex';
  tags: string[]; // e.g. 'namorados', 'mais-vendido', 'novidades', 'promocao'
  stock: number;
  rating: number;
  reviewsCount: number;
  features: string[]; // Itens que compõem o kit ou características
  details: string; // Descrição longa do produto
  sizes?: string[]; // Tamanhos disponíveis (ex: P, M, G, GG)
  status?: 'rascunho' | 'publicado' | 'arquivado';
  featured?: boolean;
  campaign?: string; // id da campanha
  slug?: string;
  sku?: string;
  seoTitle?: string;
  seoDescription?: string;
  colors?: string[]; // Variações de cor
  models?: string[]; // Variações de modelo
  variations?: ProductVariation[];
  minStock?: number;
  allowOutOfStockSale?: boolean;
  canonicalUrl?: string;
  keyword?: string;
  indexing?: 'index' | 'noindex';
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedVariations?: Record<string, string>;
}

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  shippingMethod: string;
  shippingPrice: number;
  paymentMethod: 'pix' | 'card' | 'boleto' | 'crypto';
  couponCode?: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize?: string;
    image: string;
  }[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered';
  trackingCode?: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  status: 'captured' | 'recovered' | 'purchased';
  cartItems: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    selectedSize?: string;
  }[];
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number; // Ex: 10 para 10% ou R$10
  minPurchaseValue: number;
  expiresAt: string;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number;
  comment: string;
  photos: string[];
  verifiedPurchase: boolean;
  approved: boolean;
  createdAt: string;
}

export type CampaignType = 'namorados' | 'maes' | 'pais' | 'natal' | 'blackfriday' | 'aniversarios';

export interface Campaign {
  id: CampaignType;
  name: string;
  emoji: string;
  headline: string;
  subheadline: string;
  bgGradient: string; // Tailwind gradient class
  primaryColor: string; // Tailwind text/bg color class
  accentColor: string; // Tailwind text/bg accent color class
  badgeText: string;
}
