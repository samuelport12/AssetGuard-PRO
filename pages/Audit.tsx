import React, { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/DataService';
import { AuditLog } from '../types';
import { ShieldAlert, User, Clock, FileText, Filter, CalendarDays, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2 } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  CREATE: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
  MOVEMENT_IN: 'Entrada',
  MOVEMENT_OUT: 'Saída',
};

const PAGE_SIZE = 25;

const Audit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  // Filter dropdown options (from server)
  const [userOptions, setUserOptions] = useState<string[]>([]);
  const [actionOptions, setActionOptions] = useState<string[]>([]);

  const loadLogs = useCallback(async (targetPage: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await dataService.getLogs({
        page: targetPage,
        limit: PAGE_SIZE,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userName: selectedUser || undefined,
        action: selectedAction || undefined,
      });
      setLogs(data.logs);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setUserOptions(data.filterOptions.users);
      setActionOptions(data.filterOptions.actions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedUser, selectedAction]);

  // Load on mount and when filters change (reset to page 1)
  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    loadLogs(p);
  };

  const hasActiveFilters = startDate || endDate || selectedUser || selectedAction;

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedUser('');
    setSelectedAction('');
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('OUT')) return 'text-red-600 bg-red-50 border-red-200';
    if (action.includes('CREATE') || action.includes('IN')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    return 'text-blue-600 bg-blue-50 border-blue-200';
  };

  // Generate page numbers for pagination
  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center animate-in">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>Auditoria do Sistema</h2>
          <p style={{ color: '#94a3b8' }} className="text-sm">Registro imutável de todas as operações críticas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-100 rounded-lg flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Trash2 size={14} className="text-slate-400" />
            Retenção: 90 dias
          </div>
          <div className="px-4 py-2 bg-slate-100 rounded-lg flex items-center gap-2 text-slate-600 text-sm font-medium">
            <ShieldAlert size={16} />
            Log Seguro Ativo
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card animate-in p-4" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center gap-2 mb-3 text-slate-700">
          <Filter size={16} />
          <span className="text-sm font-semibold">Filtros</span>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Início</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          {/* End Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Data Fim</label>
            <div className="relative">
              <CalendarDays size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          {/* User Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Usuário</label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos os usuários</option>
                {userOptions.map((user) => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Ação</label>
            <div className="relative">
              <ShieldAlert size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todas as ações</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>{ACTION_LABELS[action] || action}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Exibindo <span className="font-semibold text-slate-700">{logs.length}</span> de <span className="font-semibold text-slate-700">{total}</span> registros
          {hasActiveFilters && ' (filtrado)'}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card animate-in overflow-hidden" style={{ animationDelay: '120ms' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
            Carregando logs...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-red-500 text-sm">
            Erro: {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.015)' }} className="text-xs uppercase font-semibold">
                  <th className="px-6 py-4">Data/Hora</th>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Alvo</th>
                  <th className="px-6 py-4">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock size={14} className="text-slate-400" />
                          {new Date(log.timestamp).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-slate-100 rounded-full">
                            <User size={12} className="text-slate-500" />
                          </div>
                          <span className="text-sm font-medium text-slate-900">{log.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${getActionColor(log.action)}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                        {log.targetType}{log.targetId ? `: ${log.targetId}` : ''}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2 max-w-md">
                          <FileText size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-600">{log.details}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)', background: 'rgba(0,0,0,0.015)' }}>
            <p className="text-xs text-slate-500">
              Página <span className="font-semibold text-slate-700">{page}</span> de <span className="font-semibold text-slate-700">{totalPages}</span>
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Primeira página"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 text-slate-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${p === page
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                        : 'text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Última página"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Audit;