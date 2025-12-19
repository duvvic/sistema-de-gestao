import React, { useState, useMemo } from 'react';
import { useSupabaseRealtime } from '../hooks/useSupabaseRealtime';
import { Client, Project, Task } from '../types';
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
      case 'Todo': return 'bg-slate-100';
      case 'In Progress': return 'bg-blue-50';
      case 'Review': return 'bg-purple-50';
      case 'Done': return 'bg-green-50';
      default: return 'bg-slate-100';
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'text-slate-600';
      case 'In Progress': return 'text-blue-600';
      case 'Review': return 'text-purple-600';
      case 'Done': return 'text-green-600';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-3">
              {client.logoUrl && (
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="w-8 h-8 rounded-lg object-contain bg-slate-50 border border-slate-200 p-1"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              {client.name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">Projetos e Tarefas</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onOpenClientDetails?.(client.id)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:border-[#4c1d95] hover:text-[#4c1d95] transition-colors flex items-center gap-2"
            title="Informações e Edição do Cliente"
          >
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Informações</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 px-8 py-4 border-b border-slate-100 bg-slate-50">
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'projects'
              ? 'bg-[#4c1d95] text-white'
              : 'text-slate-600 hover:bg-white'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          Projetos ({clientProjects.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-[#4c1d95] text-white'
              : 'text-slate-600 hover:bg-white'
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
              <h2 className="text-lg font-bold text-slate-800 mb-6">Projetos do Cliente</h2>
              {clientProjects.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhum projeto para este cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => onProjectClick?.(project.id)}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{project.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          project.status === 'Em andamento'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
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
                <h2 className="text-lg font-bold text-slate-800">Tarefas do Cliente</h2>
                <div className="flex gap-2">
                  {(['all', 'todo', 'inprogress', 'review', 'done'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === filter
                          ? 'bg-[#4c1d95] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {filter === 'all' ? 'Todas' : filter === 'todo' ? 'Todo' : filter === 'inprogress' ? 'Em Progresso' : filter === 'review' ? 'Review' : 'Concluídas'}
                    </button>
                  ))}
                </div>
              </div>

              {clientTasks.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
                  <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600">Nenhuma tarefa para este cliente</p>
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
                      className={`${getStatusColor(status)} border border-slate-200 rounded-2xl p-4 flex flex-col`}
                    >
                      <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getStatusHeaderColor(status)}`}>
                        {status} ({list.length})
                      </h3>
                      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                        {list.map(task => (
                          <div
                            key={task.id}
                            onClick={() => onTaskClick(task.id)}
                            className="bg-white border border-slate-100 rounded-lg p-3 hover:shadow-md hover:border-purple-300 transition-all cursor-pointer group"
                          >
                            <h4 className="font-semibold text-sm text-slate-800 line-clamp-2 group-hover:text-purple-700">
                              {task.title}
                            </h4>
                            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                              <span>{task.progress || 0}%</span>
                              <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#4c1d95]"
                                  style={{ width: `${task.progress || 0}%` }}
                                />
                              </div>
                            </div>
                            {task.estimatedDelivery && (
                              <div className="mt-2 text-xs text-slate-500">
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
