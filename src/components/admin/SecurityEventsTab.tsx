import React, { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Search, RefreshCw, AlertTriangle, Eye, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const SecurityEventsTab: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected event for metadata drawer
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false });

      if (severityFilter !== 'ALL') {
        query = query.eq('severity', severityFilter);
      }
      if (categoryFilter !== 'ALL') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setEvents(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar eventos de segurança:', err);
      setError(err?.message || 'Falha ao buscar logs de segurança.');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, categoryFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Client side text search filter
  const filteredEvents = events.filter(e => {
    const text = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(text) ||
      e.description.toLowerCase().includes(text) ||
      (e.correlation_id && e.correlation_id.toLowerCase().includes(text)) ||
      (e.ip && e.ip.toLowerCase().includes(text))
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-theme-border-faint pb-4">
        <div>
          <h3 className="font-serif text-xl text-white tracking-widest uppercase">
            Auditoria & Eventos de Segurança
          </h3>
          <p className="text-[10px] text-theme-muted uppercase tracking-widest mt-1">
            Logs centralizados de governança, detecção de anomalias e incidentes
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="p-2 bg-white/5 border border-theme-border hover:bg-white/10 rounded-lg text-theme-muted hover:text-white transition cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-luxury-gray border border-theme-border-faint p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="text-theme-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por termo, IP, correlation ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-theme-border-faint border border-theme-border rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition placeholder-theme-muted font-medium"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-theme-muted font-mono">Severidade:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-theme-border-faint border border-theme-border text-xs text-white px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">Todas</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase text-theme-muted font-mono">Categoria:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-theme-border-faint border border-theme-border text-xs text-white px-2 py-1.5 rounded-lg focus:outline-none cursor-pointer font-medium"
            >
              <option value="ALL">Todas</option>
              <option value="AUTH">AUTH</option>
              <option value="PAYMENTS">PAYMENTS</option>
              <option value="CRYPTO">CRYPTO</option>
              <option value="AI">AI</option>
              <option value="USERS">USERS</option>
              <option value="WEBHOOKS">WEBHOOKS</option>
              <option value="SECURITY">SECURITY</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>
        </div>

      </div>

      {/* Logs Table / Listing */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 space-y-3">
            <RefreshCw className="animate-spin text-gold-500" size={24} />
            <span className="text-xs text-theme-muted">Carregando logs de segurança...</span>
          </div>
        ) : error ? (
          <div className="p-16 text-center space-y-2 text-rose-400">
            <AlertTriangle size={24} className="mx-auto" />
            <p className="text-xs">{error}</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-16 text-center text-theme-muted">
            <ShieldAlert size={28} className="mx-auto text-theme-border opacity-30 mb-2" />
            <p className="text-sm">Nenhum evento de segurança correspondente.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-theme-muted font-bold border-b border-theme-border-faint bg-white/2 select-none uppercase tracking-widest font-mono">
                  <th className="p-3 pl-4">Timestamp</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Severidade</th>
                  <th className="p-3">Evento</th>
                  <th className="p-3 font-mono">IP</th>
                  <th className="p-3 font-mono">Correlation ID</th>
                  <th className="p-3 pr-4 text-right">Metadados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-theme-muted font-medium">
                {filteredEvents.map((e) => (
                  <tr key={e.id} className="hover:bg-white/1 transition duration-150">
                    
                    {/* Timestamp */}
                    <td className="p-3 pl-4 font-mono text-[10px]">
                      {new Date(e.created_at).toLocaleString('pt-BR')}
                    </td>

                    {/* Category */}
                    <td className="p-3 font-semibold text-white">
                      {e.category}
                    </td>

                    {/* Severity */}
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase font-mono ${
                        e.severity === 'CRITICAL' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse' :
                        e.severity === 'WARNING' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                        'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                      }`}>
                        {e.severity}
                      </span>
                    </td>

                    {/* Event detail */}
                    <td className="p-3 max-w-xs">
                      <span className="block font-semibold text-white truncate">{e.title}</span>
                      <span className="block text-[10px] text-theme-muted mt-0.5 truncate">{e.description}</span>
                    </td>

                    {/* IP */}
                    <td className="p-3 font-mono text-[10px]">{e.ip || '—'}</td>

                    {/* Correlation ID */}
                    <td className="p-3 font-mono text-[9px] text-theme-text">{e.correlation_id ? e.correlation_id.substring(0, 13) + '...' : '—'}</td>

                    {/* Actions */}
                    <td className="p-3 pr-4 text-right">
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="p-1.5 bg-white/5 border border-theme-border hover:bg-white/10 hover:text-white rounded-lg transition cursor-pointer"
                        title="Ver Metadados"
                      >
                        <Eye size={12} />
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* METADATA DRAWER / POPUP */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSelectedEvent(null)} />
          <div className="relative w-full max-w-lg bg-luxury-gray border border-theme-border rounded-3xl p-6 shadow-2xl z-10 glow-gold space-y-4">
            
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-theme-muted hover:text-white cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="border-b border-theme-border-faint pb-3">
              <span className="text-[9px] font-mono text-gold-400 uppercase font-bold tracking-widest">{selectedEvent.category} · {selectedEvent.severity}</span>
              <h4 className="text-base font-serif text-white uppercase mt-0.5">{selectedEvent.title}</h4>
              <p className="text-[10px] text-theme-muted font-mono mt-0.5">Correlation ID: {selectedEvent.correlation_id || '—'}</p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[9px] text-theme-muted font-bold font-mono uppercase tracking-wider block">Descrição do Evento</span>
              <p className="bg-white/2 border border-theme-border-faint rounded-xl p-3 text-white leading-relaxed">
                {selectedEvent.description}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-[9px] text-theme-muted font-bold font-mono uppercase tracking-wider block">Metadados Completos (JSON)</span>
              <pre className="bg-black/50 border border-theme-border-faint rounded-xl p-4 font-mono text-[10px] text-gold-400 overflow-x-auto max-h-56 select-all">
                {JSON.stringify(selectedEvent.metadata || {}, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
