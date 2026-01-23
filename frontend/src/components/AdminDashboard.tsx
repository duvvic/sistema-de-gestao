// components/AdminDashboard.tsx - Versão adaptada para React Router
import React, { useState, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useDataController } from '@/controllers/useDataController';
import { Client, Project, Task } from "@/types";
import { Plus, Building2, ArrowDownAZ, Briefcase, LayoutGrid, List, Edit2, CheckSquare, ChevronDown, Filter, Clock, AlertCircle, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SortOption = 'recent' | 'alphabetical' | 'creation';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { clients: initialClients, projects: initialProjects, tasks: initialTasks, error, loading, users } = useDataController();

  const [clients, setClients] = useState(initialClients);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [sortBy, setSortBy] = useState<SortOption>(() => (localStorage.getItem('admin_clients_sort_by') as SortOption) || 'recent');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | 'late' | 'ongoing' | 'done'>('all');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Atualizar quando os dados mudarem
  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Painel de debug

  // Proteção contra undefined
  const safeClients = clients || [];
  const safeProjects = projects || [];
  const safeTasks = tasks || [];

  // Realtime subscriptions
  useSupabaseRealtime('dim_clientes', (payload) => {
    if (payload.eventType === 'INSERT') setClients(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setClients(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
    else if (payload.eventType === 'DELETE') setClients(prev => prev.filter(c => c.id !== payload.old.id));
  });

  useSupabaseRealtime('dim_projetos', (payload) => {
    if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
  });

  useSupabaseRealtime('fato_tarefas', (payload) => {
    if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
    else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
  });

  // Separar clientes ativos
  const activeClients = useMemo(() =>
    safeClients.filter(c => c.active !== false),
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

  return (
    <div className="h-full flex flex-col p-8" style={{ backgroundColor: 'var(--bg)' }}>


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
                          className="min-w-[280px] max-w-[280px] border rounded-2xl p-5 cursor-pointer transition-all group/card shadow-lg"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
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
    </div>
  );
};

export default AdminDashboard;
