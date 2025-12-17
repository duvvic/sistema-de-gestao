import React, { useMemo } from 'react';
import { Project, Task, Client } from '../types';
import { ArrowLeft } from 'lucide-react';

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  clients: Client[];
  onBack: () => void;
  onTaskClick: (taskId: string) => void;
}

const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  project,
  tasks,
  clients,
  onBack,
  onTaskClick,
}) => {
  const client = useMemo(
    () => clients.find(c => c.id === project.clientId),
    [clients, project.clientId]
  );

  const projectTasks = useMemo(
    () => tasks.filter(t => t.projectId === project.id),
    [tasks, project.id]
  );

  const tasksByStatus = useMemo(() => {
    return {
      'Todo': projectTasks.filter(t => t.status === 'Todo'),
      'In Progress': projectTasks.filter(t => t.status === 'In Progress'),
      'Review': projectTasks.filter(t => t.status === 'Review'),
      'Done': projectTasks.filter(t => t.status === 'Done'),
    };
  }, [projectTasks]);

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
            <h1 className="text-xl font-bold text-slate-800">{project.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {client?.name} • {projectTasks.length} tarefas
            </p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      {(project.description || project.manager || project.budget || project.startDate) && (
        <div className="px-8 py-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {project.description && (
              <div>
                <span className="text-slate-600 font-medium">Descrição</span>
                <p className="text-slate-800 truncate">{project.description}</p>
              </div>
            )}
            {project.manager && (
              <div>
                <span className="text-slate-600 font-medium">Gerente</span>
                <p className="text-slate-800">{project.manager}</p>
              </div>
            )}
            {project.budget && (
              <div>
                <span className="text-slate-600 font-medium">Orçamento</span>
                <p className="text-slate-800">R$ {project.budget.toFixed(2)}</p>
              </div>
            )}
            {project.startDate && (
              <div>
                <span className="text-slate-600 font-medium">Início</span>
                <p className="text-slate-800">
                  {new Date(project.startDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tasks Kanban */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Tarefas do Projeto</h2>
          
          {projectTasks.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-600">Nenhuma tarefa neste projeto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(tasksByStatus).map(([status, statusTasks]: [string, Task[]]) => (
                <div
                  key={status}
                  className={`${getStatusColor(status)} border border-slate-200 rounded-2xl p-4 flex flex-col`}
                >
                  <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getStatusHeaderColor(status)}`}>
                    {status} ({statusTasks.length})
                  </h3>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                    {statusTasks.map(task => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailView;
