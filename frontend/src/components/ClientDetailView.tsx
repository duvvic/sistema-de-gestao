import React, { useState, useMemo } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Client, Project, Task } from '@/types';
import { ArrowLeft, FolderKanban, CheckSquare, Info } from 'lucide-react';

interface ClientDetailViewProps {
  client: Client;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onTaskClick: (taskId: string) => void;
  onProjectClick?: (projectId: string) => void;
  onOpenClientDetails?: (clientId: string) => void;
}

const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  projects: initialProjects,
  tasks: initialTasks,
  onBack,
  onTaskClick,
  onProjectClick,
  onOpenClientDetails,
}) => {
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'inprogress' | 'review' | 'done'>('all');
  const [showClientInfo, setShowClientInfo] = useState(false);

  // Realtime subscriptions
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

  // Removido: cálculo e exibição de contrato fora de "Informações"

  // Filtra projetos do cliente
  const clientProjects = useMemo(
    () => projects.filter(p => p.clientId === client.id),
    [projects, client.id]
  );

  // Filtra tarefas do cliente
  const clientTasks = useMemo(
    () => tasks.filter(t => t.clientId === client.id),
    [tasks, client.id]
  );

  // Aplica filtro de status nas tarefas
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return clientTasks;
    const statusMap: { [key: string]: string } = {
      'todo': 'Todo',
      'inprogress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
    };
    return clientTasks.filter(t => t.status === statusMap[statusFilter]);
  }, [clientTasks, statusFilter]);

  // Agrupa tarefas por status para display em kanban
  const tasksByStatus = useMemo(() => {
    return {
      'Todo': clientTasks.filter(t => t.status === 'Todo'),
      'In Progress': clientTasks.filter(t => t.status === 'In Progress'),
      'Review': clientTasks.filter(t => t.status === 'Review'),
      'Done': clientTasks.filter(t => t.status === 'Done'),
    };
  }, [clientTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-slate-100 dark:bg-slate-800/50';
      case 'In Progress': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'Review': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'Done': return 'bg-green-50 dark:bg-green-900/20';
      default: return 'bg-slate-100 dark:bg-slate-800/50';
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'text-[var(--textMuted)]';
      case 'In Progress': return 'text-blue-600 dark:text-blue-400';
      case 'Review': return 'text-purple-600 dark:text-purple-400';
      case 'Done': return 'text-green-600 dark:text-green-400';
      default: return 'text-[var(--textMuted)]';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors text-[var(--textMuted)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--textTitle)] flex items-center gap-3">
              {client.logoUrl && (
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="w-8 h-8 rounded-lg object-contain bg-[var(--bgApp)] border border-[var(--border)] p-1"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              {client.name}
            </h1>
            <p className="text-sm text-[var(--textMuted)] mt-1">Projetos e Tarefas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenClientDetails?.(client.id)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors flex items-center gap-2"
            title="Informações e Edição do Cliente"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Informações</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-8 py-4 border-b border-[var(--border)] bg-[var(--bgApp)]">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'projects'
            ? 'bg-[var(--brand)] text-white'
            : 'text-[var(--textMuted)] hover:bg-[var(--surfaceHover)]'
            }`}
        >
          <FolderKanban className="w-4 h-4" />
          Projetos ({clientProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'tasks'
            ? 'bg-[var(--brand)] text-white'
            : 'text-[var(--textMuted)] hover:bg-[var(--surfaceHover)]'
            }`}
        >
          <CheckSquare className="w-4 h-4" />
          Tarefas ({clientTasks.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {/* Removido: cards de resumo de contrato/tempo fora de "Informações" */}
          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div>
              <h2 className="text-lg font-bold text-[var(--textTitle)] mb-6">Projetos do Cliente</h2>
              {clientProjects.length === 0 ? (
                <div className="bg-[var(--bgApp)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
                  <FolderKanban className="w-12 h-12 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-[var(--textMuted)]">Nenhum projeto para este cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => onProjectClick?.(project.id)}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:shadow-md hover:border-[#d8b4fe] dark:hover:border-purple-800 transition-all cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-[var(--textTitle)]">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-[var(--textMuted)] mt-2 line-clamp-2">{project.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${project.status === 'Em andamento'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[var(--textTitle)]">Tarefas do Cliente</h2>
                <div className="flex gap-2">
                  {(['all', 'todo', 'inprogress', 'review', 'done'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === filter
                        ? 'bg-[var(--brand)] text-white'
                        : 'bg-[var(--surfaceHover)] text-[var(--textMuted)] hover:bg-[var(--bgApp)]'
                        }`}
                    >
                      {filter === 'all' ? 'Todas' : filter === 'todo' ? 'Todo' : filter === 'inprogress' ? 'Em Progresso' : filter === 'review' ? 'Review' : 'Concluídas'}
                    </button>
                  ))}
                </div>
              </div>

              {clientTasks.length === 0 ? (
                <div className="bg-[var(--bgApp)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
                  <CheckSquare className="w-12 h-12 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-[var(--textMuted)]">Nenhuma tarefa para este cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-auto">
                  {(statusFilter === 'all'
                    ? Object.entries(tasksByStatus)
                    : Object.entries(tasksByStatus).filter(([key]) => {
                      const filterMap = { 'todo': 'Todo', 'inprogress': 'In Progress', 'review': 'Review', 'done': 'Done' };
                      return key === filterMap[statusFilter];
                    })
                  ).map(([status, statusTasks]) => {
                    const list = statusTasks as unknown as Task[];
                    return (
                      <div
                        key={status}
                        className={`${getStatusColor(status)} border border-[var(--border)] rounded-2xl p-4 flex flex-col`}
                      >
                        <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getStatusHeaderColor(status)}`}>
                          {status} ({list.length})
                        </h3>
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                          {list.map(task => (
                            <div
                              key={task.id}
                              onClick={() => onTaskClick(task.id)}
                              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md hover:border-[#d8b4fe] dark:hover:border-purple-800 transition-all cursor-pointer group"
                            >
                              <h4 className="font-semibold text-sm text-[var(--textTitle)] line-clamp-2 group-hover:text-[var(--brand)]">
                                {task.title || "(Sem título)"}
                              </h4>
                              <div className="mt-2 flex items-center justify-between text-xs text-[var(--textMuted)]">
                                <span>{task.progress || 0}%</span>
                                <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--brand)]"
                                    style={{ width: `${task.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                              {task.estimatedDelivery && (
                                <div className="mt-2 text-xs text-[var(--textMuted)]">
                                  Entrega: {new Date(task.estimatedDelivery).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailView;
