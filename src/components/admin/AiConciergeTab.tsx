import React, { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle } from 'lucide-react';
import { api } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

export const AiConciergeTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    gemini_api_key: '',
    ai_name: 'Concierge',
    ai_greeting: 'Olá! Sou seu Concierge de luxo. Como posso ajudar você a encontrar o presente perfeito hoje?',
    ai_prompt: '',
    human_whatsapp: ''
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    if (supabase) {
      try {
        const response = await supabase.functions.invoke('chat-concierge', { body: { action: 'get_full_config' } });
        if (response.data && response.data.config) {
          const data = response.data.config;
          setConfig({
            gemini_api_key: data.gemini_api_key || '',
            ai_name: data.ai_name || 'Concierge',
            ai_greeting: data.ai_greeting || '',
            ai_prompt: data.ai_prompt || '',
            human_whatsapp: data.human_whatsapp || ''
          });
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    if (supabase) {
      try {
        const response = await supabase.functions.invoke('chat-concierge', {
          body: {
            action: 'save_config',
            config: {
              gemini_api_key: config.gemini_api_key,
              ai_name: config.ai_name,
              ai_greeting: config.ai_greeting,
              ai_prompt: config.ai_prompt,
              human_whatsapp: config.human_whatsapp,
            }
          }
        });
        
        if (response.error) throw response.error;
        alert('Configurações salvas com sucesso!');
      } catch (error) {
        alert('Erro ao salvar as configurações. Verifique os logs.');
        console.error(error);
      }
    }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-8 animate-pulse">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-white tracking-wider uppercase mb-1">Concierge de IA</h2>
          <p className="text-gray-400 text-xs">Configure o agente Gemini que atenderá pelo botão do WhatsApp.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-gold hover:opacity-90 text-gray-900 text-sm font-bold uppercase rounded-lg transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-luxury-gray border border-theme-border-faint rounded-xl p-6 space-y-6">
        
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block flex items-center gap-1">
            <Bot size={12} /> Gemini API Key (Chave Secreta)
          </label>
          <input
            type="password"
            value={config.gemini_api_key}
            onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
            placeholder="AIzaSy..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-gold-500 transition"
          />
          <p className="text-[10px] text-gray-500">A chave será usada apenas no servidor seguro (Supabase Edge Functions).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
              Nome do Atendente (IA)
            </label>
            <input
              type="text"
              value={config.ai_name}
              onChange={(e) => setConfig({ ...config, ai_name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-gold-500 transition"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
              WhatsApp de Transbordo (Humano)
            </label>
            <input
              type="text"
              placeholder="+5511999999999"
              value={config.human_whatsapp}
              onChange={(e) => setConfig({ ...config, human_whatsapp: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-gold-500 transition"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
            Mensagem de Saudação Inicial
          </label>
          <textarea
            value={config.ai_greeting}
            onChange={(e) => setConfig({ ...config, ai_greeting: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-gold-500 transition resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block">
            Prompt de Sistema (Instruções para a IA)
          </label>
          <textarea
            value={config.ai_prompt}
            onChange={(e) => setConfig({ ...config, ai_prompt: e.target.value })}
            rows={6}
            placeholder="Você é um concierge de luxo da loja Amour & Co..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-gold-500 transition"
          />
          <p className="text-[10px] text-gray-500 flex items-center gap-1">
            <AlertCircle size={10} /> O catálogo de produtos ativos será injetado automaticamente ao final deste prompt.
          </p>
        </div>

      </div>
    </div>
  );
};
