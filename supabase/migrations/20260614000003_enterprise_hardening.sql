-- MIGRACAO DE SEGURANÇA E HARDENING ENTERPRISE v4.2
-- Caminho: supabase/migrations/20260614000003_enterprise_hardening.sql

-- 1. ADICIONAR COLUNAS DE BINDING E RISK SCORE EM USER_SESSIONS
ALTER TABLE public.user_sessions 
ADD COLUMN IF NOT EXISTS csrf_token TEXT DEFAULT gen_random_uuid()::text,
ADD COLUMN IF NOT EXISTS user_agent_hash TEXT,
ADD COLUMN IF NOT EXISTS ip_hash TEXT,
ADD COLUMN IF NOT EXISTS last_country TEXT,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS last_ip TEXT,
ADD COLUMN IF NOT EXISTS last_user_agent TEXT,
ADD COLUMN IF NOT EXISTS last_device_fingerprint TEXT;

-- 2. TABELA DE GOVERNANÇA DE SECRETS (secrets_governance)
CREATE TABLE IF NOT EXISTS public.secrets_governance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_name TEXT UNIQUE NOT NULL,
    secret_owner TEXT NOT NULL,
    last_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    next_rotation_due_at TIMESTAMP WITH TIME ZONE NOT NULL,
    rotation_interval_days INT DEFAULT 90 NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warning', 'critical', 'rotated')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.secrets_governance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "secrets_governance_select" ON public.secrets_governance 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "secrets_governance_super_all" ON public.secrets_governance 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- 3. TABELA DE AUDITORIA DE BACKUPS (system_backups)
CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_name TEXT NOT NULL,
    backup_size_bytes BIGINT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT true NOT NULL,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_backups_select" ON public.system_backups 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "system_backups_super_all" ON public.system_backups 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- 4. MODO MANUTENÇÃO (maintenance_config & maintenance_whitelist_ips)
CREATE TABLE IF NOT EXISTS public.maintenance_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_maintenance_active BOOLEAN DEFAULT false NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO public.maintenance_config (id, is_maintenance_active)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.maintenance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_config_select" ON public.maintenance_config 
    FOR SELECT TO public USING (true);

CREATE POLICY "maintenance_config_super_all" ON public.maintenance_config 
    FOR ALL TO authenticated USING (public.is_super_admin());

CREATE TABLE IF NOT EXISTS public.maintenance_whitelist_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.maintenance_whitelist_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_whitelist_ips_select" ON public.maintenance_whitelist_ips 
    FOR SELECT TO public USING (true);

CREATE POLICY "maintenance_whitelist_ips_super_all" ON public.maintenance_whitelist_ips 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- 5. TELEMETRIA E SLA DE SAÚDE (provider_health_logs)
CREATE TABLE IF NOT EXISTS public.provider_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy')),
    latency_ms INT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.provider_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_health_logs_select" ON public.provider_health_logs 
    FOR SELECT TO authenticated USING (public.is_support());

CREATE POLICY "provider_health_logs_insert" ON public.provider_health_logs 
    FOR INSERT TO public WITH CHECK (true); -- Permitir que a edge function de health check registre telemetria

-- Função SLA de Saúde do Provedor
CREATE OR REPLACE FUNCTION public.get_provider_sla(p_provider TEXT, p_interval INTERVAL)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_total INT;
  v_healthy INT;
BEGIN
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'healthy')
  INTO v_total, v_healthy
  FROM public.provider_health_logs
  WHERE provider_name = p_provider
  AND created_at >= now() - p_interval;
  
  IF v_total = 0 THEN
    RETURN 100.0;
  END IF;
  
  RETURN ROUND((v_healthy::NUMERIC / v_total::NUMERIC) * 100.0, 2);
END;
$$;

-- 6. LGPD COMPLIANCE (lgpd_requests)
CREATE TABLE IF NOT EXISTS public.lgpd_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('EXPORT', 'ANONYMIZE', 'DELETE')),
    status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    result_url TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.lgpd_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lgpd_requests_select_own" ON public.lgpd_requests 
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_support());

CREATE POLICY "lgpd_requests_insert_own" ON public.lgpd_requests 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "lgpd_requests_super_all" ON public.lgpd_requests 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- 7. RATE LIMITING (rate_limits)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_key TEXT UNIQUE NOT NULL,
    attempts INT DEFAULT 1 NOT NULL,
    last_attempt TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Controlado apenas via service_role pelas edge functions

-- 8. EVENTOS DE RECUPERAÇÃO MFA (mfa_recovery_events)
CREATE TABLE IF NOT EXISTS public.mfa_recovery_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recovery_method TEXT NOT NULL,
    approved BOOLEAN DEFAULT true NOT NULL,
    device_metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.mfa_recovery_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mfa_recovery_events_select" ON public.mfa_recovery_events 
    FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_support());

CREATE POLICY "mfa_recovery_events_super_all" ON public.mfa_recovery_events 
    FOR ALL TO authenticated USING (public.is_super_admin());

