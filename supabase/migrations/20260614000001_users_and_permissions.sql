-- MIGRACAO: ADICAO DE STATUS E ATUALIZACAO DE RLS
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. ADICIONAR COLUNA STATUS NA TABELA USER_ROLES (SE NAO EXISTIR)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ativo' 
CHECK (status IN ('ativo', 'suspenso', 'bloqueado'));

-- 2. ATUALIZAR FUNÇÕES DE SEGURANÇA RLS PARA VERIFICAR STATUS = 'ativo'

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin')
    AND status = 'ativo'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager')
    AND status = 'ativo'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_support()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'manager', 'support')
    AND status = 'ativo'
  );
$$;
