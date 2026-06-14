import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Valida a sessão JWT do cabeçalho de Autorização e verifica se o usuário tem privilégios de Admin.
 * Retorna as informações do usuário e sua role se for válido, ou lança um erro.
 */
export async function verifyAdminSession(req: Request, allowedRoles: string[] = ["super_admin", "admin", "manager"]) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Cabeçalho de autorização ausente ou malformatado.");
  }

  // Criar cliente Supabase com o token do usuário para validar o JWT
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    throw new Error("Sessão inválida ou expirada.");
  }

  // Buscar o papel do usuário usando o cliente Service Role (ignora RLS para leitura segura)
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const { data: roleData, error: roleError } = await serviceClient
    .from("user_roles")
    .select("role, status, deleted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError || !roleData) {
    throw new Error("Acesso negado: Perfil administrativo não localizado.");
  }

  if (roleData.deleted_at) {
    throw new Error("Acesso negado: Este usuário foi excluído.");
  }

  if (roleData.status !== "ativo") {
    throw new Error(`Acesso negado: Esta conta está inativa (${roleData.status}).`);
  }

  if (!allowedRoles.includes(roleData.role)) {
    throw new Error(`Acesso negado: Papel '${roleData.role}' insuficiente.`);
  }

  return { user, role: roleData.role };
}
