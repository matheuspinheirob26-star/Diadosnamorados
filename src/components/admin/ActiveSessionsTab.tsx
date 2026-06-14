import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Laptop, ShieldAlert, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export const ActiveSessionsTab: React.FC = () => {
  const { adminUser, fingerprint, revokeSession } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!supabase || !adminUser) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', adminUser.id)
        .order('last_activity', { ascending: false });
      
      if (!error && data) {
        setSessions(data);
      }
    } catch (err) {
      console.warn('Erro ao carregar sessões:', err);
    } finally {
      setLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    if (confirm("Deseja mesmo revogar esta sessão? O dispositivo associado será deslogado na próxima atividade.")) {
      await revokeSession(sessionId);
      await loadSessions();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Dispositivos & Sessões Ativas
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Audite e gerencie logins ativos vinculados à sua credencial
          </p>
        </div>
        <button 
          onClick={loadSessions} 
          disabled={loading}
          className="p-2 bg-white/5 border border-theme-border hover:bg-white/10 rounded-lg text-theme-muted hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="p-16 text-center text-theme-muted bg-luxury-gray border border-theme-border-faint rounded-3xl">
          <Activity size={32} className="mx-auto text-theme-border opacity-40 mb-2" />
          <p className="text-sm">Nenhuma sessão ativa identificada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => {
            const isCurrent = session.device_fingerprint === fingerprint;
            return (
              <div 
                key={session.id} 
                className={`bg-luxury-gray border p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between gap-4 transition duration-300 ${
                  session.is_active 
                    ? isCurrent 
                      ? 'border-gold-500/40 bg-gold-500/5 glow-gold'
                      : 'border-theme-border-faint hover:border-white/15'
                    : 'border-theme-border-faint opacity-40'
                }`}
              >
                
                {/* Details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      session.is_active 
                        ? 'bg-gold-500/10 border-gold-500/20 text-gold-400' 
                        : 'bg-white/5 border-theme-border text-theme-muted'
                    }`}>
                      <Laptop size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">
                          {session.browser} · {session.os}
                        </span>
                        {isCurrent && session.is_active && (
                          <span className="bg-gradient-gold text-theme-text text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                            Este Dispositivo
                          </span>
                        )}
                        {!session.is_active && (
                          <span className="bg-rose-950 border border-rose-500/30 text-rose-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full">
                            Revogada
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-theme-muted font-mono block mt-0.5">
                        IP: {session.ip} ({session.city}, {session.country})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-theme-muted border-t border-theme-border-faint/50 pt-2 font-mono">
                    <div>Resolução: {session.screen_resolution}</div>
                    <div>Timezone: {session.timezone}</div>
                    <div>Idioma: {session.language}</div>
                    <div>Plataforma: {session.platform}</div>
                  </div>
                </div>

                {/* Revoke action */}
                <div className="flex items-center justify-between border-t border-theme-border-faint/50 pt-2">
                  <span className="text-[9px] text-theme-muted uppercase tracking-wider">
                    Atividade: {new Date(session.last_activity).toLocaleTimeString('pt-BR')}
                  </span>
                  
                  {session.is_active && !isCurrent ? (
                    <button
                      onClick={() => handleRevoke(session.session_id)}
                      className="flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <XCircle size={10} /> Encerrar Sessão
                    </button>
                  ) : null}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
