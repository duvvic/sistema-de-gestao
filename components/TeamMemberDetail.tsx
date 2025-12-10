import React from 'react';
import { User, Task, Project } from '../types';
import { ArrowLeft, Briefcase, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface TeamMemberDetailProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  onBack: () => void;
  onTaskClick: (taskId: string) => void;
}

const TeamMemberDetail: React.FC<TeamMemberDetailProps> = ({ user, tasks, projects, onBack, onTaskClick }) => {
  // Logic: Get tasks for this user by ID (não por nome)
  let userTasks = tasks.filter(t => t.developerId === user.id);
  
  // Logic: Get unique projects user is involved in
  const userProjectIds = Array.from(new Set(userTasks.map(t => t.projectId)));
  const userProjects = projects.filter(p => userProjectIds.includes(p.id));

  // Helper to check delay
  const getDelayDays = (task: Task) => {
    if (task.status === 'Done') return 0;
    if (!task.estimatedDelivery) return 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Parse YYYY-MM-DD manually
    const parts = task.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    if (today <= due) return 0;

    const diffTime = today.getTime() - due.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Sorting Logic Helper
  // 0: Delayed, 1: In Progress, 2: Todo, 3: Review, 4: Done
  const getTaskPriority = (task: Task) => {
    // 1. Check Delay first (Highest Priority)
    const delay = getDelayDays(task);
    if (delay > 0) return 0;

    // 2. Check Status
    switch (task.status) {
      case 'In Progress': return 1;
      case 'Todo': return 2;
      case 'Review': return 3;
      case 'Done': return 4;
      default: return 5;
    }
  };

  // Apply Sorting
  userTasks.sort((a, b) => getTaskPriority(a) - getTaskPriority(b));

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{user.name}</h1>
          <p className="text-sm text-slate-500">Detalhes de alocação e produtividade</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Summary */}
            <div className="space-y-6">
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4">Resumo</h3>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-sm text-slate-600">Projetos Ativos</span>
                        <span className="font-bold text-[#4c1d95] text-lg">{userProjects.length}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-sm text-slate-600">Total de Tarefas</span>
                        <span className="font-bold text-slate-800 text-lg">{userTasks.length}</span>
                     </div>
                     <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                        <span className="text-sm text-slate-600">Concluídas</span>
                        <span className="font-bold text-green-600 text-lg">
                           {userTasks.filter(t => t.status === 'Done').length}
                        </span>
                     </div>
                  </div>
               </div>
               
               <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                   <h3 className="font-bold text-slate-800 mb-4">Projetos Envolvidos</h3>
                   {userProjects.length > 0 ? (
                      <div className="space-y-3">
                         {userProjects.map(p => (
                            <div key={p.id} className="flex items-center gap-3">
                               <div className="w-2 h-2 rounded-full bg-[#4c1d95]"></div>
                               <span className="text-sm font-medium text-slate-700">{p.name}</span>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <p className="text-sm text-slate-400">Nenhum projeto vinculado.</p>
                   )}
               </div>
            </div>

            {/* Right Column: Task List (Editable via click) */}
            <div className="lg:col-span-2">
               <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                  Tarefas Alocadas
                  <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                    Clique para editar
                  </span>
               </h3>
               
               <div className="space-y-3">
                  {userTasks.map(task => {
                     const delayDays = getDelayDays(task);
                     const isDelayed = delayDays > 0;

                     return (
                        <div 
                          key={task.id}
                          onClick={() => onTaskClick(task.id)}
                          className={`
                            border p-4 rounded-xl flex justify-between items-center hover:shadow-md cursor-pointer transition-all group
                            ${isDelayed 
                              ? 'bg-red-50 border-red-200 hover:border-red-300' 
                              : 'bg-white border-slate-200 hover:border-[#4c1d95]'}
                          `}
                        >
                           <div className="flex items-center gap-3">
                              {task.status === 'Done' ? (
                                 <CheckCircle2 className="w-5 h-5 text-green-500" />
                              ) : (
                                 <Clock className={`w-5 h-5 ${isDelayed ? 'text-red-400' : 'text-slate-400'}`} />
                              )}
                              <div>
                                 <p className={`font-semibold text-sm group-hover:text-[#4c1d95] ${isDelayed ? 'text-red-900' : 'text-slate-800'}`}>
                                    {task.title}
                                 </p>
                                 <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                    <span className={`px-1.5 py-0.5 rounded border ${isDelayed ? 'bg-red-100 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100'}`}>
                                       {task.status}
                                    </span>
                                    <span>•</span>
                                    <span className={`flex items-center gap-1 ${isDelayed ? 'text-red-600 font-bold' : ''}`}>
                                       <Calendar className="w-3 h-3"/> 
                                       {new Date(task.estimatedDelivery).toLocaleDateString()}
                                       {isDelayed && ` (+${delayDays}d)`}
                                    </span>
                                 </div>
                              </div>
                           </div>
                           <div className={`text-xs font-bold ${isDelayed ? 'text-red-500' : 'text-slate-400'}`}>
                              {task.progress}%
                           </div>
                        </div>
                     );
                  })}
                  
                  {userTasks.length === 0 && (
                     <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                        <p className="text-slate-400">Nenhuma tarefa alocada para este colaborador.</p>
                     </div>
                  )}
               </div>
            </div>

         </div>
      </div>
    </div>
  );
};

export default TeamMemberDetail;