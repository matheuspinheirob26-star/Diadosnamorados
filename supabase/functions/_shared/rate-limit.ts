import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface RateLimitOptions {
  ip: string;
  fingerprint?: string;
  userId?: string;
  sessionId?: string;
  endpoint: string;
  maxAttempts?: number;
  windowSeconds?: number;
}

/**
 * Valida o limite de requisições de forma composta.
 */
export async function checkRateLimit(req: Request, options: RateLimitOptions) {
  const {
    ip,
    fingerprint,
    userId,
    sessionId,
    endpoint,
    maxAttempts = 60,
    windowSeconds = 60
  } = options;

  // Monta chaves de limite compostas
  const keys = [
    `ip:${ip}:${endpoint}`,
    fingerprint ? `fp:${fingerprint}:${endpoint}` : null,
    userId ? `user:${userId}:${endpoint}` : null,
    sessionId ? `sess:${sessionId}:${endpoint}` : null
  ].filter(Boolean) as string[];

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });

  const now = new Date();

  for (const key of keys) {
    const { data, error } = await supabase
      .from("rate_limits")
      .select("id, attempts, last_attempt")
      .eq("client_key", key)
      .maybeSingle();

    if (error) {
      console.warn(`[RateLimit] Falha ao verificar chave '${key}':`, error.message);
      continue;
    }

    if (data) {
      const lastAttempt = new Date(data.last_attempt);
      const timeDiffSeconds = (now.getTime() - lastAttempt.getTime()) / 1000;

      if (timeDiffSeconds > windowSeconds) {
        // Nova janela de tempo
        await supabase
          .from("rate_limits")
          .update({
            attempts: 1,
            last_attempt: now.toISOString()
          })
          .eq("id", data.id);
      } else {
        const nextAttempts = data.attempts + 1;
        if (nextAttempts > maxAttempts) {
          // Registrar alerta de brute force em security_events caso passe do limite
          if (nextAttempts === maxAttempts + 1) {
            await supabase.from("security_events").insert({
              category: "SECURITY",
              severity: "WARNING",
              title: "Rate Limit Excedido (Brute Force Prevented)",
              description: `Bloqueio temporário ativado. Chave limite excedida: ${key}`,
              user_id: userId || null,
              ip: ip,
              metadata: { key, attempts: nextAttempts, endpoint }
            });
          }
          throw new Error("Limite de requisições excedido. Por favor, aguarde alguns instantes.");
        }

        await supabase
          .from("rate_limits")
          .update({
            attempts: nextAttempts,
            last_attempt: now.toISOString()
          })
          .eq("id", data.id);
      }
    } else {
      // Inserir registro inicial
      await supabase
        .from("rate_limits")
        .insert({
          client_key: key,
          attempts: 1,
          last_attempt: now.toISOString()
        });
    }
  }
}
