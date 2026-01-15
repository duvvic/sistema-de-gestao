// components/DeveloperProjects.tsx - Adaptado para Router
import React, { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Project, Client } from "@/types";
import { ArrowLeft, Building2, FolderKanban, CheckSquare, Clock, LayoutGrid, List } from "lucide-react";

type ViewType = 'clients' | 'projects' | 'tasks';
type ViewMode = 'grid' | 'list';

// Componente TaskCard
interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const navigate = useNavigate();

  const handleCreateTimesheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div
      onClick={onClick}
      className="border rounded-lg p-3 text-left hover:shadow-md transition-all group w-full flex flex-col cursor-pointer pointer-events-auto"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--brand)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div className="mb-2">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className="h-full bg-[#4c1d95]"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs font-bold" style={{ color: 'var(--text-default)' }}>{task.progress}%</span>
        </div>
        {task.priority && (
          <span className={`text-xs mt-2 px-2 py-1 rounded-full font-medium inline-block ${task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
            task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
              task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
            }`}>
            {task.priority}
          </span>
        )}
      </div>

      {task.status !== 'Done' && (
        <button
          onClick={handleCreateTimesheet}
          className="w-full mt-auto flex items-center justify-center gap-2 py-2 bg-purple-50 hover:bg-[#4c1d95] text-[#4c1d95] hover:text-white rounded-lg transition-all text-xs font-bold border border-purple-100 shadow-sm"
        >
          <Clock className="w-4 h-4" />
          Apontar Tarefa
        </button>
      )}
    </div>
  );
};

