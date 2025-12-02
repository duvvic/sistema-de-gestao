import React from 'react';
import { Project, Client, Task, User } from '../types';
import { Building2, ArrowRight, CheckCircle2, Clock, FolderKanban, AlertTriangle } from 'lucide-react';

interface DeveloperProjectsProps {
  user: User;
  projects: Project[];
  clients: Client[];
  tasks: Task[];
  onProjectClick: (projectId: string) => void;
}

const DeveloperProjects: React.FC<DeveloperProjectsProps> = ({ user, projects, clients, tasks, onProjectClick }) => {
  // Find projects where the user has at least one task assigned
  const myTasks = tasks.filter(t => t.developer === user.name);
  const myProjectIds = Array.from(new Set(myTasks.map(t => t.projectId)));
  
  // Filter projects list
  const myProjects = projects.filter(p => myProjectIds.includes(p.id));

  const isTaskDelayed = (task: Task) => {
    if (task.status === 'Done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.estimatedDelivery);
    return today > due;
  };

  return (
    <div className="h-full flex flex-col p-2">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Meus Projetos</h1>
        <p className="text-slate-500 mt-1">Projetos e empresas onde você está alocado</p>
      </div>

      {myProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <FolderKanban className="w-12 h-12 mb-4 text-slate-300" />
          <p>Você ainda não está alocado em nenhum projeto.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
          {myProjects.map(project => {
            const client = clients.find(c => c.id === project.clientId);
            const projectTasks = myTasks.filter(t => t.projectId === project.id);
            const pendingTasks = projectTasks.filter(t => t.status !== 'Done').length;
            const delayedTasksCount = projectTasks.filter(isTaskDelayed).length;

            return (
              <div 
                key={project.id}
                onClick={() => onProjectClick(project.id)}
                className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg hover:border-[#4c1d95]/30 transition-all group flex flex-col h-full relative overflow-hidden"
              >
                {delayedTasksCount > 0 && (
                   <div className="absolute top-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {delayedTasksCount} Atrasadas
                   </div>
                )}

                {/* Header: Client Info */}
                <div className="flex items-center gap-4 mb-4 border-b border-slate-50 pb-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center">
                    {client?.logoUrl ? (
                      <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Empresa</h3>
                    <p className="text-sm font-bold text-slate-700">{client?.name}</p>
                  </div>
                </div>

                {/* Project Title */}
                <h2 className="text-xl font-bold text-slate-800 mb-6 group-hover:text-[#4c1d95] transition-colors">
                  {project.name}
                </h2>

                {/* Task Summary */}
                <div className="mt-auto bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-500" /> Pendentes
                    </span>
                    <span className="font-bold text-slate-800">{pendingTasks}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" /> Concluídas
                    </span>
                    <span className="font-bold text-slate-800">
                      {projectTasks.filter(t => t.status === 'Done').length}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                   <div className="flex items-center gap-2 text-sm font-medium text-[#4c1d95] opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver Tarefas <ArrowRight className="w-4 h-4" />
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeveloperProjects;