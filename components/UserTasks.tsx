import React from 'react';
import { Task, Project, Client, User } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, ArrowRight, Calendar, ArrowLeft, Plus, AlertTriangle } from 'lucide-react';

interface UserTasksProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  onTaskClick: (taskId: string) => void;
  // New Props for Contextual View
  filterProjectId?: string | null;
  onBack?: () => void;
  onNewTask?: () => void;
}

const UserTasks: React.FC<UserTasksProps> = ({ 
  user, 
  tasks, 
  projects, 
  clients, 
  onTaskClick,
  filterProjectId,
  onBack,
  onNewTask
}) => {
  // Helper to check delay (boolean/count)
  const getDelayInfo = (task: Task) => {
    if (task.status === 'Done') return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    // Parse manually to avoid timezone issues
    const parts = task.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return diffDays;
    return null;
  };

  // Sorting Logic Helper
  // 0: Delayed, 1: In Progress, 2: Todo, 3: Review, 4: Done
  const getTaskPriority = (task: Task) => {
    // 1. Check Delay first (Highest Priority)
    const delay = getDelayInfo(task);
    if (delay !== null && delay > 0) return 0;

    // 2. Check Status
    switch (task.status) {
      case 'In Progress': return 1;
      case 'Todo': return 2;
      case 'Review': return 3;
      case 'Done': return 4;
      default: return 5;
    }
  };

  // Filter tasks for the logged in user
  let myTasks = tasks.filter(t => t.developer === user.name);

  // Apply project filter if exists
  if (filterProjectId) {
    myTasks = myTasks.filter(t => t.projectId === filterProjectId);
  }

  // Apply Sorting
  myTasks.sort((a, b) => getTaskPriority(a) - getTaskPriority(b));

  const currentProject = filterProjectId ? projects.find(p => p.id === filterProjectId) : null;
  const currentClient = currentProject ? clients.find(c => c.id === currentProject.clientId) : null;

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'Done': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'In Progress': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'Review': return <AlertCircle className="w-5 h-5 text-purple-500" />;
      default: return <Circle className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="h-full flex flex-col p-2">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {filterProjectId && onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
               <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {filterProjectId ? currentProject?.name : 'Todas as Tarefas'}
            </h1>
            <p className="text-slate-500 mt-1">
              {filterProjectId 
                ? `Tarefas para ${currentClient?.name}` 
                : `Lista geral de atividades alocadas a ${user.name}`}
            </p>
          </div>
        </div>

        {/* Contextual New Task Button */}
        {onNewTask && (
           <button 
             onClick={onNewTask}
             className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-5 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 font-bold text-sm"
           >
             <Plus className="w-5 h-5" />
             Nova Tarefa
           </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        {myTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-lg font-medium">Nenhuma tarefa encontrada neste contexto.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Status</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Tarefa</th>
                  {!filterProjectId && (
                     <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Projeto / Cliente</th>
                  )}
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">Entrega</th>
                  <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  const client = clients.find(c => c.id === task.clientId);
                  const daysDelayed = getDelayInfo(task);
                  
                  return (
                    <tr 
                      key={task.id} 
                      onClick={() => onTaskClick(task.id)}
                      className={`
                        cursor-pointer group transition-colors
                        ${daysDelayed ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-purple-50/50'}
                      `}
                    >
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <div className="flex flex-col">
                             <span className="text-sm font-medium text-slate-700">{task.status}</span>
                             {daysDelayed && (
                               <span className="text-[10px] font-bold text-red-600 flex items-center gap-1">
                                 <AlertTriangle className="w-3 h-3" />
                                 {daysDelayed} dias de atraso
                               </span>
                             )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className={`font-semibold ${daysDelayed ? 'text-red-900' : 'text-slate-800'}`}>{task.title}</p>
                        {task.notes && <p className="text-xs text-slate-500 truncate max-w-xs">{task.notes}</p>}
                      </td>
                      {!filterProjectId && (
                        <td className="p-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-slate-700">{project?.name || 'Sem projeto'}</span>
                            <span className="text-xs text-slate-500">{client?.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="p-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1.5 text-sm w-fit px-2 py-1 rounded-lg ${daysDelayed ? 'bg-red-100 text-red-700 font-bold' : 'bg-slate-50 text-slate-600'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(task.estimatedDelivery).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-[#4c1d95] transition-colors" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTasks;