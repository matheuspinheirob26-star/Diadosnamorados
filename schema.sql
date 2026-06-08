-- SCHEMA DE BANCO DE DADOS - AMOUR & CO.
-- Copie e cole este script no Editor SQL (SQL Editor) do seu painel do Supabase para criar as tabelas e popular os dados iniciais.

-- 1. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    images TEXT[] NOT NULL,
    video TEXT,
    category TEXT,
    gender TEXT,
    tags TEXT[] DEFAULT '{}',
    stock INT DEFAULT 0,
    rating NUMERIC(3, 1) DEFAULT 5.0,
    reviews_count INT DEFAULT 0,
    features TEXT[] DEFAULT '{}',
    details TEXT,
    sizes TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE CUPONS
CREATE TABLE IF NOT EXISTS coupons (
    code TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- 'percentage' ou 'fixed'
    value NUMERIC(10, 2) NOT NULL,
    min_purchase_value NUMERIC(10, 2) DEFAULT 0,
    expires_at DATE NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE AVALIAÇÕES (REVIEWS)
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photos TEXT[] DEFAULT '{}',
    verified_purchase BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE PEDIDOS (ORDERS)
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_cpf TEXT NOT NULL,
    cep TEXT NOT NULL,
    address TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    shipping_method TEXT NOT NULL,
    shipping_price NUMERIC(10, 2) DEFAULT 0,
    payment_method TEXT NOT NULL,
    coupon_code TEXT,
    items JSONB NOT NULL, -- Array de itens comprados [{productId, name, price, quantity, selectedSize, image}]
    subtotal NUMERIC(10, 2) NOT NULL,
    discount NUMERIC(10, 2) DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'paid', 'processing', 'shipped', 'delivered'
    tracking_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE LEADS (CARRINHOS ABANDONADOS)
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'captured' NOT NULL, -- 'captured', 'recovered', 'purchased'
    cart_items JSONB NOT NULL, -- Array de itens [{productId, name, price, quantity, selectedSize}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. POPULAR DADOS INICIAIS (MOCK PREMIUM)

-- Limpar dados anteriores para evitar duplicações se rodar o script novamente
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE coupons CASCADE;

-- Inserir Produtos
INSERT INTO products (id, name, description, price, original_price, images, category, gender, tags, stock, rating, reviews_count, features, details, sizes)
VALUES 
(
  'kit-namorados-premium',
  'Kit Especial Dia dos Namorados Premium',
  'A expressão definitiva de amor e sofisticação. Um kit exclusivo contendo itens de altíssima qualidade selecionados para surpreender com elegância.',
  449.90,
  599.90,
  ARRAY['/images/kit-namorados.png'],
  'Kits Presenteáveis',
  'unissex',
  ARRAY['namorados', 'mais-vendidos', 'romantico'],
  15,
  4.9,
  124,
  ARRAY['Camisa Premium em Algodão Egípcio Fio 80', 'Carteira Slim em Couro Legítimo Saffiano', 'Perfume Exclusivo Noir Intense (100ml)', 'Cueca Boxer Premium em Modal Antialérgico', 'Embalagem Especial de Luxo Laqueada com Fita de Cetim'],
  'Desenvolvido sob curadoria rigorosa, o Kit Especial Dia dos Namorados Premium é o presente ideal para quem valoriza os detalhes. A camisa de algodão egípcio oferece toque macio e caimento impecável. A carteira slim é compacta e possui proteção RFID contra clonagem de cartões. O perfume Noir Intense destaca-se por notas amadeiradas e marcantes de longa fixação. Tudo isso é envolto em uma caixa rígida de presente com acabamento laqueado, exalando exclusividade desde o primeiro toque.',
  ARRAY['P', 'M', 'G', 'GG']
),
(
  'kit-momentos-dois',
  'Kit Momentos a Dois Luxo',
  'Uma noite inesquecível em formato de presente. Perfeito para celebrar momentos íntimos com muito romance e sofisticação.',
  299.90,
  399.90,
  ARRAY['https://images.unsplash.com/photo-1512909006721-3d6018887383?q=80&w=600&auto=format&fit=crop'],
  'Romântico',
  'unissex',
  ARRAY['romantico', 'kits-presenteaveis'],
  24,
  4.8,
  88,
  ARRAY['Espumante Premium Brut (750ml)', 'Duas Taças de Cristal Bohemia Lapidadas à Mão', 'Caixa de Chocolates Trufados Belgas (16 un)', 'Vela Aromática de Baunilha & Âmbar em Copo de Vidro', 'Caixa Organizadora Preta com Laço de Cetim'],
  'O Kit Momentos a Dois traz o cenário perfeito para uma noite especial. O espumante brut gelado harmoniza perfeitamente com os chocolates trufados finos de receita belga. As taças de cristal trazem brilho e elegância ao brinde, enquanto a vela aromática de âmbar cria uma atmosfera acolhedora e intensamente romântica.',
  ARRAY['']
),
(
  'relogio-chronographe',
  'Relógio Chronographe Imperial',
  'A precisão do tempo aliada ao luxo estético. Um acessório indispensável para homens de presença marcante.',
  849.90,
  1199.90,
  ARRAY['https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=600&auto=format&fit=crop'],
  'Masculino',
  'masculino',
  ARRAY['masculino', 'mais-vendidos'],
  8,
  5.0,
  42,
  ARRAY['Maquinário Quartz Japonês Cronógrafo Ativo', 'Pulseira em Aço Inoxidável 316L Escovado', 'Resistente à Água 5ATM (50 metros)', 'Vidro em Cristal Mineral Hardlex Anti-Risco', 'Estojo de Apresentação em Couro Ecológico'],
  'Uma peça de arte para o pulso. O Chronographe Imperial une funcionalidade de cronometragem ativa com design inspirado na relojoaria suíça. Sua pulseira em aço 316L escovado garante durabilidade e conforto no dia a dia, sendo perfeito tanto para o ambiente corporativo quanto para eventos sociais sofisticados.',
  ARRAY['']
),
(
  'perfume-aurum-gold',
  'Perfume Aurum Gold Parfum',
  'Uma fragrância fascinante e misteriosa. Cria um rastro magnético impossível de ignorar.',
  379.90,
  499.90,
  ARRAY['https://images.unsplash.com/photo-1541643600914-78b084683601?q=80&w=600&auto=format&fit=crop'],
  'Masculino',
  'masculino',
  ARRAY['masculino', 'promocoes'],
  32,
  4.7,
  95,
  ARRAY['Família Olfativa: Amadeirado Especiado Amber', 'Notas de Cabeça: Cardamomo, Bergamota e Hortelã', 'Notas de Coração: Cedro da Virgínia e Lavanda', 'Notas de Base: Âmbar Negro, Patchouli e Sândalo', 'Concentração Eau de Parfum com Fixação de até 12 horas'],
  'Aurum Gold Parfum é uma fragrância intrigante desenvolvida pelos perfumistas mais renomados. Suas notas abrem com a refrescância da bergamota misturada ao calor do cardamomo, evoluindo para um corpo elegante de cedro e lavanda, terminando no poder sedutor do âmbar negro e sândalo. Ideal para noites de gala e encontros especiais.',
  ARRAY['']
),
(
  'carteira-premium-couro',
  'Carteira Premium Couro Legítimo',
  'O equilíbrio perfeito entre tamanho slim e capacidade. Proteja seus pertences com o melhor acabamento.',
  129.90,
  199.90,
  ARRAY['https://images.unsplash.com/photo-1627124765135-56a290d2940b?q=80&w=600&auto=format&fit=crop'],
  'Masculino',
  'masculino',
  ARRAY['masculino', 'promocoes'],
  50,
  4.8,
  156,
  ARRAY['100% Couro Bovino Legítimo Texturizado', 'Tecnologia de Proteção RFID Anti-Clonagem', 'Compartimento Slim para CNH e até 6 Cartões', 'Porta Cédulas Otimizado de Acesso Rápido', 'Embalagem Rígida Premium de Presente'],
  'Uma carteira moderna para quem não quer volumes desnecessários no bolso. Costurada à mão com linha encerada ultra resistente, ela conta com bloqueio magnético que evita a leitura não autorizada de cartões de aproximação. Acompanha uma elegante caixa de presente.',
  ARRAY['']
),
(
  'bolsa-saffiano-eternelle',
  'Bolsa Couro Saffiano Éternelle',
  'Um ícone de elegância e funcionalidade. Projetada para a mulher sofisticada que precisa de espaço sem perder o estilo.',
  549.90,
  799.90,
  ARRAY['https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=600&auto=format&fit=crop'],
  'Feminino',
  'feminino',
  ARRAY['feminino', 'mais-vendidos'],
  6,
  4.9,
  57,
  ARRAY['Couro Saffiano Autêntico Impermeável e Anti-Risco', 'Ferragens Especiais com Banho Duplo de Ouro 18k', 'Forro Interno em Jacquard Acetinado Vermelho', 'Alça de Ombro Removível e Ajustável', 'Acompanha Dust Bag protetora de Algodão Orgânico'],
  'A Bolsa Éternelle é fabricada em couro Saffiano, uma textura clássica da alta moda que resiste a arranhões e umidade. Suas divisórias internas inteligentes permitem organizar celular, maquiagem e carteira com facilidade. As ferragens douradas banhadas a ouro 18k trazem um brilho extra de sofisticação ao design clássico.',
  ARRAY['']
),
(
  'pijama-silk-touch',
  'Kit Pijama Silk Touch Casal',
  'Descanse com o máximo conforto e requinte. Toque de seda super suave para noites tranquilas e elegantes.',
  349.90,
  479.90,
  ARRAY['https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=600&auto=format&fit=crop'],
  'Feminino',
  'unissex',
  ARRAY['feminino', 'romantico', 'novidades'],
  12,
  4.6,
  39,
  ARRAY['Tecido Cetim Silk Touch Premium (Poliéster e Elastano)', 'Contém 2 Conjuntos Completos (Masculino e Feminino)', 'Corte Confortável com Vivo Contrastante Elegante', 'Fechamento Frontal por Botões Personalizados da Marca', 'Caixa Rígida Aromática de Apresentação'],
  'O Kit Pijama Silk Touch proporciona noites de puro deleite. O cetim com elastano adapta-se perfeitamente aos movimentos do corpo sem prender, oferecendo regulação térmica excelente. A caixa perfumada e o cartão de presente tornam esta opção o presente de luxo ideal para casais celebrando bodas ou datas especiais.',
  ARRAY['P', 'M', 'G', 'GG']
),
(
  'buque-rosas-preservadas',
  'Buquê de Rosas Vermelhas Preservadas',
  'Rosas naturais tratadas com processo tecnológico avançado para durarem anos. Um símbolo eterno do seu afeto.',
  219.90,
  299.90,
  ARRAY['https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop'],
  'Romântico',
  'feminino',
  ARRAY['romantico', 'novidades'],
  18,
  4.9,
  71,
  ARRAY['12 Rosas Vermelhas Naturais Equatorianas Importadas', 'Tratamento Químico de Conservação Ecológica (Dura até 3 anos)', 'Cúpula Protetora de Vidro com Base em Madeira Nobre', 'Sem Necessidade de Rega ou Luz Solar', 'Embalagem com Fita de Veludo e Cartão Dedicatório'],
  'Diferente das flores comuns que murcham em poucos dias, este buquê preservado representa um sentimento perene. As rosas equatorianas de cor vermelha intensa passam por uma desidratação seguida de reidratação com glicerina e óleos naturais, mantendo sua textura macia e aparência de flor recém-colhida por anos. Exibidas sob uma cúpula de cristal protetora.',
  ARRAY['']
);

-- Inserir Cupons
INSERT INTO coupons (code, type, value, min_purchase_value, expires_at, active)
VALUES 
('NAMORADOS10', 'percentage', 10.00, 150.00, '2026-12-31', true),
('BEMVINDO50', 'fixed', 50.00, 300.00, '2026-12-31', true),
('VIP20', 'percentage', 20.00, 500.00, '2026-12-31', true),
('FRETEGRATIS', 'percentage', 0.00, 200.00, '2026-12-31', true);
