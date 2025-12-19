// components/TeamMemberDetail.tsx - Adaptado para Router
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { Task } from '../types';
import { ArrowLeft, Calendar, CheckCircle2, Clock, User as UserIcon } from 'lucide-react';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { users, tasks, projects } = useDataController();

   const [taskFilter, setTaskFilter] = useState<'all' | 'delayed' | 'completed'>('all');

   const user = users.find(u => u.id === userId);

   // Helpers
   const getDelayDays = (task: Task) => {
      if (task.status === 'Done') return 0;
      if (!task.estimatedDelivery) return 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parts = task.estimatedDelivery.split('-');
      const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const diffTime = today.getTime() - due.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return today > due ? (days > 0 ? days : 0) : 0;
   };

   const getTaskPriority = (task: Task) => {
      const delay = getDelayDays(task);
      if (delay > 0) return 0;
      switch (task.status) {
         case 'In Progress': return 1;
         case 'Todo': return 2;
         case 'Review': return 3;
         case 'Done': return 4;
         default: return 5;
      }
   };

   if (!user) {
      return <div className="p-8">Colaborador não encontrado.</div>;
   }

   // Logic
   let userTasks = tasks.filter(t => t.developerId === user.id);
   const userProjectIds = Array.from(new Set(userTasks.map(t => t.projectId)));
   const userProjects = projects.filter(p => userProjectIds.includes(p.id));

   // Sort
   userTasks = [...userTasks].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));

   // Metrics
   const totalTasks = userTasks.length;
   const delayedTasks = userTasks.filter(t => getDelayDays(t) > 0);
   const completedTasks = userTasks.filter(t => t.status === 'Done');

   const filteredTasks = taskFilter === 'all'
      ? userTasks
      : taskFilter === 'delayed'
         ? delayedTasks
         : completedTasks;

   return (
      <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         {/* Header */}
         <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-gradient-to-r from-[#4c1d95] to-purple-600 sticky top-0 z-10">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
               <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center border-2 border-white shadow-lg overflow-hidden text-2xl font-bold text-white">
               {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
               ) : (
                  user.name.substring(0, 2).toUpperCase()
               )}
            </div>

            <div className="flex-1">
               <h1 className="text-xl font-bold text-white">{user.name}</h1>
               <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-purple-100">{user.cargo || 'Cargo não informado'}</p>
                  <span className="text-purple-200">•</span>
                  <p className="text-sm text-purple-100">{user.role === 'admin' ? 'Administrador' : 'Desenvolvedor'}</p>
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

               {/* Left Column: Summary */}
               <div className="space-y-6">
                  <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4">Resumo</h3>
                     <div className="space-y-3">
                        <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                           <span className="text-sm text-slate-600">Projetos Ativos</span>
                           <span className="font-bold text-[#4c1d95] text-lg">{userProjects.length}</span>
                        </div>
                        <button
                           onClick={() => setTaskFilter('all')}
                           className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${taskFilter === 'all' ? 'bg-[#4c1d95] border-[#4c1d95] text-white' : 'bg-white border-slate-100 hover:border-[#4c1d95]'}`}
                        >
                           <span className="text-sm">Total de Tarefas</span>
                           <span className="font-bold text-lg">{totalTasks}</span>
                        </button>
                        <button
                           onClick={() => setTaskFilter('delayed')}
                           className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${taskFilter === 'delayed' ? 'bg-red-500 border-red-500 text-white' : 'bg-white border-slate-100 hover:border-red-300'}`}
                        >
                           <span className="text-sm">Tarefas Atrasadas</span>
                           <span className="font-bold text-lg">{delayedTasks.length}</span>
                        </button>
                        <button
                           onClick={() => setTaskFilter('completed')}
                           className={`w-full flex justify-between items-center p-3 rounded-xl border transition-all ${taskFilter === 'completed' ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-100 hover:border-green-300'}`}
                        >
                           <span className="text-sm">Concluídas</span>
                           <span className="font-bold text-lg">{completedTasks.length}</span>
                        </button>
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

               {/* Right Column: Task List */}
               <div className="lg:col-span-2">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                     <span className="flex items-center gap-2">
                        Tarefas Alocadas
                        {taskFilter !== 'all' && (
                           <span className={`text-xs font-semibold px-2 py-1 rounded-full ${taskFilter === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {taskFilter === 'delayed' ? 'Atrasadas' : 'Concluídas'}
                           </span>
                        )}
                     </span>
                     <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                        Clique para editar
                     </span>
                  </h3>

                  <div className="space-y-3">
                     {filteredTasks.map(task => {
                        const delayDays = getDelayDays(task);
                        const isDelayed = delayDays > 0;

                        return (
                           <div
                              key={task.id}
                              onClick={() => navigate(`/tasks/${task.id}`)}
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
                                          <Calendar className="w-3 h-3" />
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

                     {filteredTasks.length === 0 && (
                        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                           <p className="text-slate-400">
                              {taskFilter === 'all' ? 'Nenhuma tarefa alocada para este colaborador.' : taskFilter === 'delayed' ? 'Nenhuma tarefa atrasada.' : 'Nenhuma tarefa concluída.'}
                           </p>
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