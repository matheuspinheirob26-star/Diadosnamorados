import React, { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, AlertTriangle, ShieldCheck, Clock, Gauge, BarChart2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const HealthMonitorTab: React.FC = () => {
  const { adminUser } = useAuth();
  const [healthData, setHealthData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: funcError } = await supabase.functions.invoke('health-check');
      if (funcError) throw funcError;
      setHealthData(data);
    } catch (err: any) {
      console.error('Erro ao buscar telemetria de saúde:', err);
      setError(err.message || 'Falha ao consultar monitor de saúde e SLAs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const getStatusIndicator = (status: string) => {
    if (status === 'healthy') {
      return (
        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse inline-block" /> ONLINE
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs">
        <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" /> ANOMALIA / FALHA
      </span>
    );
  };

  const getSlaColor = (sla: number) => {
    if (sla >= 99.9) return 'text-emerald-400';
    if (sla >= 99.0) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Monitor de Saúde & SLAs
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Uptime, latência de barramentos e disponibilidade contínua dos provedores de serviço
          </p>
        </div>
        <button 
          onClick={fetchHealth} 
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

      {/* SLA Metrics Cards */}
      {healthData && healthData.services ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Database Card */}
          <div className="bg-luxury-gray border border-theme-border-faint p-5 rounded-2xl space-y-4 hover:border-white/15 transition duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white text-sm">Banco de Dados Local</h4>
                <p className="text-[10px] text-theme-muted mt-0.5">Supabase Engine</p>
              </div>
              {getStatusIndicator(healthData.services.database.status)}
            </div>

            <div className="flex items-baseline justify-between border-t border-theme-border-faint/50 pt-3">
              <span className="text-xs text-theme-muted">Latência do Ping:</span>
              <span className="text-lg font-bold font-mono text-white">
                {healthData.services.database.latency_ms} ms
              </span>
            </div>

            <div className="space-y-2 border-t border-theme-border-faint/50 pt-3 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 24h:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.database.sla['24h'])}`}>
                  {healthData.services.database.sla['24h']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 7d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.database.sla['7d'])}`}>
                  {healthData.services.database.sla['7d']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 30d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.database.sla['30d'])}`}>
                  {healthData.services.database.sla['30d']}%
                </span>
              </div>
            </div>
          </div>

          {/* Gemini AI Card */}
          <div className="bg-luxury-gray border border-theme-border-faint p-5 rounded-2xl space-y-4 hover:border-white/15 transition duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white text-sm">Gemini AI Concierge</h4>
                <p className="text-[10px] text-theme-muted mt-0.5">Google Generative AI</p>
              </div>
              {getStatusIndicator(healthData.services.gemini.status)}
            </div>

            <div className="flex items-baseline justify-between border-t border-theme-border-faint/50 pt-3">
              <span className="text-xs text-theme-muted">Latência Cache:</span>
              <span className="text-lg font-bold font-mono text-white">
                {healthData.services.gemini.latency_ms > 0 ? `${healthData.services.gemini.latency_ms} ms` : 'N/A'}
              </span>
            </div>

            <div className="space-y-2 border-t border-theme-border-faint/50 pt-3 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 24h:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.gemini.sla['24h'])}`}>
                  {healthData.services.gemini.sla['24h']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 7d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.gemini.sla['7d'])}`}>
                  {healthData.services.gemini.sla['7d']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 30d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.gemini.sla['30d'])}`}>
                  {healthData.services.gemini.sla['30d']}%
                </span>
              </div>
            </div>
          </div>

          {/* Payment Gateway Card */}
          <div className="bg-luxury-gray border border-theme-border-faint p-5 rounded-2xl space-y-4 hover:border-white/15 transition duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-white text-sm">Gateways de Pagamento</h4>
                <p className="text-[10px] text-theme-muted mt-0.5">Multi-Gateway Hub</p>
              </div>
              {getStatusIndicator(healthData.services.payments.status)}
            </div>

            <div className="flex items-baseline justify-between border-t border-theme-border-faint/50 pt-3">
              <span className="text-xs text-theme-muted">Latência Média:</span>
              <span className="text-lg font-bold font-mono text-white">
                {healthData.services.payments.latency_ms > 0 ? `${healthData.services.payments.latency_ms} ms` : 'N/A'}
              </span>
            </div>

            <div className="space-y-2 border-t border-theme-border-faint/50 pt-3 text-[10px] font-mono">
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 24h:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.payments.sla['24h'])}`}>
                  {healthData.services.payments.sla['24h']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 7d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.payments.sla['7d'])}`}>
                  {healthData.services.payments.sla['7d']}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-theme-muted">SLA 30d:</span>
                <span className={`font-bold ${getSlaColor(healthData.services.payments.sla['30d'])}`}>
                  {healthData.services.payments.sla['30d']}%
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-theme-muted bg-luxury-gray border border-theme-border-faint rounded-3xl">
          <Activity size={32} className="mx-auto text-theme-border opacity-40 mb-2" />
          <p className="text-sm">Clique em atualizar para carregar dados de telemetria.</p>
        </div>
      )}

      {/* Latency Auditing Chart Representation */}
      <div className="bg-luxury-gray border border-theme-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-theme-border-faint pb-3">
          <BarChart2 className="text-gold-400" size={16} />
          <h4 className="font-serif text-sm text-white uppercase tracking-wider">Integridade de Resposta dos barramentos</h4>
        </div>
        <p className="text-xs text-theme-muted">
          A latência dos barramentos determina o tempo de resposta das transações de checkout e respostas do chatbot concierge. 
          Estabilidade e velocidades inferiores a 250ms garantem a máxima conversão e satisfação do cliente premium.
        </p>

        {healthData && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-theme-muted font-mono">
                <span>DATABASE DISPONIBILIDADE</span>
                <span>{healthData.services.database.latency_ms}ms / 300ms limit</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gold-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((healthData.services.database.latency_ms / 300) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-theme-muted font-mono">
                <span>GEMINI PORTAL INTERNO</span>
                <span>{healthData.services.gemini.latency_ms}ms / 150ms limit</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gold-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((healthData.services.gemini.latency_ms / 150) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-theme-muted font-mono">
                <span>PAYMENT METRICS ROUTING</span>
                <span>{healthData.services.payments.latency_ms}ms / 500ms limit</span>
              </div>
              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gold-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((healthData.services.payments.latency_ms / 500) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
