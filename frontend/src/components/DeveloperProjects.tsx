// components/DeveloperProjects.tsx - Adaptado para Router
import React, { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Project, Client } from "@/types";
import { ArrowLeft, Building2, FolderKanban, CheckSquare, Clock } from "lucide-react";

type ViewType = 'clients' | 'projects' | 'tasks';

const DeveloperProjects: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, projects, clients, projectMembers } = useDataController();

  const [currentView, setCurrentView] = useState<ViewType>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-8">

      {/* VISTA 1: EMPRESAS/CLIENTES */}
      {currentView === 'clients' && (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Projetos</h1>
            <p className="text-slate-500 mt-1">Todos os projetos da empresa</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Building2 className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhum projeto cadastrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clients
                  .filter(c => clientStats.has(c.id))
                  .map(client => {
                    const stats = clientStats.get(client.id);
                    return (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClientId(client.id);
                          setCurrentView('projects');
                        }}
                        className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-[#4c1d95]/30 transition-all text-left group"
                      >
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#4c1d95]">{client.name}</h3>
                            <p className="text-sm text-slate-500 mt-1">{stats?.taskCount} tarefas</p>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <FolderKanban className="w-4 h-4 text-[#4c1d95]" />
                            {projects.filter(p => p.clientId === client.id).length} Projetos
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}

      {/* VISTA 2: PROJETOS DO CLIENTE */}
      {currentView === 'projects' && selectedClientId && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentView('clients');
                setSelectedClientId(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">Projetos</h1>
              <p className="text-slate-500 mt-1">
                {clients.find(c => c.id === selectedClientId)?.name}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {clientProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FolderKanban className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhum projeto nesta empresa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientProjects.map(project => {
                  const projTasks = myTasks.filter(t => t.projectId === project.id);
                  const completedTasks = projTasks.filter(t => t.status === 'Done').length;

                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('tasks');
                      }}
                      className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-[#4c1d95]/30 transition-all text-left group"
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#4c1d95]">{project.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{projTasks.length} tarefas</p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600 flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-green-500" />
                            Concluídas
                          </span>
                          <span className="font-bold text-green-600">{completedTasks}/{projTasks.length}</span>
                        </div>
                        {project.status && (
                          <div className="text-xs text-slate-500">
                            Status: <span className="font-medium text-slate-700">{project.status}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* VISTA 3: TAREFAS DO PROJETO */}
      {currentView === 'tasks' && selectedProjectId && (
        <>
          <div className="mb-6 flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentView('projects');
                setSelectedProjectId(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-800">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </h1>
              <p className="text-slate-500 mt-1">Tarefas do projeto</p>
            </div>
            <button
              className="px-4 py-2 bg-[#4c1d95] text-white rounded-xl font-bold shadow hover:bg-[#3b1675]"
              onClick={() => navigate(`/tasks/new?project=${selectedProjectId}&client=${projects.find(p => p.id === selectedProjectId)?.clientId}`)}
            >
              + Nova Tarefa
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {projectTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <CheckSquare className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhuma tarefa neste projeto.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* TODO */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">A Fazer ({projectTasksByStatus.Todo.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.Todo.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                    ))}
                  </div>
                </div>

                {/* EM PROGRESSO */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Em Progresso ({projectTasksByStatus.InProgress.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.InProgress.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                    ))}
                  </div>
                </div>

                {/* REVISÃO */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Revisão ({projectTasksByStatus.Review.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.Review.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                    ))}
                  </div>
                </div>

                {/* CONCLUÍDAS */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Concluídas ({projectTasksByStatus.Done.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.Done.map(task => (
                      <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

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
    <div className="space-y-2">
      <button
        onClick={onClick}
        className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left hover:bg-white hover:border-[#4c1d95]/30 hover:shadow-md transition-all group w-full"
      >
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#4c1d95]">{task.title}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4c1d95]"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600">{task.progress}%</span>
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
      </button>

      {task.status !== 'Done' && (
        <button
          onClick={handleCreateTimesheet}
          className="w-full flex items-center justify-center gap-2 py-2 bg-purple-50 hover:bg-[#4c1d95] text-[#4c1d95] hover:text-white rounded-lg transition-all text-xs font-bold border border-purple-100 shadow-sm"
        >
          <Clock className="w-4 h-4" />
          Apontar Horas
        </button>
      )}
    </div>
  );
};

export default DeveloperProjects;
