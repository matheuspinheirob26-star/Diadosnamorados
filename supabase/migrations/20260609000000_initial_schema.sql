-- Migração Inicial: Criação de todas as tabelas utilizadas pela loja Amour & Co.

-- Extensão para UUIDs (caso ainda não exista)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric NOT NULL,
    original_price numeric,
    images jsonb DEFAULT '[]'::jsonb,
    video text,
    category text,
    gender text,
    tags jsonb DEFAULT '[]'::jsonb,
    stock integer DEFAULT 0,
    rating numeric DEFAULT 5.0,
    reviews_count integer DEFAULT 0,
    features jsonb DEFAULT '[]'::jsonb,
    details text,
    sizes jsonb DEFAULT '[]'::jsonb,
    status text DEFAULT 'publicado',
    featured boolean DEFAULT false,
    campaign text DEFAULT 'nenhuma',
    slug text,
    sku text,
    seo_title text,
    seo_description text,
    colors jsonb DEFAULT '[]'::jsonb,
    models jsonb DEFAULT '[]'::jsonb,
    variations jsonb DEFAULT '[]'::jsonb,
    min_stock integer DEFAULT 5,
    allow_out_of_stock_sale boolean DEFAULT false,
    canonical_url text,
    keyword text,
    indexing text DEFAULT 'index',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Cupons
CREATE TABLE IF NOT EXISTS public.coupons (
    code text PRIMARY KEY,
    type text NOT NULL, -- 'percentage' ou 'fixed'
    value numeric NOT NULL,
    min_purchase_value numeric DEFAULT 0,
    expires_at timestamp with time zone,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Avaliações (Reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id text PRIMARY KEY,
    product_id text REFERENCES public.products(id) ON DELETE CASCADE,
    customer_name text NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    photos jsonb DEFAULT '[]'::jsonb,
    verified_purchase boolean DEFAULT false,
    approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Pedidos
CREATE TABLE IF NOT EXISTS public.orders (
    id text PRIMARY KEY,
    customer_name text NOT NULL,
    customer_email text NOT NULL,
    customer_phone text NOT NULL,
    customer_cpf text NOT NULL,
    cep text NOT NULL,
    address text NOT NULL,
    number text NOT NULL,
    complement text,
    neighborhood text NOT NULL,
    city text NOT NULL,
    state text NOT NULL,
    shipping_method text NOT NULL,
    shipping_price numeric NOT NULL,
    payment_method text NOT NULL,
    coupon_code text,
    items jsonb NOT NULL,
    subtotal numeric NOT NULL,
    discount numeric DEFAULT 0,
    total numeric NOT NULL,
    status text DEFAULT 'pending',
    tracking_code text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Leads (Clientes potenciais/Carrinhos abandonados)
CREATE TABLE IF NOT EXISTS public.leads (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    status text DEFAULT 'captured',
    cart_items jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Configurações de Gateway de Pagamento
CREATE TABLE IF NOT EXISTS public.gateway_configs (
    id text PRIMARY KEY,
    gateway text UNIQUE NOT NULL,
    label text NOT NULL,
    enabled boolean DEFAULT false,
    priority integer DEFAULT 1,
    config jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabela de Leads do Chat (Concierge)
CREATE TABLE IF NOT EXISTS public.chat_leads (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text,
    phone text NOT NULL,
    interest text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Tabela de Eventos de Webhook (Pagamentos)
CREATE TABLE IF NOT EXISTS public.webhook_events (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway text NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabela de Transações Financeiras
CREATE TABLE IF NOT EXISTS public.transactions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id text REFERENCES public.orders(id) ON DELETE SET NULL,
    gateway text NOT NULL,
    gateway_transaction_id text UNIQUE,
    amount numeric NOT NULL,
    status text NOT NULL,
    payment_method text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Segurança RLS (Row Level Security) - Desabilitadas por padrão no script inicial
-- Caso queira habilitar, descomente e ajuste as regras.
/*
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.products FOR SELECT USING (true);
*/
