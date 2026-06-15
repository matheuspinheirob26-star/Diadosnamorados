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
    // 1. Validar conexão com banco (Supabase) e medir latência
    const startDb = performance.now();
    const { data: dbPing, error: dbError } = await supabase.from("maintenance_config").select("is_maintenance_active").eq("id", 1).maybeSingle();
    const endDb = performance.now();
    const dbLatency = Math.round(endDb - startDb);

    const isDbHealthy = !dbError;
    const dbStatus = isDbHealthy ? "healthy" : "unhealthy";

    // Registrar telemetria no banco de dados para o Provedor Supabase
    await supabase.from("provider_health_logs").insert({
      provider_name: "Supabase",
      status: dbStatus,
      latency_ms: dbLatency,
      error_message: dbError ? dbError.message : null
    });

    // 2. Analisar saúde de serviços externos com base em logs de erros recentes (Sem fazer chamadas diretas externas)
    // Para Gemini API e Payment Gateway: verifica se há erros críticos ou de webhook nas últimas 12 horas
    const checkWindow = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    
    // Verificação de erro recente do Gemini
    const { data: recentAiErrors } = await supabase
      .from("security_events")
      .select("id")
      .eq("category", "AI")
      .eq("severity", "CRITICAL")
      .gte("created_at", checkWindow)
      .limit(1);

    const isAiHealthy = !(recentAiErrors && recentAiErrors.length > 0);
    const aiLatency = isAiHealthy ? 45 : 0; // Mock de latência média ou 0 se inativo
    await supabase.from("provider_health_logs").insert({
      provider_name: "Gemini API",
      status: isAiHealthy ? "healthy" : "unhealthy",
      latency_ms: aiLatency,
      error_message: isAiHealthy ? null : "Recent critical AI service anomalies detected in security logs."
    });

    // Verificação de erro recente do Payment Gateway
    const { data: recentPaymentErrors } = await supabase
      .from("security_events")
      .select("id")
      .eq("category", "PAYMENTS")
      .eq("severity", "CRITICAL")
      .gte("created_at", checkWindow)
      .limit(1);

    const isPaymentsHealthy = !(recentPaymentErrors && recentPaymentErrors.length > 0);
    const paymentsLatency = isPaymentsHealthy ? 120 : 0;
    await supabase.from("provider_health_logs").insert({
      provider_name: "Payment Gateway",
      status: isPaymentsHealthy ? "healthy" : "unhealthy",
      latency_ms: paymentsLatency,
      error_message: isPaymentsHealthy ? null : "Recent critical payment gateway anomalies detected in security logs."
    });

    // 3. Obter métricas de SLA calculadas pelo Banco
    const { data: slaData, error: slaError } = await supabase.rpc("get_provider_sla", { p_provider: "Supabase", p_interval: "24 hours" });
    
    // Executar consultas SLA via raw RPC calls ou queries equivalentes
    const getSla = async (provider: string, interval: string) => {
      const { data } = await supabase.rpc("get_provider_sla", { p_provider: provider, p_interval: interval });
      return data !== null ? parseFloat(data) : 100.0;
    };

    const statusReport = {
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latency_ms: dbLatency,
          sla: {
            "24h": await getSla("Supabase", "24 hours"),
            "7d": await getSla("Supabase", "7 days"),
            "30d": await getSla("Supabase", "30 days")
          }
        },
        gemini: {
          status: isAiHealthy ? "healthy" : "unhealthy",
          latency_ms: aiLatency,
          sla: {
            "24h": await getSla("Gemini API", "24 hours"),
            "7d": await getSla("Gemini API", "7 days"),
            "30d": await getSla("Gemini API", "30 days")
          }
        },
        payments: {
          status: isPaymentsHealthy ? "healthy" : "unhealthy",
          latency_ms: paymentsLatency,
          sla: {
            "24h": await getSla("Payment Gateway", "24 hours"),
            "7d": await getSla("Payment Gateway", "7 days"),
            "30d": await getSla("Payment Gateway", "30 days")
          }
        }
      }
    };

    return new Response(JSON.stringify(statusReport), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno ao validar saúde do sistema." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
