// components/DeveloperProjects.tsx
import React, { useMemo, useState } from "react";
import { Task, Project, Client, User } from "../types";
import { ArrowLeft, Building2, FolderKanban, CheckSquare, Clock } from "lucide-react";

interface DeveloperProjectsProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  onNewProject?: () => void;
  onTaskClick: (taskId: string) => void;
}

type ViewType = 'clients' | 'projects' | 'tasks';

const DeveloperProjects: React.FC<DeveloperProjectsProps> = ({
  user,
  tasks,
  projects,
  clients,
  onNewProject,
  onTaskClick
}) => {
  const [currentView, setCurrentView] = useState<ViewType>('clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Filtra tarefas do usuário
  const myTasks = useMemo(
    () => tasks.filter((t) => t.developerId === user.id),
    [tasks, user.id]
  );

  // Agrupa tarefas por empresa
  const clientStats = useMemo(() => {
    const stats = new Map<string, { totalHours: number; taskCount: number }>();
    
    myTasks.forEach(task => {
      const current = stats.get(task.clientId) || { totalHours: 0, taskCount: 0 };
      stats.set(task.clientId, {
        totalHours: current.totalHours + (task.progress || 0), // Aproximado
        taskCount: current.taskCount + 1
      });
    });

    return stats;
  }, [myTasks]);

  // Projetos do cliente selecionado
  const clientProjects = useMemo(() => {
    if (!selectedClientId) return [];
    return projects.filter(p => p.clientId === selectedClientId);
  }, [selectedClientId, projects]);

  // Tarefas do projeto selecionado
  const projectTasks = useMemo(() => {
    if (!selectedProjectId) return [];
    return myTasks.filter(t => t.projectId === selectedProjectId);
  }, [selectedProjectId, myTasks]);

  // Agrupa tarefas do projeto por status
  const projectTasksByStatus = useMemo(() => {
    return {
      Todo: projectTasks.filter(t => t.status === "Todo"),
      InProgress: projectTasks.filter(t => t.status === "In Progress"),
      Review: projectTasks.filter(t => t.status === "Review"),
      Done: projectTasks.filter(t => t.status === "Done"),
    };
  }, [projectTasks]);

  // ===================== RENDERIZAÇÃO =====================

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      
      {/* ========== VISTA 1: EMPRESAS ========== */}
      {currentView === 'clients' && (
        <>
          <div className="px-8 py-6 border-b border-slate-100 bg-white flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Meus Projetos</h1>
              <p className="text-slate-500 mt-1">Empresas e projetos que você trabalha</p>
            </div>
            <div>
              <button onClick={() => onNewProject?.()} className="px-4 py-2 bg-[#4c1d95] text-white rounded-xl shadow hover:bg-[#3b1675] flex items-center gap-2">
                <span className="text-sm font-medium">Novo Projeto</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Building2 className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhum projeto atribuído.</p>
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
                            {clientProjects.filter(p => myTasks.some(t => t.projectId === p.id)).length} Projetos
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

      {/* ========== VISTA 2: PROJETOS ========== */}
      {currentView === 'projects' && selectedClientId && (
        <>
          <div className="px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center gap-4">
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
            <div>
              <button onClick={() => onNewProject?.()} className="px-3 py-2 bg-[#4c1d95] text-white rounded-xl shadow hover:bg-[#3b1675] flex items-center gap-2">
                Novo Projeto
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {clientProjects.filter(p => myTasks.some(t => t.projectId === p.id)).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <FolderKanban className="w-12 h-12 mb-4 text-slate-300" />
                <p>Nenhum projeto nesta empresa.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientProjects
                  .filter(p => myTasks.some(t => t.projectId === p.id))
                  .map(project => {
                    const projectTasks = myTasks.filter(t => t.projectId === project.id);
                    const completedTasks = projectTasks.filter(t => t.status === 'Done').length;
                    
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
                          <p className="text-sm text-slate-500 mt-1">{projectTasks.length} tarefas</p>
                        </div>
                        
                        <div className="pt-4 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 flex items-center gap-2">
                              <CheckSquare className="w-4 h-4 text-green-500" />
                              Concluídas
                            </span>
                            <span className="font-bold text-green-600">{completedTasks}/{projectTasks.length}</span>
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

      {/* ========== VISTA 3: TAREFAS DO PROJETO ========== */}
      {currentView === 'tasks' && selectedProjectId && (
        <>
          <div className="px-8 py-6 border-b border-slate-100 bg-white sticky top-0 z-10 flex items-center gap-4">
            <button
              onClick={() => {
                setCurrentView('projects');
                setSelectedProjectId(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {projects.find(p => p.id === selectedProjectId)?.name}
              </h1>
              <p className="text-slate-500 mt-1">Tarefas do projeto</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
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
                      <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
                    ))}
                  </div>
                </div>

                {/* IN PROGRESS */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Em Progresso ({projectTasksByStatus.InProgress.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.InProgress.map(task => (
                      <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
                    ))}
                  </div>
                </div>

                {/* REVIEW */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Revisão ({projectTasksByStatus.Review.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.Review.map(task => (
                      <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
                    ))}
                  </div>
                </div>

                {/* DONE */}
                <div className="space-y-3">
                  <h3 className="font-bold text-slate-700 text-sm">Concluídas ({projectTasksByStatus.Done.length})</h3>
                  <div className="space-y-2">
                    {projectTasksByStatus.Done.map(task => (
                      <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
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

// ===================== COMPONENTE AUXILIAR =====================

interface TaskCardProps {
  task: Task;
  onTaskClick: (taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onTaskClick }) => {
  return (
    <button
      onClick={() => onTaskClick(task.id)}
      className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-left hover:bg-white hover:border-[#4c1d95]/30 hover:shadow-md transition-all group"
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
        <span className={`text-xs mt-2 px-2 py-1 rounded-full font-medium inline-block ${
          task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
          task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
          'bg-green-100 text-green-700'
        }`}>
          {task.priority}
        </span>
      )}
    </button>
  );
};

export default DeveloperProjects;