-- 9. DYNAMIC TRIGGER DE ANOMALIA DE DISPOSITIVO E RISK SCORE
CREATE OR REPLACE FUNCTION public.check_session_anomaly()
RETURNS TRIGGER AS $$
DECLARE
    risk_score INT := 0;
BEGIN
    -- Só valida se a sessão estiver ativa
    IF NEW.is_active = false THEN
        RETURN NEW;
    END IF;

    -- Inicializa os campos last_ se estiverem nulos
    IF NEW.last_device_fingerprint IS NULL THEN
        NEW.last_device_fingerprint := NEW.device_fingerprint;
    END IF;
    IF NEW.last_user_agent IS NULL THEN
        NEW.last_user_agent := NEW.user_agent;
    END IF;
    IF NEW.last_country IS NULL THEN
        NEW.last_country := NEW.country;
    END IF;
    IF NEW.last_ip IS NULL THEN
        NEW.last_ip := NEW.ip;
    END IF;

    -- Cálculo do Score de Risco comparando o estado atual da requisição (last_) com o inicial (ip, user_agent, etc.)
    -- Fingerprint mudou -> +20
    IF NEW.last_device_fingerprint IS DISTINCT FROM NEW.device_fingerprint THEN
        risk_score := risk_score + 20;
    END IF;

    -- User Agent mudou -> +15
    IF NEW.last_user_agent IS DISTINCT FROM NEW.user_agent THEN
        risk_score := risk_score + 15;
    END IF;

    -- País mudou -> +50
    IF NEW.last_country IS DISTINCT FROM NEW.country THEN
        risk_score := risk_score + 50;
    END IF;

    -- IP mudou -> +5
    IF NEW.last_ip IS DISTINCT FROM NEW.ip THEN
        risk_score := risk_score + 5;
    END IF;

    -- Se atingiu ou passou do limiar de 50, bloqueia sessão e gera evento CRITICAL
    IF risk_score >= 50 THEN
        NEW.is_active := false;
        NEW.revoked_at := timezone('utc'::text, now());
        
        INSERT INTO public.security_events (
            category,
            severity,
            title,
            description,
            user_id,
            ip,
            metadata
        ) VALUES (
            'SECURITY',
            'CRITICAL',
            'Sessão Bloqueada por Anomalia (Score de Risco Excedido)',
            'A sessão ID ' || NEW.id || ' foi bloqueada automaticamente devido a um score de risco de anomalia de ' || risk_score || '.',
            NEW.user_id,
            NEW.last_ip,
            jsonb_build_object(
                'session_id', NEW.id,
                'risk_score', risk_score,
                'initial_ip', NEW.ip, 'current_ip', NEW.last_ip,
                'initial_country', NEW.country, 'current_country', NEW.last_country,
                'initial_ua', NEW.user_agent, 'current_ua', NEW.last_user_agent,
                'initial_fingerprint', NEW.device_fingerprint, 'current_fingerprint', NEW.last_device_fingerprint
            )
        );
    ELSIF risk_score > 0 THEN
        -- Só gera o alerta se as propriedades atuais mudaram em relação ao OLD.last_ip/last_country/etc.
        IF OLD IS NULL OR
           NEW.last_ip IS DISTINCT FROM OLD.last_ip OR
           NEW.last_country IS DISTINCT FROM OLD.last_country OR
           NEW.last_device_fingerprint IS DISTINCT FROM OLD.last_device_fingerprint OR
           NEW.last_user_agent IS DISTINCT FROM OLD.last_user_agent THEN
           
            INSERT INTO public.security_events (
                category,
                severity,
                title,
                description,
                user_id,
                ip,
                metadata
            ) VALUES (
                'SECURITY',
                'WARNING',
                'Desvio Detectado de Parâmetros de Sessão',
                'Sessão ID ' || NEW.id || ' apresentou variação de assinatura. Score de risco atual: ' || risk_score || '.',
                NEW.user_id,
                NEW.last_ip,
                jsonb_build_object(
                    'session_id', NEW.id,
                    'risk_score', risk_score,
                    'initial_ip', NEW.ip, 'current_ip', NEW.last_ip,
                    'initial_country', NEW.country, 'current_country', NEW.last_country,
                    'initial_ua', NEW.user_agent, 'current_ua', NEW.last_user_agent,
                    'initial_fingerprint', NEW.device_fingerprint, 'current_fingerprint', NEW.last_device_fingerprint
                )
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_check_session_anomaly
    BEFORE INSERT OR UPDATE ON public.user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_session_anomaly();

-- 10. HELPER RPC PARA VERIFICAÇÃO DE RLS NO PRODUCTION READINESS GATE
CREATE OR REPLACE FUNCTION public.check_rls_status_rpc()
RETURNS TABLE (table_name TEXT, rls_enabled BOOLEAN) 
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT c.relname::TEXT, c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' 
      AND c.relkind = 'r';
END;
$$;

