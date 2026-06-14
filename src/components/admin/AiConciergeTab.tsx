import React, { useState, useEffect } from 'react';
import { Bot, Save, AlertCircle } from 'lucide-react';
import { api } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const AiConciergeTab: React.FC = () => {
  const { fingerprint, correlationId } = useAuth();
  
  // Reauth states
  const [showReauth, setShowReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthLoading, setReauthLoading] = useState(false);

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

  const handleSave = () => {
    setShowReauth(true);
    setReauthError(null);
    setReauthPassword('');
  };

  const handleReauthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setReauthLoading(true);
    setReauthError(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'request',
          targetType: 'ai_settings',
          targetId: '1',
          payload: {
            gemini_api_key: config.gemini_api_key,
            ai_name: config.ai_name,
            ai_greeting: config.ai_greeting,
            ai_prompt: config.ai_prompt,
            human_whatsapp: config.human_whatsapp
          },
          currentPassword: reauthPassword,
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setShowReauth(false);
      setReauthPassword('');
      alert("Solicitação enviada com sucesso! Um Super Admin diferente precisará homologar esta alteração na aba 'Aprovações Pendentes'.");
      await loadConfig();
    } catch (err: any) {
      setReauthError(err?.message || 'Falha ao reautenticar ou enviar solicitação.');
    } finally {
      setReauthLoading(false);
    }
  };

  if (loading) return <div className="text-white p-8 animate-pulse">Carregando configurações...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-white tracking-wider uppercase mb-1">Concierge de IA</h2>
          <p className="text-theme-muted text-sm">Configure o agente Gemini que atenderá pelo botão do WhatsApp.</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-gold hover:opacity-90 text-theme-text text-base font-bold uppercase rounded-lg transition disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="bg-luxury-gray border border-theme-border-faint rounded-xl p-6 space-y-6">
        
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block flex items-center gap-1">
            <Bot size={12} /> Gemini API Key (Chave Secreta)
          </label>
          <input
            type="password"
            value={config.gemini_api_key}
            onChange={(e) => setConfig({ ...config, gemini_api_key: e.target.value })}
            placeholder="AIzaSy..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:border-gold-500 transition"
          />
          <p className="text-[10px] text-theme-muted">A chave será usada apenas no servidor seguro (Supabase Edge Functions).</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
              Nome do Atendente (IA)
            </label>
            <input
              type="text"
              value={config.ai_name}
              onChange={(e) => setConfig({ ...config, ai_name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:border-gold-500 transition"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
              WhatsApp de Transbordo (Humano)
            </label>
            <input
              type="text"
              placeholder="+5511999999999"
              value={config.human_whatsapp}
              onChange={(e) => setConfig({ ...config, human_whatsapp: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:border-gold-500 transition"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
            Mensagem de Saudação Inicial
          </label>
          <textarea
            value={config.ai_greeting}
            onChange={(e) => setConfig({ ...config, ai_greeting: e.target.value })}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:border-gold-500 transition resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
            Prompt de Sistema (Instruções para a IA)
          </label>
          <textarea
            value={config.ai_prompt}
            onChange={(e) => setConfig({ ...config, ai_prompt: e.target.value })}
            rows={6}
            placeholder="Você é um concierge de luxo da loja Amour & Co..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-base text-white focus:border-gold-500 transition"
          />
          <p className="text-[10px] text-theme-muted flex items-center gap-1">
            <AlertCircle size={10} /> O catálogo de produtos ativos será injetado automaticamente ao final deste prompt.
          </p>
        </div>

      </div>

      {/* REAUTH MODAL FOR DOUBLE APPROVAL */}
      {showReauth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn text-left">
          <div className="absolute inset-0" onClick={() => { if (!reauthLoading) setShowReauth(false); }} />
          
          <form 
            onSubmit={handleReauthSubmit}
            className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 sm:p-8 shadow-2xl z-10 glow-gold space-y-4 text-theme-muted"
          >
            <div className="flex items-center gap-2 border-b border-theme-border-faint pb-3 text-gold-400">
              <Bot size={16} />
              <h4 className="text-sm font-bold uppercase tracking-wider">Ação Crítica da IA</h4>
            </div>

            {reauthError && (
              <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs p-3 rounded-xl">
                {reauthError}
              </div>
            )}

            <p className="text-xs text-theme-muted leading-relaxed">
              Você está alterando as configurações globais da Inteligência Artificial. Esta ação exige aprovação dupla de outro Super Admin.
              Por favor, confirme sua senha administrativa antes de enviar a solicitação.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">Digite sua Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={reauthPassword}
                onChange={e => setReauthPassword(e.target.value)}
                disabled={reauthLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 transition font-mono"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => { setShowReauth(false); setReauthPassword(''); setReauthError(null); }}
                className="px-4 py-2 rounded-lg text-[10px] font-semibold text-theme-muted hover:text-white transition"
                disabled={reauthLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={reauthLoading}
                className="bg-gradient-gold text-theme-text font-bold text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                {reauthLoading ? 'Confirmando...' : 'Confirmar e Solicitar'}
              </button>
            </div>

          </form>
        </div>
      )}
    </div>
  );
};
