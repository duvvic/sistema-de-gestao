import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    fetchClients,
    fetchProjects,
    fetchCollaborators,
    fetchTasks,
    fetchReportPreview,
    upsertProjectCost,
    exportReportExcel,
    exportReportPowerBI,
    ReportRow,
    ProjectTotal,
    ReportPreviewResponse
} from '@/services/reportApi';
import { formatDecimalToTime } from '@/utils/normalizers';
import {
    Download,
    BarChart3,
    Filter,
    Calendar,
    Users,
    Briefcase,
    DollarSign,
    Search,
    Loader2,
    FileSpreadsheet,
    TrendingUp,
    Table as TableIcon,
    Clock
} from 'lucide-react';

const ReportDashboard: React.FC = () => {
    // Estados de Dados
    const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
    const [projects, setProjects] = useState<Array<{ id: number; name: string; clientId: number }>>([]);
    const [collaborators, setCollaborators] = useState<Array<{ id: number; name: string }>>([]);
    const [tasks, setTasks] = useState<Array<{ id: string; name: string; projectId: number }>>([]);

    // Estados de Filtro
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        clientIds: [] as number[],
        projectIds: [] as number[],
        collaboratorIds: [] as number[],
        taskIds: [] as (number | string)[],
    });

    // Estados de UI/Loading
    const [reportData, setReportData] = useState<ReportPreviewResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'preview' | 'costs' | 'tracking'>('preview');

    // Carregamento Inicial
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [c, co] = await Promise.all([
                    fetchClients(true),      // Inclui inativos
                    fetchCollaborators(true) // Inclui inativos
                ]);
                setClients(c);
                setCollaborators(co);
            } catch (err) {
                console.error('Erro ao carregar filtros:', err);
            }
        };
        loadInitialData();
    }, []);

    // Carregar Projetos quando Clientes mudarem
    useEffect(() => {
        const loadProjects = async () => {
            try {
                const p = await fetchProjects(filters.clientIds.length > 0 ? filters.clientIds : undefined, true); // Inclui inativos
                setProjects(p);
            } catch (err) {
                console.error('Erro ao carregar projetos:', err);
            }
        };
        loadProjects();
    }, [filters.clientIds]);

    // Carregar Tarefas quando Projetos mudarem
    useEffect(() => {
        const loadTasks = async () => {
            try {
                const t = await fetchTasks(filters.projectIds.length > 0 ? filters.projectIds : undefined);
                setTasks(t);
            } catch (err) {
                console.error('Erro ao carregar tarefas:', err);
            }
        };
        loadTasks();
    }, [filters.projectIds]);

    const handleFetchReport = async () => {
        setLoading(true);
        try {
            const data = await fetchReportPreview(filters);
            setReportData(data);
        } catch (err) {
            console.error('Erro ao gerar relatório:', err);
            alert('Falha ao gerar relatório. Verifique a conexão com a API.');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (type: 'excel' | 'powerbi') => {
        setExporting(type);
        try {
            const blob = type === 'excel'
                ? await exportReportExcel(filters)
                : await exportReportPowerBI(filters);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-${type}-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'json'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error(`Erro ao exportar ${type}:`, err);
            alert(`Falha na exportação para ${type}.`);
        } finally {
            setExporting(null);
        }
    };

    const handleUpdateCost = async (projectId: number, cost: number | null) => {
        try {
            await upsertProjectCost(projectId, cost);
            // Atualiza localmente para feedback imediato se tiver dados
            if (reportData) {
                const newTotals = reportData.projectTotals.map(pt =>
                    pt.id_projeto === projectId ? { ...pt, valor_projeto: cost } : pt
                );
                setReportData({ ...reportData, projectTotals: newTotals });
            }
        } catch (err) {
            console.error('Erro ao atualizar custo:', err);
            alert('Erro ao salvar custo do projeto.');
        }
    };

    const toggleFilter = (key: 'clientIds' | 'projectIds' | 'collaboratorIds' | 'taskIds', id: number | string) => {
        setFilters(prev => {
            const current = [...(prev[key] as any)];
            const index = current.indexOf(id);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(id);
            }
            return { ...prev, [key]: current };
        });
    };

    return (
        <div className="p-8 flex flex-col gap-8 bg-[var(--bg)] min-h-full">
            {/* Header com Glassmorphism */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface)]/80 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-[var(--text)]">
                        <TrendingUp className="w-8 h-8 text-[var(--primary)]" />
                        Centro de Inteligência e Relatórios
                    </h1>
                    <p className="text-[var(--muted)] text-sm mt-1">Análise estratégica de horas, custos e rentabilidade.</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => handleExport('excel')}
                        disabled={exporting !== null || !reportData}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg font-medium"
                    >
                        {exporting === 'excel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                        Excel
                    </button>
                    <button
                        onClick={() => handleExport('powerbi')}
                        disabled={exporting !== null || !reportData}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg font-medium"
                    >
                        {exporting === 'powerbi' ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
                        PowerBI
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                {/* Painel de Filtros Lateral */}
                <aside className="xl:col-span-1 flex flex-col gap-6 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-sm h-fit sticky top-8">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--text)] py-2 border-b border-[var(--border)] mb-2">
                        <Filter className="w-4 h-4 text-[var(--primary)]" />
                        Filtros de Período
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-2">Data Início</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)]" />
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm transition-all"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-2">Data Fim</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--primary)]" />
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold flex items-center gap-2 text-[var(--text)] py-2 border-b border-[var(--border)] mt-4 mb-2">
                        <Briefcase className="w-4 h-4 text-[var(--primary)]" />
                        Seleção Estratégica
                    </h3>

                    <div className="space-y-4 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
                        {/* Clientes */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-[var(--muted)] uppercase">Clientes</p>
                            <div className="flex flex-wrap gap-2">
                                {clients.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleFilter('clientIds', c.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filters.clientIds.includes(c.id)
                                            ? 'bg-[var(--primary)] text-white border-transparent'
                                            : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-[var(--primary)]'
                                            }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colaboradores */}
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-[var(--muted)] uppercase">Equipe</p>
                            <div className="flex flex-wrap gap-2">
                                {collaborators.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleFilter('collaboratorIds', c.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${filters.collaboratorIds.includes(c.id)
                                            ? 'bg-indigo-600 text-white border-transparent'
                                            : 'bg-[var(--bg)] text-[var(--text)] border-[var(--border)] hover:border-indigo-600'
                                            }`}
                                    >
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleFetchReport}
                        disabled={loading}
                        className="w-full mt-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                        {loading ? 'Processando...' : 'Gerar Inteligência'}
                    </button>
                </aside>

                {/* Área de Conteúdo Principal */}
                <main className="xl:col-span-3 flex flex-col gap-6">
                    {/* NAVEGAÇÃO DE SUB-MENUS (VERSÃO COMPACTA & FUNCIONAL) */}
                    <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)] w-fit mb-4">
                        <button
                            onClick={() => setActiveTab('preview')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'preview'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                                }`}
                        >
                            Visualização Master
                        </button>

                        <button
                            onClick={() => setActiveTab('costs')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'costs'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                                }`}
                        >
                            Custos de Projeto
                        </button>

                        <button
                            onClick={() => setActiveTab('tracking')}
                            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'tracking'
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                                }`}
                        >
                            Rastreamento
                        </button>
                    </div>

                    {!reportData && !loading && (
                        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface)] rounded-3xl border border-dashed border-[var(--border)] p-20 text-center">
                            <TrendingUp className="w-20 h-20 text-[var(--muted)] opacity-20 mb-4" />
                            <h3 className="text-xl font-bold text-[var(--text)]">Preparado para análise?</h3>
                            <p className="text-[var(--muted)] max-w-sm">Selecione o filtro desejado e clique em "Gerar Inteligência" para visualizar os dados consolidados.</p>
                        </div>
                    )}

                    {loading && (
                        <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface)] rounded-3xl border border-[var(--border)] p-20 text-center">
                            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin mb-4" />
                            <h3 className="text-xl font-bold text-[var(--text)]">Processando Dados...</h3>
                            <p className="text-[var(--muted)]">Buscando informações, calculando rateios e consolidando métricas.</p>
                        </div>
                    )}

                    {reportData && !loading && activeTab === 'preview' && (
                        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Cards de Resumo */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-lg overflow-hidden relative">
                                    <Clock className="w-20 h-20 absolute -right-4 -bottom-4 opacity-10" />
                                    <p className="text-white/70 text-sm font-bold uppercase tracking-wider">Total de Horas</p>
                                    <h4 className="text-4xl font-black mt-2">{formatDecimalToTime(reportData.totals.horas_total)}</h4>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded-lg">
                                        Período selecionado
                                    </div>
                                </div>
                                <div className="bg-emerald-600 p-6 rounded-3xl text-white shadow-lg overflow-hidden relative">
                                    <DollarSign className="w-20 h-20 absolute -right-4 -bottom-4 opacity-10" />
                                    <p className="text-white/70 text-sm font-bold uppercase tracking-wider">Valor Total Rateado</p>
                                    <h4 className="text-4xl font-black mt-2">
                                        {reportData.totals.valor_total_rateado
                                            ? `R$ ${reportData.totals.valor_total_rateado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                            : 'N/A'}
                                    </h4>
                                    <div className="mt-4 flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded-lg">
                                        Com base nos custos definidos
                                    </div>
                                </div>
                            </div>

                            {/* Tabela de Detalhes */}
                            <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
                                    <h3 className="font-bold text-[var(--text)]">Detalhamento por Colaborador/Projeto</h3>
                                    <span className="text-xs font-medium text-[var(--muted)]">Sincronizado em: {new Date(reportData.generatedAt).toLocaleString()}</span>
                                </div>
                                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg)] text-[var(--muted)] text-[10px] uppercase tracking-widest font-black">
                                                <th className="px-6 py-4">Cliente / Projeto</th>
                                                <th className="px-6 py-4">Colaborador</th>
                                                <th className="px-6 py-4">Tarefa</th>
                                                <th className="px-6 py-4 text-center">Horas</th>
                                                <th className="px-6 py-4 text-right">R$ Rateado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border)]">
                                            {reportData.rows.map((row, i) => (
                                                <tr key={i} className="hover:bg-[var(--bg)]/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm text-[var(--text)]">{row.projeto}</div>
                                                        <div className="text-xs text-[var(--muted)]">{row.cliente}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-sm text-[var(--text)]">{row.colaborador}</td>
                                                    <td className="px-6 py-4 text-xs text-[var(--muted)] italic">{row.tarefa || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-center font-black text-sm text-[var(--primary)]">{formatDecimalToTime(row.horas)}</td>
                                                    <td className="px-6 py-4 text-right font-bold text-sm text-emerald-600">
                                                        {row.valor_rateado ? `R$ ${row.valor_rateado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {reportData && !loading && activeTab === 'costs' && (
                        <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-[var(--border)]">
                                <h3 className="font-bold text-[var(--text)]">Gestão de Valores de Projeto</h3>
                                <p className="text-xs text-[var(--muted)] mt-1">Defina o valor total de cada projeto para cálculo automático de rateio por hora.</p>
                            </div>
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg)] text-[var(--muted)] text-[10px] uppercase tracking-widest font-black">
                                            <th className="px-6 py-4">Projeto</th>
                                            <th className="px-6 py-4 text-center">Horas Totais</th>
                                            <th className="px-6 py-4">Custo Projeto (R$)</th>
                                            <th className="px-6 py-4 text-center">Valor/Hora Extraído</th>
                                            <th className="px-6 py-4 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {reportData.projectTotals.map((pt) => (
                                            <ProjectCostRow
                                                key={pt.id_projeto}
                                                pt={pt}
                                                onUpdate={handleUpdateCost}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {reportData && !loading && activeTab === 'tracking' && (
                        <div className="bg-[var(--surface)] rounded-3xl border border-[var(--border)] shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-6 border-b border-[var(--border)]">
                                <h3 className="font-bold text-[var(--text)]">Rastreamento de Planejamento</h3>
                                <p className="text-xs text-[var(--muted)] mt-1">Status, complexidade e progresso real dos projetos ativos.</p>
                            </div>
                            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border)] scrollbar-track-transparent">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg)] text-[var(--muted)] text-[10px] uppercase tracking-widest font-black">
                                            <th className="px-6 py-4">Cliente / Projeto</th>
                                            <th className="px-6 py-4">Status Planejamento</th>
                                            <th className="px-6 py-4 text-center">Complexidade</th>
                                            <th className="px-6 py-4 text-center">Progresso</th>
                                            <th className="px-6 py-4 text-right">Período Planejado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {Array.from(new Set(reportData.rows.map(r => r.id_projeto))).map(id => {
                                            const row = reportData.rows.find(r => r.id_projeto === id)!;
                                            return (
                                                <tr key={id} className="hover:bg-[var(--bg)]/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-sm text-[var(--text)]">{row.projeto}</div>
                                                        <div className="text-xs text-[var(--muted)]">{row.cliente}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${row.status_p === 'Desenvolvimento' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                            row.status_p === 'Arquitetura' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                                                'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                            }`}>
                                                            {row.status_p || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`text-[10px] font-bold ${row.complexidade_p === 'Alta' ? 'text-red-500' :
                                                            row.complexidade_p === 'Média' ? 'text-amber-500' :
                                                                'text-emerald-500'
                                                            }`}>
                                                            {row.complexidade_p || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-black text-xs text-[var(--text)]">{row.progresso_p || 0}%</span>
                                                            <div className="w-16 h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                                                                <div
                                                                    className="h-full bg-slate-600"
                                                                    style={{ width: `${row.progresso_p || 0}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-[10px] font-medium text-[var(--muted)] tabular-nums">
                                                        {row.data_inicio_p ? new Date(row.data_inicio_p).toLocaleDateString('pt-BR') : '-'}
                                                        <br />
                                                        {row.data_fim_p ? new Date(row.data_fim_p).toLocaleDateString('pt-BR') : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

interface ProjectCostRowProps {
    pt: ProjectTotal;
    onUpdate: (id: number, val: number | null) => Promise<void>;
}

const ProjectCostRow: React.FC<ProjectCostRowProps> = ({ pt, onUpdate }) => {
    const [inputValue, setInputValue] = useState(pt.valor_projeto && pt.valor_projeto !== 0 ? pt.valor_projeto.toString() : '');

    return (
        <tr className="hover:bg-[var(--bg)]/50 transition-colors">
            <td className="px-6 py-4">
                <div className="font-bold text-sm text-[var(--text)]">{pt.projeto}</div>
                <div className="text-xs text-[var(--muted)]">{pt.cliente}</div>
            </td>
            <td className="px-6 py-4 text-center font-medium text-[var(--text)]">{formatDecimalToTime(pt.horas_projeto_total)}</td>
            <td className="px-6 py-4">
                <div className="relative max-w-[150px]">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted)]" />
                    <input
                        type="number"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm transition-all"
                        onBlur={() => {
                            const val = inputValue.trim() === '' ? null : Number(inputValue);
                            if (val !== pt.valor_projeto) {
                                onUpdate(pt.id_projeto, val);
                            }
                        }}
                    />
                </div>
            </td>
            <td className="px-6 py-4 text-center text-xs font-bold text-emerald-600">
                {pt.valor_hora_projeto ? `R$ ${pt.valor_hora_projeto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h` : 'N/A'}
            </td>
            <td className="px-6 py-4 text-right">
                <button
                    className="text-xs font-bold text-[var(--primary)] hover:underline"
                    onClick={() => {
                        const val = inputValue.trim() === '' ? null : Number(inputValue);
                        onUpdate(pt.id_projeto, val);
                    }}
                >
                    Salvar
                </button>
            </td>
        </tr>
    );
};

export default ReportDashboard;
