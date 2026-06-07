import { Product, Order, Lead, Coupon, Review } from '../types';

// Mock inicial de Produtos Premium
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
    sizes: ['P', 'M', 'G', 'GG']
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
    details: 'Uma peça de arte para o pulso. O Chronographe Imperial une funcionalidade de cronometragem ativa com design inspirado na relojoaria suíça. Sua pulseira em aço 316L escovado garante durabilidade e conforto no dia a dia, sendo perfeito tanto para o ambiente corporativo quanto para eventos sociais sofisticados.'
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
    details: 'Aurum Gold Parfum é uma fragrância intrigante desenvolvida pelos perfumistas mais renomados. Suas notas abrem com a refrescância da bergamota misturada ao calor do cardamomo, evoluindo para um corpo elegante de cedro e lavanda, terminando no poder sedutor do âmbar negro e sândalo. Ideal para noites de gala e encontros especiais.'
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
    details: 'Uma carteira moderna para quem não quer volumes desnecessários no bolso. Costurada à mão com linha encerada ultra resistente, ela conta com bloqueio magnético que evita a leitura não autorizada de cartões de aproximação. Acompanha uma elegante caixa de presente.'
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
    details: 'A Bolsa Éternelle é fabricada em couro Saffiano, uma textura clássica da alta moda que resiste a arranhões e umidade. Suas divisórias internas inteligentes permitem organizar celular, maquiagem e carteira com facilidade. As ferragens douradas banhadas a ouro 18k trazem um brilho extra de sofisticação ao design clássico.'
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
    sizes: ['P', 'M', 'G', 'GG']
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
    details: 'Diferente das flores comuns que murcham em poucos dias, este buquê preservado representa um sentimento perene. As rosas equatorianas de cor vermelha intensa passam por uma desidratação seguida de reidratação com glicerina e óleos naturais, mantendo sua textura macia e aparência de flor recém-colhida por anos. Exibidas sob uma cúpula de cristal protetora.'
  }
];

// Mock inicial de Cupons
const INITIAL_COUPONS: Coupon[] = [
  { code: 'NAMORADOS10', type: 'percentage', value: 10, minPurchaseValue: 150, expiresAt: '2026-12-31', active: true },
  { code: 'BEMVINDO50', type: 'fixed', value: 50, minPurchaseValue: 300, expiresAt: '2026-12-31', active: true },
  { code: 'VIP20', type: 'percentage', value: 20, minPurchaseValue: 500, expiresAt: '2026-12-31', active: true },
  { code: 'FRETEGRATIS', type: 'percentage', value: 0, minPurchaseValue: 200, expiresAt: '2026-12-31', active: true } // Tratado separadamente para abater o frete
];

// Mock inicial de Avaliações
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
  },
  {
    id: 'rev-3',
    productId: 'kit-momentos-dois',
    customerName: 'Beatriz Costa',
    rating: 4,
    comment: 'Comprei para comemorar nosso aniversário de namoro e adoramos! O espumante é excelente e a vela aromática deixa o quarto com um perfume maravilhoso de baunilha. Só acho que as taças poderiam ser um pouco maiores, mas são lindas.',
    photos: ['https://images.unsplash.com/photo-1543007630-9710e4a00a20?q=80&w=300&auto=format&fit=crop'],
    verifiedPurchase: true,
    approved: true,
    createdAt: '2026-05-28T20:15:00Z'
  },
  {
    id: 'rev-4',
    productId: 'relogio-chronographe',
    customerName: 'Carlos Eduardo',
    rating: 5,
    comment: 'Um relógio robusto e elegante. O cronógrafo funciona perfeitamente, o material escovado é impecável e tem um peso que demonstra a qualidade. Veio super bem embalado no estojo de couro. Recomendo muito!',
    photos: [],
    verifiedPurchase: true,
    approved: true,
    createdAt: '2026-06-01T09:45:00Z'
  }
];

// Mock inicial de Pedidos (para popular o Admin de início)
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
  },
  {
    id: 'AMR-6512',
    customerName: 'Fernanda Lima',
    customerEmail: 'fernanda.lima@email.com',
    customerPhone: '(21) 97123-4567',
    customerCpf: '987.654.321-11',
    cep: '22021-001',
    address: 'Avenida Atlântica',
    number: '500',
    neighborhood: 'Copacabana',
    city: 'Rio de Janeiro',
    state: 'RJ',
    shippingMethod: 'PAC (Econômico)',
    shippingPrice: 12.50,
    paymentMethod: 'card',
    items: [
      {
        productId: 'kit-momentos-dois',
        name: 'Kit Momentos a Dois Luxo',
        price: 299.90,
        quantity: 1,
        image: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop'
      }
    ],
    subtotal: 299.90,
    discount: 0,
    total: 312.40,
    status: 'shipped',
    trackingCode: 'QI876543210BR',
    createdAt: '2026-06-05T11:15:00Z'
  }
];

// Mock inicial de Leads
const INITIAL_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Juliana Ferreira',
    email: 'juliana.f@hotmail.com',
    phone: '(31) 98888-7777',
    createdAt: '2026-06-07T10:12:00Z',
    status: 'captured',
    cartItems: [
      { productId: 'bolsa-saffiano-eternelle', name: 'Bolsa Couro Saffiano Éternelle', price: 549.90, quantity: 1 }
    ]
  }
];

// Helper para ler/escrever do LocalStorage
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

