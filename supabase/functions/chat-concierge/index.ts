import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { verifyAdminSession } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Função Auxiliar de Rate Limit (Ajuste 5) ---
async function checkRateLimit(supabase: any, clientIp: string, leadId?: string) {
  const now = new Date();
  const windowMinutes = 1;
  const maxMessagesPerMinute = 10;
  const windowStart = new Date(now.getTime() - windowMinutes * 60_000).toISOString();

  // Obter contagem de mensagens no último minuto
  let query = supabase
    .from("chat_rate_limits")
    .select("id, ip, lead_id, message_count, window_start")
    .gt("window_start", windowStart);

  if (leadId) {
    query = query.or(`ip.eq.${clientIp},lead_id.eq.${leadId}`);
  } else {
    query = query.eq("ip", clientIp);
  }

  const { data: records, error } = await query;
  if (error) {
    console.error("Erro no rate limit db check:", error);
    return; // Evita indisponibilidade do chat em caso de erro na tabela
  }

  let totalMessages = 0;
  let activeRecord: any = null;

  for (const record of (records || [])) {
    totalMessages += record.message_count;
    if (record.ip === clientIp || (leadId && record.lead_id === leadId)) {
      activeRecord = record;
    }
  }

  if (totalMessages >= maxMessagesPerMinute) {
    throw new Error("Muitas mensagens enviadas. Limite de 10 mensagens por minuto excedido. Por favor, aguarde.");
  }

  // Incrementar contador ou inserir novo registro
  if (activeRecord) {
    await supabase
      .from("chat_rate_limits")
      .update({
        message_count: activeRecord.message_count + 1,
        window_start: activeRecord.window_start
      })
      .eq("id", activeRecord.id);
  } else {
    await supabase
      .from("chat_rate_limits")
      .insert({
        ip: clientIp,
        lead_id: leadId || null,
        message_count: 1,
        window_start: now.toISOString()
      });
  }
}

serve(async (req) => {
  // 1. Tratamento do preflight de CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    // Usar a Service Role Key para persistir dados além do RLS padrão
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const body = await req.json();
    const { action, leadId, message, chatHistory, leadName, leadEmail, leadPhone } = body;

    // --- Ações Públicas (Não exigem login de administrador) ---

    // Ação: Iniciar / Obter configurações públicas
    if (action === "init") {
      // Exclui gemini_api_key e ai_prompt da busca para proteção de segredos
      const { data: aiSettings, error } = await supabase
        .from("ai_settings")
        .select("ai_name, ai_greeting, human_whatsapp")
        .eq("id", 1)
        .single();
        
      if (error) throw error;
      return new Response(JSON.stringify({ config: aiSettings }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Ações Administrativas (Exigem validação JWT e Papel) ---

    if (action === "save_config") {
      await verifyAdminSession(req, ["super_admin", "admin"]);
      const { config } = body;
      const { error } = await supabase.from("ai_settings").upsert({
        id: 1,
        ...config,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_full_config") {
      await verifyAdminSession(req, ["super_admin", "admin", "manager"]);
      const { data: aiSettings, error } = await supabase.from("ai_settings").select("*").eq("id", 1).single();
      if (error) throw error;
      return new Response(JSON.stringify({ config: aiSettings }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_history") {
      await verifyAdminSession(req, ["super_admin", "admin", "manager", "support"]);
      if (!leadId) throw new Error("Missing leadId");
      const { data: lead, error } = await supabase.from("chat_leads").select("chat_history").eq("id", leadId).single();
      if (error) throw error;
      return new Response(JSON.stringify({ history: lead?.chat_history || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Ação de Conversação Principal ---
    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Rate Limiting (Ajuste 5)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    try {
      await checkRateLimit(supabase, clientIp, leadId);
    } catch (limitErr: any) {
      return new Response(JSON.stringify({ 
        error: "Rate limit excedido.",
        response: limitErr.message 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Rate Limit adicional: Máximo de 50 mensagens por lead (existente)
    const currentHistoryCount = Array.isArray(chatHistory) ? chatHistory.length : 0;
    if (currentHistoryCount > 50) {
      return new Response(JSON.stringify({ 
        error: "Limite de mensagens atingido.", 
        response: "Atingimos o limite desta conversa por aqui. Por favor, clique em 'Continuar no WhatsApp Humano' para finalizarmos seu atendimento com um especialista!" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter chaves e configurações da IA do banco de dados (Secretas)
    const { data: aiSettings, error: aiError } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (aiError || !aiSettings || !aiSettings.gemini_api_key) {
      console.error("Erro ao obter chaves da IA:", aiError);
      return new Response(JSON.stringify({ 
        error: "Serviço de IA temporariamente indisponível.",
        response: "Perdão, estou enfrentando uma instabilidade técnica. Por favor, clique no botão 'Continuar no WhatsApp Humano' abaixo para falar com um humano."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Obter contexto do catálogo de produtos (Ativos)
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, description, status, stock, allow_out_of_stock_sale, sizes")
      .eq("status", "publicado");

    const catalogContext = products?.map(p => 
      `- ${p.name} (R$ ${p.price}): ${p.description}. Estoque: ${p.stock > 0 ? 'Disponível' : (p.allow_out_of_stock_sale ? 'Sob encomenda' : 'Esgotado')}.`
    ).join("\n") || "Nenhum produto disponível no momento.";

    const systemPrompt = `
      ${aiSettings.ai_prompt}
      
      Seu nome é: ${aiSettings.ai_name}.
      Seja sempre extremamente educado e persuasivo.
      Se o cliente quiser falar com um humano, diga que ele pode clicar no botão "Continuar no WhatsApp" que fica na janela.
      
      Aqui está o catálogo de produtos atualizado da loja Amour & Co:
      ${catalogContext}
      
      IMPORTANTE: Use formatação Markdown nas suas respostas para deixar o texto bonito (ex: negrito, itálico).
      Seja conciso e natural, não escreva textos muito grandes.
    `;

    // Iniciar SDK do Gemini
    const genAI = new GoogleGenerativeAI(aiSettings.gemini_api_key);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt 
    });

    const formattedHistory = Array.isArray(chatHistory) ? chatHistory.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })) : [];

    const chat = model.startChat({
      history: formattedHistory,
    });

    if (leadId && currentHistoryCount <= 1) {
      await supabase.from('system_logs').insert({
        action: 'Nova Conversa IA',
        description: `Novo lead capturado no chat: ${leadName || 'Desconhecido'} (${leadPhone || 'Sem telefone'})`,
        user_name: 'Sistema',
        user_email: 'sistema@amour.co',
        entity_type: 'lead',
        entity_id: leadId,
        severity: 'info'
      });
    }

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    if (leadId) {
      const updatedHistory = [
        ...(chatHistory || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: responseText, timestamp: new Date().toISOString() }
      ];

      await supabase
        .from('chat_leads')
        .update({ chat_history: updatedHistory, updated_at: new Date().toISOString() })
        .eq('id', leadId);
    }

    return new Response(JSON.stringify({ 
      response: responseText 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Erro na chamada do Concierge:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
