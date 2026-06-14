-- MIGRACAO DE SEGURANCA: AMOUR & CO.
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. CRIACAO DA TABELA DE PAPEIS DE USUARIO (user_roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'support')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id)
);

-- Ativar RLS para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. FUNÇÕES SQL REUTILIZÁVEIS PARA RLS (Ajuste 2)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'support')
  );
$$;

-- Políticas de RLS para a tabela user_roles
DROP POLICY IF EXISTS "Allow users to read their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admins all access to roles" ON public.user_roles;

CREATE POLICY "Allow users to read their own roles" ON public.user_roles 
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow admins all access to roles" ON public.user_roles 
    FOR ALL TO authenticated USING (public.is_admin());


-- 3. CRIACAO DA TABELA DE LOGS DE AUDITORIA (audit_logs - Ajuste 3)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para audit_logs
DROP POLICY IF EXISTS "Allow admins to read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Allow authenticated users to insert logs" ON public.audit_logs;

CREATE POLICY "Allow admins to read audit logs" ON public.audit_logs 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "Allow authenticated users to insert logs" ON public.audit_logs 
    FOR INSERT TO authenticated WITH CHECK (true);


-- 4. CRIACAO DA TABELA DE CONFIGURACOES DA VITRINE (storefront_configs)
CREATE TABLE IF NOT EXISTS public.storefront_configs (
    id INTEGER PRIMARY KEY DEFAULT 1,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para storefront_configs
ALTER TABLE public.storefront_configs ENABLE ROW LEVEL SECURITY;


-- 5. CRIACAO DA TABELA DE RATE LIMIT PARA CONCIERGE (Ajuste 5)
CREATE TABLE IF NOT EXISTS public.chat_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT NOT NULL,
    lead_id TEXT,
    message_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativar RLS para chat_rate_limits (apenas escrita pública, leitura admins)
ALTER TABLE public.chat_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert rate limits" ON public.chat_rate_limits;
DROP POLICY IF EXISTS "Allow admins read rate limits" ON public.chat_rate_limits;

CREATE POLICY "Allow public insert rate limits" ON public.chat_rate_limits 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins read rate limits" ON public.chat_rate_limits 
    FOR SELECT TO authenticated USING (public.is_support());


-- 6. CRIACAO DA TABELA DE WEBHOOKS PROCESSADOS - REPLAY ATTACK (Ajuste 6)
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    gateway TEXT NOT NULL,
    event_id TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (gateway, event_id)
);

-- Ativar RLS para processed_webhooks
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins read processed webhooks" ON public.processed_webhooks;
CREATE POLICY "Allow admins read processed webhooks" ON public.processed_webhooks 
    FOR SELECT TO authenticated USING (public.is_support());


-- 7. HABILITAR RLS EM TODAS AS DEMAIS TABELAS EXISTENTES
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gateway_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;


-- 8. APLICACAO DE POLÍTICAS DE RLS SEGURAS E RESTRITAS

-- --- TABELA: products ---
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow admins write products" ON public.products;

CREATE POLICY "Allow public read products" ON public.products 
    FOR SELECT USING (true);
CREATE POLICY "Allow admins write products" ON public.products 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: coupons ---
DROP POLICY IF EXISTS "Allow public read coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admins write coupons" ON public.coupons;

CREATE POLICY "Allow public read coupons" ON public.coupons 
    FOR SELECT USING (true);
CREATE POLICY "Allow admins write coupons" ON public.coupons 
    FOR ALL TO authenticated USING (public.is_admin());

-- --- TABELA: reviews ---
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow admins to edit/delete reviews" ON public.reviews;

CREATE POLICY "Allow public read approved reviews" ON public.reviews 
    FOR SELECT USING (approved = true OR public.is_support());
CREATE POLICY "Allow public insert reviews" ON public.reviews 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins to edit/delete reviews" ON public.reviews 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: orders (Ajuste 7) ---
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins write orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins delete orders" ON public.orders;

