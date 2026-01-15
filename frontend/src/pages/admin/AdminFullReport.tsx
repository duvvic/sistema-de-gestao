// src/pages/admin/AdminFullReport.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    exportReportExcel,
    exportReportPowerBI,
    fetchClients,
    fetchCollaborators,
    fetchProjects,
    fetchReportPreview,
    ProjectTotal,
    ReportPreviewResponse,
    ReportRow,
    upsertProjectCost,
} from '@/services/reportApi';
import {
    FileSpreadsheet,
    BarChart3,
    Search,
    Filter,
    Calendar as CalendarIcon, // Renaming to avoid conflict if needed, though Calendar is fine
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
    Check
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
        purple: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
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
            className="relative flex items-center bg-[#0d091b] rounded-2xl border border-white/5 px-4 py-3 cursor-pointer hover:border-purple-500/50 transition-all group"
            onClick={() => {
                // Tenta abrir o picker nativo. showPicker() é supported em Chrome/Edge/Firefox recentes.
                try {
                    inputRef.current?.showPicker();
                } catch (e) {
                    inputRef.current?.focus();
                }
            }}
        >
            <CalendarIcon className="w-4 h-4 text-purple-500 mr-3 group-hover:text-purple-400 transition-colors" />
            <div className="flex-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 group-hover:text-purple-300 transition-colors">{label}</div>
                <div className="text-sm font-black text-slate-200 group-hover:text-white transition-colors">
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
    const { currentUser } = useAuth();

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

    // Opções
    const [clientOptions, setClientOptions] = useState<{ id: number; name: string }[]>([]);
    const [projectOptions, setProjectOptions] = useState<{ id: number; name: string; clientId: number }[]>([]);
    const [collaboratorOptions, setCollaboratorOptions] = useState<{ id: number; name: string }[]>([]);

    // Estados da UI
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState<'excel' | 'powerbi' | null>(null);
    const [reportData, setReportData] = useState<ReportPreviewResponse | null>(null);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: ToastType }[]>([]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

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

    // Carregar Opções
    useEffect(() => {
        if (currentUser?.role !== 'admin') {
            navigate('/dashboard');
            return;
        }
        const load = async () => {
            try {
                const [cls, cols, prjs] = await Promise.all([
                    fetchClients(),
                    fetchCollaborators(),
                    fetchProjects()
                ]);
                setClientOptions(cls);
                setCollaboratorOptions(cols);
                setProjectOptions(prjs);
            } catch (err) {
                console.error('Load Error:', err);
                addToast('Erro ao conectar com servidor. Verifique se o backend está rodando.', 'error');
            }
        };
        load();
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
        <div className="flex flex-col min-h-screen bg-[#0d091b] text-slate-100 font-sans p-6 lg:p-10 space-y-8 overflow-x-hidden" ref={topRef}>
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tighter text-white">
                        Relatório Completo <span className="text-purple-500">(Horas & Custos)</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">Gestão avançada de rentabilidade e alocação financeira por projeto.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all font-bold text-sm border border-white/5">
                        <HelpCircle className="w-4 h-4" /> Ajuda Admin
                    </button>
                </div>
            </header>

            {/* --- BLOCO 1: FILTROS --- */}
            <section className="bg-[#161129] border border-white/5 rounded-[32px] p-8 shadow-2xl relative z-30 group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-[120px] rounded-full -mr-20 -mt-20"></div>

                <div className="flex items-center gap-2 mb-6 text-xs font-black uppercase tracking-[0.2em] text-purple-400">
                    <Filter className="w-4 h-4" /> Filtros de Relatório
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Período Customizado */}
                    <div className="col-span-1 md:col-span-2 space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Período de Análise</label>
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
                                    className="w-4 h-4 rounded border-2 border-purple-500/30 bg-[#0d091b] checked:bg-purple-600 checked:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                                />
                                <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useDateFilter ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-400'}`}>
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
                            <div className="h-[50px] flex items-center justify-center bg-[#0d091b] border border-white/5 rounded-2xl text-xs font-bold text-slate-500 uppercase tracking-widest">
                                Todo o Período
                            </div>
                        )}
                    </div>

                    {/* Clientes */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Clientes</label>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'clients' ? null : 'clients')}
                                className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-purple-500/30"
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
                                        className="absolute z-50 w-full mt-2 bg-[#161129] border border-white/10 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
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
                                                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${clientIds.includes(c.id) ? 'bg-purple-600 border-purple-600' : 'border-white/10'}`}>
                                                    {clientIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs text-slate-300">{c.name}</span>
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Projetos</label>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'projects' ? null : 'projects')}
                                className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-purple-500/30"
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
                                        className="absolute z-50 w-full mt-2 bg-[#161129] border border-white/10 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
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
                                                    <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${projectIds.includes(p.id) ? 'bg-purple-600 border-purple-600' : 'border-white/10'}`}>
                                                        {projectIds.includes(p.id) && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-xs text-slate-300">{p.name}</span>
                                                </div>
                                            ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Colaboradores</label>
                            <label
                                onClick={() => {
                                    setUseCollaboratorFilter(!useCollaboratorFilter);
                                    if (useCollaboratorFilter) setCollaboratorIds([]);
                                }}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useCollaboratorFilter ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-400'}`}>
                                    EXIBIR
                                </span>
                            </label>
                        </div>
                        <div className={`relative ${!useCollaboratorFilter ? 'opacity-40 pointer-events-none' : ''}`}>
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'collaborators' ? null : 'collaborators')}
                                className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-purple-500/30"
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
                                        className="absolute z-50 w-full mt-2 bg-[#161129] border border-white/10 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
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
                                                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${collaboratorIds.includes(c.id) ? 'bg-purple-600 border-purple-600' : 'border-white/10'}`}>
                                                    {collaboratorIds.includes(c.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs text-slate-300">{c.name}</span>
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
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Status da Tarefa</label>
                            <label
                                onClick={() => {
                                    setUseStatusFilter(!useStatusFilter);
                                    if (useStatusFilter) setSelectedStatuses([]);
                                }}
                                className="flex items-center gap-2 cursor-pointer group"
                            >
                                <span className={`text-[10px] font-bold transition-colors uppercase tracking-widest ${useStatusFilter ? 'text-purple-400' : 'text-slate-500 group-hover:text-purple-400'}`}>
                                    EXIBIR
                                </span>
                            </label>
                        </div>
                        <div className={`relative ${!useStatusFilter ? 'opacity-40 pointer-events-none' : ''}`}>
                            <button
                                onClick={() => setActiveDropdown(activeDropdown === 'status' ? null : 'status')}
                                className="w-full bg-[#0d091b] border border-white/5 rounded-2xl px-4 py-3 text-sm text-left flex justify-between items-center transition-all hover:border-purple-500/30"
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
                                        className="absolute z-50 w-full mt-2 bg-[#161129] border border-white/10 rounded-2xl shadow-2xl p-2 max-h-80 overflow-y-auto custom-scrollbar"
                                    >

                                        {[
                                            { id: 'A Fazer', label: 'A Fazer' },
                                            { id: 'Em Andamento', label: 'Em Andamento' },
                                            { id: 'Revisão', label: 'Revisão' },
                                            { id: 'Concluído', label: 'Concluído' },
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
                                                <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${selectedStatuses.includes(st.id) ? 'bg-purple-600 border-purple-600' : 'border-white/10'}`}>
                                                    {selectedStatuses.includes(st.id) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <span className="text-xs text-slate-300">{st.label}</span>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Colunas no Excel */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block mb-3">Colunas no Excel</label>
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
                                        className="w-4 h-4 rounded border-2 border-purple-500/30 bg-[#0d091b] checked:bg-purple-600 checked:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all cursor-pointer"
                                    />
                                    <span className={`text-[11px] font-bold transition-colors uppercase tracking-tight ${col.state ? 'text-purple-400' : 'text-slate-400 group-hover:text-purple-400'}`}>
                                        {col.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {reportData ? `Mostrando dados de ${reportData.rows.length} registros encontrados.` : 'Configure os filtros.'}
                    </span>
                    <div className="flex items-center gap-4 flex-wrap">
                        <button
                            onClick={handleClearFilters}
                            className="text-xs font-black text-slate-500 hover:text-red-400 transition-colors uppercase tracking-widest mr-2"
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
                                    className="flex items-center gap-3 px-4 py-2 bg-purple-600 text-white rounded-2xl cursor-pointer hover:bg-purple-500 transition-colors border border-white/10 shadow-lg"
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
                            className={`p-3 rounded-2xl transition-all border border-white/5 ${hasUnappliedChanges ? 'bg-purple-600 hover:bg-purple-500 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </section >

            {/* --- BLOCO 2: CÁLCULOS E EXPORTAÇÃO --- */}
            <div className="w-full gap-8">
                {/* Configuração de Valores */}
                {includeCost && (
                    <div className="w-full bg-[#161129] border border-white/5 rounded-[32px] p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            <h3 className="text-sm font-black text-white uppercase tracking-tight">Configuração de Valores dos Projetos</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-6">Insira os valores totais para cálculo de rentabilidade por hora.</p>

                        <div className="space-y-4 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {reportData?.projectTotals.map(pt => (
                                <ProjectConfigRow key={pt.id_projeto} pt={pt} onSave={handleUpdateBudget} />
                            ))}
                            {!reportData && <div className="text-xs text-slate-700 italic">Gere o relatório para configurar custos.</div>}
                        </div>
                    </div>
                )}

                {/* Exportar removido daqui, pois agora está no cabeçalho dos filtros */}
                <AnimatePresence>
                </AnimatePresence>
            </div>

            {/* --- BLOCO 3: VISUALIZAÇÃO EM TEMPO REAL --- */}
            <section ref={resultsRef} className="bg-[#161129] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/10 rounded-xl">
                            <LayoutDashboard className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest whitespace-nowrap">Visualização em Tempo Real</h3>
                    </div>

                    <div className="flex flex-1 flex-wrap items-center justify-end gap-3 ml-auto">
                        {/* Novo botão Alterar para voltar ao topo */}
                        <button
                            onClick={() => topRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all border border-white/5"
                        >
                            Alterar
                        </button>

                        <button
                            onClick={() => addToast('PowerBI export em desenvolvimento.', 'info')}
                            disabled={hasUnappliedChanges || !reportData}
                            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black text-white uppercase tracking-widest transition-all border border-white/5"
                        >
                            <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                            Power BI
                        </button>
                        <button
                            onClick={handleExportExcel}
                            disabled={exporting === 'excel' || hasUnappliedChanges || !reportData}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-purple-500/20 transition-all border border-white/10"
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

                {/* Resumo Geral */}
                {detailedStats && (
                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {/* 1. Dias */}
                            <div className="bg-[#0d091b] border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                                <span className="text-[10px] uppercase font-black text-slate-500 mb-1">Dias Apontados</span>
                                <div className="text-xl font-black text-white">{detailedStats.uniqueDays}</div>
                            </div>

                            {/* 2. Projetos */}
                            <div className="bg-[#0d091b] border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                                <span className="text-[10px] uppercase font-black text-slate-500 mb-1">Projetos</span>
                                <div className="text-xl font-black text-white">{detailedStats.uniqueProjects}</div>
                            </div>

                            {/* 3. Colaboradores */}
                            <div className="bg-[#0d091b] border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                                <span className="text-[10px] uppercase font-black text-slate-500 mb-1">Colaboradores</span>
                                <div className="text-xl font-black text-white">{detailedStats.uniqueColl}</div>
                            </div>

                            {/* 4. Card: Status (Mini Lista) */}
                            <div className="bg-[#0d091b] border border-white/5 p-3 rounded-2xl overflow-y-auto max-h-[80px] custom-scrollbar lg:col-span-1 col-span-2">
                                <span className="text-[9px] uppercase font-black text-slate-500 block mb-1 text-center">Tarefas por Status</span>
                                <div className="flex flex-col gap-1">
                                    {Object.entries(detailedStats.statusCounts).map(([st, count]) => (
                                        <div key={st} className="flex justify-between items-center text-[10px] text-slate-300">
                                            <span className="truncate max-w-[80px]">{st}</span>
                                            <span className="font-bold text-white bg-white/10 px-1.5 rounded">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* 5. Card: Horas */}
                            <div className="bg-[#0d091b] border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                                <span className="text-[10px] uppercase font-black text-slate-500 mb-1">Total de Horas</span>
                                <div className="text-xl font-black text-white flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    {formatHours(totals.hours)}
                                </div>
                            </div>

                            {/* 6. Card: Valor (Opcional) */}
                            {includeCost && (
                                <div className="bg-[#0d091b] border border-white/5 p-4 rounded-2xl flex flex-col justify-center items-center">
                                    <span className="text-[10px] uppercase font-black text-slate-500 mb-1">Custo Estimado</span>
                                    <div className="text-xl font-black text-green-400 flex items-center gap-2">
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
                        <thead className="sticky top-0 z-10 bg-[#161129] shadow-lg">
                            <tr className="text-slate-500 text-[10px] uppercase font-black tracking-widest">
                                <th className="pl-10 py-6 bg-[#161129]">Data</th>
                                <th className="px-6 py-6 bg-[#161129]">Cliente</th>
                                <th className="px-6 py-6 bg-[#161129]">Projeto</th>
                                {useCollaboratorFilter && <th className="px-6 py-6 bg-[#161129]">Colaborador</th>}
                                {useStatusFilter && <th className="px-6 py-6 bg-[#161129]">Status</th>}
                                {includeHours && <th className="px-6 py-6 text-center bg-[#161129]">Horas</th>}
                                {includeCost && <th className="pr-10 py-6 text-right bg-[#161129]">Valor Rateado (R$)</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {previewData.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-20 text-center text-slate-700 font-bold italic">Nenhum dado selecionado.</td>
                                </tr>
                            )}
                            {previewData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="pl-10 py-4 font-black text-slate-500 text-[10px] uppercase tracking-tighter">
                                        {row.data ? new Date(row.data + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-200">
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="w-4 h-4 text-purple-400/50" />
                                            {row.cliente}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-black text-purple-300 uppercase">
                                        <div className="flex items-center gap-3">
                                            <Layers className="w-3.5 h-3.5 text-purple-500/50" />
                                            {row.projeto}
                                        </div>
                                    </td>
                                    {useCollaboratorFilter && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3 text-slate-400">
                                                <UserIcon className="w-4 h-4 text-slate-600" />
                                                {row.colaborador}
                                            </div>
                                        </td>
                                    )}
                                    {useStatusFilter && (
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 rounded text-slate-500">
                                                {row.status || 'N/A'}
                                            </span>
                                        </td>
                                    )}
                                    {includeHours && (
                                        <td className="px-6 py-4 text-center font-black text-slate-400">
                                            {formatHours(row.horas)}
                                        </td>
                                    )}
                                    {includeCost && (
                                        <td className="pr-10 py-4 text-right font-black text-white">
                                            {formatBRL(row.valor)}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 bg-black/20 flex justify-center items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <RefreshCw className="w-3 h-3" /> Sincronizando com timesheet em tempo real..
                </div>
            </section>

            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div >
    );
};

// --- Componente de Input de Moeda Inteligente ---
const MoneyInput = ({ initialValue, onSave }: { initialValue: number | null, onSave: (val: number | null) => void }) => {
    // Estado interno para controle visual imediato
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);

    // Converte número (ex: 50.00) para string formatada (ex: "50,00") sem o R$ para edição
    const formatToDisplay = (val: number | null) => {
        if (val === null) return '';
        return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    useEffect(() => {
        setInputValue(formatToDisplay(initialValue));
    }, [initialValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Remove tudo que não é dígito
        let digits = e.target.value.replace(/\D/g, '');

        // Remove zeros à esquerda
        digits = digits.replace(/^0+/, '');

        if (digits === '') {
            setInputValue('0,00');
            return;
        }

        // Se tiver menos de 3 dígitos, preenche com zeros à esquerda para formar decimal
        while (digits.length < 3) {
            digits = '0' + digits;
        }

        // Insere a vírgula antes dos últimos 2 dígitos
        const integerPart = digits.slice(0, -2);
        const decimalPart = digits.slice(-2);

        // Formata milhar
        const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

        setInputValue(`${formattedInteger},${decimalPart}`);
    };

    const handleBlur = async () => {
        if (!inputValue) {
            await onSave(null);
            return;
        }

        // Converte "1.000,50" -> 1000.50
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
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 select-none">R$</span>
            <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="0,00"
                className="w-36 bg-[#161129] border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-black text-slate-100 focus:border-purple-500/50 outline-none transition-all tabular-nums text-right"
            />
            {loading && <Loader2 className="absolute -right-6 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin text-purple-500" />}
        </div>
    );
};

const ProjectConfigRow = ({ pt, onSave }: { pt: ProjectTotal, onSave: (id: number, val: number | null) => void }) => {
    return (
        <div className="flex items-center justify-between gap-4 p-4 bg-[#0d091b] rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group">
            <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-slate-200 truncate uppercase tracking-tight">{pt.projeto}</div>
                <div className="text-[10px] font-bold text-slate-600 uppercase truncate">{pt.cliente}</div>
            </div>

            <div className="flex items-center gap-6">
                <MoneyInput
                    initialValue={pt.valor_projeto}
                    onSave={(val) => onSave(pt.id_projeto, val)}
                />

                <div className="w-24 text-right flex-shrink-0">
                    <div className="text-[10px] font-black text-slate-600 uppercase">Est. / Hora</div>
                    <div className="text-sm font-black text-emerald-400 tabular-nums">{formatBRL(pt.valor_hora_projeto)}</div>
                </div>
            </div>
        </div>
    );
};

export default AdminFullReport;
