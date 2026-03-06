import React, { useState, useEffect, useMemo } from 'react';
import { auditService, AuditLog } from '../services/auditService';
import { useDataController } from '../controllers/useDataController';
import { History, Search, Eye, Filter, Calendar, User, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const SystemTimelinePage: React.FC = () => {
    const { users } = useDataController();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [userFilter, setUserFilter] = useState('');

    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await auditService.fetchAuditLogs({
                action: actionFilter || undefined,
                entity: entityFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                user_id: userFilter || undefined,
                limit: 500
            });
            setLogs(data);
        } catch (error) {
            console.error('Erro ao buscar audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [actionFilter, entityFilter, dateFrom, dateTo, userFilter]);

    const getActionPhrase = (log: AuditLog) => {
        const action = log.action.toUpperCase();
        const entityName = log.entity_name || 'Registro';
        const userName = log.user_name || 'Sistema';

        if (action === 'CREATE') return { phrase: 'criou', color: 'text-emerald-600' };
        if (action === 'UPDATE') return { phrase: 'atualizou', color: 'text-blue-600' };
        if (action === 'DELETE') return { phrase: 'removeu', color: 'text-red-600' };
        return { phrase: 'modificou', color: 'text-slate-600' };
    };

    const getEntityLabel = (entity: string) => {
        switch (entity) {
            case 'dim_clientes': return 'o cliente';
            case 'dim_projetos': return 'o projeto';
            case 'fato_tarefas': return 'a tarefa';
            case 'dim_colaboradores': return 'o colaborador';
            case 'horas_trabalhadas': return 'o apontamento de';
            default: return 'o registro';
        }
    };

    const filteredLogs = useMemo(() => {
        if (!searchTerm) return logs;
        const lowerTerm = searchTerm.toLowerCase();
        return logs.filter(log =>
            log.action.toLowerCase().includes(lowerTerm) ||
            log.entity.toLowerCase().includes(lowerTerm) ||
            log.user_name.toLowerCase().includes(lowerTerm) ||
            log.entity_name?.toLowerCase().includes(lowerTerm)
        );
    }, [logs, searchTerm]);

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header / Hero Section */}
            <div className="px-8 py-10 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-purple-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                            <History className="w-8 h-8 text-purple-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Atividades dos Usuários</h1>
                            <p className="text-slate-400 mt-1 text-lg">Histórico gerencial de todas as ações e movimentações realizadas pelos usuários.</p>
                        </div>
                    </div>

                    {/* Quick Search & Filter Bar */}
                    <div className="mt-8 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[300px]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Buscar na timeline..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                            />
                        </div>

                        <select
                            value={userFilter}
                            onChange={(e) => setUserFilter(e.target.value)}
                            className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                            <option value="">Todos Usuários</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>

                        <select
                            value={entityFilter}
                            onChange={(e) => setEntityFilter(e.target.value)}
                            className="py-3 px-4 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                            <option value="">Todas Entidades</option>
                            <option value="dim_clientes">Clientes</option>
                            <option value="dim_projetos">Projetos</option>
                            <option value="fato_tarefas">Tarefas</option>
                            <option value="dim_colaboradores">Colaboradores</option>
                            <option value="horas_trabalhadas">Apontamentos</option>
                        </select>

                        <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                            <Calendar className="w-5 h-5 text-slate-500" />
                            <input
                                type="date"
                                className="bg-transparent text-slate-300 focus:outline-none text-sm"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                            <ArrowRight className="w-4 h-4 text-slate-600" />
                            <input
                                type="date"
                                className="bg-transparent text-slate-300 focus:outline-none text-sm"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-auto bg-slate-50 px-8 py-10">
                <div className="max-w-4xl mx-auto relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-slate-500 font-medium">Carregando eventos...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                            <Info className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 text-lg">Nenhuma atividade registrada no período.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {filteredLogs.map((log) => {
                                const actionData = getActionPhrase(log);
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={log.id}
                                        className="relative pl-14 group"
                                    >
                                        {/* Timeline Node */}
                                        <div className="absolute left-[20px] top-2 w-3 h-3 rounded-full bg-white border-2 border-purple-500 z-10 group-hover:scale-125 transition-transform" />

                                        {/* Card Content */}
                                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-200 transition-all">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(log.created_at).toLocaleString('pt-BR', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                        <span className="mx-1">•</span>
                                                        <span className="text-slate-300">IP: {log.ip_address || 'N/A'}</span>
                                                    </div>

                                                    <div className="text-lg leading-snug">
                                                        <span className="font-bold text-slate-900">{log.user_name}</span>
                                                        {' '}
                                                        <span className={`font-medium ${actionData.color}`}>{actionData.phrase}</span>
                                                        {' '}
                                                        <span className="text-slate-600">{getEntityLabel(log.entity)}</span>
                                                        {' '}
                                                        <span className="font-bold text-slate-900">"{log.entity_name}"</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedLog(log)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 rounded-xl border border-slate-100 transition-all font-medium text-sm"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Detalhes
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalhes Superior */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${getActionPhrase(selectedLog).color} bg-current opacity-10`} />
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Detalhamento da Mudança</h3>
                                        <p className="text-slate-500 font-medium">
                                            {selectedLog.user_name} em {selectedLog.entity_name}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-auto p-8 bg-slate-50">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Column Left - Old */}
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                                                Estado Anterior
                                            </h4>
                                        </div>
                                        <div className="flex-1 bg-slate-900 rounded-2xl p-6 overflow-auto min-h-[400px] border border-slate-800 shadow-2xl font-mono">
                                            <pre className="text-sm text-slate-400 leading-relaxed">
                                                {selectedLog.old_data ? JSON.stringify(selectedLog.old_data, null, 2) : '// Sem dados anteriores'}
                                            </pre>
                                        </div>
                                    </div>

                                    {/* Column Right - New */}
                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                Nova Versão
                                            </h4>
                                        </div>
                                        <div className="flex-1 bg-slate-900 rounded-2xl p-6 overflow-auto min-h-[400px] border border-slate-800 shadow-2xl font-mono">
                                            <pre className="text-sm text-emerald-400/90 leading-relaxed">
                                                {selectedLog.new_data ? JSON.stringify(selectedLog.new_data, null, 2) : '// Sem novos dados'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-8 py-5 border-t border-slate-100 bg-white flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-slate-900/20"
                                >
                                    Concluir Revisão
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