CREATE POLICY "Allow public insert orders" ON public.orders 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins read orders" ON public.orders 
    FOR SELECT TO authenticated USING (public.is_support());
CREATE POLICY "Allow admins write orders" ON public.orders 
    FOR UPDATE TO authenticated USING (public.is_support());
CREATE POLICY "Allow admins delete orders" ON public.orders 
    FOR DELETE TO authenticated USING (public.is_support());

-- --- TABELA: leads (Ajuste 8) ---
DROP POLICY IF EXISTS "Allow public select leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow public update leads" ON public.leads;
DROP POLICY IF EXISTS "Allow admins all leads" ON public.leads;

CREATE POLICY "Allow public insert leads" ON public.leads 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admins all leads" ON public.leads 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: chat_leads (Ajuste 8) ---
DROP POLICY IF EXISTS "Public Insert Chat Leads" ON public.chat_leads;
DROP POLICY IF EXISTS "Admin Read All Chat Leads" ON public.chat_leads;
DROP POLICY IF EXISTS "Allow admins all chat_leads" ON public.chat_leads;

CREATE POLICY "Public Insert Chat Leads" ON public.chat_leads 
    FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Allow admins all chat_leads" ON public.chat_leads 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: ai_settings (Ajuste 3) ---
DROP POLICY IF EXISTS "Admin Read AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admin Update AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admin Insert AI Settings" ON public.ai_settings;

CREATE POLICY "Admin Read AI Settings" ON public.ai_settings 
    FOR SELECT TO authenticated USING (public.is_support());
CREATE POLICY "Admin Update AI Settings" ON public.ai_settings 
    FOR UPDATE TO authenticated USING (public.is_admin());
CREATE POLICY "Admin Insert AI Settings" ON public.ai_settings 
    FOR INSERT TO authenticated WITH CHECK (public.is_admin());

-- --- TABELA: gateway_configs (Ajuste 4) ---
DROP POLICY IF EXISTS "gateway_configs_public_read" ON public.gateway_configs;
DROP POLICY IF EXISTS "gateway_configs_admin_write" ON public.gateway_configs;

CREATE POLICY "gateway_configs_public_read" ON public.gateway_configs 
    FOR SELECT USING (true);
CREATE POLICY "gateway_configs_admin_write" ON public.gateway_configs 
    FOR ALL TO authenticated USING (public.is_admin());

-- --- TABELA: storefront_configs ---
DROP POLICY IF EXISTS "storefront_configs_public_read" ON public.storefront_configs;
DROP POLICY IF EXISTS "storefront_configs_admin_write" ON public.storefront_configs;

CREATE POLICY "storefront_configs_public_read" ON public.storefront_configs 
    FOR SELECT USING (true);
CREATE POLICY "storefront_configs_admin_write" ON public.storefront_configs 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: transactions ---
DROP POLICY IF EXISTS "transactions_public_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_read" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_write" ON public.transactions;

CREATE POLICY "transactions_public_insert" ON public.transactions 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_admin_read" ON public.transactions 
    FOR SELECT TO authenticated USING (public.is_support());
CREATE POLICY "transactions_admin_write" ON public.transactions 
    FOR ALL TO authenticated USING (public.is_support());

-- --- TABELA: payment_attempts ---
DROP POLICY IF EXISTS "payment_attempts_public_insert" ON public.payment_attempts;
DROP POLICY IF EXISTS "payment_attempts_admin_read" ON public.payment_attempts;

CREATE POLICY "payment_attempts_public_insert" ON public.payment_attempts 
    FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_attempts_admin_read" ON public.payment_attempts 
    FOR SELECT TO authenticated USING (public.is_support());

-- --- TABELA: webhook_events ---
DROP POLICY IF EXISTS "webhook_events_admin_all" ON public.webhook_events;