const DeveloperProjects: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, projects, clients, projectMembers } = useDataController();

  const [currentView, setCurrentView] = useState<ViewType>('clients');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('project_view_mode');
    return (saved as ViewMode) || 'list';
  });
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('project_view_mode', mode);
  };

  // Filtra tarefas e projetos para o usuário logado
  const myTasks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return tasks;
    return tasks.filter(t => t.developerId === currentUser.id);
  }, [tasks, currentUser]);

  const myProjectIdsFromTasks = useMemo(() => new Set(myTasks.map(t => t.projectId)), [myTasks]);

  const myMemberProjectIds = useMemo(() => {
    // Se projectMembers não estiver carregado ainda, retorna vazio
    if (!currentUser || !projectMembers) return new Set<string>();
    return new Set(
      projectMembers
        .filter(pm => pm.userId === currentUser.id)
        .map(pm => pm.projectId)
    );
  }, [projectMembers, currentUser]);

  const myProjects = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return projects;

    // Projetos onde tem tarefa (myProjectIdsFromTasks) OU é membro (myMemberProjectIds)
    return projects.filter(p => myProjectIdsFromTasks.has(p.id) || myMemberProjectIds.has(p.id));
  }, [projects, myProjectIdsFromTasks, myMemberProjectIds, currentUser]);

  // Estatísticas por cliente (baseado nos projetos visíveis)
  const clientStats = useMemo(() => {
    const stats = new Map<string, { totalHours: number; taskCount: number; projectCount: number }>();

    // Inicializa com projetos visíveis
    myProjects.forEach(project => {
      const current = stats.get(project.clientId) || { totalHours: 0, taskCount: 0, projectCount: 0 };
      stats.set(project.clientId, {
        ...current,
        projectCount: current.projectCount + 1
      });
    });

    // Soma horas e tarefas
    myTasks.forEach(task => {
      const current = stats.get(task.clientId) || { totalHours: 0, taskCount: 0, projectCount: 0 };
      // Se o projeto não estiver na lista (ex: tarefa orfã?), garante que cliente exista no map
      // Mas tasks geralmente têm projectId válido.

      stats.set(task.clientId, {
        ...current,
        totalHours: current.totalHours + (task.progress || 0), // Progress não é hora, mas ok, mantendo lógica original
        taskCount: current.taskCount + 1
      });
    });

    return stats;
  }, [myTasks, myProjects]);

  // Projetos do cliente selecionado
  const clientProjects = useMemo(() => {
    if (!selectedClientId) return [];
    return myProjects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, myProjects]);

  // Tarefas do projeto selecionado
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return myTasks.filter(t => t.projectId === selectedProjectId);
  }, [selectedProjectId, myTasks]);

  // Agrupa tarefas por status
  const projectTasksByStatus = useMemo(() => {
    return {
      Todo: projectTasks.filter(t => t.status === "Todo"),
      InProgress: projectTasks.filter(t => t.status === "In Progress"),
      Review: projectTasks.filter(t => t.status === "Review"),
      Done: projectTasks.filter(t => t.status === "Done"),
    };
  }, [projectTasks]);

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'transparent' }}>

      {/* VISTA 1: EMPRESAS/CLIENTES */}
      {currentView === 'clients' && (
        <div className="flex-1 flex flex-col p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Projetos</h1>
              <p className="mt-1" style={{ color: 'var(--text-muted)' }}>
                {viewMode === 'list' ? 'Seus projetos agrupados por cliente' : 'Escolha um cliente para ver os projetos'}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex bg-white/10 p-1 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => handleToggleViewMode('grid')}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-[#4c1d95] text-white shadow-md' : 'text-muted hover:bg-white/5'}`}
                title="Visualização em Blocos"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-xs font-bold hidden md:block">Blocos</span>
              </button>
              <button
                onClick={() => handleToggleViewMode('list')}
                className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-[#4c1d95] text-white shadow-md' : 'text-muted hover:bg-white/5'}`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4" />
                <span className="text-xs font-bold hidden md:block">Lista</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {clients.filter(c => clientStats.has(c.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full" style={{ color: 'var(--text-muted)' }}>
                <Building2 className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p>Nenhum cliente vinculado encontrado.</p>
              </div>
            ) : viewMode === 'list' ? (
              /* MODO LISTA AGRUPADO */
              <div className="space-y-8">
                {clients
                  .filter(c => clientStats.has(c.id))
                  .map(client => {
                    const projectsOfClient = myProjects.filter(p => p.clientId === client.id);
                    return (
                      <div key={client.id} className="space-y-4">
                        {/* Linha do Cliente */}
                        <div className="flex items-center gap-4 py-3 px-4 border-l-4 rounded-r-xl bg-white/5" style={{ borderColor: 'var(--brand)' }}>
                          <div className="w-10 h-10 rounded-lg border p-1.5 flex items-center justify-center bg-white" style={{ borderColor: 'var(--border)' }}>
                            {client.logoUrl ? (
                              <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{projectsOfClient.length} projetos</p>
                          </div>
                        </div>

                        {/* Projetos do Cliente */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4 md:pl-10">
                          {projectsOfClient.map(project => {
                            const projTasks = myTasks.filter(t => t.projectId === project.id);
                            const completedTasks = projTasks.filter(t => t.status === 'Done').length;

                            return (
                              <div
                                key={project.id}
                                onClick={() => {
                                  setSelectedClientId(client.id);
                                  setSelectedProjectId(project.id);
                                  setCurrentView('tasks');
                                }}
                                className="border rounded-2xl p-5 hover:shadow-lg transition-all text-left group cursor-pointer pointer-events-auto"
                                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                              >
                                <div className="mb-3">
                                  <h4 className="font-bold text-base group-hover:text-[#4c1d95]" style={{ color: 'var(--text-primary)' }}>{project.name}</h4>
                                  <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{project.description || 'Sem descrição'}</p>
                                </div>

                                <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-2" style={{ color: 'var(--text-default)' }}>
                                      <CheckSquare className="w-3 h-3 text-green-500" />
                                      Progresso
                                    </span>
                                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{completedTasks}/{projTasks.length}</span>
                                  </div>
                                  <div className="w-full h-1 rounded-full overflow-hidden mt-1" style={{ backgroundColor: 'var(--border)' }}>
                                    <div
                                      className="h-full bg-green-500 rounded-full"
                                      style={{ width: `${projTasks.length > 0 ? (completedTasks / projTasks.length) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* MODO BLOCOS (CLIENTES) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients
                  .filter(c => clientStats.has(c.id))
                  .map(client => {
                    const stats = clientStats.get(client.id);
                    return (
                      <div
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setCurrentView('projects');
                        }}
                        className="border rounded-2xl p-6 hover:shadow-lg transition-all text-left group cursor-pointer pointer-events-auto"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl border p-2 flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bg-app)', borderColor: 'var(--border)' }}>
                            {client.logoUrl ? (
                              <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                            ) : (
                              <Building2 className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{stats?.projectCount} projetos vinculados</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-default)' }}>
                            <CheckSquare className="w-4 h-4 text-[#4c1d95]" />
                            {stats?.taskCount} tarefas vinculadas
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 2: PROJETOS DO CLIENTE */}
      {currentView === 'projects' && selectedClientId && (
        <div className="flex-1 flex flex-col">
          {/* BARRA SUPERIOR PERSONALIZADA */}
          <div className="px-8 py-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-app)' }}>
            <button
              onClick={() => {
                setCurrentView('clients');
                setSelectedClientId(null);
              }}
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-lg border p-1.5 flex items-center justify-center overflow-hidden shadow-sm" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
                {clients.find(c => c.id === selectedClientId)?.logoUrl ? (
                  <img src={clients.find(c => c.id === selectedClientId)?.logoUrl} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {clients.find(c => c.id === selectedClientId)?.name}
                </h1>
                <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>Selecione um projeto</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            <h2 className="text-sm font-bold uppercase tracking-widest mb-6 px-1" style={{ color: 'var(--text-muted)' }}>Projetos</h2>
            {clientProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
                <FolderKanban className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p>Nenhum projeto vinculado encontrado para este cliente.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientProjects.map(project => {
                  const projTasks = myTasks.filter(t => t.projectId === project.id);
                  const completedTasks = projTasks.filter(t => t.status === 'Done').length;

                  return (
                    <div
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('tasks');
                      }}
                      className="border rounded-2xl p-6 hover:shadow-lg transition-all text-left group cursor-pointer pointer-events-auto"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</h3>
                        <p className="text-sm mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{project.description || 'Sem descrição'}</p>
                      </div>

                      <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2" style={{ color: 'var(--text-default)' }}>
                            <CheckSquare className="w-4 h-4 text-green-500" />
                            Progresso
                          </span>
                          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{completedTasks}/{projTasks.length} tarefas</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ backgroundColor: 'var(--border)' }}>
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${projTasks.length > 0 ? (completedTasks / projTasks.length) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISTA 3: TAREFAS DO PROJETO */}
      {currentView === 'tasks' && selectedProjectId && (
        <div className="flex-1 flex flex-col">
          {/* BARRA SUPERIOR CUSTOMIZADA PARA TAREFAS */}
          <div className="px-8 py-6 border-b flex items-center gap-4" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-app)' }}>
            <button
              onClick={() => {
                setCurrentView('projects');
                setSelectedProjectId(null);
              }}
              className="p-2 rounded-full transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {projects.find(p => p.id === selectedProjectId)?.name}
              </h1>
              <p className="text-xs uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Minhas Tarefas
              </p>
            </div>
            <button
              className="px-6 py-2.5 bg-[#4c1d95] text-white rounded-xl font-bold shadow-lg hover:bg-[#3b1675] transition-all flex items-center gap-2 transform active:scale-95"
              onClick={() => navigate(`/tasks/new?project=${selectedProjectId}&client=${selectedClientId}`)}
            >
              <CheckSquare className="w-4 h-4" />
              Criar Tarefa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8">
            {projectTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
                <CheckSquare className="w-12 h-12 mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                <p>Nenhuma tarefa criada por você neste projeto.</p>
                <button
                  className="mt-4 text-[#4c1d95] font-bold hover:underline"
                  onClick={() => navigate(`/tasks/new?project=${selectedProjectId}&client=${selectedClientId}`)}
                >
                  Criar sua primeira tarefa agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projectTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperProjects;
