import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { verifyAdminSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, correlation-id, x-csrf-token, x-session-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Security-Policy": "default-src 'none';",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin"
};

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

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

  // Apenas operadores autorizados (support, manager, admin, super_admin)
  let operatorUser;
  try {
    const authResult = await verifyAdminSession(req, ["super_admin", "admin", "manager", "support"]);
    operatorUser = authResult.user;
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Acesso não autorizado." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action, email } = body;

    if (!action || !email) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios ausentes (action, email)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailQuery = email.trim().toLowerCase();

    // --- AÇÃO: EXPORTAR DADOS (DIREITO DE ACESSO LGPD) ---
    if (action === "export") {
      // Registrar solicitação de export
      const { data: requestRecord } = await supabase.from("lgpd_requests").insert({
        request_type: "EXPORT",
        status: "processing"
      }).select().single();

      // Buscar pedidos
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_email", emailQuery);

      // Buscar leads
      const { data: leads } = await supabase
        .from("leads")
        .select("*")
        .eq("email", emailQuery);

      // Buscar chat leads
      const { data: chatLeads } = await supabase
        .from("chat_leads")
        .select("*")
        .eq("email", emailQuery);

      const payload = {
        exported_at: new Date().toISOString(),
        customer_email: email,
        data: {
          orders: orders || [],
          leads: leads || [],
          chat_leads: chatLeads || []
        }
      };

      // Atualizar solicitação como concluída
      if (requestRecord) {
        await supabase
          .from("lgpd_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", requestRecord.id);
      }

      // Registrar auditoria
      await supabase.from("audit_logs").insert({
        user_id: operatorUser.id,
        user_email: operatorUser.email,
        action: "Exportação LGPD efetuada",
        entity_type: "lgpd",
        entity_id: emailQuery,
        ip_address: clientIP,
        new_data: { email: emailQuery }
      });

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // --- AÇÃO: ANONYMIZE (DIREITO DE ESQUECIMENTO / ANONYMIZATION LGPD) ---
    if (action === "anonymize") {
      // Registrar solicitação de anonimização
      const { data: requestRecord } = await supabase.from("lgpd_requests").insert({
        request_type: "ANONYMIZE",
        status: "processing"
      }).select().single();

      const hashedEmail = await hashString(emailQuery);
      const anonymizedEmail = `${hashedEmail.substring(0, 12)}@lgpd.anonymized`;
      const anonymizedPhone = "00000000000";
      const anonymizedCpf = "00000000000";
      const anonymizedName = "Cliente Anonimizado";

      // 1. Anonimizar pedidos (Orders) mantendo integridade financeira
      const { data: matchedOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_email", emailQuery);

      if (matchedOrders && matchedOrders.length > 0) {
        for (const order of matchedOrders) {
          await supabase
            .from("orders")
            .update({
              customer_name: anonymizedName,
              customer_email: anonymizedEmail,
              customer_phone: anonymizedPhone,
              customer_cpf: anonymizedCpf,
              cep: "00000-000",
              address: "Endereço Anonimizado",
              number: "0",
              complement: "",
              neighborhood: "Anonimizado",
              city: "Anonimizado",
              state: "XX",
              tracking_code: order.tracking_code ? "ANON" : null
            })
            .eq("id", order.id);
        }
      }

      // 2. Anonimizar Leads
      await supabase
        .from("leads")
        .update({
          name: anonymizedName,
          email: anonymizedEmail,
          phone: anonymizedPhone
        })
        .eq("email", emailQuery);

      // 3. Anonimizar Chat Leads
      await supabase
        .from("chat_leads")
        .update({
          name: anonymizedName,
          phone: anonymizedPhone,
          email: anonymizedEmail,
          chat_history: "[]" // Limpa conversas por conter PII
        })
        .eq("email", emailQuery);

      // 4. Anonimizar Avaliações (Reviews)
      const { data: matchedReviews } = await supabase
        .from("reviews")
        .select("id")
        .eq("customer_name", emailQuery); // review armazena nome

      if (matchedReviews) {
        for (const rev of matchedReviews) {
          await supabase
            .from("reviews")
            .update({
              customer_name: "Cliente Anônimo",
              comment: "Comentário removido em conformidade com LGPD."
            })
            .eq("id", rev.id);
        }
      }

      // Atualizar solicitação como concluída
      if (requestRecord) {
        await supabase
          .from("lgpd_requests")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", requestRecord.id);
      }

      // Registrar auditoria
      await supabase.from("audit_logs").insert({
        user_id: operatorUser.id,
        user_email: operatorUser.email,
        action: "Anonimização LGPD executada",
        entity_type: "lgpd",
        entity_id: emailQuery,
        ip_address: clientIP,
        new_data: { hashedEmail: anonymizedEmail }
      });

      // Gravar security event
      await supabase.from("security_events").insert({
        category: "SYSTEM",
        severity: "INFO",
        title: "Anonimização LGPD Concluída",
        description: `Dados associados ao email informado foram permanentemente anonimizados para cumprimento de direito de exclusão.`,
        user_id: operatorUser.id,
        ip: clientIP,
        metadata: { hashedEmail: anonymizedEmail }
      });

      return new Response(JSON.stringify({ success: true, message: "Os dados pessoais foram anonimizados irreversivelmente." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(
      JSON.stringify({ error: `Ação inválida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno no processamento LGPD." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
