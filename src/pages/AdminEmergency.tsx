import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Key, HelpCircle, FileText, Send, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface AdminEmergencyProps {
  onNavigate: (page: string) => void;
}

export const AdminEmergency: React.FC<AdminEmergencyProps> = ({ onNavigate }) => {
  const { fingerprint, correlationId } = useAuth();

  const [key, setKey] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [reason, setReason] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!key.trim() || !mfaCode.trim() || !reason.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    if (reason.trim().length < 10) {
      setError('A justificativa operacional deve conter pelo menos 10 caracteres explicativos.');
      setLoading(false);
      return;
    }

    try {
      if (!supabase) throw new Error('Conexão com banco de dados indisponível.');

      const { data, error: funcError } = await supabase.functions.invoke('emergency-auth', {
        body: {
          key: key.trim(),
          mfaCode: mfaCode.trim(),
          reason: reason.trim(),
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setSuccess(true);
      
      // Armazenar sinalização de sessão de emergência para auditoria local se necessário
      sessionStorage.setItem('amr_emergency_session', 'true');
      
      // Mostrar feedback e redirecionar pelo link retornado
      setTimeout(() => {
        if (data.actionUrl) {
          window.location.href = data.actionUrl;
        } else {
          onNavigate('admin');
        }
      }, 1500);

    } catch (err: any) {
      setError(err?.message || 'Erro ao validar acesso de contingência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-luxury-black flex items-center justify-center px-4 py-12 relative overflow-hidden">
      
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-luxury-black via-luxury-dark to-rose-950/20" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-gold-600/5 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg bg-luxury-gray border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl glow-rose space-y-6"
      >
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
            <ShieldAlert size={24} className="animate-pulse" />
          </div>
          <h2 className="font-serif text-xl sm:text-2xl text-white tracking-widest uppercase">
            Acesso de Contingência
          </h2>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest">
            Procedimento Break-Glass · Auditoria Crítica
          </p>
        </div>

        {/* Warning Banner */}
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-1.5 text-xs text-rose-400">
          <span className="font-bold uppercase tracking-wider block">⚠️ AVISO DE GOVERNANÇA ENTERPRISE</span>
          <p className="leading-relaxed text-theme-muted">
            Este canal é reservado para emergências (falha total de MFA, indisponibilidade ou corrupção de privilégios dos administradores). 
            Seu uso gera um log de severidade <strong className="text-rose-400">CRITICAL</strong> irrevogável contendo seu IP, metadados e fingerprint do dispositivo.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs p-4 rounded-xl">
            {error}
          </div>
        )}

        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-6 rounded-xl text-center space-y-2">
            <span className="block font-bold uppercase tracking-wider">Acesso Homologado!</span>
            <span className="block text-xs text-theme-muted">Iniciando redirecionamento para o Painel Administrativo...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Break Glass Key */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                Chave de Contingência (Break Glass Key)
              </label>
              <div className="relative">
                <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                <input
                  type="password"
                  placeholder="Insira a chave secreta..."
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition"
                  required
                />
              </div>
            </div>

            {/* Emergency MFA Token */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                Token MFA de Emergência
              </label>
              <div className="relative">
                <HelpCircle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" />
                <input
                  type="text"
                  placeholder="Código de segundo fator..."
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition"
                  required
                />
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold block">
                Justificativa Operacional Obrigatória
              </label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-theme-muted" />
                <textarea
                  placeholder="Explique detalhadamente o motivo do uso da chave de emergência (mínimo 10 caracteres)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 transition resize-none"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate('admin-login')}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 border border-theme-border hover:bg-white/5 text-theme-muted hover:text-white px-4 py-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
              >
                <ArrowLeft size={12} /> Voltar ao Login
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition hover:shadow-lg hover:shadow-rose-600/20 cursor-pointer disabled:opacity-40"
              >
                {loading ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Ativar Break-Glass</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </motion.div>
      
    </div>
  );
};