CREATE POLICY "webhook_events_admin_all" ON public.webhook_events 
    FOR ALL TO authenticated USING (public.is_support());


-- 9. TRIGGERS DE AUDITORIA AUTOMÁTICA (Ajuste 3)

-- A. Trigger para Tabela de Produtos (Products)
CREATE OR REPLACE FUNCTION public.audit_product_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data, user_id, user_email)
    VALUES ('criação de produto', 'products', NEW.id, to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Logs específicos de estoque e preço
    IF OLD.stock <> NEW.stock THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
      VALUES ('mudança de estoque', 'products', NEW.id, jsonb_build_object('stock', OLD.stock), jsonb_build_object('stock', NEW.stock), auth.uid(), v_user_email);
    END IF;
    IF OLD.price <> NEW.price THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
      VALUES ('alteração de preço', 'products', NEW.id, jsonb_build_object('price', OLD.price), jsonb_build_object('price', NEW.price), auth.uid(), v_user_email);
    END IF;
    -- Log geral de edição
    IF OLD.stock = NEW.stock AND OLD.price = NEW.price THEN
      INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
      VALUES ('edição de produto', 'products', NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, user_id, user_email)
    VALUES ('exclusão de produto', 'products', OLD.id, to_jsonb(OLD), auth.uid(), v_user_email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
CREATE TRIGGER trg_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.audit_product_trigger();

-- B. Trigger para Tabela de Cupons (Coupons)
CREATE OR REPLACE FUNCTION public.audit_coupon_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, new_data, user_id, user_email)
    VALUES ('criação de cupom', 'coupons', NEW.code, to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
    VALUES ('edição de cupom', 'coupons', NEW.code, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, user_id, user_email)
    VALUES ('exclusão de cupom', 'coupons', OLD.code, to_jsonb(OLD), auth.uid(), v_user_email);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_coupons ON public.coupons;
CREATE TRIGGER trg_audit_coupons
    AFTER INSERT OR UPDATE OR DELETE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.audit_coupon_trigger();

-- C. Trigger para Tabela de Pedidos (Orders)
CREATE OR REPLACE FUNCTION public.audit_order_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
  v_action TEXT := 'atualização de pedido';
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status AND NEW.status = 'refunded' THEN
      v_action := 'reembolso';
    END IF;
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
    VALUES (v_action, 'orders', NEW.id, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
    AFTER UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_order_trigger();

-- D. Trigger para Tabela de Gateways (Gateway Configs)
CREATE OR REPLACE FUNCTION public.audit_gateway_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
    VALUES ('alteração de gateway', 'gateway_configs', NEW.gateway, to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_gateways ON public.gateway_configs;
CREATE TRIGGER trg_audit_gateways
    AFTER UPDATE ON public.gateway_configs
    FOR EACH ROW EXECUTE FUNCTION public.audit_gateway_trigger();

-- E. Trigger para Tabela de Configurações da IA (AI Settings)
CREATE OR REPLACE FUNCTION public.audit_ai_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
    VALUES ('alteração da IA', 'ai_settings', CAST(NEW.id AS TEXT), to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_ai ON public.ai_settings;
CREATE TRIGGER trg_audit_ai
    AFTER UPDATE ON public.ai_settings
    FOR EACH ROW EXECUTE FUNCTION public.audit_ai_trigger();

-- F. Trigger para Tabela de Configurações da Vitrine (Storefront Configs)
CREATE OR REPLACE FUNCTION public.audit_storefront_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  v_user_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, entity_type, entity_id, old_data, new_data, user_id, user_email)
    VALUES ('alteração de configurações', 'storefront_configs', CAST(NEW.id AS TEXT), to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_user_email);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_storefront ON public.storefront_configs;
CREATE TRIGGER trg_audit_storefront
    AFTER UPDATE ON public.storefront_configs
    FOR EACH ROW EXECUTE FUNCTION public.audit_storefront_trigger();
