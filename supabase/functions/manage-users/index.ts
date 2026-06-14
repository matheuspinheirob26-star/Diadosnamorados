import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
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

// Zod schemas for input validation
const ListSchema = z.object({
  action: z.literal("list")
});

const CreateUserSchema = z.object({
  action: z.literal("create"),
  userData: z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: z.enum(["super_admin", "admin", "manager", "support"]),
    status: z.enum(["ativo", "suspenso", "bloqueado"]).default("ativo"),
    forcePasswordChange: z.boolean().default(false)
  })
});

const UpdateUserSchema = z.object({
  action: z.literal("update"),
  userData: z.object({
    id: z.string().uuid("ID inválido"),
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").optional(),
    role: z.enum(["super_admin", "admin", "manager", "support"]).optional(),
    status: z.enum(["ativo", "suspenso", "bloqueado"]).optional()
  })
});

const DeleteUserSchema = z.object({
  action: z.literal("delete"),
  userData: z.object({
    id: z.string().uuid("ID inválido"),
    reason: z.string().min(4, "Justificativa deve ter pelo menos 4 caracteres")
  })
});

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

  const clientIP = req.headers.get("x-forwarded-for") || (connInfo.remoteAddr as any)?.hostname || "127.0.0.1";
  const correlationId = req.headers.get("correlation-id") || req.headers.get("x-correlation-id") || crypto.randomUUID();

  try {
    const rawBody = await req.json();
    const action = rawBody.action;

    // --- AÇÃO: LISTAR OPERADORES (permitida para todos os admins ativos) ---
    if (action === "list") {
      let operatorRole;
      let operatorUser;
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

      // Validar payload
      const parseResult = ListSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Payload de listagem inválido.", details: parseResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar todos os usuários do Auth
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        return new Response(
          JSON.stringify({ error: `Erro ao listar usuários: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar papéis e status que NÃO estejam deletados (Soft Delete)
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, status, deleted_at")
        .is("deleted_at", null);

      if (rolesError) {
        return new Response(
          JSON.stringify({ error: `Erro ao buscar papéis: ${rolesError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mapear dados com máscara de dados sensíveis para papéis restritos
      const mappedUsers = users
        .filter((u: any) => roles?.some((r: any) => r.user_id === u.id))
        .map((u: any) => {
          const r = roles?.find((x: any) => x.user_id === u.id);
          const userRole = r?.role || "support";
          const userStatus = r?.status || "ativo";

          // Admins normais não veem dados sensíveis de super_admins/admins
          const isTargetAdmin = ["super_admin", "admin"].includes(userRole);
          const shouldMask = operatorRole === "admin" && isTargetAdmin && u.id !== operatorUser.id;

          return {
            id: shouldMask ? "masked" : u.id,
            email: shouldMask ? u.email.replace(/(..)(.*)(@.*)/, "$1***$3") : u.email,
            name: u.user_metadata?.name || u.email?.split("@")[0] || "Sem nome",
            role: userRole,
            status: userStatus,
            lastSignIn: shouldMask ? null : (u.last_sign_in_at || null),
            createdAt: shouldMask ? null : u.created_at
          };
        });

      // Ordenar por criação decrescente
      mappedUsers.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return new Response(
        JSON.stringify({ users: mappedUsers }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- AÇÕES DE ESCRITA: Exigem autenticação super_admin ---
    let operatorUser;
    try {
      const authResult = await verifyAdminSession(req, ["super_admin"]);
      operatorUser = authResult.user;
    } catch (err: any) {
      // Registrar tentativa negada em security_events (CRITICAL)
      await supabase.from("security_events").insert({
        category: "USERS",
        severity: "CRITICAL",
        title: "Tentativa de escrita não autorizada",
        description: `Usuário tentou executar '${action}' sem privilégios de super_admin. IP: ${clientIP}`,
        correlation_id: correlationId,
        ip: clientIP,
        metadata: { action }
      });

      return new Response(
        JSON.stringify({ error: "Acesso negado: Apenas Super Admin pode realizar esta operação." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO: CRIAR USUÁRIO
    if (action === "create") {
      const parseResult = CreateUserSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Dados inválidos para criação.", details: parseResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { name, email, password, role, status, forcePasswordChange } = parseResult.data.userData;

      // Se for promover a admin ou super_admin, exige aprovação dupla
      if (["super_admin", "admin"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "A criação de novos administradores exige aprovação dupla via Aprovações Pendentes." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Criar usuário no Supabase Auth
      const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
        app_metadata: { force_password_change: forcePasswordChange }
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: `Erro ao criar no Auth: ${createError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Inserir em user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: newAuthUser.user.id,
          role,
          status
        });

      if (roleError) {
        // Rollback
        await supabase.auth.admin.deleteUser(newAuthUser.user.id);
        return new Response(
          JSON.stringify({ error: `Erro ao salvar papel do usuário: ${roleError.message}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Registrar auditoria
      await supabase.from("audit_logs").insert({
        user_id: operatorUser.id,
        user_email: operatorUser.email,
        action: "usuário criado",
        entity_type: "users",
        entity_id: newAuthUser.user.id,
        ip_address: clientIP,
        new_data: { email, name, role, status }
      });

      return new Response(
        JSON.stringify({ success: true, user: { id: newAuthUser.user.id, email, name, role, status } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO: EDITAR USUÁRIO
    if (action === "update") {
      const parseResult = UpdateUserSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Dados inválidos para edição.", details: parseResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { id, name, role, status } = parseResult.data.userData;

      // Buscar papel e status anterior
      const { data: oldRoleData } = await supabase
        .from("user_roles")
        .select("role, status")
        .eq("user_id", id)
        .maybeSingle();

      if (!oldRoleData) {
        return new Response(
          JSON.stringify({ error: "Usuário não localizado no sistema." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bloquear auto-demissão / auto-bloqueio / auto-suspensão
      if (id === operatorUser.id) {
        if (role && role !== oldRoleData.role) {
          return new Response(
            JSON.stringify({ error: "Operação bloqueada: Você não pode alterar seu próprio privilégio administrativo." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status && status !== "ativo") {
          return new Response(
            JSON.stringify({ error: "Operação bloqueada: Você não pode bloquear ou suspender sua própria conta." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Se houver alteração de papel (role) ou status, exige aprovação dupla
      if ((role && role !== oldRoleData.role) || (status && status !== oldRoleData.status)) {
        return new Response(
          JSON.stringify({ error: "Alterações de permissões, papéis (roles) ou status exigem aprovação dupla via Central de Governança." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Atualizar metadados no auth
      if (name) {
        const { error: updateAuthError } = await supabase.auth.admin.updateUserById(id, {
          user_metadata: { name }
        });

        if (updateAuthError) {
          return new Response(
            JSON.stringify({ error: `Erro ao atualizar dados cadastrais: ${updateAuthError.message}` }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Dados atualizados com sucesso." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // AÇÃO: SOFT DELETE DE OPERADORES (sempre exige aprovação dupla!)
    if (action === "delete") {
      const parseResult = DeleteUserSchema.safeParse(rawBody);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Dados inválidos para exclusão.", details: parseResult.error.format() }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { id } = parseResult.data.userData;

      if (id === operatorUser.id) {
        return new Response(
          JSON.stringify({ error: "Operação bloqueada: Você não pode excluir sua própria conta administrativa." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Bloquear direto: exclusão deve ir por aprovação dupla!
      return new Response(
        JSON.stringify({ error: "A exclusão de operadores exige obrigatoriamente aprovação dupla via Aprovações Pendentes." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
