import React, { useState } from 'react';
import { ShieldAlert, Download, RefreshCw, Trash2, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const LgpdTab: React.FC = () => {
  const { adminUser } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !supabase) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreviewData(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-lgpd', {
        body: {
          action: 'export',
          email: emailInput.trim().toLowerCase()
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setPreviewData(data);
      setSuccess('Dados do cliente localizados e exportados com sucesso!');
    } catch (err: any) {
      setError(err.message || 'Erro ao exportar dados do cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadJson = () => {
    if (!previewData) return;
    const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lgpd_export_${emailInput.trim().toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAnonymize = async () => {
    if (!emailInput.trim() || !supabase) return;
    
    const doubleConfirm = confirm(
      `ATENÇÃO: A anonimização de dados é um processo IRREVERSÍVEL.\n\n` +
      `Isso irá hashificar permanentemente o nome, email, telefone e CPF do cliente nos registros de Pedidos, Leads e Históricos de Chat, além de apagar suas conversas.\n\n` +
      `Os totais financeiros e datas serão preservados para auditoria fiscal.\n\n` +
      `Deseja realmente continuar com a anonimização para "${emailInput.trim()}"?`
    );

    if (!doubleConfirm) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setPreviewData(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('manage-lgpd', {
        body: {
          action: 'anonymize',
          email: emailInput.trim().toLowerCase()
        }
      });

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setSuccess('Dados pessoais anonimizados permanentemente no banco de dados!');
      setEmailInput('');
    } catch (err: any) {
      setError(err.message || 'Falha ao anonimizar registros.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Privacidade & Conformidade LGPD
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Atenda a direitos de acesso (Exportação) e de esquecimento (Anonimização) do titular de dados
          </p>
        </div>
      </div>

      {error && (
        <div data-testid="lgpd-error" className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400 text-xs">
          <AlertTriangle className="mt-0.5 flex-shrink-0" size={16} />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div data-testid="lgpd-success" className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl flex items-start gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="mt-0.5 flex-shrink-0" size={16} />
          <p>{success}</p>
        </div>
      )}

      {/* Main Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search Panel */}
        <div className="bg-luxury-gray border border-theme-border p-5 rounded-2xl space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-gold-400" />
            <h4 className="font-serif text-xs text-white uppercase tracking-wider">Buscar Titular</h4>
          </div>

          <form onSubmit={handleExport} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-theme-muted uppercase tracking-wider block">Email do Cliente</label>
              <input
                type="email"
                data-testid="lgpd-email-input"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border text-white text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-gold-500/40"
                placeholder="cliente@email.com"
                disabled={loading}
                required
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                data-testid="lgpd-export-btn"
                disabled={loading}
                className="flex-1 py-2 bg-gradient-gold hover:brightness-110 text-theme-text font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <FileText size={12} />} Exportar Dados
              </button>

              <button
                type="button"
                data-testid="lgpd-anonymize-btn"
                onClick={handleAnonymize}
                disabled={loading || !emailInput.trim()}
                className="py-2 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
              >
                <Trash2 size={12} /> Esquecer
              </button>
            </div>
          </form>
        </div>

        {/* Preview Panel */}
        <div className="md:col-span-2 bg-luxury-gray border border-theme-border p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-theme-border-faint pb-3">
            <h4 className="font-serif text-xs text-white uppercase tracking-wider">
              Visualização de Relatório LGPD
            </h4>
            {previewData && (
              <button
                onClick={handleDownloadJson}
                className="flex items-center gap-1 bg-white/5 border border-theme-border hover:bg-white/10 text-white font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg transition"
              >
                <Download size={10} /> Baixar JSON
              </button>
            )}
          </div>

          {previewData ? (
            <div className="space-y-4">
              <p className="text-[10px] text-theme-muted font-mono">
                Dados gerados em: {new Date(previewData.exported_at).toLocaleString('pt-BR')}
              </p>

              <div className="bg-black/40 border border-theme-border-faint p-4 rounded-xl max-h-[300px] overflow-y-auto font-mono text-[10px] text-theme-muted">
                <pre>{JSON.stringify(previewData.data, null, 2)}</pre>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-theme-muted font-mono text-xs">
              Busque por um e-mail cadastrado para visualizar e auditar o relatório completo de PII do cliente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
