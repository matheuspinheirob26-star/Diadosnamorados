import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, RefreshCw, Download, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Info, FileText } from 'lucide-react';
import { LogService } from '../../lib/LogService';
import { SystemLog, LogSeverity } from '../../types/log';

export const SystemLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<LogSeverity | 'all'>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const fetchLogs = async () => {
    setLoading(true);
    // Fetch a large enough batch to allow local filtering. We limit to 500 for safety, but paginate by 50.
    const data = await LogService.getLogs(500);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Compute unique filter options from data
  const uniqueActions = Array.from(new Set(logs.map(l => l.action)));
  const uniqueUsers = Array.from(new Set(logs.map(l => l.user)));

  // Filter logs locally
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    const matchesDate = filterDate === '' || log.timestamp.startsWith(filterDate);

    return matchesSearch && matchesSeverity && matchesAction && matchesUser && matchesDate;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    
    const headers = ['Data', 'Severidade', 'Ação', 'Usuário', 'Descrição', 'Entidade', 'ID Entidade'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('pt-BR'),
      log.severity,
      log.action,
      log.user,
      `"${log.description.replace(/"/g, '""')}"`, // escape quotes for CSV
      log.entityType,
      log.entityId
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `system_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'error': return <AlertTriangle size={14} className="text-rose-400" />;
      default: return <Info size={14} className="text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-white tracking-wider uppercase mb-1 flex items-center gap-2">
            <Shield className="text-gold-400" />
            Logs do Sistema
          </h2>
          <p className="text-gray-400 text-xs">Auditoria de ações, alterações e acesso administrativo.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchLogs} 
            disabled={loading}
            className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 transition" 
            title="Atualizar Logs"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-luxury-gray border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-end">
        
        <div className="flex-1 w-full space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Busca Textual</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <input 
              type="text"
              placeholder="Buscar por descrição ou ID..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition"
            />
          </div>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Severidade</label>
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
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Ação</label>
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
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Usuário</label>
          <select 
            value={filterUser} 
            onChange={e => { setFilterUser(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          >
            <option value="all">Todos os Usuários</option>
            {uniqueUsers.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-40 space-y-1">
          <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Data Específica</label>
          <input 
            type="date"
            value={filterDate}
            onChange={e => { setFilterDate(e.target.value); setCurrentPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-gold-500 transition cursor-pointer"
          />
        </div>

      </div>

      {/* Logs Table */}
      <div className="bg-luxury-gray border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
            <p className="text-xs">Carregando logs...</p>
          </div>
        ) : currentLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <FileText size={32} className="mx-auto text-gray-600 mb-3 opacity-50" />
            <p className="text-sm text-gray-400">Nenhum log encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-white/5 border-b border-white/10 text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 w-10">St</th>
                  <th className="px-4 py-3">Data / Hora</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3 min-w-[200px]">Descrição</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {currentLogs.map(log => (
                  <tr key={log.id} className="hover:bg-white/2 transition">
                    <td className="px-4 py-3 text-center">
                      {getSeverityIcon(log.severity)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 line-clamp-2" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.user}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 truncate max-w-[120px]" title={log.entityId}>
                      {log.entityId || '-'}
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
        <div className="flex items-center justify-between bg-luxury-gray border border-white/5 p-4 rounded-xl">
          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
            Página {currentPage} de {totalPages} ({filteredLogs.length} registros)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} className="text-gray-300" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white/5 hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} className="text-gray-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
