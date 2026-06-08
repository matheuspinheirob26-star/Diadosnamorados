import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    // Usar a Service Role Key para poder ler/escrever tabelas com RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Parse request
    const body = await req.json();
    const { action, leadId, message, chatHistory, leadName, leadEmail, leadPhone } = body;

    // Ação: Iniciar / Obter configurações públicas
    if (action === "init") {
      const { data: aiSettings } = await supabase.from("ai_settings").select("ai_name, ai_greeting, human_whatsapp").eq("id", 1).single();
      return new Response(JSON.stringify({ config: aiSettings }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ação: Salvar configurações (Admin)
    if (action === "save_config") {
      const { config } = body;
      const { error } = await supabase.from("ai_settings").upsert({
        id: 1,
        ...config,
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ação: Obter configurações completas (Admin)
    if (action === "get_full_config") {
      const { data: aiSettings } = await supabase.from("ai_settings").select("*").eq("id", 1).single();
      return new Response(JSON.stringify({ config: aiSettings }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ação: Obter histórico do lead (apenas Service Role)
    if (action === "get_history") {
      if (!leadId) throw new Error("Missing leadId");
      const { data: lead } = await supabase.from("chat_leads").select("chat_history").eq("id", leadId).single();
      return new Response(JSON.stringify({ history: lead?.chat_history || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: "Missing message" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7. RATE LIMIT (Máximo de 50 mensagens por lead)
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

    // 3. Obter configurações da IA do banco de dados (Secretas)
    const { data: aiSettings, error: aiError } = await supabase
      .from("ai_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (aiError || !aiSettings || !aiSettings.gemini_api_key) {
      console.error("AI Settings fetch error:", aiError);
      return new Response(JSON.stringify({ 
        error: "Serviço de IA temporariamente indisponível.",
        response: "Perdão, estou enfrentando uma instabilidade técnica. Por favor, clique no botão 'Continuar no WhatsApp Humano' abaixo para falar com um humano."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Obter contexto do catálogo de produtos (Ativos)
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, description, status, stock, allow_out_of_stock_sale, sizes")
      .eq("status", "publicado");

    const catalogContext = products?.map(p => 
      `- ${p.name} (R$ ${p.price}): ${p.description}. Estoque: ${p.stock > 0 ? 'Disponível' : (p.allow_out_of_stock_sale ? 'Sob encomenda' : 'Esgotado')}.`
    ).join("\n") || "Nenhum produto disponível no momento.";

    // 5. Configurar o Prompt do Sistema (Contexto)
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

    // 6. Iniciar o SDK do Gemini
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

    // Se o lead for muito novo (primeira mensagem), registra um Log do Sistema
    if (leadId && currentHistoryCount <= 1) {
      await supabase.from('system_logs').insert({
        action: 'Nova Conversa IA',
        description: `Novo lead capturado no chat: ${leadName || 'Desconhecido'} (${leadPhone || 'Sem telefone'})`,
        user: 'Sistema',
        entityType: 'lead',
        entityId: leadId,
        severity: 'info'
      });
    }

    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    // 9. Atualizar o histórico no banco de dados
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
    console.error("Error invoking Gemini:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
