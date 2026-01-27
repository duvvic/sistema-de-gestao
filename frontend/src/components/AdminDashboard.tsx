import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useDataController } from '@/controllers/useDataController';
import { Client, Project, Task } from "@/types";
import { Plus, Building2, ArrowDownAZ, Briefcase, LayoutGrid, List, Edit2, CheckSquare, ChevronDown, Filter, Clock, AlertCircle, ArrowUp, Trash2, DollarSign, TrendingUp, BarChart, Users, PieChart, ArrowRight } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from "framer-motion";

type SortOption = 'recent' | 'alphabetical' | 'creation';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clients, projects, tasks, error, loading, users, deleteProject } = useDataController();
  const { currentUser, isAdmin } = useAuth();
  const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem('admin_clients_sort_by') as SortOption) || 'recent');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'late' | 'ongoing' | 'done'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setShowScrollTop(scrollTop > 400);
  };

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('admin_clients_view_mode') as 'grid' | 'list') || 'grid';
  });

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('admin_clients_view_mode', mode);
  };

  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
    localStorage.setItem('admin_clients_sort_by', option);
    setShowSortMenu(false);
  };

  // Data handling moved to useDataController

  // Painel de debug

  // Proteção contra undefined
  const safeClients = clients || [];
  const safeProjects = projects || [];
  const safeTasks = tasks || [];

  // Realtime handling should be done in useDataController or hooks/useAppData to maintain normalization.
  // Removing local broken realtime logic.

  // Separar clientes ativos (Apenas Diretos: Nem parceiro, nem vinculado)
  const activeClients = useMemo(() =>
    safeClients.filter(c => c.active !== false && c.tipo_cliente !== 'parceiro' && !c.partner_id),
    [safeClients]
  );

  // Tarefa mais recente de um cliente
  const getMostRecentTaskDate = (clientId: string): Date | null => {
    const clientTasks = safeTasks.filter(t => t.clientId === clientId);
    if (clientTasks.length === 0) return null;

    const dates = clientTasks
      .map(t => t.actualStart)
      .filter(Boolean)
      .map(d => new Date(d!));

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // Filtrar e Ordenar clientes
  const filteredSortedClients = useMemo(() => {
    let result = [...activeClients];

    // Aplicar Filtro de Status de Tarefa
    if (taskStatusFilter !== 'all') {
      result = result.filter(client => {
        const clientTasks = safeTasks.filter(t => t.clientId === client.id);
        if (taskStatusFilter === 'late') {
          return clientTasks.some(t => {
            if (t.status === 'Done' || t.status === 'Review') return false;
            if (!t.estimatedDelivery) return false;
            return (t.daysOverdue ?? 0) > 0;
          });
        }
        if (taskStatusFilter === 'ongoing') {
          return clientTasks.some(t => t.status === 'In Progress');
        }
        if (taskStatusFilter === 'done') {
          const clientProjects = safeProjects.filter(p => p.clientId === client.id);
          return clientProjects.some(p => p.status === 'Concluído');
        }
        return true;
      });
    }

    // Aplicar Ordenação
    return result.sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'creation':
          return a.id.localeCompare(b.id);
        case 'recent':
        default:
          const dateA = getMostRecentTaskDate(a.id);
          const dateB = getMostRecentTaskDate(b.id);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
      }
    });
  }, [activeClients, sortBy, taskStatusFilter, safeTasks, safeProjects]);

  // Cálculos Executivos do Portfólio
  const { timesheetEntries: portfolioTimesheets } = useDataController();

  const executiveMetrics = useMemo(() => {
    if (!safeProjects.length) return null;

    // 1. Financeiro Global
    let totalBudgeted = 0;
    let totalCommitted = 0;
    let totalForecastedFinish = 0;

    // 2. Progresso Global (Ponderado por Horas Estimadas)
    let totalPortfolioEstimatedHours = 0;
    let totalPortfolioWeightedProgress = 0;

    safeProjects.forEach(project => {
      totalBudgeted += project.valor_total_rs || 0;

      const projectTasks = safeTasks.filter(t => t.projectId === project.id);
      const pTimesheets = portfolioTimesheets.filter(e => e.projectId === project.id);

      // Custo do Projeto
      const projectCost = pTimesheets.reduce((acc, entry) => {
        const u = users.find(user => user.id === entry.userId);
        return acc + (entry.totalHours * (u?.hourlyCost || 0));
      }, 0);
      totalCommitted += projectCost;

      // Horas e Progresso
      const projectEstimated = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      const projectWeighted = projectEstimated > 0
        ? projectTasks.reduce((acc, t) => acc + ((t.progress || 0) * (t.estimatedHours || 0)), 0) / projectEstimated
        : (projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / (projectTasks.length || 1));

      totalPortfolioEstimatedHours += projectEstimated;
      totalPortfolioWeightedProgress += (projectWeighted * projectEstimated);

      // Previsão para terminar (Simplificado)
      const remainingHours = projectTasks.reduce((acc, t) => acc + ((t.estimatedHours || 0) * (1 - (t.progress || 0) / 100)), 0);
      totalForecastedFinish += (remainingHours * 150); // Fallback rate
    });

    const globalProgress = totalPortfolioEstimatedHours > 0
      ? totalPortfolioWeightedProgress / totalPortfolioEstimatedHours
      : 0;

    // 3. Capacidade de Recursos
    const resourcesCapacity = users.filter(u => u.active !== false).map(u => {
      const userTasks = safeTasks.filter(t => t.developerId === u.id && t.status !== 'Done');
      const assignedHours = userTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
      return {
        id: u.id,
        name: u.name,
        tower: u.tower,
        capacity: u.monthlyAvailableHours || 160,
        assigned: assignedHours,
        load: (assignedHours / (u.monthlyAvailableHours || 160)) * 100
      };
    });

    return {
      totalBudgeted,
      totalCommitted,
      totalEstimatedROI: totalBudgeted - (totalCommitted + totalForecastedFinish),
      globalProgress,
      resourcesCapacity,
      activeProjectsCount: safeProjects.filter(p => p.status !== 'Concluído').length,
      delayedTasksCount: safeTasks.filter(t => (t.daysOverdue ?? 0) > 0 && t.status !== 'Done').length
    };
  }, [safeProjects, safeTasks, portfolioTimesheets, users]);

  const activeTab = (searchParams.get('tab') as 'operacional' | 'executivo' | 'capacidade' | 'parceiros') || 'operacional';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="h-full flex flex-col p-8" style={{ backgroundColor: 'var(--bg)' }}>
      {/* ABAS DE NAVEGAÇÃO SUPERIOR */}
      <div className="flex gap-2 mb-8 p-1 rounded-2xl w-fit border shadow-sm transition-colors" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('operacional')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'operacional' ? 'bg-[var(--surface)] shadow-md text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          Operacional
        </button>
        <button
          onClick={() => setActiveTab('executivo')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'executivo' ? 'bg-[var(--surface)] shadow-md text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          Executive Insights
        </button>
        <button
          onClick={() => setActiveTab('capacidade')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'capacidade' ? 'bg-[var(--surface)] shadow-md text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          Quadro de Capacidade
        </button>
        <button
          onClick={() => setActiveTab('parceiros')}
          className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'parceiros' ? 'bg-[var(--surface)] shadow-md text-[var(--primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}
        >
          Parceiros
        </button>
      </div>

      {activeTab === 'executivo' && executiveMetrics && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 mb-10">
          {/* KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-3xl border shadow-sm transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-2xl text-[var(--primary)]"><TrendingUp size={24} /></div>
                  <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-md h-fit">ATUALIZADO</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>Avanço do Portfólio</p>
                <div className="flex items-end gap-2">
                  <p className="text-3xl font-black" style={{ color: 'var(--text)' }}>{Math.round(executiveMetrics.globalProgress)}%</p>
                  <span className="text-xs font-bold text-emerald-500 mb-1.5 flex items-center"><ArrowUp size={12} /> Real</span>
                </div>
                <div className="w-full h-1.5 rounded-full mt-4 overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                  <div className="h-full bg-[var(--primary)]" style={{ width: `${executiveMetrics.globalProgress}%` }} />
                </div>
              </div>

              <div className="p-6 rounded-3xl border shadow-sm transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600"><DollarSign size={24} /></div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>Custo Empenhado</p>
                <p className="text-3xl font-black" style={{ color: 'var(--text)' }}>
                  {executiveMetrics.totalCommitted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] font-bold mt-2" style={{ color: 'var(--muted)' }}>Valor acumulado em todos os projetos</p>
              </div>

              <div className="p-6 rounded-3xl border shadow-sm transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600"><PieChart size={24} /></div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>Previsão de Resultado</p>
                <p className={`text-3xl font-black ${executiveMetrics.totalEstimatedROI < 0 ? 'text-red-500' : 'text-[var(--text)]'}`}>
                  {executiveMetrics.totalEstimatedROI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] font-bold mt-2" style={{ color: 'var(--muted)' }}>Margem Orçado x Real (Forecast)</p>
              </div>

              <div className="p-6 rounded-3xl border shadow-sm transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex justify-between mb-4">
                  <div className="p-3 bg-red-500/10 rounded-2xl text-red-600"><AlertCircle size={24} /></div>
                  <span className="text-[10px] font-black bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded-md h-fit">CRÍTICO</span>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--muted)' }}>Alertas de Saúde</p>
                <p className="text-3xl font-black" style={{ color: 'var(--text)' }}>{executiveMetrics.delayedTasksCount}</p>
                <p className="text-[10px] font-bold mt-2" style={{ color: 'var(--muted)' }}>Tarefas com atraso no portfólio</p>
              </div>
            </div>
          </div>

          {/* FINANCE TABLE */}
          <div className="p-8 rounded-[32px] border shadow-xl transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h3 className="text-lg font-black mb-6 flex items-center gap-3" style={{ color: 'var(--text)' }}>
              <DollarSign className="text-[var(--primary)]" /> Detalhamento Financeiro por Projeto
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-700">
                    <th className="pb-4">Projeto</th>
                    <th className="pb-4">Status</th>
                    <th className="pb-4">Evolução</th>
                    <th className="pb-4">Orçado</th>
                    <th className="pb-4">Empenhado</th>
                    <th className="pb-4">Variação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {safeProjects.map(p => {
                    const pTasks = safeTasks.filter(t => t.projectId === p.id);
                    const pTimesheets = portfolioTimesheets.filter(e => e.projectId === p.id);
                    const cost = pTimesheets.reduce((acc, e) => acc + (e.totalHours * (users.find(u => u.id === e.userId)?.hourlyCost || 0)), 0);
                    const prog = pTasks.length > 0 ? (pTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / pTasks.length) : 0;
                    const budget = p.valor_total_rs || 0;
                    const variance = budget - cost;

                    return (
                      <tr key={p.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                        <td className="py-4 font-bold text-sm text-slate-700 dark:text-slate-200">{p.name}</td>
                        <td className="py-4">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${p.status === 'Concluído' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                            {p.status || 'Ativo'}
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full bg-purple-500" style={{ width: `${prog}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500">{Math.round(prog)}%</span>
                          </div>
                        </td>
                        <td className="py-4 text-xs font-bold text-slate-600 dark:text-slate-400">{budget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="py-4 text-xs font-black text-slate-800 dark:text-slate-100">{cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className={`py-4 text-xs font-black ${variance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {variance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'capacidade' && executiveMetrics && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
          <div className="p-8 rounded-[32px] border shadow-xl transition-all" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black flex items-center gap-3" style={{ color: 'var(--text)' }}>
                <Users className="text-[var(--primary)]" /> Mapa de Ocupação dos Recursos
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Excelente (&lt;80%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Alerta (80-100%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Sobrecarga (&gt;100%)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {executiveMetrics.resourcesCapacity.map(res => (
                <div key={res.id} className="p-5 rounded-2xl border transition-all hover:shadow-lg" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-sm truncate" style={{ color: 'var(--text)' }}>{res.name}</h4>
                      <span className="text-[9px] font-black text-[var(--primary)] uppercase tracking-tighter">{res.tower || 'Sem Torre'}</span>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${res.load > 100 ? 'bg-red-500/10 text-red-500' : res.load > 80 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {Math.round(res.load)}%
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className={`h-full transition-all duration-1000 ${res.load > 100 ? 'bg-red-500' : res.load > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(res.load, 100)}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-black uppercase" style={{ color: 'var(--muted)' }}>
                      <span>Alocado: {res.assigned}h</span>
                      <span>Base: {res.capacity}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'parceiros' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--surface)] p-6 rounded-3xl border border-[var(--border)] shadow-sm">
            <div>
              <h2 className="text-xl font-black text-[var(--text)]">Gestão de Parceiros</h2>
              <p className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">Visualize parceiros e empresas vinculadas</p>
            </div>
            <button
              onClick={() => navigate('/admin/clients/new?tipo=parceiro')}
              className="bg-[var(--primary)] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shadow-lg shadow-purple-500/20"
            >
              <Plus size={16} /> Novo Parceiro
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {safeClients.filter(c => c.tipo_cliente === 'parceiro').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-[var(--surface)] rounded-[32px] border-2 border-dashed border-[var(--border)]">
                <Briefcase size={40} className="text-[var(--muted)] mb-4 opacity-20" />
                <p className="text-[var(--muted)] font-black uppercase text-[10px] tracking-widest">Nenhum parceiro cadastrado ainda</p>
              </div>
            ) : (
              safeClients.filter(c => c.tipo_cliente === 'parceiro').map(partner => (
                <div key={partner.id} className="bg-[var(--surface)] rounded-[32px] border border-[var(--border)] shadow-sm overflow-hidden transition-all hover:shadow-md">
                  <div className="p-6 flex flex-col md:flex-row items-center justify-between bg-[var(--surface-2)]/50 border-b border-[var(--border)] gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center p-2 shadow-sm border border-[var(--border)]">
                        <img src={partner.logoUrl || '/placeholder-logo.png'} alt={partner.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[var(--text)]">{partner.name}</h3>
                        <span className="text-[9px] font-black uppercase text-[var(--primary)] bg-[var(--primary-soft)] px-2 py-0.5 rounded-md">PARCEIRO NIC-LABS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-[var(--muted)] uppercase tracking-tighter">
                        {safeClients.filter(c => c.partner_id === partner.id).length} Empresas Vinculadas
                      </span>
                      <button
                        onClick={() => navigate(`/admin/clients/${partner.id}`)}
                        className="p-2 hover:bg-[var(--surface)] rounded-xl transition-colors border border-transparent hover:border-[var(--border)] text-[var(--text)]"
                      >
                        <TrendingUp size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {safeClients.filter(c => c.partner_id === partner.id).map(linkedCompany => (
                        <div
                          key={linkedCompany.id}
                          onClick={() => navigate(`/admin/clients/${linkedCompany.id}`)}
                          className="p-4 rounded-2xl border border-[var(--border)] hover:border-[var(--primary)] transition-all cursor-pointer group flex items-center gap-4 bg-[var(--surface)]"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center p-2 border border-[var(--border)] group-hover:scale-105 transition-transform">
                            <img src={linkedCompany.logoUrl || '/placeholder-logo.png'} alt={linkedCompany.name} className="max-w-full max-h-full object-contain opacity-80" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm text-[var(--text)] truncate">{linkedCompany.name}</p>
                            <p className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-tighter">Empresa Vinculada</p>
                          </div>
                          <ArrowRight size={14} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                        </div>
                      ))}
                      <button
                        onClick={() => navigate(`/admin/clients/new?tipo=cliente_final&partnerId=${partner.id}`)}
                        className="p-4 rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] transition-all flex items-center justify-center gap-3 group"
                      >
                        <Plus size={18} className="text-[var(--muted)] group-hover:text-[var(--primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] group-hover:text-[var(--primary)]">Adicionar Empresa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {activeTab === 'operacional' && (
        <>


          {/* NEW COMPACT HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-600/10 border border-purple-500/20">
                <Briefcase className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text)' }}>Portfólio de Operações</h1>
                <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--muted)' }}>
                  {activeClients.length} Clientes Ativos • {safeProjects.length} Projetos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* BOTÃO ORDENAR (DROPDOWN) */}
              <div className="relative">
                <button
                  onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
                  className="px-4 py-2.5 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <ArrowDownAZ className="w-4 h-4 text-purple-400" />
                  <span>Ordenar: {sortBy === 'recent' ? 'Recentes' : sortBy === 'alphabetical' ? 'Alfabética' : 'Criação'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
                </button>

                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                      <button onClick={() => handleSortChange('recent')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'recent' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Mais Recentes
                      </button>
                      <button onClick={() => handleSortChange('alphabetical')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'alphabetical' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Alfabética (A-Z)
                      </button>
                      <button onClick={() => handleSortChange('creation')} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${sortBy === 'creation' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Data de Criação
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* BOTÃO FILTRAR (DROPDOWN) */}
              <div className="relative">
                <button
                  onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
                  className="px-4 py-2.5 border rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
                  style={{
                    backgroundColor: taskStatusFilter !== 'all' ? 'rgba(109, 40, 217, 0.2)' : 'var(--surface)',
                    borderColor: taskStatusFilter !== 'all' ? 'rgba(109, 40, 217, 0.5)' : 'var(--border)',
                    color: taskStatusFilter !== 'all' ? 'var(--primary)' : 'var(--text)'
                  }}
                >
                  <Filter className="w-4 h-4" />
                  <span>Status: {taskStatusFilter === 'all' ? 'Todos' : taskStatusFilter === 'late' ? 'Em Atraso' : taskStatusFilter === 'ongoing' ? 'Em Andamento' : 'Concluídos'}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                </button>

                {showFilterMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
                      <button onClick={() => { setTaskStatusFilter('all'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                        Todos os Clientes
                      </button>
                      <button onClick={() => { setTaskStatusFilter('late'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'late' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <AlertCircle className="w-4 h-4" /> Em Atraso
                      </button>
                      <button onClick={() => { setTaskStatusFilter('ongoing'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'ongoing' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <Clock className="w-4 h-4" /> Em Andamento
                      </button>
                      <button onClick={() => { setTaskStatusFilter('done'); setShowFilterMenu(false); }} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${taskStatusFilter === 'done' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-white/5'}`}>
                        <CheckSquare className="w-4 h-4" /> Proj. Concluídos
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* VIEW TOGGLE */}
              <div className="flex p-1 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => toggleViewMode('grid')}
                  className="p-2 px-3 rounded-lg transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: viewMode === 'grid' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'grid' ? 'white' : 'var(--muted)'
                  }}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleViewMode('list')}
                  className="p-2 px-3 rounded-lg transition-all flex items-center gap-2"
                  style={{
                    backgroundColor: viewMode === 'list' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'list' ? 'white' : 'var(--muted)'
                  }}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => navigate('/admin/clients/new')}
                className="ml-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all font-bold text-sm"
              >
                <Plus size={18} />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* LISTA DE CLIENTES */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
                <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando clientes...</p>
              </div>
            </div>
          ) : filteredSortedClients.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center" style={{ color: 'var(--muted)' }}>
                <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">
                  Nenhum cliente ativo
                </p>
                <p className="text-sm">
                  Clique em "Novo Cliente" para começar
                </p>
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar"
            >
              {filteredSortedClients.map((client) => (
                <div
                  key={client.id}
                  className="group border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  onClick={() => navigate(`/admin/clients/${client.id}`)}
                >
                  <div className="w-full h-[180px] p-6 flex items-center justify-center border-b transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--surface-hover)',
                      borderColor: 'var(--border)'
                    }}>
                    <img
                      src={client.logoUrl}
                      alt={client.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => (e.currentTarget.src = "https://placehold.co/200x200?text=Logo")}
                    />
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="flex-1 flex flex-col justify-center">
                      <h2 className="text-sm font-bold mb-2 line-clamp-2 leading-tight transition-colors text-center group-hover:text-[var(--primary)]" style={{ color: 'var(--text)' }}>
                        {client.name}
                      </h2>
                      <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                          {safeProjects.filter((p) => p.clientId === client.id).length}
                        </span>
                        <span>{safeProjects.filter((p) => p.clientId === client.id).length === 1 ? 'projeto' : 'projetos'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* LIST VIEW IMPROVED (USER REQUEST) */
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pb-10"
            >
              {filteredSortedClients.map((client) => {
                const clientProjects = safeProjects.filter(p => p.clientId === client.id);
                const clientTasks = safeTasks.filter(t => t.clientId === client.id);

                return (
                  <div key={client.id} className="space-y-4">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl border group transition-all"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-xl border bg-white p-2 flex items-center justify-center shadow-lg" style={{ borderColor: 'var(--border)' }}>
                          <img
                            src={client.logoUrl}
                            alt={client.name}
                            className="w-full h-full object-contain"
                            onError={(e) => (e.currentTarget.src = "https://placehold.co/100x100?text=Logo")}
                          />
                        </div>
                        <div>
                          <h2 className="text-xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{client.name}</h2>
                          <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--muted)' }}>
                            <span>{clientProjects.length} {clientProjects.length === 1 ? 'projeto' : 'projetos'}</span>
                            <span className="text-slate-600">•</span>
                            <span>{clientTasks.length} {clientTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-4 md:mt-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${client.id}/edit`); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold text-xs border"
                          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)', borderColor: 'var(--border)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${client.id}/projects/new`); }}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600/90 hover:bg-purple-600 text-white rounded-xl transition-all font-bold text-xs shadow-lg shadow-purple-900/20"
                        >
                          <Plus className="w-3.5 h-3.5" /> Novo Projeto
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar-thin pl-2">
                      {clientProjects.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-4">Nenhum projeto cadastrado para este cliente.</div>
                      ) : (
                        clientProjects.map(project => {
                          const projectTasks = safeTasks.filter(t => t.projectId === project.id);
                          const doneTasks = projectTasks.filter(t => t.status === 'Done').length;
                          const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;

                          return (
                            <motion.div
                              whileHover={{ y: -4 }}
                              key={project.id}
                              onClick={() => navigate(`/admin/projects/${project.id}`)}
                              className="min-w-[280px] max-w-[280px] border rounded-2xl p-5 cursor-pointer transition-all group/card shadow-lg relative"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                            >
                              {isAdmin && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProjectToDelete(project.id);
                                  }}
                                  className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all z-10 opacity-0 group-hover/card:opacity-100"
                                  title="Excluir Projeto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                              <h4 className="font-bold mb-3 line-clamp-1 transition-colors uppercase text-[11px] tracking-wider" style={{ color: 'var(--text)' }}>{project.name}</h4>

                              <div className="space-y-4">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                  <span>Progresso</span>
                                  <span className="text-purple-400">{progress}%</span>
                                </div>
                                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                                  <div
                                    className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                                    <CheckSquare className="w-3.5 h-3.5 text-purple-500" />
                                    <span>{doneTasks}/{projectTasks.length}</span>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${project.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}>
                                    {project.status || 'Ativo'}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* FLOAT SCROLL TO TOP */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-10 right-10 p-4 bg-purple-600 text-white rounded-full shadow-2xl hover:bg-purple-500 transition-all z-50 border border-white/10 group"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!projectToDelete}
        title="Excluir Projeto"
        message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
        onConfirm={async () => {
          if (projectToDelete) {
            try {
              await deleteProject(projectToDelete);
              setProjectToDelete(null);
            } catch (err) {
              console.error('Erro ao excluir projeto:', err);
              alert('Erro ao excluir projeto.');
            }
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />
    </div>
  );
};

export default AdminDashboard;
