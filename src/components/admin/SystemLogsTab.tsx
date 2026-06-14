import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, RefreshCw, Download, ChevronLeft, ChevronRight, 
  AlertTriangle, CheckCircle, Info, FileText, ShieldAlert, Zap, 
  Settings, Key, Eye
} from 'lucide-react';
import { LogService } from '../../lib/LogService';
import { SystemLog, LogSeverity } from '../../types/log';

export const SystemLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity | 'all'>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchLogs = async () => {
    setLoading(true);
    const data = await LogService.getLogs(500);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Opções exclusivas de filtros
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueUsers = Array.from(new Set(logs.map(l => l.user)));

  // Filtragem local
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    const matchesDate = filterDate === '' || log.timestamp.startsWith(filterDate);

    return matchesSearch && matchesSeverity && matchesAction && matchesUser && matchesDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- Estatísticas para o Dashboard de Segurança (Ajuste 9) ---
  const stats = {
    failedLogins: logs.filter(l => l.action === 'Login Admin' && l.severity === 'error').length,
    conversaIa: logs.filter(l => l.action.toLowerCase().includes('ia') || l.action.toLowerCase().includes('chat')).length,
    alteracoesAdmin: logs.filter(l => 
      ['alteração de preço', 'criação de produto', 'edição de produto', 'exclusão de produto', 
       'criação de cupom', 'exclusão de cupom', 'alteração de gateway', 'alteração da IA', 
       'alteração de configurações'].includes(l.action.toLowerCase())
    ).length,
    webhookErros: logs.filter(l => l.action.toLowerCase().includes('webhook') && l.severity === 'error').length,
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Data', 'Severidade', 'Acao', 'Usuario', 'Descricao', 'Entidade', 'ID Entidade', 'IP'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('pt-BR'),
      log.severity,
      log.action,
      log.user,
      `"${log.description.replace(/"/g, '""')}"`,
      log.entityType,
      log.entityId,
      log.ip || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_seguranca_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'error': return <ShieldAlert size={14} className="text-rose-400 animate-pulse" />;
      default: return <Info size={14} className="text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-white tracking-wider uppercase mb-1 flex items-center gap-2">
            <Shield className="text-gold-400" />
            Painel de Segurança e Auditoria
          </h2>
          <p className="text-theme-muted text-xs">Monitoramento de acessos, conformidade com LGPD e histórico de alterações do banco.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-theme-muted transition cursor-pointer" 
            title="Atualizar Auditoria"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition cursor-pointer"
          >
            <Download size={14} />
            Exportar Logs
          </button>
        </div>
      </div>

      {/* Security Dashboard Cards (Ajuste 9) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Failed Logins */}
        <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-theme-muted uppercase font-bold block">Logins Falhos (Abuso)</span>
            <span className={`text-2xl font-serif font-bold ${stats.failedLogins > 0 ? 'text-rose-400 animate-pulse' : 'text-white'}`}>
              {stats.failedLogins}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${stats.failedLogins > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-theme-muted'}`}>
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* Card 2: Alterações Admin */}
        <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-theme-muted uppercase font-bold block">Alterações Auditadas</span>
            <span className="text-2xl font-serif font-bold text-white">{stats.alteracoesAdmin}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-gold-400">
            <Settings size={20} />
          </div>
        </div>

        {/* Card 3: Erros Webhooks */}
        <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-theme-muted uppercase font-bold block">Erros de Webhook (Fraude)</span>
            <span className={`text-2xl font-serif font-bold ${stats.webhookErros > 0 ? 'text-rose-400' : 'text-white'}`}>
              {stats.webhookErros}
            </span>
          </div>
          <div className={`p-3 rounded-xl ${stats.webhookErros > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-white/5 text-theme-muted'}`}>
            <Key size={20} />
          </div>
        </div>

        {/* Card 4: IA Concierge */}
        <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-theme-muted uppercase font-bold block">Uso da IA Concierge</span>
            <span className="text-2xl font-serif font-bold text-white">{stats.conversaIa}</span>
          </div>
          <div className="p-3 bg-white/5 rounded-xl text-emerald-400">
            <Zap size={20} />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">Pesquisa Rápida</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted" size={14} />
            <input 
              type="text"
              placeholder="Buscar por descrição, ação ou ID..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
            />
          </div>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">Severidade</label>
          <select 
            value={filterSeverity} 
            onChange={e => { setFilterSeverity(e.target.value as LogSeverity | 'all'); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            <option value="all">Todas</option>
            <option value="info">Info</option>
            <option value="success">Sucesso</option>
            <option value="warning">Aviso</option>
            <option value="error">Erro</option>
          </select>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">Ação</label>
          <select 
            value={filterAction} 
            onChange={e => { setFilterAction(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            <option value="all">Todas as Ações</option>
            {uniqueActions.map(action => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">Usuário</label>
          <select 
            value={filterUser} 
            onChange={e => { setFilterUser(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            <option value="all">Todos</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-theme-muted font-bold">Data</label>
          <input 
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-luxury-gray border border-theme-border-faint rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-theme-muted">
            <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
            <p className="text-xs">Carregando auditoria...</p>
          </div>
        ) : currentLogs.length === 0 ? (
          <div className="p-12 text-center text-theme-muted">
            <FileText size={32} className="mx-auto text-theme-text mb-3 opacity-50" />
            <p className="text-xs text-theme-muted">Nenhum evento registrado com os filtros informados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-white/5 border-b border-white/10 text-theme-muted font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">St</th>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3 min-w-[240px]">Descrição</th>
                  <th className="px-4 py-3">Operador</th>
                  <th className="px-4 py-3">IP</th>
                  <th className="px-4 py-3 text-center">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/2 transition">
                    <td className="px-4 py-3 text-center">
                      {getSeverityIcon(log.severity)}
                    </td>
                    <td className="px-4 py-3 text-theme-muted whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-theme-muted" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-theme-muted">
                      {log.user}
                    </td>
                    <td className="px-4 py-3 text-theme-muted font-mono">
                      {log.ip || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(log.oldData || log.newData) ? (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1 hover:bg-white/10 rounded text-gold-400 hover:text-white transition cursor-pointer"
                          title="Ver Alteração Completa"
                        >
                          <Eye size={14} />
                        </button>
                      ) : (
                        <span className="text-theme-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between bg-luxury-gray border border-theme-border-faint p-4 rounded-xl">
          <span className="text-[10px] text-theme-muted uppercase tracking-widest font-bold">
            Página {currentPage} de {totalPages} ({filteredLogs.length} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft size={16} className="text-theme-muted" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight size={16} className="text-theme-muted" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Visualizador JSON (Auditoria Avançada) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-luxury-gray border border-theme-border glow-gold w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-theme-border-faint flex items-center justify-between">
              <div>
                <h3 className="font-serif text-white text-base font-bold uppercase tracking-wider">Detalhes da Alteração</h3>
                <p className="text-theme-muted text-[10px] uppercase mt-0.5">{selectedLog.action} · {new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-theme-muted hover:text-white font-bold uppercase text-xs tracking-widest cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-theme-text flex-1">
              <div className="bg-black/30 p-3 rounded-lg border border-theme-border-faint space-y-1">
                <p><span className="text-gold-400 font-bold">Ação:</span> {selectedLog.action}</p>
                <p><span className="text-gold-400 font-bold">Entidade:</span> {selectedLog.entityType} ({selectedLog.entityId})</p>
                <p><span className="text-gold-400 font-bold">Descrição:</span> {selectedLog.description}</p>
                <p><span className="text-gold-400 font-bold">Operador:</span> {selectedLog.user} ({selectedLog.userEmail})</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Dados Anteriores */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold font-sans text-rose-400 tracking-wider">Estado Anterior (Antes)</span>
                  <pre className="bg-black/50 border border-rose-500/10 rounded-xl p-4 overflow-x-auto max-h-72 text-theme-muted">
                    {selectedLog.oldData ? JSON.stringify(selectedLog.oldData, null, 2) : 'Nenhum dado registrado.'}
                  </pre>
                </div>

                {/* Dados Novos */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold font-sans text-emerald-400 tracking-wider">Estado Novo (Depois)</span>
                  <pre className="bg-black/50 border border-emerald-500/10 rounded-xl p-4 overflow-x-auto max-h-72 text-theme-text">
                    {selectedLog.newData ? JSON.stringify(selectedLog.newData, null, 2) : 'Nenhum dado registrado.'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
