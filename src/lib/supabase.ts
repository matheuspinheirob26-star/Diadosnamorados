import { createClient } from '@supabase/supabase-js';
import { Product, Order, Lead, Coupon, Review } from '../types';

// Carregar variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Inicializar cliente do Supabase
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;


// --- MOCK LOCALSTORAGE BACKUP (FALLBACK) ---
const INITIAL_PRODUCTS: Product[] = [

  {
    id: 'kit-namorados-premium',
    name: 'Kit Especial Dia dos Namorados Premium',
    description: 'A expressão definitiva de amor e sofisticação. Um kit exclusivo contendo itens de altíssima qualidade selecionados para surpreender com elegância.',
    price: 449.90,
    originalPrice: 599.90,
    images: ['/images/kit-namorados.png'],
    category: 'Kits Presenteáveis',
    gender: 'unissex',
    tags: ['namorados', 'mais-vendidos', 'romantico'],
    stock: 15,
    rating: 4.9,
    reviewsCount: 124,
    features: [
      'Camisa Premium em Algodão Egípcio Fio 80',
      'Carteira Slim em Couro Legítimo Saffiano',
      'Perfume Exclusivo Noir Intense (100ml)',
      'Cueca Boxer Premium em Modal Antialérgico',
      'Embalagem Especial de Luxo Laqueada com Fita de Cetim'
    ],
    details: 'Desenvolvido sob curadoria rigorosa, o Kit Especial Dia dos Namorados Premium é o presente ideal para quem valoriza os detalhes. A camisa de algodão egípcio oferece toque macio e caimento impecável. A carteira slim é compacta e possui proteção RFID contra clonagem de cartões. O perfume Noir Intense destaca-se por notas amadeiradas e marcantes de longa fixação. Tudo isso é envolto em uma caixa rígida de presente com acabamento laqueado, exalando exclusividade desde o primeiro toque.',
    sizes: ['P', 'M', 'G', 'GG'],
    status: 'publicado',
    featured: true,
    campaign: 'namorados',
    slug: 'kit-namorados-premium',
    sku: 'AMR-KIT_NAMORADOS_PREMIUM',
    seoTitle: 'Kit Especial Dia dos Namorados Premium | Amour & Co.',
    seoDescription: 'A expressão definitiva de amor e sofisticação. Adquira o kit exclusivo da Amour & Co. com frete grátis.',
    colors: ['Preto', 'Branco'],
    models: ['Padrão'],
    minStock: 5,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'kit namorados premium',
    indexing: 'index',
    variations: []
  },
  {
    id: 'kit-momentos-dois',
    name: 'Kit Momentos a Dois Luxo',
    description: 'Uma noite inesquecível em formato de presente. Perfeito para celebrar momentos íntimos com muito romance e sofisticação.',
    price: 299.90,
    originalPrice: 399.90,
    images: ['https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop'],
    category: 'Romântico',
    gender: 'unissex',
    tags: ['romantico', 'kits-presenteaveis'],
    stock: 24,
    rating: 4.8,
    reviewsCount: 88,
    features: [
      'Espumante Premium Brut (750ml)',
      'Duas Taças de Cristal Bohemia Lapidadas à Mão',
      'Caixa de Chocolates Trufados Belgas (16 un)',
      'Vela Aromática de Baunilha & Âmbar em Copo de Vidro',
      'Caixa Organizadora Preta com Laço de Cetim'
    ],
    details: 'O Kit Momentos a Dois traz o cenário perfeito para uma noite especial. O espumante brut gelado harmoniza perfeitamente com os chocolates trufados finos de receita belga. As taças de cristal trazem brilho e elegância ao brinde, enquanto a vela aromática de âmbar cria uma atmosfera acolhedora e intensamente romântica.',
    status: 'publicado',
    featured: false,
    campaign: 'namorados',
    slug: 'kit-momentos-dois',
    sku: 'AMR-KIT_MOMENTOS_DOIS',
    seoTitle: 'Kit Momentos a Dois Luxo | Amour & Co.',
    seoDescription: 'Celebre o amor com espumante, taças de cristal e chocolates finos belgas.',
    colors: ['Preto'],
    models: ['Padrão'],
    minStock: 5,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'kit momentos casal',
    indexing: 'index',
    variations: []
  },
  {
    id: 'relogio-chronographe',
    name: 'Relógio Chronographe Imperial',
    description: 'A precisão do tempo aliada ao luxo estético. Um acessório indispensável para homens de presença marcante.',
    price: 849.90,
    originalPrice: 1199.90,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop'],
    category: 'Masculino',
    gender: 'masculino',
    tags: ['masculino', 'mais-vendidos'],
    stock: 8,
    rating: 5.0,
    reviewsCount: 42,
    features: [
      'Maquinário Quartz Japonês Cronógrafo Ativo',
      'Pulseira em Aço Inoxidável 316L Escovado',
      'Resistente à Água 5ATM (50 metros)',
      'Vidro em Cristal Mineral Hardlex Anti-Risco',
      'Estojo de Apresentação em Couro Ecológico'
    ],
    details: 'Uma peça de arte para o pulso. O Chronographe Imperial une funcionalidade de cronometragem activa com design inspirado na relojoaria suíça. Sua pulseira em aço 316L escovado garante durabilidade e conforto no dia a dia, sendo perfeito tanto para o ambiente corporativo quanto para eventos sociais sofisticados.',
    status: 'publicado',
    featured: true,
    campaign: 'nenhuma',
    slug: 'relogio-chronographe',
    sku: 'AMR-RELOGIO_CHRONOGRAPHE',
    seoTitle: 'Relógio Chronographe Imperial | Amour & Co.',
    seoDescription: 'Cronógrafo ativo de quartzo japonês em aço inoxidável 316L escovado.',
    colors: ['Prata', 'Dourado'],
    models: ['Imperial'],
    minStock: 3,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'relogio masculino luxo',
    indexing: 'index',
    variations: []
  },
  {
    id: 'perfume-aurum-gold',
    name: 'Perfume Aurum Gold Parfum',
    description: 'Uma fragrância fascinante e misteriosa. Cria um rastro magnético impossível de ignorar.',
    price: 379.90,
    originalPrice: 499.90,
    images: ['https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop'],
    category: 'Masculino',
    gender: 'masculino',
    tags: ['masculino', 'promocoes'],
    stock: 32,
    rating: 4.7,
    reviewsCount: 95,
    features: [
      'Família Olfativa: Amadeirado Especiado Amber',
      'Notas de Cabeça: Cardamomo, Bergamota e Hortelã',
      'Notas de Coração: Cedro da Virgínia e Lavanda',
      'Notas de Base: Âmbar Negro, Patchouli e Sândalo',
      'Concentração Eau de Parfum com Fixação de até 12 horas'
    ],
    details: 'Aurum Gold Parfum é uma fragrância intrigante desenvolvida pelos perfumistas mais renomados. Suas notas abrem com a refrescância da bergamota misturada ao calor do cardamomo, evoluindo para um corpo elegante de cedro e lavanda, terminando no poder sedutor do âmbar negro e sândalo. Ideal para noites de gala e encontros especiais.',
    status: 'publicado',
    featured: false,
    campaign: 'nenhuma',
    slug: 'perfume-aurum-gold',
    sku: 'AMR-PERFUME_AURUM_GOLD',
    seoTitle: 'Perfume Aurum Gold Parfum | Amour & Co.',
    seoDescription: 'Fragrância exclusiva masculina Eau de Parfum com fixação de até 12h.',
    colors: ['Gold'],
    models: ['100ml'],
    minStock: 5,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'perfume masculino importado',
    indexing: 'index',
    variations: []
  },
  {
    id: 'carteira-premium-couro',
    name: 'Carteira Premium Couro Legítimo',
    description: 'O equilíbrio perfeito entre tamanho slim e capacidade. Proteja seus pertences com o melhor acabamento.',
    price: 129.90,
    originalPrice: 199.90,
    images: ['https://images.unsplash.com/photo-1627124765135-56a290d2940b?q=80&w=600&auto=format&fit=crop'],
    category: 'Masculino',
    gender: 'masculino',
    tags: ['masculino', 'promocoes'],
    stock: 50,
    rating: 4.8,
    reviewsCount: 156,
    features: [
      '100% Couro Bovino Legítimo Texturizado',
      'Tecnologia de Proteção RFID Anti-Clonagem',
      'Compartimento Slim para CNH e até 6 Cartões',
      'Porta Cédulas Otimizado de Acesso Rápido',
      'Embalagem Rígida Premium de Presente'
    ],
    details: 'Uma carteira moderna para quem não quer volumes desnecessários no bolso. Costurada à mão com linha encerada ultra resistente, ela conta com bloqueio magnético que evita a leitura não autorizada de cartões de aproximação. Acompanha uma elegante caixa de presente.',
    status: 'publicado',
    featured: false,
    campaign: 'nenhuma',
    slug: 'carteira-premium-couro',
    sku: 'AMR-CARTEIRA_PREMIUM_COURO',
    seoTitle: 'Carteira Premium Couro Legítimo | Amour & Co.',
    seoDescription: 'Carteira compacta com bloqueio RFID e fabricação 100% em couro bovino legítimo.',
    colors: ['Preto', 'Café'],
    models: ['Saffiano'],
    minStock: 5,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'carteira de couro slim',
    indexing: 'index',
    variations: []
  },
  {
    id: 'bolsa-saffiano-eternelle',
    name: 'Bolsa Couro Saffiano Éternelle',
    description: 'Um ícone de elegância e funcionalidade. Projetada para a mulher sofisticada que precisa de espaço sem perder o estilo.',
    price: 549.90,
    originalPrice: 799.90,
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop'],
    category: 'Feminino',
    gender: 'feminino',
    tags: ['feminino', 'mais-vendidos'],
    stock: 6,
    rating: 4.9,
    reviewsCount: 57,
    features: [
      'Couro Saffiano Autêntico Impermeável e Anti-Risco',
      'Ferragens Especiais com Banho Duplo de Ouro 18k',
      'Forro Interno em Jacquard Acetinado Vermelho',
      'Alça de Ombro Removível e Ajustável',
      'Acompanha Dust Bag protetora de Algodão Orgânico'
    ],
    details: 'A Bolsa Éternelle é fabricada em couro Saffiano, uma textura clássica da alta moda que resiste a arranhões e umidade. Suas divisórias internas inteligentes permitem organizar celular, maquiagem e carteira com facilidade. As ferragens douradas banhadas a ouro 18k trazem um brilho extra de sofisticação ao design clássico.',
    status: 'publicado',
    featured: true,
    campaign: 'nenhuma',
    slug: 'bolsa-saffiano-eternelle',
    sku: 'AMR-BOLSA_SAFFIANO_ETERNELLE',
    seoTitle: 'Bolsa Couro Saffiano Éternelle | Amour & Co.',
    seoDescription: 'Bolsa de luxo em couro Saffiano impermeável com ferragens banhadas a ouro 18k.',
    colors: ['Preto', 'Nude', 'Vermelho'],
    models: ['Média'],
    minStock: 2,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'bolsa de luxo saffiano',
    indexing: 'index',
    variations: []
  },
  {
    id: 'pijama-silk-touch',
    name: 'Kit Pijama Silk Touch Casal',
    description: 'Descanse com o máximo conforto e requinte. Toque de seda super suave para noites tranquilas e elegantes.',
    price: 349.90,
    originalPrice: 479.90,
    images: ['https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600&auto=format&fit=crop'],
    category: 'Feminino',
    gender: 'unissex',
    tags: ['feminino', 'romantico', 'novidades'],
    stock: 12,
    rating: 4.6,
    reviewsCount: 39,
    features: [
      'Tecido Cetim Silk Touch Premium (Poliéster e Elastano)',
      'Contém 2 Conjuntos Completos (Masculino e Feminino)',
      'Corte Confortável com Vivo Contrastante Elegante',
      'Fechamento Frontal por Botões Personalizados da Marca',
      'Caixa Rígida Aromática de Apresentação'
    ],
    details: 'O Kit Pijama Silk Touch proporciona noites de puro deleite. O cetim com elastano adapta-se perfeitamente aos movimentos do corpo sem prender, oferecendo regulação térmica excelente. A caixa perfumada e o cartão de presente tornam esta opção o presente de luxo ideal para casais celebrando bodas ou datas especiais.',
    sizes: ['P', 'M', 'G', 'GG'],
    status: 'publicado',
    featured: false,
    campaign: 'namorados',
    slug: 'pijama-silk-touch',
    sku: 'AMR-PIJAMA_SILK_TOUCH',
    seoTitle: 'Kit Pijama Silk Touch Casal | Amour & Co.',
    seoDescription: 'Pijamas de cetim Silk Touch para noites refinadas de sono e descanso.',
    colors: ['Azul Marinho', 'Bordô'],
    models: ['Conjunto Casal'],
    minStock: 4,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'pijama cetim casal',
    indexing: 'index',
    variations: []
  },
  {
    id: 'buque-rosas-preservadas',
    name: 'Buquê de Rosas Vermelhas Preservadas',
    description: 'Rosas naturais tratadas com processo tecnológico avançado para durarem anos. Um símbolo eterno do seu afeto.',
    price: 219.90,
    originalPrice: 299.90,
    images: ['https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop'],
    category: 'Romântico',
    gender: 'feminino',
    tags: ['romantico', 'novidades'],
    stock: 18,
    rating: 4.9,
    reviewsCount: 71,
    features: [
      '12 Rosas Vermelhas Naturais Equatorianas Importadas',
      'Tratamento Químico de Conservação Ecológica (Dura até 3 anos)',
      'Cúpula Protetora de Vidro com Base em Madeira Nobre',
      'Sem Necessidade de Rega ou Luz Solar',
      'Embalagem com Fita de Veludo e Cartão Dedicatório'
    ],
    details: 'Diferente das flores comuns que murcham in poucos dias, este buquê preservado representa um sentimento perene. Rosas equatorianas de cor vermelha intensa passam por desidratação e reidratação com glicerina e óleos naturais, mantendo textura macia de flor recém-colhida por anos. Exibidas sob cúpula protetora.',
    sizes: [''],
    status: 'publicado',
    featured: false,
    campaign: 'namorados',
    slug: 'buque-rosas-preservadas',
    sku: 'AMR-ROSAS_PRESERVADAS',
    seoTitle: 'Buquê de Rosas Vermelhas Preservadas | Amour & Co.',
    seoDescription: 'Rosas equatorianas naturais preservadas in cúpula de vidro. Durabilidade de até 3 anos.',
    colors: ['Vermelho'],
    models: ['Cúpula Média'],
    minStock: 3,
    allowOutOfStockSale: false,
    canonicalUrl: '',
    keyword: 'buque de rosas vermelhas',
    indexing: 'index',
    variations: []
  }
];

