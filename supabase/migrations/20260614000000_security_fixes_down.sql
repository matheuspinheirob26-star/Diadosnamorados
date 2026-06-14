-- REVERSÃO DE MIGRAÇÃO DE SEGURANÇA: AMOUR & CO.
-- Use este script APENAS em caso de falha crítica pós-migração.
-- IMPORTANTE: Este script NÃO desativa o Row Level Security (RLS). Ele apenas simplifica as políticas para regras seguras de contingência.

-- 1. REMOVER TRIGGERS DE AUDITORIA (para isolar problemas de execução de triggers)
DROP TRIGGER IF EXISTS trg_audit_products ON public.products;
DROP TRIGGER IF EXISTS trg_audit_coupons ON public.coupons;
DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_audit_gateways ON public.gateway_configs;
DROP TRIGGER IF EXISTS trg_audit_ai ON public.ai_settings;
DROP TRIGGER IF EXISTS trg_audit_storefront ON public.storefront_configs;

-- 2. REMOVER POLÍTICAS ESPECÍFICAS DA MIGRAÇÃO
DROP POLICY IF EXISTS "Allow public read products" ON public.products;
DROP POLICY IF EXISTS "Allow admins write products" ON public.products;
DROP POLICY IF EXISTS "Allow public read coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow admins write coupons" ON public.coupons;
DROP POLICY IF EXISTS "Allow public read approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow admins to edit/delete reviews" ON public.reviews;
DROP POLICY IF EXISTS "Allow public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins read orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins write orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admins delete orders" ON public.orders;
DROP POLICY IF EXISTS "Allow public insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow admins all leads" ON public.leads;
DROP POLICY IF EXISTS "Public Insert Chat Leads" ON public.chat_leads;
DROP POLICY IF EXISTS "Allow admins all chat_leads" ON public.chat_leads;
DROP POLICY IF EXISTS "Admin Read AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admin Update AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admin Insert AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "gateway_configs_public_read" ON public.gateway_configs;
DROP POLICY IF EXISTS "gateway_configs_admin_write" ON public.gateway_configs;
DROP POLICY IF EXISTS "storefront_configs_public_read" ON public.storefront_configs;
DROP POLICY IF EXISTS "storefront_configs_admin_write" ON public.storefront_configs;
DROP POLICY IF EXISTS "transactions_public_insert" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_read" ON public.transactions;
DROP POLICY IF EXISTS "transactions_admin_write" ON public.transactions;
DROP POLICY IF EXISTS "payment_attempts_public_insert" ON public.payment_attempts;
DROP POLICY IF EXISTS "payment_attempts_admin_read" ON public.payment_attempts;
DROP POLICY IF EXISTS "webhook_events_admin_all" ON public.webhook_events;

-- 3. APLICAR POLÍTICAS DE CONTINGÊNCIA E SEGURANÇA BÁSICA (RLS CONTINUA ATIVO)

-- Produtos
CREATE POLICY "Contingency read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Contingency write products" ON public.products FOR ALL TO authenticated USING (public.is_admin());

-- Cupons
CREATE POLICY "Contingency read coupons" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Contingency write coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin());

-- Pedidos (Público apenas insere, leitura exclusiva de administradores)
CREATE POLICY "Contingency insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Contingency read orders" ON public.orders FOR SELECT TO authenticated USING (public.is_support());
CREATE POLICY "Contingency write orders" ON public.orders FOR UPDATE TO authenticated USING (public.is_support());

-- Leads (Público insere, leitura/escrita administradores)
CREATE POLICY "Contingency insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Contingency read leads" ON public.leads FOR ALL TO authenticated USING (public.is_support());

-- Leads do Chat
CREATE POLICY "Contingency insert chat_leads" ON public.chat_leads FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Contingency read chat_leads" ON public.chat_leads FOR SELECT TO authenticated USING (public.is_support());

-- Configurações de IA (Bloqueio total de leitura pública)
CREATE POLICY "Contingency read AI" ON public.ai_settings FOR SELECT TO authenticated USING (public.is_support());
CREATE POLICY "Contingency write AI" ON public.ai_settings FOR UPDATE TO authenticated USING (public.is_admin());

-- Configurações de Gateways
CREATE POLICY "Contingency read gateways" ON public.gateway_configs FOR SELECT USING (true);
CREATE POLICY "Contingency write gateways" ON public.gateway_configs FOR ALL TO authenticated USING (public.is_admin());
