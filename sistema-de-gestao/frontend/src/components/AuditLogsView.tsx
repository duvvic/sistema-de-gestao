import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/services/supabaseClient';
import { AuditLogEntry, User } from '@/types';
import { Search, Filter, Calendar as CalendarIcon, Eye, ShieldAlert, ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { useDataController } from '@/controllers/useDataController';

const AuditLogsView: React.FC = () => {
    const { users } = useDataController(); // Para pegar nomes dos usuários
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [resourceFilter, setResourceFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('');
    const [selectedClientId, setSelectedClientId] = useState<string>('all');
    const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

    // Gerar lista dos últimos 15 dias para o filtro em linha
    const days = useMemo(() => {
        const result = [];
        for (let i = 0; i < 15; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            result.push(date.toISOString().split('T')[0]);
        }
        return result;
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('audit_log')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(200); // Limite inicial de segurança

            if (error) throw error;

            // Mapear user_id para user_name se possível
            const mappedLogs = (data || []).map((log: any) => {
                // Tenta achar usuario pelo ID. Nota: audit_log.user_id pode não bater com dim_colaboradores se for auth.users
                // Assumindo que user_id no audit é UUID do auth ou ID do colaborador.
                // Vou tentar bater com users.id (UUID)
                const user = users.find(u => u.id === log.user_id) || users.find(u => u.email === log.user_email);
                return {
                    ...log,
                    user_name: user ? user.name : (log.user_email || log.user_id || 'Sistema/Desconhecido')
                };
            });

            setLogs(mappedLogs);
        } catch (error) {
            console.error('Erro ao buscar logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Configuração de Tempo Real (Realtime)
        const channel = supabase
            .channel('audit_log_changes')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'audit_log' },
                (payload) => {
                    const newLog = payload.new as any;
                    // Mapear nome do usuário para o novo log
                    const user = users.find(u => u.id === newLog.user_id) || users.find(u => u.email === newLog.user_email);
                    const mappedNewLog = {
                        ...newLog,
                        user_name: user ? user.name : (newLog.user_email || newLog.user_id || 'Sistema/Desconhecido')
                    };

                    setLogs(currentLogs => [mappedNewLog, ...currentLogs].slice(0, 500)); // Mantém o topo e limita tamanho
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [users]); // Re-executa se usuarios carregarem

    const uniqueActions = useMemo(() => Array.from(new Set(logs.map(l => l.action))), [logs]);
    const uniqueResources = useMemo(() => Array.from(new Set(logs.map(l => l.resource))), [logs]);

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch =
                log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.project_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.task_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                JSON.stringify(log.changes || {}).toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = actionFilter === 'all' || log.action === actionFilter;
            const matchesResource = resourceFilter === 'all' || log.resource === resourceFilter;
            const matchesClient = selectedClientId === 'all' || String(log.client_id) === selectedClientId;

            const matchesDate = !dateFilter || new Date(log.timestamp).toISOString().split('T')[0] === dateFilter;

            return matchesSearch && matchesAction && matchesResource && matchesClient && matchesDate;
        });
    }, [logs, searchTerm, actionFilter, resourceFilter, selectedClientId, dateFilter]);

    const getActionColor = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('delete') || act.includes('excluir')) return 'text-red-600 bg-red-50 border-red-200';
        if (act.includes('create') || act.includes('insert') || act.includes('criar')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (act.includes('update') || act.includes('edit') || act.includes('editar')) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (act.includes('login')) return 'text-purple-600 bg-purple-50 border-purple-200';
        return 'text-slate-600 bg-slate-50 border-slate-200';
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <div className="px-8 py-8">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-purple-600" /> Histórico de Auditoria
                        </h1>
                        <p className="text-slate-500 mt-1">Rastreabilidade completa de ações e segurança do sistema.</p>
                    </div>
                    <button onClick={fetchLogs} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm" title="Atualizar">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Vertical Day Strip Filter */}
                <div className="flex items-center gap-4 mb-6 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
                    <button
                        onClick={() => setDateFilter('')}
                        className={`flex-shrink-0 px-6 py-3 rounded-2xl font-bold transition-all border ${dateFilter === ''
                                ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200 scale-105'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                            }`}
                    >
                        Tudo
                    </button>
                    {days.map(dateStr => {
                        const date = new Date(dateStr + 'T12:00:00');
                        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                        const dayNum = date.getDate();
                        const isToday = new Date().toISOString().split('T')[0] === dateStr;
                        const isActive = dateFilter === dateStr;

                        return (
                            <button
                                key={dateStr}
                                onClick={() => setDateFilter(dateStr)}
                                className={`flex-shrink-0 flex flex-col items-center min-w-[70px] py-3 rounded-2xl font-bold transition-all border ${isActive
                                        ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-200 scale-105'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                                    }`}
                            >
                                <span className={`text-[10px] uppercase tracking-wider mb-1 ${isActive ? 'text-purple-100' : 'text-slate-400'}`}>
                                    {isToday ? 'Hoje' : dayName}
                                </span>
                                <span className="text-xl leading-none">{dayNum}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 relative min-w-[300px]">
                        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Buscar por usuário, ação, conteúdo..."
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-600 cursor-pointer hover:bg-slate-100"
                        >
                            <option value="all">Todas Ações</option>
                            {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-600 cursor-pointer hover:bg-slate-100"
                        >
                            <option value="all">Todos Clientes</option>
                            {Array.from(new Set(logs.filter(l => l.client_name).map(l => JSON.stringify({ id: l.client_id, name: l.client_name }))))
                                .map(str => JSON.parse(str))
                                .map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={resourceFilter}
                            onChange={(e) => setResourceFilter(e.target.value)}
                            className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-medium text-slate-600 cursor-pointer hover:bg-slate-100"
                        >
                            <option value="all">Todos Recursos</option>
                            {uniqueResources.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-auto px-8 pb-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs w-[180px]"><div className="flex items-center gap-2"><CalendarIcon className="w-3 h-3" /> Data/Hora</div></th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Usuário</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Ação</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Cliente / Projeto</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs">Tarefa</th>
                                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider text-xs text-right">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map(log => (
                                <tr key={log.id} onClick={() => setSelectedLog(log)} className={`hover:bg-purple-50/50 transition-colors cursor-pointer ${selectedLog?.id === log.id ? 'bg-purple-50' : ''}`}>
                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                {log.user_name ? log.user_name.substring(0, 2).toUpperCase() : '??'}
                                            </div>
                                            <span className="font-medium text-slate-700">{log.user_name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-8">{log.user_role || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${getActionColor(log.action)} uppercase`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">{log.project_name || log.resource}</span>
                                            <span className="text-[10px] text-slate-400">{log.client_name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700 truncate max-w-[200px]" title={log.task_name || ''}>
                                                {log.task_name || '-'}
                                            </span>
                                            {log.task_id && <span className="text-[10px] text-slate-400 font-mono">ID: {log.task_id}</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-purple-600 hover:bg-purple-100 p-2 rounded-lg transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        Nenhum registro encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal / Panel */}
            {selectedLog && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                Detalhes do Registro <span className="text-xs bg-slate-200 px-2 py-1 rounded font-mono text-slate-600">#{selectedLog.id}</span>
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Autor</span>
                                    <p className="font-medium text-slate-800">{selectedLog.user_name}</p>
                                    <p className="text-xs text-slate-500">{selectedLog.user_role} • {selectedLog.ip_address || 'IP Desconhecido'}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Ação</span>
                                    <p className="font-medium text-slate-800">{selectedLog.action} em {selectedLog.resource}</p>
                                    <p className="text-xs text-slate-500">{new Date(selectedLog.timestamp).toLocaleString('pt-BR')}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                    <FileTextIcon className="w-4 h-4 text-purple-600" /> Alterações (JSON)
                                </h4>
                                <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto border border-slate-800 shadow-inner">
                                    <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                                        {JSON.stringify(selectedLog.changes, null, 2)}
                                    </pre>
                                </div>
                            </div>

                            {selectedLog.user_agent && (
                                <div className="text-xs text-slate-400 border-t border-slate-100 pt-4">
                                    User Agent: {selectedLog.user_agent}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setSelectedLog(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-600 hover:bg-slate-100 transition-colors">
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const FileTextIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
);

export default AuditLogsView;
