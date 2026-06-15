import React, { useEffect, useState, useCallback } from 'react';
import { Key, RefreshCw, AlertTriangle, ShieldCheck, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const SecretsTab: React.FC = () => {
  const { adminUser, fingerprint, correlationId } = useAuth();
  const [secrets, setSecrets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request rotation modal state
  const [selectedSecret, setSelectedSecret] = useState<any | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSecrets = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      // Garantir dados iniciais se vazio
      const { data: initialCheck } = await supabase.from('secrets_governance').select('id');
      if (initialCheck && initialCheck.length === 0) {
        // Inicializar com chaves padrão para exibição e controle de idade
        await supabase.from('secrets_governance').upsert([
          { secret_name: 'gemini_api_key', secret_owner: 'Gemini AI Portal', last_rotated_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(), next_rotation_due_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), status: 'warning' },
          { secret_name: 'gateway_secret_mercadopago', secret_owner: 'Mercado Pago Dashboard', last_rotated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), next_rotation_due_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), status: 'active' },
          { secret_name: 'gateway_secret_stripe', secret_owner: 'Stripe Dashboard', last_rotated_at: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(), next_rotation_due_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), status: 'critical' }
        ]);
      }

      const { data, error: dbError } = await supabase
        .from('secrets_governance')
        .select('*')
        .order('secret_name', { ascending: true });

      if (dbError) throw dbError;
      setSecrets(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar secrets:', err);
      setError(err.message || 'Falha ao buscar governança de chaves.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  const handleOpenRequestModal = (secret: any) => {
    setSelectedSecret(secret);
    setShowRequestModal(true);
    setPasswordInput('');
    setModalError(null);
    setSuccessMessage(null);
  };

  const handleRequestRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSecret || !supabase) return;
    setModalLoading(true);
    setModalError(null);
    setSuccessMessage(null);

    if (!passwordInput.trim()) {
      setModalError('Informe sua senha atual para assinar a solicitação.');
      setModalLoading(false);
      return;
    }

    try {
      // O tipo de destino do 2-man rule é "gateway_configs" ou "ai_settings".
      // Vamos simular a solicitação de alteração de chave para o respectivo target
      const targetType = selectedSecret.secret_name === 'gemini_api_key' ? 'ai_settings' : 'gateway_configs';
      const targetId = selectedSecret.secret_name === 'gemini_api_key' ? '1' : selectedSecret.secret_name.replace('gateway_secret_', '');
      
      const payload = selectedSecret.secret_name === 'gemini_api_key' 
        ? { gemini_api_key: 'ROTATED_DEMO_KEY_' + crypto.randomUUID().substring(0, 8), ai_name: 'Concierge Rotated' }
        : { enabled: true, priority: 1, config: { publicKey: 'ROTATED_PUBLIC_KEY', clientSecret: 'ROTATED_SECRET' } };

      const { data, error: funcError } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'request',
          targetType,
          targetId,
          payload,
          currentPassword: passwordInput.trim(),
          fingerprint
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setSuccessMessage('Solicitação de rotação cadastrada e enviada para aprovação dupla!');
      setTimeout(() => {
        setShowRequestModal(false);
        setSelectedSecret(null);
        setPasswordInput('');
        loadSecrets();
      }, 2000);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao criar solicitação.');
    } finally {
      setModalLoading(false);
    }
  };

  const getStatusBadge = (status: string, nextRotation: string) => {
    const isExpired = new Date(nextRotation) < new Date();
    if (isExpired || status === 'critical') {
      return (
        <span className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          <ShieldAlert size={10} /> Crítico / Expirado
        </span>
      );
    }
    if (status === 'warning') {
      return (
        <span className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/25 text-amber-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
          <AlertTriangle size={10} /> Rotação Próxima
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
        <ShieldCheck size={10} /> Seguro / Ativo
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Governança de Secrets & Chaves
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Monitoramento de idade e rotação de credenciais de gateway de pagamento e IA
          </p>
        </div>
        <button 
          onClick={loadSecrets} 
          disabled={loading}
          className="p-2 bg-white/5 border border-theme-border hover:bg-white/10 rounded-lg text-theme-muted hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400 text-xs">
          <AlertTriangle className="mt-0.5 flex-shrink-0" size={16} />
          <p>{error}</p>
        </div>
      )}

      {/* Grid of Secrets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {secrets.map((sec) => {
          const lastRotated = new Date(sec.last_rotated_at);
          const nextDue = new Date(sec.next_rotation_due_at);
          const diffTime = nextDue.getTime() - Date.now();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isCritical = diffDays <= 0 || sec.status === 'critical';

          return (
            <div 
              key={sec.id}
              className={`bg-luxury-gray border p-5 rounded-2xl flex flex-col justify-between gap-4 transition duration-300 ${
                isCritical ? 'border-rose-500/20 bg-rose-500/5 glow-rose' : 'border-theme-border-faint hover:border-white/15'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                      isCritical ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' : 'bg-gold-500/10 border-gold-500/20 text-gold-400'
                    }`}>
                      <Key size={16} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm font-mono">{sec.secret_name}</h4>
                      <span className="text-[10px] text-theme-muted block">Dono: {sec.secret_owner}</span>
                    </div>
                  </div>
                  {getStatusBadge(sec.status, sec.next_rotation_due_at)}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] text-theme-muted border-t border-theme-border-faint/50 pt-3 font-mono">
                  <div>Última Rotação: {lastRotated.toLocaleDateString('pt-BR')}</div>
                  <div>Próxima Rotação: {nextDue.toLocaleDateString('pt-BR')}</div>
                  <div className="col-span-2">
                    Intervalo de Rotação: {sec.rotation_interval_days} dias
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-theme-border-faint/50 pt-3">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${
                  diffDays <= 0 ? 'text-rose-400' : diffDays <= 15 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {diffDays <= 0 ? 'Expirado' : `Expira em ${diffDays} dias`}
                </span>

                <button
                  onClick={() => handleOpenRequestModal(sec)}
                  className="flex items-center gap-1 bg-white/5 border border-theme-border hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <RefreshCw size={10} /> Solicitar Rotação
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Request Rotation Modal */}
      {showRequestModal && selectedSecret && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-theme-bg border border-theme-border max-w-md w-full rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-3 border-b border-theme-border-faint pb-3">
              <ShieldCheck className="text-gold-400" size={24} />
              <div>
                <h4 className="font-serif text-lg text-white uppercase tracking-wider">
                  Assinar Solicitação de Rotação
                </h4>
                <p className="text-[10px] text-theme-muted uppercase tracking-wider">
                  Operação exige validação do modelo 2-Man Rule
                </p>
              </div>
            </div>

            <p className="text-xs text-theme-muted leading-relaxed">
              Você está criando uma proposta para rotacionar o segredo <strong className="text-white font-mono">{selectedSecret.secret_name}</strong>. 
              Esta chave não será trocada imediatamente. A alteração ficará pendente de aprovação por outro administrador.
            </p>

            <form onSubmit={handleRequestRotation} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] text-theme-muted uppercase tracking-wider block">
                  Confirme sua Senha do Painel
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-luxury-gray border border-theme-border hover:border-white/15 focus:border-gold-500/40 text-white rounded-xl px-4 py-2.5 text-sm outline-none transition font-mono"
                  placeholder="Sua senha administrativa"
                  disabled={modalLoading}
                  required
                />
              </div>

              {modalError && (
                <div className="p-3 bg-rose-950/20 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="flex-shrink-0" />
                  <p>{modalError}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={14} className="flex-shrink-0" />
                  <p>{successMessage}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-xs border border-theme-border hover:bg-white/5 rounded-xl text-theme-muted hover:text-white transition"
                  disabled={modalLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-gradient-gold hover:brightness-110 text-theme-text font-bold rounded-xl transition flex items-center gap-1.5"
                  disabled={modalLoading}
                >
                  {modalLoading ? <RefreshCw size={12} className="animate-spin" /> : 'Confirmar Envio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
