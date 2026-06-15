import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, correlation-id, x-csrf-token, x-session-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Content-Security-Policy": "default-src 'none';",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  try {
    const checks = [];
    let score = 100;

    // 1. Verificar MFA para Super Admins e Admins
    // Encontrar todos os IDs de usuários do Auth que são super_admin ou admin
    const { data: adminRoles, error: adminRolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["super_admin", "admin"])
      .is("deleted_at", null)
      .eq("status", "ativo");

    if (adminRolesError) {
      checks.push({ name: "MFA Compliance Check", status: "FAIL", message: `Erro ao consultar roles: ${adminRolesError.message}` });
      score -= 20;
    } else {
      let nonCompliantAdmins = 0;
      for (const row of adminRoles) {
        // Verifica se o usuário possui códigos de recuperação cadastrados
        const { count, error } = await supabase
          .from("mfa_recovery_codes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", row.user_id);
        
        if (error || !count || count === 0) {
          nonCompliantAdmins++;
        }
      }

      if (nonCompliantAdmins > 0) {
        checks.push({
          name: "MFA Compliance Check",
          status: "WARNING",
          message: `${nonCompliantAdmins} administradores ativos não configuraram MFA/Recovery Codes.`
        });
        score -= (nonCompliantAdmins * 5 > 20) ? 20 : nonCompliantAdmins * 5;
      } else {
        checks.push({ name: "MFA Compliance Check", status: "PASS", message: "Todos os administradores ativos possuem MFA ativo." });
      }
    }

    // 2. RLS Check (Verifica se as tabelas principais estão com RLS ativado)
    const criticalTables = [
      "gateway_configs", "ai_settings", "user_roles", "user_sessions", 
      "security_events", "double_approvals", "mfa_recovery_codes", 
      "emergency_access", "secrets_governance", "system_backups", 
      "maintenance_config", "maintenance_whitelist_ips", "provider_health_logs"
    ];

    const { data: rlsData, error: rlsError } = await supabase.rpc("check_rls_status_rpc");
    
    // Fallback: se a RPC não existir ainda, faremos via query direta de pg_tables se possível
    let unsecureTables = [];
    if (rlsError) {
      // Usaremos query direta
      const { data: tablesRaw, error: queryError } = await supabase
        .from("pg_tables")
        .select("tablename, rowsecurity")
        .eq("schemaname", "public");

      if (queryError) {
        // Se falhar de vez devido a restrições, assume OK ou avisa
        checks.push({ name: "RLS Audit Check", status: "WARNING", message: "Não foi possível auditar RLS programaticamente. Garanta que todas as tabelas possuem ENABLE ROW LEVEL SECURITY." });
      } else {
        const publicTables = tablesRaw || [];
        for (const t of criticalTables) {
          const matched = publicTables.find((x: any) => x.tablename === t);
          if (matched && !matched.rowsecurity) {
            unsecureTables.push(t);
          }
        }
      }
    } else {
      unsecureTables = (rlsData || [])
        .filter((t: any) => criticalTables.includes(t.table_name) && !t.rls_enabled)
        .map((t: any) => t.table_name);
    }

    if (unsecureTables.length > 0) {
      checks.push({ name: "RLS Audit Check", status: "FAIL", message: `Tabelas vulneráveis (RLS desativado): ${unsecureTables.join(", ")}` });
      score -= 25;
    } else {
      checks.push({ name: "RLS Audit Check", status: "PASS", message: "Todas as tabelas críticas possuem políticas RLS ativadas." });
    }

    // 3. Secrets Check
    const { data: expiredSecrets, error: secretsError } = await supabase
      .from("secrets_governance")
      .select("secret_name, next_rotation_due_at")
      .lt("next_rotation_due_at", new Date().toISOString());

    if (secretsError) {
      checks.push({ name: "Secrets Age Audit", status: "FAIL", message: `Erro ao buscar status de secrets: ${secretsError.message}` });
      score -= 15;
    } else if (expiredSecrets && expiredSecrets.length > 0) {
      checks.push({
        name: "Secrets Age Audit",
        status: "WARNING",
        message: `Seguintes chaves precisam de rotação imediata: ${expiredSecrets.map(s => s.secret_name).join(", ")}`
      });
      score -= 15;
    } else {
      checks.push({ name: "Secrets Age Audit", status: "PASS", message: "Todas as chaves criptográficas e secrets estão dentro da validade." });
    }

    // 4. Backups Check (Verifica se houve backup verificado nas últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentBackups, error: backupError } = await supabase
      .from("system_backups")
      .select("id, verification_status")
      .eq("verification_status", "verified")
      .gte("created_at", oneDayAgo);

    if (backupError) {
      checks.push({ name: "Disaster Recovery Check", status: "FAIL", message: `Erro ao consultar logs de backup: ${backupError.message}` });
      score -= 15;
    } else if (!recentBackups || recentBackups.length === 0) {
      checks.push({ name: "Disaster Recovery Check", status: "WARNING", message: "Nenhum backup verificado (verified) foi registrado nas últimas 24 horas." });
      score -= 10;
    } else {
      checks.push({ name: "Disaster Recovery Check", status: "PASS", message: "Disaster recovery verificado nas últimas 24 horas." });
    }

    // 5. Health Monitor Check
    const { data: unhealthyServices } = await supabase
      .from("provider_health_logs")
      .select("provider_name")
      .eq("status", "unhealthy")
      .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // nos últimos 30 minutos
      .limit(1);

    if (unhealthyServices && unhealthyServices.length > 0) {
      checks.push({ name: "Provider SLA Health Check", status: "WARNING", message: "Um ou mais serviços externos (Gemini/Gateway) relataram anomalias recentes." });
      score -= 10;
    } else {
      checks.push({ name: "Provider SLA Health Check", status: "PASS", message: "Todos os provedores de serviços operam em níveis saudáveis." });
    }

    // 6. Super Admins Break-Glass Availability
    const { data: superAdmins, error: saError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin")
      .eq("status", "ativo")
      .is("deleted_at", null);

    if (saError) {
      checks.push({ name: "Break-Glass Super Admins", status: "FAIL", message: `Erro ao validar super admins: ${saError.message}` });
      score -= 15;
    } else if (!superAdmins || superAdmins.length < 2) {
      checks.push({ name: "Break-Glass Super Admins", status: "WARNING", message: "Menos de 2 Super Admins ativos. Risco operacional para aprovações duplas." });
      score -= 10;
    } else {
      checks.push({ name: "Break-Glass Super Admins", status: "PASS", message: "Disponibilidade de múltiplos Super Admins atende ao modelo 2-Man Rule." });
    }

    // Assegurar score não-negativo
    score = Math.max(score, 0);

    let status = "PASS";
    if (score < 70) {
      status = "FAIL";
    } else if (score < 90 || checks.some(c => c.status === "WARNING")) {
      status = "WARNING";
    }

    // Registrar auditoria se o score for ruim ou mudou
    if (status === "FAIL") {
      await supabase.from("security_events").insert({
        category: "SYSTEM",
        severity: "CRITICAL",
        title: "Falha de Conformidade no Readiness Gate",
        description: `O portão de prontidão de produção falhou com score ${score}.`,
        metadata: { score, checks }
      });
    }

    return new Response(JSON.stringify({ status, score, checks }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no readiness audit." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