// Inicializar banco local
export const initializeMockDB = () => {
  getStorageItem('amr_products', INITIAL_PRODUCTS);
  getStorageItem('amr_coupons', INITIAL_COUPONS);
  getStorageItem('amr_reviews', INITIAL_REVIEWS);
  getStorageItem('amr_orders', INITIAL_ORDERS);
  getStorageItem('amr_leads', INITIAL_LEADS);
};

// Funções da API
export const api = {
  // Produtos
  getProducts: async (): Promise<Product[]> => {
    initializeMockDB();
    return getStorageItem('amr_products', INITIAL_PRODUCTS);
  },

  getProductById: async (id: string): Promise<Product | null> => {
    const products = await api.getProducts();
    return products.find(p => p.id === id) || null;
  },

  saveProducts: async (products: Product[]): Promise<void> => {
    setStorageItem('amr_products', products);
  },

  // Cupons
  getCoupons: async (): Promise<Coupon[]> => {
    initializeMockDB();
    return getStorageItem('amr_coupons', INITIAL_COUPONS);
  },

  createCoupon: async (coupon: Coupon): Promise<Coupon> => {
    const coupons = await api.getCoupons();
    // Remover duplicados
    const newCoupons = coupons.filter(c => c.code !== coupon.code);
    newCoupons.push(coupon);
    setStorageItem('amr_coupons', newCoupons);
    return coupon;
  },

  deleteCoupon: async (code: string): Promise<void> => {
    const coupons = await api.getCoupons();
    const filtered = coupons.filter(c => c.code !== code);
    setStorageItem('amr_coupons', filtered);
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
    
    // Validar expiração (compara datas simples)
    const expDate = new Date(coupon.expiresAt);
    const today = new Date();
    if (expDate < today) {
      return { isValid: false, message: 'Este cupom expirou.' };
    }

    return { isValid: true, message: 'Cupom aplicado com sucesso!', coupon };
  },

  // Avaliações
  getReviews: async (productId?: string, onlyApproved = true): Promise<Review[]> => {
    initializeMockDB();
    const reviews = getStorageItem('amr_reviews', INITIAL_REVIEWS);
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
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    const newReview: Review = {
      ...review,
      id: `rev-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      approved: false // Inicialmente precisa de moderação pelo Admin
    };
    reviews.push(newReview);
    setStorageItem('amr_reviews', reviews);
    return newReview;
  },

  approveReview: async (reviewId: string): Promise<void> => {
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    const idx = reviews.findIndex(r => r.id === reviewId);
    if (idx !== -1) {
      reviews[idx].approved = true;
      setStorageItem('amr_reviews', reviews);
      
      // Opcional: Atualizar a média do produto
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
    const reviews = getStorageItem<Review[]>('amr_reviews', INITIAL_REVIEWS);
    const filtered = reviews.filter(r => r.id !== reviewId);
    setStorageItem('amr_reviews', filtered);
  },

  // Pedidos
  getOrders: async (): Promise<Order[]> => {
    initializeMockDB();
    const orders = getStorageItem('amr_orders', INITIAL_ORDERS);
    return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  createOrder: async (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
    const orders = getStorageItem<Order[]>('amr_orders', INITIAL_ORDERS);
    const newOrder: Order = {
      ...orderData,
      id: `AMR-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    orders.push(newOrder);
    setStorageItem('amr_orders', orders);

    // Abater do estoque dos produtos comprados
    const products = getStorageItem<Product[]>('amr_products', INITIAL_PRODUCTS);
    newOrder.items.forEach(item => {
      const idx = products.findIndex(p => p.id === item.productId);
      if (idx !== -1) {
        products[idx].stock = Math.max(0, products[idx].stock - item.quantity);
      }
    });
    setStorageItem('amr_products', products);

    // Se o cliente comprou, podemos remover o lead ou mudar o status dele
    const leads = getStorageItem<Lead[]>('amr_leads', INITIAL_LEADS);
    const leadIdx = leads.findIndex(l => l.email.toLowerCase() === orderData.customerEmail.toLowerCase());
    if (leadIdx !== -1) {
      leads[leadIdx].status = 'purchased';
      setStorageItem('amr_leads', leads);
    }

    return newOrder;
  },

  updateOrderStatus: async (orderId: string, status: Order['status'], trackingCode?: string): Promise<void> => {
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

  // Leads
  getLeads: async (): Promise<Lead[]> => {
    initializeMockDB();
    return getStorageItem('amr_leads', INITIAL_LEADS);
  },

  createLead: async (leadData: Omit<Lead, 'id' | 'createdAt' | 'status'>): Promise<Lead> => {
    const leads = getStorageItem<Lead[]>('amr_leads', INITIAL_LEADS);
    
    // Procurar por lead com o mesmo email para atualizar
    const idx = leads.findIndex(l => l.email.toLowerCase() === leadData.email.toLowerCase());
    
    if (idx !== -1) {
      // Atualiza o lead existente (mas se já for 'purchased', mantém se for novo carrinho abandonado)
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
      // Cria novo lead
      const newLead: Lead = {
        ...leadData,
        id: `lead-${Math.random().toString(36).substr(2, 9)}`,
        status: 'captured',
        createdAt: new Date().toISOString()
      };
      leads.push(newLead);
      setStorageItem('amr_leads', leads);
      return newLead;
    }
  },

  updateLeadStatus: async (leadId: string, status: Lead['status']): Promise<void> => {
    const leads = getStorageItem<Lead[]>('amr_leads', INITIAL_LEADS);
    const idx = leads.findIndex(l => l.id === leadId);
    if (idx !== -1) {
      leads[idx].status = status;
      setStorageItem('amr_leads', leads);
    }
  }
};