const INITIAL_COUPONS: Coupon[] = [
  { code: 'NAMORADOS10', type: 'percentage', value: 10, minPurchaseValue: 150, expiresAt: '2026-12-31', active: true },
  { code: 'BEMVINDO50', type: 'fixed', value: 50, minPurchaseValue: 300, expiresAt: '2026-12-31', active: true },
  { code: 'VIP20', type: 'percentage', value: 20, minPurchaseValue: 500, expiresAt: '2026-12-31', active: true },
  { code: 'FRETEGRATIS', type: 'percentage', value: 0, minPurchaseValue: 200, expiresAt: '2026-12-31', active: true }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    productId: 'kit-namorados-premium',
    customerName: 'Mariana Silva',
    rating: 5,
    comment: 'O kit superou todas as minhas expectativas! A caixa de madeira laqueada é linda demais e o perfume Noir Intense tem uma fixação absurda, meu marido amou! A camisa vestiu perfeitamente. Vale cada centavo pela sofisticação.',
    photos: ['https://images.unsplash.com/photo-1513201099705-a9746e1e201f?q=80&w=300&auto=format&fit=crop'],
    verifiedPurchase: true,
    approved: true,
    createdAt: '2026-06-02T14:23:00Z'
  },
  {
    id: 'rev-2',
    productId: 'kit-namorados-premium',
    customerName: 'Guilherme Santos',
    rating: 5,
    comment: 'Sensacional! Chegou super rápido aqui em São Paulo. O acabamento dos itens é de marca de luxo mesmo, a carteira em couro legítimo é muito compacta e elegante. O perfume é muito cheiroso, excelente custo-benefício para dar de presente.',
    photos: [],
    verifiedPurchase: true,
    approved: true,
    createdAt: '2026-06-03T18:10:00Z'
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: 'AMR-7281',
    customerName: 'Lucas Oliveira',
    customerEmail: 'lucas.oliveira@email.com',
    customerPhone: '(11) 98765-4321',
    customerCpf: '123.456.789-00',
    cep: '01311-000',
    address: 'Avenida Paulista',
    number: '1000',
    complement: 'Apto 152',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    shippingMethod: 'Sedex (Expresso)',
    shippingPrice: 19.90,
    paymentMethod: 'pix',
    couponCode: 'NAMORADOS10',
    items: [
      {
        productId: 'kit-namorados-premium',
        name: 'Kit Especial Dia dos Namorados Premium',
        price: 449.90,
        quantity: 1,
        selectedSize: 'M',
        image: '/images/kit-namorados.png'
      }
    ],
    subtotal: 449.90,
    discount: 44.99,
    total: 424.81,
    status: 'paid',
    createdAt: '2026-06-06T15:30:00Z'
  }
];

