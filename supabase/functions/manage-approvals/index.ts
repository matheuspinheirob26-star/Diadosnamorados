import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyAdminSession } from "../_shared/auth.ts";

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
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

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
    const { action } = body;

    const clientIP = req.headers.get("x-forwarded-for") || (connInfo.remoteAddr as any)?.hostname || "127.0.0.1";
    const correlationId = req.headers.get("correlation-id") || req.headers.get("x-correlation-id") || crypto.randomUUID();

    // 1. CRIAR SOLICITAÇÃO (requer qualquer admin, mais reautenticação)
    if (action === "request") {
      let operatorUser;
      let operatorRole;
      try {
        const authResult = await verifyAdminSession(req, ["super_admin", "admin", "manager", "support"]);
        operatorUser = authResult.user;
        operatorRole = authResult.role;
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || "Acesso não autorizado." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { targetType, targetId, payload, fingerprint, currentPassword } = body;

      if (!targetType || !targetId || !payload || !currentPassword) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios ausentes para solicitação (targetType, targetId, payload, password)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reautenticação
      const tempUserClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { error: reauthError } = await tempUserClient.auth.signInWithPassword({
        email: operatorUser.email || "",
        password: currentPassword,
      });

      if (reauthError) {
        // Logar falha de reautenticação
        await supabase.from("security_events").insert({
          category: "AUTH",
          severity: "WARNING",
          title: "Falha de Reautenticação",
          description: `Usuário ${operatorUser.email} falhou ao reautenticar para ação crítica: ${targetType}.`,
          correlation_id: correlationId,
          user_id: operatorUser.id,
          ip: clientIP,
          metadata: { targetType, targetId }
        });

        return new Response(
          JSON.stringify({ error: "Senha incorreta. Ação não autorizada." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar registro na tabela double_approvals
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 horas
      
      const { data: requestRecord, error: requestError } = await supabase
        .from("double_approvals")
        .insert({
          requester_id: operatorUser.id,
          target_type: targetType,
          target_id: targetId,
          payload: {
            ...payload,
            metadata: {
              ip: clientIP,
              fingerprint: fingerprint || "não fornecido"
            }
          },
          status: "pending",
          expires_at: expiresAt
        })
        .select()
        .single();

      if (requestError) {
        return new Response(
          JSON.stringify({ error: `Erro ao criar solicitação de aprovação: ${requestError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Registrar auditoria
      await supabase.from("audit_logs").insert({
        user_id: operatorUser.id,
        user_email: operatorUser.email,
        action: "Solicitação de aprovação dupla criada",
        entity_type: "double_approvals",
        entity_id: requestRecord.id,
        ip_address: clientIP,
        new_data: { targetType, targetId }
      });

      return new Response(
        JSON.stringify({ success: true, requestId: requestRecord.id, message: "Solicitação enviada para aprovação." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. LISTAR SOLICITAÇÕES
    if (action === "list") {
      try {
        await verifyAdminSession(req, ["super_admin", "admin", "manager", "support"]);
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || "Acesso não autorizado." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar todos os pendentes
      const { data, error } = await supabase
        .from("double_approvals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ approvals: data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. DECIDIR (Aprovar ou Rejeitar — Restrito a super_admin)
    if (action === "decide") {
      let approverUser;
      try {
        const authResult = await verifyAdminSession(req, ["super_admin"]);
        approverUser = authResult.user;
      } catch (err: any) {
        return new Response(
          JSON.stringify({ error: err.message || "Apenas Super Admins podem aprovar ou rejeitar solicitações." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { id, decision, rejectionReason, fingerprint } = body;

      if (!id || !decision || !["approved", "rejected"].includes(decision)) {
        return new Response(
          JSON.stringify({ error: "Campos obrigatórios ausentes ou inválidos (id, decision)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar a solicitação
      const { data: request, error: fetchError } = await supabase
        .from("double_approvals")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (fetchError || !request) {
        return new Response(
          JSON.stringify({ error: "Solicitação de aprovação não encontrada." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (request.status !== "pending") {
        return new Response(
          JSON.stringify({ error: `Solicitação já finalizada com status "${request.status}".` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verificar expiração
      if (new Date(request.expires_at) < new Date()) {
        await supabase.from("double_approvals").update({ status: "expired" }).eq("id", id);
        return new Response(
          JSON.stringify({ error: "Solicitação expirou (limite de 24 horas excedido)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regra 1: Solicitante não pode ser aprovador
      if (request.requester_id === approverUser.id) {
        return new Response(
          JSON.stringify({ error: "Regra da Dupla Aprovação: O solicitante original não pode aprovar a própria ação." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regra 2: Mesmo IP não pode aprovar
      const requesterIp = request.payload?.metadata?.ip || "";
      if (requesterIp === clientIP && clientIP !== "127.0.0.1") {
        return new Response(
          JSON.stringify({ error: "Regra da Dupla Aprovação: Não é permitido aprovar solicitações vindas do mesmo endereço IP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Regra 3: Mesmo fingerprint não pode aprovar
      const requesterFingerprint = request.payload?.metadata?.fingerprint || "";
      if (fingerprint && requesterFingerprint === fingerprint) {
        return new Response(
          JSON.stringify({ error: "Regra da Dupla Aprovação: Não é permitido aprovar solicitações vindas do mesmo navegador/dispositivo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decisão: Rejeitado
      if (decision === "rejected") {
        await supabase
          .from("double_approvals")
          .update({
            status: "rejected",
            approver_id: approverUser.id,
            rejection_reason: rejectionReason || "Sem justificativa fornecida",
            approved_at: new Date().toISOString()
          })
          .eq("id", id);

        // Registrar auditoria
        await supabase.from("audit_logs").insert({
          user_id: approverUser.id,
          user_email: approverUser.email,
          action: "Solicitação de aprovação rejeitada",
          entity_type: "double_approvals",
          entity_id: id,
          ip_address: clientIP,
          new_data: { rejectionReason }
        });

        return new Response(
          JSON.stringify({ success: true, message: "Aprovação rejeitada com sucesso." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Decisão: Aprovado -> Executar a ação
      const { target_type, target_id, payload } = request;
      
      // Limpar campos de metadados do payload antes de persistir
      const cleanPayload = { ...payload };
      delete cleanPayload.metadata;

      // Executar a ação correspondente
      if (target_type === "gateway_configs") {
        // Atualizar gateway
        const { error: dbError } = await supabase
          .from("gateway_configs")
          .update({
            enabled: cleanPayload.enabled,
            priority: cleanPayload.priority,
            config: cleanPayload.config,
            updated_at: new Date().toISOString()
          })
          .eq("gateway", target_id);

        if (dbError) throw dbError;

      } else if (target_type === "ai_settings") {
        // Atualizar IA
        const { error: dbError } = await supabase
          .from("ai_settings")
          .update({
            gemini_api_key: cleanPayload.gemini_api_key,
            ai_name: cleanPayload.ai_name,
            ai_greeting: cleanPayload.ai_greeting,
            ai_prompt: cleanPayload.ai_prompt,
            human_whatsapp: cleanPayload.human_whatsapp,
            updated_at: new Date().toISOString()
          })
          .eq("id", 1);

        if (dbError) throw dbError;

      } else if (target_type === "user_roles_promote" || target_type === "user_roles_demote" || target_type === "user_roles_permissions") {
        // Atualizar papel de usuário
        const { error: dbError } = await supabase
          .from("user_roles")
          .update({
            role: cleanPayload.role,
            status: cleanPayload.status || "ativo",
            created_at: new Date().toISOString()
          })
          .eq("user_id", target_id);

        if (dbError) throw dbError;

      } else if (target_type === "user_delete") {
        // Soft delete no user_roles
        const { error: dbError } = await supabase
          .from("user_roles")
          .update({
            status: "bloqueado",
            deleted_at: new Date().toISOString(),
            deleted_by: request.requester_id,
            deletion_reason: cleanPayload.reason
          })
          .eq("user_id", target_id);

        if (dbError) throw dbError;

        // Revogar sessões
        await supabase
          .from("user_sessions")
          .update({ is_active: false, revoked_at: new Date().toISOString() })
          .eq("user_id", target_id);

        // Deslogar do Supabase Auth
        await supabase.auth.admin.signOut(target_id);

      } else {
        return new Response(
          JSON.stringify({ error: `Tipo de destino desconhecido: ${target_type}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Marcar aprovação como finalizada
      await supabase
        .from("double_approvals")
        .update({
          status: "approved",
          approver_id: approverUser.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", id);

      // Registrar auditoria do executor
      await supabase.from("audit_logs").insert({
        user_id: approverUser.id,
        user_email: approverUser.email,
        action: `Solicitação de aprovação ${target_type} aprovada e executada`,
        entity_type: "double_approvals",
        entity_id: id,
        ip_address: clientIP,
        new_data: { target_type, target_id }
      });

      // Gravar security_event CRITICAL para alteração de gateways/wallets/IA/permissoes
      await supabase.from("security_events").insert({
        category: "SECURITY",
        severity: "CRITICAL",
        title: `Alteração Crítica Efetuada: ${target_type}`,
        description: `Ação solicitada por ID ${request.requester_id} foi aprovada e executada por ${approverUser.email}. Destino: ${target_type} / ${target_id}`,
        correlation_id: correlationId,
        user_id: approverUser.id,
        ip: clientIP,
        metadata: { target_type, target_id }
      });

      return new Response(
        JSON.stringify({ success: true, message: "Solicitação aprovada e executada com sucesso." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação inválida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
