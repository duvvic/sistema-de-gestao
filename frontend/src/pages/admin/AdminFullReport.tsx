// src/pages/admin/AdminFullReport.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    exportReportExcel,
    exportReportPowerBI,
    fetchReportPreview,
    ProjectTotal,
    ReportPreviewResponse,
    ReportRow,
    upsertProjectCost,
} from '@/services/reportApi';
import { useData } from '@/contexts/DataContext';
import {
    FileSpreadsheet,
    BarChart3,
    Search,
    Filter,
    Calendar as CalendarIcon,
    Users,
    Briefcase,
    DollarSign,
    Clock,
    ChevronDown,
    ChevronRight,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Info,
    RefreshCw,
    HelpCircle,
    Download,
    LayoutDashboard,
    User as UserIcon,
    Layers,
    X,
    Check,

} from 'lucide-react';
import { ToastContainer, ToastType } from '@/components/Toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Helpers ---
function formatBRL(v: number | null | undefined) {
    const n = typeof v === 'number' ? v : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function formatHours(hours: number) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function daysAgoISO(days: number) {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
}

// --- Interfaces para a Tabela Hierárquica ---
interface HierarchicalData {
    clients: {
        [id: number]: {
            id: number;
            name: string;
            totalHours: number;
            totalVal: number;
            projects: {
                [id: number]: {
                    id: number;
                    name: string;
                    totalHours: number;
                    totalVal: number;
                    budget: number | null;
                    hourRate: number | null;
                    collaborators: {
                        [id: number]: {
                            id: number;
                            name: string;
                            hours: number;
                            valRateado: number;
                            percentOfProject: number;
                            records: {
                                data: string;
                                tarefa: string;
                                horas: number;
                                valor_rateado: number;
                            }[];
                        }
                    }
                }
            }
        }
    };
    totals: {
        hours: number;
        val: number;
        avgRate: number;
    }
}

// --- Componentes Menores ---
const Badge = ({ children, color = 'purple' }: { children: React.ReactNode, color?: 'purple' | 'green' | 'blue' }) => {
    const variants = {
        purple: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
        green: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
        blue: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
    };
    return (
        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${variants[color]}`}>
            {children}
        </span>
    );
};

const DateButton = ({ label, value, onChange }: { label: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <div
            className="relative flex items-center rounded-2xl border px-4 py-3 cursor-pointer hover:border-purple-500/50 transition-all group shadow-sm"
            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}
            onClick={() => {
                try {
                    inputRef.current?.showPicker();
                } catch (e) {
                    inputRef.current?.focus();
                }
            }}
        >
            <CalendarIcon className="w-4 h-4 text-purple-500 mr-3 group-hover:text-slate-600 transition-colors" />
            <div className="flex-1">
                <div className="text-[10px] font-bold uppercase tracking-widest mb-0.5 group-hover:text-purple-500 transition-colors" style={{ color: 'var(--muted)' }}>{label}</div>
                <div className="text-sm font-black transition-colors" style={{ color: 'var(--text)' }}>
                    {value ? new Date(value + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                </div>
            </div>
            <input
                ref={inputRef}
                type="date"
                value={value}
                onChange={onChange}
                className="absolute inset-0 opacity-0 cursor-pointer pointer-events-none"
                // pointer-events-none para não bloquear o clique do pai, mas precisamos garantir que o picker abra.
                // Na verdade, opacity 0 e cobrindo tudo é melhor para mobile, mas queremos controlar o visual.
                // Com showPicker() via JS no onClick do pai, podemos esconder o input ou deixá-lo minusculo.
                style={{ visibility: 'hidden', position: 'absolute', bottom: 0, left: 0 }}
            />
        </div>
    );
};

// --- Tela Principal ---
const AdminFullReport: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, isAdmin } = useAuth();
    const { clients: ctxClients, projects: ctxProjects, users: ctxUsers, loading: dataLoading } = useData();

    // Estados de Filtros (sempre começam limpos)
    const [startDate, setStartDate] = useState(daysAgoISO(30));
    const [endDate, setEndDate] = useState(todayISO());
    const [useDateFilter, setUseDateFilter] = useState(true); // Novo: controla se usa filtro de data
    const [useClientFilter, setUseClientFilter] = useState(false); // Controla filtro de clientes
    const [useProjectFilter, setUseProjectFilter] = useState(false); // Controla filtro de projetos
    const [useCollaboratorFilter, setUseCollaboratorFilter] = useState(false); // Controla filtro de colaboradores
    const [clientIds, setClientIds] = useState<number[]>([]);
    const [projectIds, setProjectIds] = useState<number[]>([]);
    const [collaboratorIds, setCollaboratorIds] = useState<number[]>([]);
    const [useStatusFilter, setUseStatusFilter] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // Configurações de Colunas (Excel)
    const [includeCost, setIncludeCost] = useState(false);
    const [includeHours, setIncludeHours] = useState(true);

    // Opções sincronizadas com o Contexto Global (Otimizado)
    const clientOptions = useMemo(() =>
        ctxClients.map(c => ({ id: Number(c.id), name: c.name })),
        [ctxClients]);

    const projectOptions = useMemo(() =>
        ctxProjects.map(p => ({ id: Number(p.id), name: p.name, clientId: Number(p.clientId) })),
        [ctxProjects]);

    const collaboratorOptions = useMemo(() => {
        const activeCargos = ['desenvolvedor', 'infraestrutura de ti'];
        return ctxUsers
            .filter(u => activeCargos.includes(u.cargo?.toLowerCase() || ''))
            .map(u => ({ id: Number(u.id), name: u.name }));
    }, [ctxUsers]);

    // Estados da UI
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'powerbi' | null>(null);
    const [reportData, setReportData] = useState<ReportPreviewResponse | null>(null);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState<'operacional' | 'executivo'>('operacional');

    // Novo Estado para rastrear mudanças não aplicadas
    const [hasUnappliedChanges, setHasUnappliedChanges] = useState(false);

    // Monitorar mudanças nos filtros
    useEffect(() => {
        // Ignora a montagem inicial se quiser, ou assume que carregar a página já requer "Aplicar"
        // Mas como os estados iniciam com valores padrão (e reportData null), tecnicamente temos filtros "não aplicados" até o primeiro clique.
        // Vamos considerar que qualquer mudança após o primeiro render marca como sujo.
        const timer = setTimeout(() => {
            setHasUnappliedChanges(true);
        }, 100);
        return () => clearTimeout(timer);
    }, [
        startDate, endDate, useDateFilter,
        useClientFilter, clientIds,
        useProjectFilter, projectIds,
        useCollaboratorFilter, collaboratorIds,
        useStatusFilter, selectedStatuses
    ]);

    // Calcula o período real dos dados carregados (para quando o filtro de data está em "Todos")
    const actualDateRange = useMemo(() => {
        if (!reportData || reportData.rows.length === 0) return { start: '', end: '' };
        const dates = reportData.rows.map(r => r.data_registro).filter(Boolean).sort();
        if (dates.length === 0) return { start: '', end: '' };
        return {
            start: dates[0].slice(0, 10),
            end: dates[dates.length - 1].slice(0, 10)
        };
    }, [reportData]);

    const addToast = (message: string, type: ToastType) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

    // Carregar Opções (Simplificado: apenas valida acesso)
    useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard');
            return;
        }
        // Não é mais necessário fetchClients/Collaborators aqui!
        // Eles já vêm do useData() de forma reativa.
    }, [currentUser, navigate]);

    // Lógica de Agrupamento Dinâmico (Flat Table)
    const previewData = useMemo(() => {
        if (!reportData) return [];

        const groups: { [key: string]: any } = {};

        reportData.rows.forEach(r => {
            const keys: string[] = [];

            // Data, Cliente e Projeto sempre são exibidos/agrupados
            keys.push(`d-${r.data_registro}`);
            keys.push(`c-${r.id_cliente}`);
            keys.push(`p-${r.id_projeto}`);

            if (useCollaboratorFilter) keys.push(`u-${r.id_colaborador}`);
            if (useStatusFilter) keys.push(`s-${r.id_projeto}-${r.id_colaborador}-${r.tarefa}`);

            const key = keys.join('|');

            if (!groups[key]) {
                groups[key] = {
                    data: r.data_registro,
                    cliente: r.cliente,
                    projeto: r.projeto,
                    colaborador: r.colaborador,
                    status: r.status_tarefa,
                    statusP: r.status_p,
                    dataInicioP: r.data_inicio_p,
                    dataFimP: r.data_fim_p,
                    complexidadeP: r.complexidade_p,
                    progressoP: r.progresso_p,
                    horas: 0,
                    valor: 0
                };
            }
            groups[key].horas += r.horas;
            groups[key].valor += (r.valor_rateado ?? 0);
        });

        return Object.values(groups).sort((a, b) => b.data.localeCompare(a.data));
    }, [reportData, useCollaboratorFilter, useStatusFilter]);

    const totals = useMemo(() => {
        if (!reportData) return { hours: 0, val: 0 };
        return reportData.rows.reduce((acc, r) => ({
            hours: acc.hours + r.horas,
            val: acc.val + (r.valor_rateado ?? 0)
        }), { hours: 0, val: 0 });
    }, [reportData]);

    const detailedStats = useMemo(() => {
        if (!reportData) return null;
        const uniqueProjects = new Set(reportData.rows.map(r => r.id_projeto)).size;
        const uniqueColl = new Set(reportData.rows.map(r => r.id_colaborador)).size;
        const uniqueDays = new Set(reportData.rows.map(r => r.data_registro)).size;

        const statusCounts: Record<string, number> = {};
        reportData.rows.forEach(r => {
            const st = r.status_tarefa || 'N/A';
            statusCounts[st] = (statusCounts[st] || 0) + 1;
        });

        return { uniqueProjects, uniqueColl, uniqueDays, statusCounts };
    }, [reportData]);

    const handleApplyFilters = async () => {
        setLoading(true);
        try {
            const resp = await fetchReportPreview({
                startDate: useDateFilter ? startDate : undefined,
                endDate: useDateFilter ? endDate : undefined,
                clientIds: clientIds.length ? clientIds : undefined,
                projectIds: projectIds.length ? projectIds : undefined,
                collaboratorIds: useCollaboratorFilter && collaboratorIds.length ? collaboratorIds : undefined,
                statuses: useStatusFilter && selectedStatuses.length ? selectedStatuses : undefined
            });
            setReportData(resp);
            setHasUnappliedChanges(false); // Resetamos a flag aqui
            addToast('Dados carregados com sucesso!', 'success');

            // Scroll suave para os resultados
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        } catch (err) {
            addToast('Erro ao carregar relatório.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateBudget = async (id: number, val: number | null) => {
        try {
            await upsertProjectCost(id, val);
            addToast('Budget atualizado. Recalculando...', 'info');
            handleApplyFilters(); // Recarrega para ver o valor rateado novo
        } catch (err) {
            addToast('Erro ao atualizar custo.', 'error');
        }
    };

    const handleExportExcel = async () => {
        setExporting('excel');
        try {
            const blob = await exportReportExcel({
                startDate: useDateFilter ? startDate : undefined,
                endDate: useDateFilter ? endDate : undefined,
                clientIds: clientIds.length ? clientIds : undefined,
                projectIds: projectIds.length ? projectIds : undefined,
                collaboratorIds: useCollaboratorFilter && collaboratorIds.length ? collaboratorIds : undefined,
                statuses: useStatusFilter && selectedStatuses.length ? selectedStatuses : undefined,
                includeCost,
                includeHours,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fileName = useDateFilter
                ? `relatorio_analitico_${startDate}_${endDate}.xlsx`
                : `relatorio_analitico_completo.xlsx`;
            a.download = fileName;
            a.click();
            addToast('Exportação concluída!', 'success');
        } catch (err) {
            addToast('Erro ao exportar Excel.', 'error');
        } finally {
            setExporting(null);
        }
    };

    const handleClearFilters = async () => {
        setClientIds([]);
        setProjectIds([]);
        setCollaboratorIds([]);
        setSelectedStatuses([]);
        setUseDateFilter(false);
        setUseClientFilter(false);
        setUseProjectFilter(false);
        setUseCollaboratorFilter(false);
        setUseStatusFilter(false);
        setActiveDropdown(null);
        setIncludeCost(false);
        setIncludeHours(true);
        setStartDate('');
        setEndDate('');

        setLoading(true);
        try {
            // Ao limpar, buscamos os dados sem nenhum filtro (período total)
            const resp = await fetchReportPreview({
                startDate: undefined,
                endDate: undefined,
                clientIds: undefined,
                projectIds: undefined,
                collaboratorIds: undefined,
                statuses: undefined
            });
            setReportData(resp);
            setHasUnappliedChanges(false);
            addToast('Filtros limpos e dados atualizados.', 'info');
        } catch (err) {
            addToast('Erro ao atualizar dados.', 'error');
            setReportData(null);
        } finally {
            setLoading(false);
        }
    };

    const topRef = useRef<HTMLDivElement>(null);

    return (
        <div className="flex flex-col min-h-screen font-sans p-6 lg:p-10 space-y-6 overflow-x-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }} ref={topRef}>
            {/* --- NAVEGAÇÃO DE SUB-TELAS (TOPO) --- */}
            <div className="flex bg-[var(--surface-2)] p-1.5 rounded-2xl border border-[var(--border)] w-fit shadow-sm">
                <button
                    onClick={() => setActiveTab('operacional')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'operacional'
                        ? 'bg-slate-800 text-white shadow-xl scale-[1.02]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-slate-500/5'
                        }`}
                >
                    RELATÓRIO
                </button>
                <button
                    onClick={() => setActiveTab('executivo')}
                    className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'executivo'
                        ? 'bg-slate-800 text-white shadow-xl scale-[1.02]'
                        : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-slate-500/5'
                        }`}
                >
                    RASTREAMENTO
                </button>
            </div>

            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>
                        Relatório Completo
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-sm border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>
                        <HelpCircle className="w-4 h-4" /> Ajuda Admin
                    </button>
                </div>
            </header>

            {
                (activeTab === 'operacional' || activeTab === 'executivo') && (
                    <>
                        {/* --- BLOCO 1: FILTROS --- */}
                        <section className="border rounded-[32px] p-8 shadow-2xl relative z-30 group" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

                            <div className="flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                                <Filter className="w-4 h-4" /> Filtros de Relatório
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Período Customizado */}
                                <div className="col-span-1 md:col-span-2 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--muted)' }}>Período de Análise</label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={useDateFilter}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setUseDateFilter(checked);
                                                    if (checked) {
                                                        if (!startDate) setStartDate(daysAgoISO(30));
                                                        if (!endDate) setEndDate(todayISO());
                                                    } else {
                                                        setStartDate('');
                                                        setEndDate('');
                                                    }
                                                }}
                                                className="w-4 h-4 rounded border-2 border-slate-300 checked:bg-slate-800 checked:border-slate-800 focus:ring-2 focus:ring-slate-500/20 transition-all cursor-pointer"
                                                style={{ backgroundColor: 'var(--bg)' }}
                                            />
                                            <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useDateFilter ? 'text-slate-600' : 'group-hover:text-slate-600'}`} style={{ color: useDateFilter ? undefined : 'var(--muted)' }}>
                                                Filtrar
                                            </span>
                                        </label>
                                    </div>
                                    {useDateFilter ? (
                                        <div className="grid grid-cols-2 gap-4 pt-1 transition-all">
                                            <DateButton
                                                label="Início"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                            />
                                            <DateButton
                                                label="Fim"
                                                value={endDate}
                                                onChange={e => setEndDate(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="h-[50px] flex items-center justify-center border rounded-2xl text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                                            Todo o Período
                                        </div>
                                    )}
                                </div>

                                {/* Clientes */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--muted)' }}>Clientes</label>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === 'clients' ? null : 'clients')}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-slate-400"
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                        >
                                            <span className="truncate">
                                                {clientIds.length === 0 ? 'Todos os Clientes' :
                                                    clientIds.length === 1 ? clientOptions.find(c => c.id === clientIds[0])?.name :
                                                        `${clientIds.length} Clientes Selecionados`}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'clients' ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === 'clients' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 w-full mt-2 border rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
                                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                                >

                                                    {clientOptions.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                if (clientIds.includes(c.id)) setClientIds(clientIds.filter(id => id !== c.id));
                                                                else setClientIds([...clientIds, c.id]);
                                                            }}
                                                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${clientIds.includes(c.id) ? 'bg-slate-800 border-slate-800' : 'border-white/10'}`}>
                                                                {clientIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{c.name}</span>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Projetos */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--muted)' }}>Projetos</label>
                                    </div>
                                    <div className="relative">
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-slate-400"
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                        >
                                            <span className="truncate">
                                                {projectIds.length === 0 ? 'Todos os Projetos' :
                                                    projectIds.length === 1 ? projectOptions.find(p => p.id === projectIds[0])?.name :
                                                        `${projectIds.length} Projetos Selecionados`}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'projects' ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === 'projects' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 w-full mt-2 border rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
                                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                                >

                                                    {projectOptions
                                                        .filter(p => clientIds.length === 0 || clientIds.includes(p.clientId))
                                                        .map(p => (
                                                            <div
                                                                key={p.id}
                                                                onClick={() => {
                                                                    if (projectIds.includes(p.id)) setProjectIds(projectIds.filter(id => id !== p.id));
                                                                    else setProjectIds([...projectIds, p.id]);
                                                                }}
                                                                className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                                            >
                                                                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${projectIds.includes(p.id) ? 'bg-slate-800 border-slate-800' : 'border-white/10'}`}>
                                                                    {projectIds.includes(p.id) && <Check className="w-3 h-3 text-white" />}
                                                                </div>
                                                                <span className="text-xs" style={{ color: 'var(--text-2)' }}>{p.name}</span>
                                                            </div>
                                                        ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--muted)' }}>Colaboradores</label>
                                        <label
                                            onClick={() => {
                                                setUseCollaboratorFilter(!useCollaboratorFilter);
                                                if (useCollaboratorFilter) setCollaboratorIds([]);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer group"
                                        >
                                            <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useCollaboratorFilter ? 'text-slate-600' : 'group-hover:text-slate-600'}`} style={{ color: useCollaboratorFilter ? undefined : 'var(--muted)' }}>
                                                EXIBIR
                                            </span>
                                        </label>
                                    </div>
                                    <div className={`relative ${!useCollaboratorFilter ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === 'collaborators' ? null : 'collaborators')}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-slate-400"
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                        >
                                            <span className="truncate">
                                                {collaboratorIds.length === 0 ? 'Todos os Colaboradores' :
                                                    collaboratorIds.length === 1 ? collaboratorOptions.find(c => c.id === collaboratorIds[0])?.name :
                                                        `${collaboratorIds.length} Colaboradores Selecionados`}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'collaborators' ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === 'collaborators' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 w-full mt-2 border rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
                                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                                >

                                                    {collaboratorOptions.map(c => (
                                                        <div
                                                            key={c.id}
                                                            onClick={() => {
                                                                if (collaboratorIds.includes(c.id)) setCollaboratorIds(collaboratorIds.filter(id => id !== c.id));
                                                                else setCollaboratorIds([...collaboratorIds, c.id]);
                                                            }}
                                                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${collaboratorIds.includes(c.id) ? 'bg-slate-800 border-slate-800' : 'border-white/10'}`}>
                                                                {collaboratorIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{c.name}</span>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>


                                {/* Status da Tarefa */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--muted)' }}>Status da Tarefa</label>
                                        <label
                                            onClick={() => {
                                                setUseStatusFilter(!useStatusFilter);
                                                if (useStatusFilter) setSelectedStatuses([]);
                                            }}
                                            className="flex items-center gap-2 cursor-pointer group"
                                        >
                                            <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useStatusFilter ? 'text-slate-600' : 'group-hover:text-slate-600'}`} style={{ color: useStatusFilter ? undefined : 'var(--muted)' }}>
                                                EXIBIR
                                            </span>
                                        </label>
                                    </div>
                                    <div className={`relative ${!useStatusFilter ? 'opacity-40 pointer-events-none' : ''}`}>
                                        <button
                                            onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-slate-400"
                                            style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                        >
                                            <span className="truncate">
                                                {selectedStatuses.length === 0 ? 'Todos os Status' :
                                                    selectedStatuses.length === 1 ? selectedStatuses[0] :
                                                        `${selectedStatuses.length} Status Selecionados`}
                                            </span>
                                            <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'status' ? 'rotate-180' : ''}`} />
                                        </button>

                                        <AnimatePresence>
                                            {activeDropdown === 'status' && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute z-50 w-full mt-2 border rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
                                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                                >

                                                    {[
                                                        { id: 'Não Iniciado', label: 'Não Iniciado' },
                                                        { id: 'Iniciado', label: 'Iniciado' },
                                                        { id: 'Pendente', label: 'Pendente' },
                                                        { id: 'Conclusão', label: 'Conclusão' },
                                                        { id: 'Atrasado', label: 'Atrasados' },
                                                    ].map(st => (
                                                        <div
                                                            key={st.id}
                                                            onClick={() => {
                                                                if (selectedStatuses.includes(st.id)) setSelectedStatuses(selectedStatuses.filter(s => s !== st.id));
                                                                else setSelectedStatuses([...selectedStatuses, st.id]);
                                                            }}
                                                            className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                                                        >
                                                            <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${selectedStatuses.includes(st.id) ? 'bg-slate-800 border-slate-800' : 'border-white/10'}`}>
                                                                {selectedStatuses.includes(st.id) && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                            <span className="text-xs" style={{ color: 'var(--text-2)' }}>{st.label}</span>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Colunas no Excel */}
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest pl-1 block mb-3" style={{ color: 'var(--muted)' }}>Colunas no Excel</label>
                                    <div className="flex flex-wrap gap-4 px-1">
                                        {[
                                            { label: 'Custo', state: includeCost, setter: setIncludeCost },
                                            { label: 'Horas', state: includeHours, setter: setIncludeHours },
                                        ].map(col => (
                                            <label key={col.label} className="flex items-center gap-2 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={col.state}
                                                    onChange={(e) => col.setter(e.target.checked)}
                                                    className="w-4 h-4 rounded border-2 border-slate-300 checked:bg-slate-800 checked:border-slate-800 focus:ring-2 focus:ring-slate-500/20 transition-all cursor-pointer"
                                                    style={{ backgroundColor: 'var(--bg)' }}
                                                />
                                                <span className={`text-[11px] font-bold transition-colors uppercase tracking-tight ${col.state ? 'text-slate-600' : 'group-hover:text-slate-600'}`} style={{ color: col.state ? undefined : 'var(--muted)' }}>
                                                    {col.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                    {reportData ? `Mostrando dados de ${reportData.rows.length} registros encontrados.` : 'Configure os filtros.'}
                                </span>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-xs font-black hover:text-red-400 transition-colors uppercase tracking-widest mr-2"
                                        style={{ color: 'var(--muted)' }}
                                    >
                                        Limpar Filtros
                                    </button>

                                    {/* Tarja Fixa de Filtros Alterados */}
                                    <AnimatePresence>
                                        {hasUnappliedChanges && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9, x: -10 }}
                                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, x: -10 }}
                                                onClick={handleApplyFilters}
                                                className="flex items-center gap-3 px-4 py-2 bg-slate-800 text-white rounded-2xl cursor-pointer hover:bg-slate-700 transition-colors border shadow-lg"
                                                style={{ borderColor: 'var(--border)' }}
                                            >
                                                <div className="bg-white/20 p-1.5 rounded-full">
                                                    <RefreshCw className="w-4 h-4 animate-spin-slow" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-tight">Filtros Alterados</span>
                                                    <span className="text-[8px] opacity-80 leading-tight">Clique para atualizar a visualização.</span>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        onClick={handleApplyFilters}
                                        disabled={loading}
                                        title="Recarregar"
                                        className={`p-3 rounded-2xl transition-all border ${hasUnappliedChanges ? 'bg-slate-800 hover:bg-slate-700 text-white animate-pulse' : 'hover:bg-black/10'}`}
                                        style={{ backgroundColor: !hasUnappliedChanges ? 'var(--surface-2)' : undefined, borderColor: 'var(--border)', color: !hasUnappliedChanges ? 'var(--muted)' : 'white' }}
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* --- BLOCO 2: CÁLCULOS E EXPORTAÇÃO (Somente se ativo no Filtro) --- */}
                        {includeCost && (
                            <div className="w-full border rounded-[32px] p-8 shadow-xl" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <Layers className="w-5 h-5 text-slate-600" />
                                    <h3 className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text)' }}>Venda dos Projetos Selecionados</h3>
                                </div>
                                <p className="text-xs mb-6" style={{ color: 'var(--muted)' }}>Estime a rentabilidade por hora configurando os valores abaixo.</p>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                    {reportData?.projectTotals.map(pt => (
                                        <ProjectConfigRow key={pt.id_projeto} pt={pt} onSave={handleUpdateBudget} />
                                    ))}
                                    {!reportData && <div className="text-xs italic" style={{ color: 'var(--muted)' }}>Gere o relatório para configurar custos.</div>}
                                </div>
                            </div>
                        )}

                        {/* --- BLOCO 3: VISUALIZAÇÃO EM TEMPO REAL --- */}
                        <section ref={resultsRef} className="border rounded-[32px] overflow-hidden shadow-2xl"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                            <div className="p-8 border-b flex flex-wrap gap-6 items-center" style={{ borderColor: 'var(--border)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-500/10 rounded-xl">
                                        <LayoutDashboard className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text)' }}>
                                        {activeTab === 'operacional' ? 'Relatórios Detalhados' : 'Rastreamento de Execução'}
                                    </h3>
                                </div>

                                <div className="flex flex-1 flex-wrap items-center justify-end gap-3 ml-auto">
                                    <button
                                        onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border"
                                        style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                                    >
                                        Alterar Filtros
                                    </button>

                                    <button
                                        onClick={() => addToast('PowerBI export em desenvolvimento.', 'info')}
                                        disabled={hasUnappliedChanges || !reportData}
                                        className="flex items-center gap-2 px-6 py-3 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border"
                                        style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                                    >
                                        <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                                        Power BI
                                    </button>
                                    <button
                                        onClick={handleExportExcel}
                                        disabled={exporting === 'excel' || hasUnappliedChanges || !reportData}
                                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-slate-500/20 transition-all border"
                                        style={{ borderColor: 'var(--border)' }}
                                    >
                                        {exporting === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                        Baixar Excel
                                    </button>

                                    <div className="flex items-center ml-2">
                                        {hasUnappliedChanges ? (
                                            <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                                DADOS DESATUALIZADOS
                                            </span>
                                        ) : (
                                            <Badge color="green">DADOS ATUALIZADOS</Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {activeTab === 'operacional' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {detailedStats && (
                                        <div className="p-8 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                                <div className="border p-4 rounded-2xl flex flex-col justify-center items-center shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <span className="text-[10px] uppercase font-black mb-1" style={{ color: 'var(--muted)' }}>Dias Apontados</span>
                                                    <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{detailedStats.uniqueDays}</div>
                                                </div>
                                                <div className="border p-4 rounded-2xl flex flex-col justify-center items-center shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <span className="text-[10px] uppercase font-black mb-1" style={{ color: 'var(--muted)' }}>Projetos</span>
                                                    <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{detailedStats.uniqueProjects}</div>
                                                </div>
                                                <div className="border p-4 rounded-2xl flex flex-col justify-center items-center shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <span className="text-[10px] uppercase font-black mb-1" style={{ color: 'var(--muted)' }}>Colaboradores</span>
                                                    <div className="text-xl font-black" style={{ color: 'var(--text)' }}>{detailedStats.uniqueColl}</div>
                                                </div>
                                                <div className="border p-3 rounded-2xl overflow-y-auto max-h-[80px] custom-scrollbar lg:col-span-1 col-span-2 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <span className="text-[9px] uppercase font-black block mb-1 text-center" style={{ color: 'var(--muted)' }}>Tarefas</span>
                                                    <div className="flex flex-col gap-1">
                                                        {Object.entries(detailedStats.statusCounts).map(([st, count]) => (
                                                            <div key={st} className="flex justify-between items-center text-[10px]" style={{ color: 'var(--text-2)' }}>
                                                                <span className="truncate max-w-[80px]">{st}</span>
                                                                <span className="font-bold px-1.5 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}>{count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="border p-4 rounded-2xl flex flex-col justify-center items-center shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                    <span className="text-[10px] uppercase font-black mb-1" style={{ color: 'var(--muted)' }}>Total Horas</span>
                                                    <div className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                                        <Clock className="w-4 h-4 text-slate-600" />
                                                        {formatHours(totals.hours)}
                                                    </div>
                                                </div>
                                                {includeCost && (
                                                    <div className="border p-4 rounded-2xl flex flex-col justify-center items-center shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                        <span className="text-[10px] uppercase font-black mb-1" style={{ color: 'var(--muted)' }}>Custo Est.</span>
                                                        <div className="text-xl font-black text-green-500 flex items-center gap-2">
                                                            <DollarSign className="w-4 h-4" />
                                                            {formatBRL(totals.val)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar">
                                        <table className="w-full text-left border-collapse relative">
                                            <thead className="sticky top-0 z-10 shadow-lg">
                                                <tr className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--muted)' }}>
                                                    <th className="pl-10 py-6" style={{ backgroundColor: 'var(--surface)' }}>Data</th>
                                                    <th className="px-6 py-6" style={{ backgroundColor: 'var(--surface)' }}>Cliente</th>
                                                    <th className="px-6 py-6" style={{ backgroundColor: 'var(--surface)' }}>Projeto</th>
                                                    {useCollaboratorFilter && <th className="px-6 py-6" style={{ backgroundColor: 'var(--surface)' }}>Colaborador</th>}
                                                    {useStatusFilter && <th className="px-6 py-6" style={{ backgroundColor: 'var(--surface)' }}>Status T.</th>}
                                                    {includeHours && <th className="px-6 py-6 text-center" style={{ backgroundColor: 'var(--surface)' }}>Horas</th>}
                                                    {includeCost && <th className="pr-10 py-6 text-right" style={{ backgroundColor: 'var(--surface)' }}>Valor (R$)</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                                                {previewData.length === 0 && (
                                                    <tr>
                                                        <td colSpan={10} className="py-20 text-center font-bold italic" style={{ color: 'var(--muted)' }}>Nenhum dado selecionado.</td>
                                                    </tr>
                                                )}
                                                {previewData.map((row, idx) => (
                                                    <tr key={idx} className="transition-colors group hover:bg-[var(--surface-2)]">
                                                        <td className="pl-10 py-4 font-black text-[10px] uppercase tracking-tighter" style={{ color: 'var(--muted)' }}>
                                                            {row.data ? new Date(row.data + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 font-bold" style={{ color: 'var(--text)' }}>{row.cliente}</td>
                                                        <td className="px-6 py-4 text-xs font-black text-purple-600 uppercase">{row.projeto}</td>
                                                        {useCollaboratorFilter && (
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-2)' }}>
                                                                    {row.colaborador}
                                                                </div>
                                                            </td>
                                                        )}
                                                        {useStatusFilter && (
                                                            <td className="px-6 py-4">
                                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                                                                    {row.status || 'N/A'}
                                                                </span>
                                                            </td>
                                                        )}
                                                        {includeHours && (
                                                            <td className="px-6 py-4 text-center font-black" style={{ color: 'var(--text-2)' }}>
                                                                {formatHours(row.horas)}
                                                            </td>
                                                        )}
                                                        {includeCost && (
                                                            <td className="pr-10 py-4 text-right font-black" style={{ color: 'var(--text)' }}>
                                                                {formatBRL(row.valor)}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'executivo' && (
                                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[var(--bg)] text-[var(--muted)] text-[10px] uppercase tracking-widest font-black border-b border-[var(--border)]">
                                                    <th className="px-10 py-6">Cliente / Projeto</th>
                                                    <th className="px-6 py-6">Status Planejamento</th>
                                                    <th className="px-6 py-6 text-center">Complexidade</th>
                                                    <th className="px-6 py-6 text-center">Progresso</th>
                                                    <th className="pr-10 py-6 text-right">Período Planejado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border)]">
                                                {previewData.reduce((acc: any[], current) => {
                                                    if (!acc.find(r => r.projeto === current.projeto)) {
                                                        acc.push(current);
                                                    }
                                                    return acc;
                                                }, []).map((row, i) => (
                                                    <tr key={i} className="hover:bg-[var(--bg)]/50 transition-colors">
                                                        <td className="px-10 py-6">
                                                            <div className="font-black text-xs text-[var(--text)] uppercase">{row.projeto}</div>
                                                            <div className="text-[10px] font-bold text-[var(--muted)] uppercase">{row.cliente}</div>
                                                        </td>
                                                        <td className="px-6 py-6 font-bold">
                                                            <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter border ${row.statusP === 'Desenvolvimento' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                                row.statusP === 'Arquitetura' ? 'bg-slate-800 text-white border-white/10' :
                                                                    row.statusP === 'Análise da solução' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                        row.statusP === 'Entendimento da demanda' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                                                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                                }`}>
                                                                {row.statusP || 'Não Definido'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-6 text-center">
                                                            <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${row.complexidadeP === 'Alta' ? 'bg-red-500/10 text-red-500' :
                                                                row.complexidadeP === 'Baixa' ? 'bg-green-500/10 text-green-500' :
                                                                    'bg-blue-500/10 text-blue-500'
                                                                }`}>
                                                                {row.complexidadeP || 'Média'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-6">
                                                            <div className="flex flex-col items-center gap-1">
                                                                <span className="font-black text-[10px] text-[var(--text)] uppercase">{(row.progressoP || 0).toFixed(0)}%</span>
                                                                <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-slate-800 rounded-full"
                                                                        style={{ width: `${row.progressoP || 0}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="pr-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tabular-nums">
                                                            {row.dataInicioP ? new Date(row.dataInicioP + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                            <br />
                                                            {row.dataFimP ? new Date(row.dataFimP + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="p-4 flex justify-center items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                                <RefreshCw className="w-3 h-3" /> Sincronizando com timesheet em tempo real..
                            </div>
                        </section>
                    </>
                )
            }



            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
};

// --- Componente de Input de Moeda Inteligente ---
const MoneyInput = ({ initialValue, onSave }: { initialValue: number | null, onSave: (val: number | null) => void }) => {
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);

    const formatToDisplay = (val: number | null) => {
        if (val === null) return '';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    useEffect(() => {
        setInputValue(formatToDisplay(initialValue));
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let digits = e.target.value.replace(/\D/g, '');
        digits = digits.replace(/^0+/, '');
        if (digits === '') {
            setInputValue('0,00');
            return;
        }
        while (digits.length < 3) {
            digits = '0' + digits;
        }
        const integerPart = digits.slice(0, -2);
        const decimalPart = digits.slice(-2);
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        setInputValue(`${formattedInteger},${decimalPart}`);
    };

    const handleBlur = async () => {
        if (!inputValue || inputValue === '0,00') {
            if (initialValue !== null) await onSave(null);
            return;
        }
        const numericString = inputValue.replace(/\./g, '').replace(',', '.');
        const numberValue = parseFloat(numericString);
        if (isNaN(numberValue)) return;
        if (numberValue === initialValue) return;

        setLoading(true);
        await onSave(numberValue);
        setLoading(false);
    };

    return (
        <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black select-none" style={{ color: 'var(--muted)' }}>R$</span>
            <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0,00"
                className="w-36 border rounded-xl py-2 pl-9 pr-3 text-xs font-black focus:border-purple-500/50 outline-none transition-all tabular-nums text-right"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            {loading && <Loader2 className="absolute -right-6 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-purple-500" />}
        </div>
    );
};

const ProjectConfigRow = ({ pt, onSave }: { pt: ProjectTotal, onSave: (id: number, val: number | null) => void }) => {
    return (
        <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border hover:border-slate-400 transition-all group" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-black truncate uppercase tracking-tight" style={{ color: 'var(--text)' }}>{pt.projeto}</div>
                <div className="text-[10px] font-bold uppercase truncate" style={{ color: 'var(--muted)' }}>{pt.cliente}</div>
            </div>

            <div className="flex items-center gap-6">
                <MoneyInput
                    initialValue={pt.valor_projeto}
                    onSave={(val) => onSave(pt.id_projeto, val)}
                />

                <div className="w-24 text-right flex-shrink-0">
                    <div className="text-[10px] font-black uppercase" style={{ color: 'var(--muted)' }}>Est. / Hora</div>
                    <div className="text-sm font-black text-emerald-400 tabular-nums">{formatBRL(pt.valor_hora_projeto)}</div>
                </div>
            </div>
        </div>
    );
};

export default AdminFullReport;

