import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, correlation-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Security-Policy": "default-src 'none';",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
};

serve(async (req, connInfo) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(
      JSON.stringify({ error: "Supabase service key is missing on backend." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  try {
    const body = await req.json();
    const { key, mfaCode, reason, fingerprint } = body;

    const expectedKey = Deno.env.get("EMERGENCY_BREAK_GLASS_KEY") || "BREAK_GLASS_SECRET_KEY_123456";
    const expectedMfa = Deno.env.get("EMERGENCY_MFA_CODE") || "999888";

    if (!key || !mfaCode || !reason) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios ausentes (chave, MFA ou justificativa)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (key !== expectedKey || mfaCode !== expectedMfa) {
      // Registrar tentativa de invasão na conta de emergência
      const clientIP = req.headers.get("x-forwarded-for") || (connInfo.remoteAddr as any)?.hostname || "127.0.0.1";
      const correlationId = req.headers.get("correlation-id") || req.headers.get("x-correlation-id") || crypto.randomUUID();

      await supabase.from("security_events").insert({
        category: "SECURITY",
        severity: "CRITICAL",
        title: "Tentativa inválida de Acesso de Emergência",
        description: `Chave de emergência ou token MFA inválido a partir do IP ${clientIP}. Justificativa alegada: ${reason}`,
        correlation_id: correlationId,
        ip: clientIP,
        metadata: { fingerprint, reason }
      });

      return new Response(
        JSON.stringify({ error: "Credenciais de emergência inválidas." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar o primeiro super_admin ativo
    const { data: superAdmins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin")
      .eq("status", "ativo")
      .is("deleted_at", null)
      .limit(1);

    if (adminError || !superAdmins || superAdmins.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum Super Administrador ativo encontrado para vincular à sessão de contingência." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUserId = superAdmins[0].user_id;

    // Buscar e-mail do super admin
    const { data: authUser, error: authUserError } = await supabase.auth.admin.getUserById(targetUserId);
    if (authUserError || !authUser?.user?.email) {
      return new Response(
        JSON.stringify({ error: "Erro ao recuperar dados da credencial do Super Admin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIP = req.headers.get("x-forwarded-for") || (connInfo.remoteAddr as any)?.hostname || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";
    const correlationId = req.headers.get("correlation-id") || req.headers.get("x-correlation-id") || crypto.randomUUID();

    // 1. Gravar registro em emergency_access
    const { data: accessRecord, error: accessError } = await supabase
      .from("emergency_access")
      .insert({
        reason,
        created_by: authUser.user.email,
        used_at: new Date().toISOString(),
        ip: clientIP,
        user_agent: userAgent,
        fingerprint: fingerprint || "não fornecido",
        status: "used"
      })
      .select()
      .single();

    if (accessError) {
      console.error("Erro ao registrar no emergency_access:", accessError);
    }

    // 2. Gravar em security_events
    await supabase.from("security_events").insert({
      category: "SECURITY",
      severity: "CRITICAL",
      title: "Conta de Emergência Utilizada",
      description: `Acesso de emergência (Break Glass) utilizado pelo IP ${clientIP} sob justificativa: "${reason}"`,
      correlation_id: correlationId,
      user_id: targetUserId,
      ip: clientIP,
      metadata: {
        access_id: accessRecord?.id || null,
        fingerprint,
        email: authUser.user.email
      }
    });

    // 3. Gravar em audit_logs
    await supabase.from("audit_logs").insert({
      user_id: targetUserId,
      user_email: authUser.user.email,
      action: "Uso da conta de emergência",
      entity_type: "emergency_access",
      entity_id: accessRecord?.id || "emergency",
      ip_address: clientIP,
      new_data: { reason }
    });

    // 4. Gerar Magic Link de autenticação para o usuário super_admin
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: authUser.user.email,
      options: {
        redirectTo: `${req.headers.get("origin") || ""}/admin`
      }
    });

    if (linkError) {
      return new Response(
        JSON.stringify({ error: `Falha ao gerar link de acesso: ${linkError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        actionUrl: linkData.properties?.action_link || "",
        email: authUser.user.email
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