const INITIAL_LEADS: Lead[] = [];

const getStorageItem = <T>(key: string, defaultValue: T): T => {
  const item = localStorage.getItem(key);
  if (!item) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
};

const setStorageItem = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const initializeMockDB = () => {
  getStorageItem('amr_products', INITIAL_PRODUCTS);
  getStorageItem('amr_coupons', INITIAL_COUPONS);
  getStorageItem('amr_reviews', INITIAL_REVIEWS);
  getStorageItem('amr_orders', INITIAL_ORDERS);
  getStorageItem('amr_leads', INITIAL_LEADS);
};

// --- API HÍBRIDA (SUPABASE COM FALLBACK LOCAL) ---
export const api = {
  // 1. PRODUTOS
  getProducts: async (): Promise<Product[]> => {
    initializeMockDB();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: Number(p.price),
            originalPrice: Number(p.original_price || p.price),
            images: p.images || [],
            video: p.video || undefined,
            category: p.category || '',
            gender: (p.gender as any) || 'unissex',
            tags: p.tags || [],
            stock: p.stock || 0,
            rating: Number(p.rating || 5.0),
            reviewsCount: p.reviews_count || 0,
            features: p.features || [],
            details: p.details || '',
            sizes: p.sizes || [],
            status: (p.status as any) || 'publicado',
            featured: p.featured || false,
            campaign: p.campaign || 'nenhuma',
            slug: p.slug || p.id,
            sku: p.sku || `SKU-${p.id.toUpperCase()}`,
            seoTitle: p.seo_title || p.name,
            seoDescription: p.seo_description || p.description || '',
            colors: p.colors || [],
            models: p.models || [],
            variations: p.variations ? (typeof p.variations === 'string' ? JSON.parse(p.variations) : p.variations) : [],
            minStock: p.min_stock !== undefined ? p.min_stock : 5,
            allowOutOfStockSale: p.allow_out_of_stock_sale !== undefined ? p.allow_out_of_stock_sale : false,
            canonicalUrl: p.canonical_url || '',
            keyword: p.keyword || '',
            indexing: p.indexing || 'index'
          }));
        }
      } catch (err) {
        console.warn('Supabase getProducts falhou, usando mock local:', err);
      }
    }
    return getStorageItem('amr_products', INITIAL_PRODUCTS);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
        if (error) throw error;
        if (data) {
          return {
            id: data.id,
            name: data.name,
            description: data.description || '',
            price: Number(data.price),
            originalPrice: Number(data.original_price || data.price),
            images: data.images || [],
            video: data.video || undefined,
            category: data.category || '',
            gender: (data.gender as any) || 'unissex',
            tags: data.tags || [],
            stock: data.stock || 0,
            rating: Number(data.rating || 5.0),
            reviewsCount: data.reviews_count || 0,
            features: data.features || [],
            details: data.details || '',
            sizes: data.sizes || [],
            status: (data.status as any) || 'publicado',
            featured: data.featured || false,
            campaign: data.campaign || 'nenhuma',
            slug: data.slug || data.id,
            sku: data.sku || `SKU-${data.id.toUpperCase()}`,
            seoTitle: data.seo_title || data.name,
            seoDescription: data.seo_description || data.description || '',
            colors: data.colors || [],
            models: data.models || [],
            variations: data.variations ? (typeof data.variations === 'string' ? JSON.parse(data.variations) : data.variations) : [],
            minStock: data.min_stock !== undefined ? data.min_stock : 5,
            allowOutOfStockSale: data.allow_out_of_stock_sale !== undefined ? data.allow_out_of_stock_sale : false,
            canonicalUrl: data.canonical_url || '',
            keyword: data.keyword || '',
            indexing: data.indexing || 'index'
          };
        }
      } catch (err) {
        console.warn(`Supabase getProductById (${id}) falhou, usando mock local:`, err);
      }
    }
    const products = await api.getProducts();
    return products.find(p => p.id === id) || null;
  },

  createProduct: async (product: Product): Promise<Product> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').insert({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          original_price: product.originalPrice,
          images: product.images,
          video: product.video || null,
          category: product.category,
          gender: product.gender,
          tags: product.tags,
          stock: product.stock,
          rating: product.rating || 5.0,
          reviews_count: product.reviewsCount || 0,
          features: product.features,
          details: product.details,
          sizes: product.sizes || [],
          status: product.status || 'publicado',
          featured: product.featured || false,
          campaign: product.campaign || 'nenhuma',
          slug: product.slug || product.id,
          sku: product.sku || `SKU-${product.id.toUpperCase()}`,
          seo_title: product.seoTitle || product.name,
          seo_description: product.seoDescription || product.description,
          colors: product.colors || [],
          models: product.models || [],
          variations: JSON.stringify(product.variations || []),
          min_stock: product.minStock !== undefined ? product.minStock : 5,
          allow_out_of_stock_sale: product.allowOutOfStockSale || false,
          canonical_url: product.canonicalUrl || '',
          keyword: product.keyword || '',
          indexing: product.indexing || 'index'
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase createProduct falhou, usando mock local:', err);
      }
    }
    const products = getStorageItem<Product[]>('amr_products', INITIAL_PRODUCTS);
    products.push(product);
    setStorageItem('amr_products', products);
    window.dispatchEvent(new Event('productsUpdated'));
    return product;
  },

  updateProduct: async (product: Product): Promise<Product> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').update({
          name: product.name,
          description: product.description,
          price: product.price,
          original_price: product.originalPrice,
          images: product.images,
          video: product.video || null,
          category: product.category,
          gender: product.gender,
          tags: product.tags,
          stock: product.stock,
          features: product.features,
          details: product.details,
          sizes: product.sizes || [],
          status: product.status || 'publicado',
          featured: product.featured || false,
          campaign: product.campaign || 'nenhuma',
          slug: product.slug || product.id,
          sku: product.sku || `SKU-${product.id.toUpperCase()}`,
          seo_title: product.seoTitle || product.name,
          seo_description: product.seoDescription || product.description,
          colors: product.colors || [],
          models: product.models || [],
          variations: JSON.stringify(product.variations || []),
          min_stock: product.minStock !== undefined ? product.minStock : 5,
          allow_out_of_stock_sale: product.allowOutOfStockSale || false,
          canonical_url: product.canonicalUrl || '',
          keyword: product.keyword || '',
          indexing: product.indexing || 'index'
        }).eq('id', product.id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase updateProduct falhou, usando mock local:', err);
      }
    }
    const products = getStorageItem<Product[]>('amr_products', INITIAL_PRODUCTS);
    const idx = products.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      products[idx] = product;
      setStorageItem('amr_products', products);
      window.dispatchEvent(new Event('productsUpdated'));
    }
    return product;
  },

  uploadProductImage: async (file: File, pathName: string): Promise<string> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(pathName, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(pathName);

        return publicUrl;
      } catch (err) {
        console.warn('Supabase Storage upload falhou, usando base64 fallback:', err);
      }
    }
    // Fallback para base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  uploadImage: async (file: File, bucket: string, pathName: string): Promise<string> => {
    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(pathName, file, { cacheControl: '3600', upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(pathName);

        return publicUrl;
      } catch (err) {
        console.warn('Supabase Storage upload falhou, usando base64 fallback:', err);
      }
    }
    // Fallback para base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  deleteProduct: async (id: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteProduct falhou, usando mock local:', err);
      }
    }
    const products = getStorageItem<Product[]>('amr_products', INITIAL_PRODUCTS);
    setStorageItem('amr_products', products.filter(p => p.id !== id));
  },

  // 2. CUPONS
  getCoupons: async (): Promise<Coupon[]> => {
    initializeMockDB();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('coupons').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(c => ({
            code: c.code,
            type: c.type as any,
            value: Number(c.value),
            minPurchaseValue: Number(c.min_purchase_value),
            expiresAt: c.expires_at,
            active: c.active
          }));
        }
      } catch (err) {
        console.warn('Supabase getCoupons falhou, usando mock local:', err);
      }
    }
    return getStorageItem('amr_coupons', INITIAL_COUPONS);
  },

  createCoupon: async (coupon: Coupon): Promise<Coupon> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('coupons').upsert({
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          min_purchase_value: coupon.minPurchaseValue,
          expires_at: coupon.expiresAt,
          active: coupon.active
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase createCoupon falhou, usando mock local:', err);
      }
    }
    // Escrever no LocalStorage
    const coupons = await api.getCoupons();
    const filtered = coupons.filter(c => c.code !== coupon.code);
    filtered.push(coupon);
    setStorageItem('amr_coupons', filtered);
    return coupon;
  },

  deleteCoupon: async (code: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('coupons').delete().eq('code', code);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteCoupon falhou, usando mock local:', err);
      }
    }
    const coupons = await api.getCoupons();
    setStorageItem('amr_coupons', coupons.filter(c => c.code !== code));
  },

  validateCoupon: async (code: string, purchaseValue: number): Promise<{ isValid: boolean; message: string; coupon?: Coupon }> => {
    const coupons = await api.getCoupons();
    const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
    
    if (!coupon) {
      return { isValid: false, message: 'Cupom inválido ou não encontrado.' };
    }
    if (!coupon.active) {
      return { isValid: false, message: 'Este cupom não está mais ativo.' };
    }
    if (purchaseValue < coupon.minPurchaseValue) {
      return { isValid: false, message: `Compra mínima para este cupom é R$ ${coupon.minPurchaseValue.toFixed(2)}.` };
    }
    
    const expDate = new Date(coupon.expiresAt);
    const today = new Date();
    if (expDate < today) {
      return { isValid: false, message: 'Este cupom expirou.' };
    }

    return { isValid: true, message: 'Cupom aplicado com sucesso!', coupon };
  },

  // 3. AVALIAÇÕES (REVIEWS)
  getReviews: async (productId?: string, onlyApproved = true): Promise<Review[]> => {
    initializeMockDB();
    if (supabase) {
      try {
        let query = supabase.from('reviews').select('*');
        if (productId) query = query.eq('product_id', productId);
        if (onlyApproved) query = query.eq('approved', true);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          return data.map(r => ({
            id: r.id,
            productId: r.product_id,
            customerName: r.customer_name,
            rating: r.rating,
            comment: r.comment,
            photos: r.photos,
            verifiedPurchase: r.verified_purchase,
            approved: r.approved,
            createdAt: r.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase getReviews falhou, usando mock local:', err);
      }
    }
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    let filtered = reviews;
    if (productId) {
      filtered = filtered.filter(r => r.productId === productId);
    }
    if (onlyApproved) {
      filtered = filtered.filter(r => r.approved);
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createReview: async (review: Omit<Review, 'id' | 'createdAt' | 'approved'>): Promise<Review> => {
    const newReview: Review = {
      ...review,
      id: `rev-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      approved: false
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('reviews').insert({
          id: newReview.id,
          product_id: newReview.productId,
          customer_name: newReview.customerName,
          rating: newReview.rating,
          comment: newReview.comment,
          photos: newReview.photos,
          verified_purchase: newReview.verifiedPurchase,
          approved: newReview.approved,
          created_at: newReview.createdAt
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase createReview falhou, usando mock local:', err);
      }
    }
    
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    reviews.push(newReview);
    setStorageItem('amr_reviews', reviews);
    return newReview;
  },

  approveReview: async (reviewId: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('reviews').update({ approved: true }).eq('id', reviewId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase approveReview falhou, usando mock local:', err);
      }
    }

    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    const idx = reviews.findIndex(r => r.id === reviewId);
    if (idx !== -1) {
      reviews[idx].approved = true;
      setStorageItem('amr_reviews', reviews);
      
      const products = getStorageItem<Product[]>('amr_products', INITIAL_PRODUCTS);
      const prodId = reviews[idx].productId;
      const prodIdx = products.findIndex(p => p.id === prodId);
      if (prodIdx !== -1) {
        const prodReviews = reviews.filter(r => r.productId === prodId && r.approved);
        const avgRating = prodReviews.reduce((acc, curr) => acc + curr.rating, 0) / prodReviews.length;
        products[prodIdx].rating = Number(avgRating.toFixed(1)) || 5.0;
        products[prodIdx].reviewsCount = prodReviews.length;
        setStorageItem('amr_products', products);
      }
    }
  },

  deleteReview: async (reviewId: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase deleteReview falhou, usando mock local:', err);
      }
    }
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    setStorageItem('amr_reviews', reviews.filter(r => r.id !== reviewId));
  },

  // 4. PEDIDOS (ORDERS)
  getOrders: async (): Promise<Order[]> => {
    initializeMockDB();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          return data.map(o => ({
            id: o.id,
            customerName: o.customer_name,
            customerEmail: o.customer_email,
            customerPhone: o.customer_phone,
            customerCpf: o.customer_cpf,
            cep: o.cep,
            address: o.address,
            number: o.number,
            complement: o.complement || undefined,
            neighborhood: o.neighborhood,
            city: o.city,
            state: o.state,
            shippingMethod: o.shipping_method,
            shippingPrice: Number(o.shipping_price),
            paymentMethod: o.payment_method as any,
            couponCode: o.coupon_code || undefined,
            items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
            subtotal: Number(o.subtotal),
            discount: Number(o.discount),
            total: Number(o.total),
            status: o.status as any,
            trackingCode: o.tracking_code || undefined,
            createdAt: o.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase getOrders falhou, usando mock local:', err);
      }
    }
    const orders = getStorageItem<Order[]>('amr_orders', INITIAL_ORDERS);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
    const newOrder: Order = {
      ...orderData,
      id: `AMR-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { error } = await supabase.from('orders').insert({
          id: newOrder.id,
          customer_name: newOrder.customerName,
          customer_email: newOrder.customerEmail,
          customer_phone: newOrder.customerPhone,
          customer_cpf: newOrder.customerCpf,
          cep: newOrder.cep,
          address: newOrder.address,
          number: newOrder.number,
          complement: newOrder.complement || null,
          neighborhood: newOrder.neighborhood,
          city: newOrder.city,
          state: newOrder.state,
          shipping_method: newOrder.shippingMethod,
          shipping_price: newOrder.shippingPrice,
          payment_method: newOrder.paymentMethod,
          coupon_code: newOrder.couponCode || null,
          items: newOrder.items,
          subtotal: newOrder.subtotal,
          discount: newOrder.discount,
          total: newOrder.total,
          status: newOrder.status,
          tracking_code: newOrder.trackingCode || null,
          created_at: newOrder.createdAt
        });
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase createOrder falhou, usando mock local:', err);
      }
    }

    const orders = getStorageItem<Order[]>('amr_orders', INITIAL_ORDERS);
    orders.push(newOrder);
    setStorageItem('amr_orders', orders);
    return newOrder;
  },

  updateOrderStatus: async (orderId: string, status: Order['status'], trackingCode?: string): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('orders').update({
          status,
          tracking_code: trackingCode || null
        }).eq('id', orderId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase updateOrderStatus falhou, usando mock local:', err);
      }
    }

    const orders = getStorageItem<Order[]>('amr_orders', INITIAL_ORDERS);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = status;
      if (trackingCode !== undefined) {
        orders[idx].trackingCode = trackingCode;
      }
      setStorageItem('amr_orders', orders);
    }
  },

  // 5. LEADS
  getLeads: async (): Promise<Lead[]> => {
    initializeMockDB();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        if (data) {
          return data.map(l => ({
            id: l.id,
            name: l.name,
            email: l.email,
            phone: l.phone,
            status: l.status as any,
            cartItems: typeof l.cart_items === 'string' ? JSON.parse(l.cart_items) : l.cart_items,
            createdAt: l.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase getLeads falhou, usando mock local:', err);
      }
    }
    return getStorageItem('amr_leads', INITIAL_LEADS);
  },

  createLead: async (leadData: Omit<Lead, 'id' | 'createdAt' | 'status'>): Promise<Lead> => {
    const id = `lead-${Math.random().toString(36).substr(2, 9)}`;
    const createdAt = new Date().toISOString();

    if (supabase) {
      try {
        // Verificar se lead já existe
        const { data: existing } = await supabase.from('leads').select('id, status').eq('email', leadData.email).single();
        
        if (existing) {
          const { error } = await supabase.from('leads').update({
            name: leadData.name,
            phone: leadData.phone,
            cart_items: leadData.cartItems,
            status: existing.status === 'purchased' ? 'captured' : existing.status
          }).eq('id', existing.id);
          
          if (error) throw error;
          return {
            id: existing.id,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            status: existing.status === 'purchased' ? 'captured' : existing.status,
            cartItems: leadData.cartItems,
            createdAt
          };
        } else {
          const { error } = await supabase.from('leads').insert({
            id,
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            status: 'captured',
            cart_items: leadData.cartItems,
            created_at: createdAt
          });
          if (error) throw error;
        }
      } catch (err) {
        console.warn('Supabase createLead falhou, usando mock local:', err);
      }
    }

    // Escrita LocalStorage Fallback
    const leads = getStorageItem<Lead[]>('amr_leads', INITIAL_LEADS);
    const idx = leads.findIndex(l => l.email.toLowerCase() === leadData.email.toLowerCase());
    if (idx !== -1) {
      const currentStatus = leads[idx].status;
      leads[idx] = {
        ...leads[idx],
        name: leadData.name,
        phone: leadData.phone,
        cartItems: leadData.cartItems,
        status: currentStatus === 'purchased' ? 'captured' : currentStatus
      };
      setStorageItem('amr_leads', leads);
      return leads[idx];
    } else {
      const newLead: Lead = {
        ...leadData,
        id,
        status: 'captured',
        createdAt
      };
      leads.push(newLead);
      setStorageItem('amr_leads', leads);
      return newLead;
    }
  },

  updateLeadStatus: async (leadId: string, status: Lead['status']): Promise<void> => {
    if (supabase) {
      try {
        const { error } = await supabase.from('leads').update({ status }).eq('id', leadId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase updateLeadStatus falhou, usando mock local:', err);
      }
    }

    const leads = getStorageItem<Lead[]>('amr_leads', INITIAL_LEADS);
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx !== -1) {
      leads[idx].status = status;
      setStorageItem('amr_leads', leads);
    }
  }
};
