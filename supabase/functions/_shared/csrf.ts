import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Valida o token CSRF enviado no header contra o registrado na sessão do usuário no banco.
 */
export async function verifyCsrf(req: Request, userId: string) {
  const csrfToken = req.headers.get("x-csrf-token") || req.headers.get("X-CSRF-Token");
  const sessionId = req.headers.get("x-session-id") || req.headers.get("X-Session-ID");

  if (!csrfToken) {
    throw new Error("Validação CSRF falhou: Cabeçalho 'x-csrf-token' ausente.");
  }
  if (!sessionId) {
    throw new Error("Validação CSRF falhou: Cabeçalho 'x-session-id' ausente.");
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  // Buscar a sessão correspondente no banco
  const { data: session, error } = await supabase
    .from("user_sessions")
    .select("csrf_token, is_active")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !session) {
    throw new Error("Validação CSRF falhou: Sessão ativa correspondente não localizada.");
  }

  if (!session.is_active) {
    throw new Error("Validação CSRF falhou: Sessão inativa.");
  }

  if (session.csrf_token !== csrfToken) {
    // Registrar evento crítico de inconsistência
    await supabase.from("security_events").insert({
      category: "SECURITY",
      severity: "CRITICAL",
      title: "Falha de Validação CSRF (Possível Ataque)",
      description: `Foi enviada uma requisição com token CSRF inconsistente. Usuário: ${userId}.`,
      user_id: userId,
      metadata: {
        sessionId,
        receivedCsrf: csrfToken,
        expectedCsrf: session.csrf_token
      }
    });

    throw new Error("Validação CSRF falhou: Assinatura de token inválida.");
  }
}
