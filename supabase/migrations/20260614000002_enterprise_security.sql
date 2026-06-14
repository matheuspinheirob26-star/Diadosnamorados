-- MIGRACAO DE SEGURANÇA ENTERPRISE, GOVERNANÇA E CONTINGÊNCIA
-- Caminho: supabase/migrations/20260614000002_enterprise_security.sql

-- 1. FUNÇÃO AUXILIAR DE SEGURANÇA: is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
    AND status = 'ativo'
    AND deleted_at IS NULL
  );
$$;

-- 2. ALTERAÇÕES NA TABELA EXISTENTE: user_roles (Adição de campos de Soft Delete)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- 3. TABELA DE SESSÕES DE USUÁRIO (user_sessions)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT,
    ip TEXT,
    country TEXT,
    city TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    device_fingerprint TEXT,
    screen_resolution TEXT,
    timezone TEXT,
    language TEXT,
    platform TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para user_sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 4. TABELA DE EVENTOS DE SEGURANÇA (security_events)
CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('AUTH', 'PAYMENTS', 'CRYPTO', 'AI', 'USERS', 'WEBHOOKS', 'SECURITY', 'SYSTEM')),
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    correlation_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE APROVAÇÃO DUPLA (double_approvals)
CREATE TABLE IF NOT EXISTS public.double_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS para double_approvals
ALTER TABLE public.double_approvals ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE CÓDIGOS DE RECUPERAÇÃO MFA (mfa_recovery_codes)
CREATE TABLE IF NOT EXISTS public.mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para mfa_recovery_codes
ALTER TABLE public.mfa_recovery_codes ENABLE ROW LEVEL SECURITY;

-- 7. TABELA DE CONTA DE EMERGÊNCIA / ACESSO DE CONTINGÊNCIA (emergency_access)
CREATE TABLE IF NOT EXISTS public.emergency_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reason TEXT,
    created_by TEXT,
    used_at TIMESTAMP WITH TIME ZONE,
    ip TEXT,
    user_agent TEXT,
    fingerprint TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'used', 'revoked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para emergency_access
ALTER TABLE public.emergency_access ENABLE ROW LEVEL SECURITY;

-- 8. APLICAÇÃO DE POLÍTICAS DE RLS SEGURAS E RESTRITAS

-- A. Políticas para user_sessions
CREATE POLICY "user_sessions_select_own" ON public.user_sessions 
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_support());

CREATE POLICY "user_sessions_insert_own" ON public.user_sessions 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_sessions_update_own" ON public.user_sessions 
    FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_super_admin());

-- B. Políticas para security_events
CREATE POLICY "security_events_select" ON public.security_events 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "security_events_insert" ON public.security_events 
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "security_events_modify_super" ON public.security_events 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- C. Políticas para double_approvals
CREATE POLICY "double_approvals_select" ON public.double_approvals 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "double_approvals_insert" ON public.double_approvals 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "double_approvals_modify_super" ON public.double_approvals 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- D. Políticas para mfa_recovery_codes
CREATE POLICY "mfa_recovery_codes_all" ON public.mfa_recovery_codes 
    FOR ALL TO authenticated USING (auth.uid() = user_id OR public.is_super_admin());

-- E. Políticas para emergency_access
CREATE POLICY "emergency_access_super" ON public.emergency_access 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- F. Restringir escrita em tabelas de configuração ao super_admin (Ajustes de Hardening RLS)

-- gateway_configs
DROP POLICY IF EXISTS "gateway_configs_admin_write" ON public.gateway_configs;
CREATE POLICY "gateway_configs_super_write" ON public.gateway_configs 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- ai_settings
DROP POLICY IF EXISTS "Admin Update AI Settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Admin Insert AI Settings" ON public.ai_settings;
CREATE POLICY "Admin Update AI Settings Super" ON public.ai_settings 
    FOR UPDATE TO authenticated USING (public.is_super_admin());
CREATE POLICY "Admin Insert AI Settings Super" ON public.ai_settings 
    FOR INSERT TO authenticated WITH CHECK (public.is_super_admin());

-- user_roles
DROP POLICY IF EXISTS "Allow admins all access to roles" ON public.user_roles;
CREATE POLICY "Allow super_admins all access to roles" ON public.user_roles 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- G. Atualizar as funções is_admin(), is_manager() e is_support() para respeitar soft delete
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
    AND status = 'ativo'
    AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
    AND status = 'ativo'
    AND deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'support')
    AND status = 'ativo'
    AND deleted_at IS NULL
  );
$$;
