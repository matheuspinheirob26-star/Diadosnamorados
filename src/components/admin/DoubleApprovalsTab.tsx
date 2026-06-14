import React, { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Eye, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const DoubleApprovalsTab: React.FC = () => {
  const { adminUser, fingerprint, correlationId } = useAuth();
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  
  // Inputs
  const [passwordInput, setPasswordInput] = useState('');
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchApprovals = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('manage-approvals', {
        body: { action: 'list' }
      });
      if (fetchError) throw fetchError;
      if (data?.error) throw new Error(data.error);
      setApprovals(data?.approvals || []);
    } catch (err: any) {
      console.error('Erro ao buscar aprovações:', err);
      setError(err?.message || 'Falha ao buscar fila de aprovações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const handleApproveConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval || !supabase) return;
    setModalLoading(true);
    setModalError(null);

    if (!passwordInput.trim()) {
      setModalError('Digite sua senha para confirmar a reautenticação.');
      setModalLoading(false);
      return;
    }

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'decide',
          id: selectedApproval.id,
          decision: 'approved',
          currentPassword: passwordInput.trim(),
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setShowApproveModal(false);
      setSelectedApproval(null);
      setPasswordInput('');
      await fetchApprovals();
    } catch (err: any) {
      setModalError(err?.message || 'Erro ao homologar aprovação.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRejectConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval || !supabase) return;
    setModalLoading(true);
    setModalError(null);

    if (!rejectionReasonInput.trim()) {
      setModalError('Forneça o motivo da rejeição.');
      setModalLoading(false);
      return;
    }

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-approvals', {
        body: {
          action: 'decide',
          id: selectedApproval.id,
          decision: 'rejected',
          rejectionReason: rejectionReasonInput.trim(),
          fingerprint
        },
        headers: {
          'correlation-id': correlationId
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setShowRejectModal(false);
      setSelectedApproval(null);
      setRejectionReasonInput('');
      await fetchApprovals();
    } catch (err: any) {
      setModalError(err?.message || 'Erro ao rejeitar solicitação.');
    } finally {
      setModalLoading(false);
    }
  };

  // Helper mapping target_type to readable labels
  const getTargetLabel = (type: string) => {
    const map: Record<string, string> = {
      'gateway_configs': 'Configurações de Gateways',
      'ai_settings': 'Parâmetros Concierge IA',
      'user_roles_promote': 'Promoção de Operador',
      'user_roles_demote': 'Rebaixamento de Operador',
      'user_roles_permissions': 'Alteração de Permissões',
      'user_delete': 'Soft Delete de Operador'
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Central de Governança — Aprovação Dupla (2-Man Rule)
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Revisão e homologação de operações críticas por múltiplos administradores
          </p>
        </div>
        <button
          onClick={fetchApprovals}
          disabled={loading}
          className="p-2 bg-white/5 border border-theme-border hover:bg-white/10 rounded-lg text-theme-muted hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Warning banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex gap-3 text-xs text-amber-400">
        <AlertTriangle size={18} className="shrink-0" />
        <div>
          <span className="font-bold block uppercase tracking-wider">Regras de Aprovação Dupla</span>
          <p className="text-theme-muted leading-relaxed mt-1">
            Por compliance, você <strong className="text-amber-400">não pode</strong> aprovar suas próprias solicitações, 
            nem aprovações geradas a partir do mesmo IP ou fingerprint do dispositivo solicitante. Todas as aprovações expiram em 24h.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <RefreshCw className="animate-spin text-gold-500" size={24} />
            <span className="text-xs text-theme-muted">Carregando fila de governança...</span>
          </div>
        ) : error ? (
          <div className="p-16 text-center space-y-2 text-rose-400">
            <AlertTriangle size={24} className="mx-auto" />
            <p className="text-xs">{error}</p>
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-16 text-center text-theme-muted">
            <ShieldCheck size={28} className="mx-auto text-theme-border opacity-30 mb-2" />
            <p className="text-sm">Nenhuma solicitação pendente no momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/2 select-none uppercase tracking-widest font-mono">
                  <th className="p-3 pl-4">Criado em</th>
                  <th className="p-3">Operação</th>
                  <th className="p-3 font-mono">Identificador</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Expira em</th>
                  <th className="p-3 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {approvals.map((app) => {
                  const isRequester = app.requester_id === adminUser?.id;
                  const isExpired = new Date(app.expires_at) < new Date();
                  
                  return (
                    <tr key={app.id} className="hover:bg-white/1 transition duration-150">
                      
                      {/* Created At */}
                      <td className="p-3 pl-4 font-mono text-[10px]">
                        {new Date(app.created_at).toLocaleString('pt-BR')}
                      </td>

                      {/* Operation */}
                      <td className="p-3 font-semibold text-white">
                        {getTargetLabel(app.target_type)}
                      </td>

                      {/* Target Identifier */}
                      <td className="p-3 font-mono text-[10px] text-theme-text">
                        {app.target_id}
                      </td>

                      {/* Status */}
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono ${
                          app.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                          app.status === 'rejected' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
                          isExpired || app.status === 'expired' ? 'bg-gray-500/15 text-theme-muted border border-gray-500/30' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                        }`}>
                          {isExpired && app.status === 'pending' ? 'EXPIRED' : app.status}
                        </span>
                      </td>

                      {/* Expires At */}
                      <td className="p-3 font-mono text-[10px]">
                        {new Date(app.expires_at).toLocaleTimeString('pt-BR')}
                      </td>

                      {/* Actions */}
                      <td className="p-3 pr-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => { setSelectedApproval(app); }}
                            className="p-1.5 bg-white/5 border border-theme-border hover:bg-white/10 hover:text-white rounded-lg transition cursor-pointer"
                            title="Ver Detalhes do Payload"
                          >
                            <Eye size={12} />
                          </button>

                          {app.status === 'pending' && !isExpired && (
                            <>
                              <button
                                onClick={() => { setSelectedApproval(app); setShowRejectModal(true); }}
                                disabled={isRequester}
                                className="p-1.5 bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-lg transition disabled:opacity-30 cursor-pointer"
                                title="Rejeitar Solicitação"
                              >
                                <XCircle size={12} />
                              </button>
                              <button
                                onClick={() => { setSelectedApproval(app); setShowApproveModal(true); }}
                                disabled={isRequester}
                                className="p-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg transition disabled:opacity-30 cursor-pointer"
                                title="Aprovar e Executar"
                              >
                                <CheckCircle2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW DETAILS DRAWER / MODAL */}
      {selectedApproval && !showApproveModal && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedApproval(null)} />
          <div className="relative w-full max-w-lg bg-luxury-gray border border-theme-border rounded-3xl p-6 shadow-2xl z-10 glow-gold space-y-4">
            
            <button
              onClick={() => setSelectedApproval(null)}
              className="absolute top-4 right-4 text-theme-muted hover:text-white cursor-pointer"
            >
              <XCircle size={16} />
            </button>

            <div className="border-b border-theme-border-faint pb-3">
              <span className="text-[9px] font-mono text-gold-400 uppercase font-bold tracking-widest">Aprovação Dupla #{selectedApproval.id.substring(0, 8)}</span>
              <h4 className="text-base font-serif text-white uppercase mt-0.5">{getTargetLabel(selectedApproval.target_type)}</h4>
              <p className="text-[10px] text-theme-muted mt-1">Solicitado por ID: {selectedApproval.requester_id}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[9px] text-theme-muted font-bold font-mono uppercase tracking-wider block">Modificações Solicitadas (Payload)</span>
              <pre className="bg-black/50 border border-theme-border-faint rounded-xl p-4 font-mono text-[10px] text-gold-400 overflow-x-auto max-h-60 select-all">
                {JSON.stringify(selectedApproval.payload, null, 2)}
              </pre>
            </div>

            {selectedApproval.status === 'rejected' && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-xs text-rose-400">
                <span className="font-bold uppercase tracking-wider block">Motivo da Rejeição:</span>
                <p className="mt-1">{selectedApproval.rejection_reason}</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* APPROVE VERIFICATION PASSWORD MODAL */}
      {showApproveModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => { if (!modalLoading) setShowApproveModal(false); }} />
          
          <form 
            onSubmit={handleApproveConfirm}
            className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 shadow-2xl z-10 glow-gold space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-theme-border-faint pb-3 text-gold-400">
              <Lock size={16} />
              <h4 className="text-sm font-bold uppercase tracking-wider">Confirmar Reautenticação</h4>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl">
                {modalError}
              </div>
            )}

            <p className="text-xs text-theme-muted leading-relaxed">
              Você está aprovando e executando a alteração em <strong>{getTargetLabel(selectedApproval.target_type)}</strong>. 
              Por segurança, redigite sua senha administrativa para validar o segundo fator.
            </p>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-theme-muted font-bold block">Digite sua Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={e => setPasswordInput(e.target.value)}
                disabled={modalLoading}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-gold-500 transition"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => { setShowApproveModal(false); setPasswordInput(''); setModalError(null); }}
                className="px-4 py-2 rounded-lg text-[10px] font-semibold text-theme-muted hover:text-white transition"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="bg-gradient-gold text-theme-text font-bold text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                {modalLoading ? 'Homologando...' : 'Confirmar e Aplicar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REJECT MOTIVE INPUT MODAL */}
      {showRejectModal && selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => { if (!modalLoading) setShowRejectModal(false); }} />
          
          <form 
            onSubmit={handleRejectConfirm}
            className="relative w-full max-w-md bg-luxury-gray border border-theme-border rounded-3xl p-6 shadow-2xl z-10 glow-rose space-y-4"
          >
            <div className="flex items-center gap-2 border-b border-theme-border-faint pb-3 text-rose-400">
              <XCircle size={16} />
              <h4 className="text-sm font-bold uppercase tracking-wider">Rejeitar Solicitação</h4>
            </div>

            {modalError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-xl">
                {modalError}
              </div>
            )}

            <p className="text-xs text-theme-muted leading-relaxed">
              Você está rejeitando a alteração em <strong>{getTargetLabel(selectedApproval.target_type)}</strong>. 
              Por favor, informe a justificativa operacional para o solicitante.
            </p>

            <div className="space-y-1">
              <label className="text-[9px] uppercase tracking-widest text-theme-muted font-bold block">Motivo da Rejeição</label>
              <textarea
                placeholder="Explique o motivo do indeferimento..."
                value={rejectionReasonInput}
                onChange={e => setRejectionReasonInput(e.target.value)}
                disabled={modalLoading}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 transition resize-none"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border-faint">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectionReasonInput(''); setModalError(null); }}
                className="px-4 py-2 rounded-lg text-[10px] font-semibold text-theme-muted hover:text-white transition"
                disabled={modalLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="bg-rose-600 text-white font-bold text-[10px] uppercase tracking-widest px-5 py-2.5 rounded-lg hover:shadow-lg transition cursor-pointer"
              >
                {modalLoading ? 'Registrando...' : 'Confirmar Rejeição'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
