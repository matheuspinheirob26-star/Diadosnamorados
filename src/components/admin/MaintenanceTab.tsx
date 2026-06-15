import React, { useEffect, useState, useCallback } from 'react';
import { ToggleLeft, ToggleRight, AlertTriangle, ShieldCheck, RefreshCw, Plus, Trash2, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const MaintenanceTab: React.FC = () => {
  const { adminUser } = useAuth();
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [whitelistedIps, setWhitelistedIps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadMaintenanceConfig = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      // Configuração singleton
      const { data: config, error: configError } = await supabase
        .from('maintenance_config')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (configError) throw configError;
      if (config) {
        setIsMaintenanceActive(config.is_maintenance_active);
      }

      // IPs liberados
      const { data: ips, error: ipsError } = await supabase
        .from('maintenance_whitelist_ips')
        .select('*')
        .order('created_at', { ascending: false });

      if (ipsError) throw ipsError;
      setWhitelistedIps(ips || []);
    } catch (err: any) {
      console.error('Erro ao buscar configuração de manutenção:', err);
      setError(err.message || 'Falha ao buscar configurações de manutenção.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaintenanceConfig();
  }, [loadMaintenanceConfig]);

  const handleToggleMaintenance = async () => {
    if (!supabase) return;
    if (adminUser?.role !== 'super_admin') {
      alert('Apenas Super Admins podem alterar o modo de manutenção global.');
      return;
    }

    const nextState = !isMaintenanceActive;
    const msg = nextState 
      ? 'Deseja realmente ATIVAR o Modo de Manutenção? Clientes sem IP liberado serão redirecionados.' 
      : 'Deseja DESATIVAR o Modo de Manutenção global? A loja ficará aberta ao público.';

    if (!confirm(msg)) return;

    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('maintenance_config')
        .update({ 
          is_maintenance_active: nextState,
          updated_at: new Date().toISOString(),
          updated_by: adminUser.id
        })
        .eq('id', 1);

      if (updateError) throw updateError;
      setIsMaintenanceActive(nextState);

      // Registrar em security_events
      await supabase.from('security_events').insert({
        category: 'SYSTEM',
        severity: 'CRITICAL',
        title: nextState ? 'Modo Manutenção Ativado' : 'Modo Manutenção Desativado',
        description: `O operador ${adminUser.email} alterou o estado de manutenção global para ${nextState ? 'ATIVO' : 'INATIVO'}.`,
        user_id: adminUser.id
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao alterar modo de manutenção.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !ipInput.trim()) return;

    if (adminUser?.role !== 'super_admin') {
      alert('Apenas Super Admins podem liberar novos IPs.');
      return;
    }

    setLoading(true);
    try {
      const { error: insertError } = await supabase
        .from('maintenance_whitelist_ips')
        .insert([{
          ip: ipInput.trim(),
          description: descInput.trim() || 'Liberação manual de admin',
          created_by: adminUser.id
        }]);

      if (insertError) throw insertError;
      
      setIpInput('');
      setDescInput('');
      await loadMaintenanceConfig();
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar IP.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIp = async (id: string, ip: string) => {
    if (!supabase) return;
    if (adminUser?.role !== 'super_admin') {
      alert('Apenas Super Admins podem remover IPs da lista.');
      return;
    }

    if (!confirm(`Remover IP ${ip} da lista de bypass?`)) return;

    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('maintenance_whitelist_ips')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      await loadMaintenanceConfig();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover IP.');
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
            Controle de Modo Manutenção
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Suspenda temporariamente a operação do storefront mantendo acesso administrativo
          </p>
        </div>
        <button 
          onClick={loadMaintenanceConfig} 
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

      {/* Main Switch Card */}
      <div className="bg-luxury-gray border border-theme-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-lg">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-gold-400" />
            <h4 className="font-serif text-sm text-white uppercase tracking-wider">Estado de Manutenção Global</h4>
          </div>
          <p className="text-xs text-theme-muted leading-relaxed">
            Ao ativar o modo de manutenção, o storefront principal da Amour & Co. exibirá uma tela de placeholder elegante. 
            Apenas requisições vindas de endereços IP cadastrados abaixo conseguirão navegar no site.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleToggleMaintenance}
            disabled={loading || adminUser?.role !== 'super_admin'}
            className={`p-2 rounded-xl transition cursor-pointer ${
              adminUser?.role !== 'super_admin' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isMaintenanceActive ? (
              <ToggleRight size={50} className="text-gold-500" />
            ) : (
              <ToggleLeft size={50} className="text-theme-muted" />
            )}
          </button>
          <span className={`text-[10px] uppercase font-bold tracking-wider ${
            isMaintenanceActive ? 'text-gold-400' : 'text-theme-muted'
          }`}>
            {isMaintenanceActive ? 'MANUTENÇÃO ATIVA' : 'SISTEMA ABERTO'}
          </span>
        </div>
      </div>

      {/* Grid: Form to Add IP and Whitelist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Form to Add IP */}
        <div className="bg-luxury-gray border border-theme-border p-5 rounded-2xl space-y-4">
          <h4 className="font-serif text-xs text-white uppercase tracking-wider border-b border-theme-border-faint pb-2">
            Liberar Endereço IP
          </h4>
          
          <form onSubmit={handleAddIp} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] text-theme-muted uppercase tracking-wider block">Endereço IP</label>
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border text-white text-xs rounded-xl px-3.5 py-2outline-none focus:border-gold-500/40 outline-none font-mono"
                placeholder="Ex: 200.150.10.5"
                disabled={loading || adminUser?.role !== 'super_admin'}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-theme-muted uppercase tracking-wider block">Descrição/Nome</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full bg-theme-bg border border-theme-border text-white text-xs rounded-xl px-3.5 py-2 outline-none focus:border-gold-500/40 outline-none"
                placeholder="Ex: Notebook CEO"
                disabled={loading || adminUser?.role !== 'super_admin'}
              />
            </div>

            <button
              type="submit"
              disabled={loading || adminUser?.role !== 'super_admin'}
              className="w-full py-2 bg-gradient-gold hover:brightness-110 text-theme-text font-bold text-xs rounded-xl transition flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Adicionar Bypass
            </button>
          </form>
        </div>

        {/* IP whitelist grid */}
        <div className="md:col-span-2 bg-luxury-gray border border-theme-border p-5 rounded-2xl space-y-4">
          <h4 className="font-serif text-xs text-white uppercase tracking-wider border-b border-theme-border-faint pb-2">
            IPs com Acesso Liberado (Whitelist)
          </h4>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {whitelistedIps.map((ip) => (
              <div 
                key={ip.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-theme-border-faint rounded-xl text-xs hover:border-white/10 transition"
              >
                <div>
                  <span className="font-mono text-white font-semibold">{ip.ip}</span>
                  <p className="text-[10px] text-theme-muted">{ip.description}</p>
                </div>

                {adminUser?.role === 'super_admin' && (
                  <button
                    onClick={() => handleRemoveIp(ip.id, ip.ip)}
                    className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {whitelistedIps.length === 0 && (
              <div className="p-8 text-center text-theme-muted font-mono text-[11px]">
                Nenhum IP cadastrado na whitelist de manutenção.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
