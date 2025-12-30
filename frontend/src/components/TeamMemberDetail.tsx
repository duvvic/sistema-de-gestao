// components/TeamMemberDetail.tsx - Adaptado para Router
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Task } from '@/types';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Timer } from 'lucide-react';

type ViewTab = 'projects' | 'tasks' | 'delayed' | 'ponto';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { users, tasks, projects, projectMembers, timesheetEntries } = useDataController();

   const [activeTab, setActiveTab] = useState<ViewTab>('projects');

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

   // Cálculo de Dias de Ponto Faltantes (Dias úteis sem apontamento no mês atual)
   const missingPontoDays = useMemo(() => {
      if (!user) return 0;
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const userEntries = timesheetEntries.filter(e => e.userId === user.id);

      let missingCount = 0;
      const currentDate = new Date(firstDay);

      while (currentDate < today) {
         // 0 = Domingo, 6 = Sábado
         const dayOfWeek = currentDate.getDay();
         if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const hasEntry = userEntries.some(e => e.date.startsWith(dateStr));
            if (!hasEntry) missingCount++;
         }
         currentDate.setDate(currentDate.getDate() + 1);
      }
      return missingCount;
   }, [user, timesheetEntries]);

   if (!user) {
      return <div className="p-8">Colaborador não encontrado.</div>;
   }

   // Logic
   let userTasks = tasks.filter(t => t.developerId === user.id);
   const linkedProjectIds = projectMembers
      .filter(pm => pm.userId === user.id)
      .map(pm => pm.projectId);

   const userProjects = projects.filter(p => linkedProjectIds.includes(p.id) && p.active !== false);
   const delayedTasks = userTasks.filter(t => getDelayDays(t) > 0);
   const totalTasks = userTasks.length;

   userTasks = [...userTasks].sort((a, b) => getTaskPriority(a) - getTaskPriority(b));

   const renderContent = () => {
      switch (activeTab) {
         case 'projects':
            return (
               <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                     <Briefcase className="w-5 h-5 text-[#4c1d95]" />
                     Projetos Vinculados
                  </h3>
                  {userProjects.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userProjects.map(p => (
                           <button
                              key={p.id}
                              onClick={() => navigate(`/admin/projects/${p.id}`)}
                              className="bg-white border-2 border-slate-100 p-5 rounded-2xl hover:border-[#4c1d95] hover:shadow-lg transition-all text-left flex flex-col justify-between group h-32"
                           >
                              <div>
                                 <h4 className="font-bold text-slate-800 group-hover:text-[#4c1d95] transition-colors">{p.name}</h4>
                                 <p className="text-xs text-slate-500 mt-1 line-clamp-1">{p.description || 'Sem descrição'}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-auto">
                                 <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded uppercase">
                                    {p.status || 'Ativo'}
                                 </span>
                              </div>
                           </button>
                        ))}
                     </div>
                  ) : (
                     <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-400">Nenhum projeto vinculado.</p>
                     </div>
                  )}
               </div>
            );
         case 'tasks':
         case 'delayed':
            const displayTasks = activeTab === 'delayed' ? delayedTasks : userTasks;
            return (
               <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                     {activeTab === 'delayed' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                     {activeTab === 'delayed' ? 'Tarefas Atrasadas' : 'Total de Tarefas'}
                  </h3>
                  {displayTasks.length > 0 ? (
                     <div className="space-y-3">
                        {displayTasks.map(task => {
                           const delayDays = getDelayDays(task);
                           const isDelayed = delayDays > 0;
                           const handleCreateTimesheet = (e: React.MouseEvent) => {
                              e.stopPropagation();
                              navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
                           };

                           return (
                              <div key={task.id} className="space-y-2">
                                 <div
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                    className={`border p-4 rounded-xl flex justify-between items-center hover:shadow-md cursor-pointer transition-all group ${isDelayed ? 'bg-red-50 border-red-200 hover:border-red-300' : 'bg-white border-slate-200 hover:border-[#4c1d95]'}`}
                                 >
                                    <div className="flex items-center gap-3">
                                       {task.status === 'Done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clock className={`w-5 h-5 ${isDelayed ? 'text-red-400' : 'text-slate-400'}`} />}
                                       <div>
                                          <p className={`font-semibold text-sm group-hover:text-[#4c1d95] ${isDelayed ? 'text-red-900' : 'text-slate-800'}`}>{task.title}</p>
                                          <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                             <span className={`px-1.5 py-0.5 rounded border ${isDelayed ? 'bg-red-100 border-red-200 text-red-700' : 'bg-slate-50 border-slate-100'}`}>{task.status}</span>
                                             <span>•</span>
                                             <span className={`flex items-center gap-1 ${isDelayed ? 'text-red-600 font-bold' : ''}`}>
                                                <Calendar className="w-3 h-3" />
                                                {new Date(task.estimatedDelivery).toLocaleDateString()}
                                                {isDelayed && ` (+${delayDays}d)`}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className={`text-xs font-bold ${isDelayed ? 'text-red-500' : 'text-slate-400'}`}>{task.progress}%</div>
                                 </div>

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
                        })}
                     </div>
                  ) : (
                     <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                        <p className="text-slate-400">Nenhuma tarefa encontrada.</p>
                     </div>
                  )}
               </div>
            );
         case 'ponto':
            return (
               <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                     <Timer className="w-5 h-5 text-orange-500" />
                     Apontamento de Horas (Ponto)
                  </h3>
                  <div className="bg-orange-50 border border-orange-100 p-8 rounded-3xl text-center">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-orange-100">
                        <span className="text-3xl font-black text-orange-600">{missingPontoDays}</span>
                     </div>
                     <h4 className="text-xl font-bold text-orange-900 mb-2">Dias pendentes no mês</h4>
                     <p className="text-orange-700 text-sm max-w-sm mx-auto">
                        Este colaborador ainda não realizou o apontamento de horas em {missingPontoDays} dias úteis do mês vigente.
                     </p>
                  </div>
               </div>
            );
      }
   };

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
               <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="text-xs font-bold px-2 py-0.5 bg-white/20 text-white rounded-full uppercase tracking-wider">
                     {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>
                  {user.cargo && (
                     <>
                        <span className="text-purple-200 opacity-50">•</span>
                        <p className="text-sm text-purple-100 font-medium">{user.cargo}</p>
                     </>
                  )}
               </div>
            </div>
         </div>

         <div className="flex-1 overflow-hidden p-8">
            <div className="max-w-6xl mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-8">

               {/* Sidebar: Resumo (Tabs) */}
               <div className="lg:col-span-4 space-y-6">
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        Resumo
                     </h3>
                     <div className="space-y-4">
                        <button
                           onClick={() => setActiveTab('projects')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'projects' ? 'bg-[#4c1d95] border-[#4c1d95] text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-[#4c1d95]'}`}
                        >
                           <div className="flex items-center gap-3">
                              <Briefcase className={`w-5 h-5 ${activeTab === 'projects' ? 'text-white' : 'text-[#4c1d95]'}`} />
                              <span className="text-sm font-bold">Projetos Vinculados</span>
                           </div>
                           <span className="font-black text-xl">{userProjects.length}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('tasks')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'tasks' ? 'bg-[#4c1d95] border-[#4c1d95] text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-[#4c1d95]'}`}
                        >
                           <div className="flex items-center gap-3">
                              <Clock className={`w-5 h-5 ${activeTab === 'tasks' ? 'text-white' : 'text-blue-500'}`} />
                              <span className="text-sm font-bold">Total de Tarefas</span>
                           </div>
                           <span className="font-black text-xl">{totalTasks}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('delayed')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'delayed' ? 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-red-300'}`}
                        >
                           <div className="flex items-center gap-3">
                              <AlertCircle className={`w-5 h-5 ${activeTab === 'delayed' ? 'text-white' : 'text-red-500'}`} />
                              <span className="text-sm font-bold">Tarefas Atrasadas</span>
                           </div>
                           <span className="font-black text-xl">{delayedTasks.length}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('ponto')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'ponto' ? 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]' : 'bg-white border-slate-100 text-slate-600 hover:border-orange-300'}`}
                        >
                           <div className="flex items-center gap-3">
                              <Timer className={`w-5 h-5 ${activeTab === 'ponto' ? 'text-white' : 'text-orange-500'}`} />
                              <span className="text-sm font-bold">Ponto</span>
                           </div>
                           <span className="font-black text-xl">{missingPontoDays}</span>
                        </button>
                     </div>
                  </div>
               </div>

               {/* Right Side: Tab Content */}
               <div className="lg:col-span-8 flex flex-col h-full bg-slate-50/50 rounded-3xl p-8 border border-slate-100 overflow-y-auto custom-scrollbar">
                  {renderContent()}
               </div>

            </div>
         </div>
      </div>
   );
};

export default TeamMemberDetail;
