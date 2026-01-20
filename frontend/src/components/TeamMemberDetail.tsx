// components/TeamMemberDetail.tsx - Adaptado para Router
import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Task } from '@/types';
import { ArrowLeft, Calendar, CheckCircle2, Clock, Briefcase, AlertCircle, Timer, Edit, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

import TimesheetCalendar from './TimesheetCalendar';

type ViewTab = 'projects' | 'tasks' | 'delayed' | 'ponto';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { users, tasks, projects, projectMembers, timesheetEntries, deleteUser } = useDataController();

   const [activeTab, setActiveTab] = useState<ViewTab>('projects');
   const [deleteModalOpen, setDeleteModalOpen] = useState(false);

   const user = users.find(u => u.id === userId);

   // Helpers
   const getDelayDays = (task: Task) => {
      if (task.status === 'Done' || task.status === 'Review') return 0;
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

   const handleDeleteUser = async () => {
      if (user && deleteUser) {
         await deleteUser(user.id);
         navigate('/admin/team');
      }
   };

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
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--textTitle)' }}>
                     <Briefcase className="w-5 h-5" style={{ color: 'var(--brand)' }} />
                     Projetos Vinculados
                  </h3>
                  {userProjects.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {userProjects.map(p => (
                           <button
                              key={p.id}
                              onClick={() => navigate(`/admin/projects/${p.id}`)}
                              className="border-2 p-5 rounded-2xl hover:shadow-lg transition-all text-left flex flex-col justify-between group h-32"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                           >
                              <div>
                                 <h4 className="font-bold transition-colors" style={{ color: 'var(--textTitle)' }}>{p.name}</h4>
                                 <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--textMuted)' }}>{p.description || 'Sem descrição'}</p>
                              </div>
                              <div className="flex items-center gap-2 mt-auto">
                                 <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: 'var(--bgApp)', color: 'var(--text)' }}>
                                    {p.status || 'Ativo'}
                                 </span>
                              </div>
                           </button>
                        ))}
                     </div>
                  ) : (
                     <div className="py-20 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border)' }}>
                        <p style={{ color: 'var(--textMuted)' }}>Nenhum projeto vinculado.</p>
                     </div>
                  )}
               </div>
            );
         case 'tasks':
         case 'delayed':
            const displayTasks = activeTab === 'delayed' ? delayedTasks : userTasks;
            return (
               <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--textTitle)' }}>
                     {activeTab === 'delayed' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
                     {activeTab === 'delayed' ? 'Tarefas Atrasadas' : 'Total de Tarefas'}
                  </h3>
                  {displayTasks.length > 0 ? (
                     <div className="space-y-3">
                        {displayTasks.map(task => {
                           const delayDays = getDelayDays(task);
                           const isDelayed = delayDays > 0;

                           return (
                              <div
                                 key={task.id}
                                 className={`border p-4 rounded-xl flex flex-col hover:shadow-md transition-all group ${isDelayed ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' : 'hover:border-[#4c1d95]'}`}
                                 style={{ backgroundColor: isDelayed ? undefined : 'var(--surface)', borderColor: isDelayed ? undefined : 'var(--border)' }}
                              >
                                 <div
                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                    className="flex justify-between items-center cursor-pointer mb-3"
                                 >
                                    <div className="flex items-center gap-3">
                                       {task.status === 'Done' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Clock className={`w-5 h-5 ${isDelayed ? 'text-red-400' : ''}`} style={{ color: isDelayed ? undefined : 'var(--textMuted)' }} />}
                                       <div>
                                          <p className={`font-semibold text-sm group-hover:text-[#4c1d95] ${isDelayed ? 'text-red-900 dark:text-red-300' : ''}`} style={{ color: isDelayed ? undefined : 'var(--textTitle)' }}>{task.title}</p>
                                          <div className="flex gap-2 text-xs mt-1" style={{ color: 'var(--textMuted)' }}>
                                             <span className={`px-1.5 py-0.5 rounded border ${isDelayed ? 'bg-red-100 border-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' : ''}`} style={{ backgroundColor: isDelayed ? undefined : 'var(--bgApp)', borderColor: isDelayed ? undefined : 'var(--border)' }}>{task.status}</span>
                                             <span>•</span>
                                             <span className={`flex items-center gap-1 ${isDelayed ? 'text-red-600 dark:text-red-400 font-bold' : ''}`}>
                                                <Calendar className="w-3 h-3" />
                                                {new Date(task.estimatedDelivery).toLocaleDateString()}
                                                {isDelayed && ` (+${delayDays}d)`}
                                             </span>
                                          </div>
                                       </div>
                                    </div>
                                    <div className={`text-xs font-bold ${isDelayed ? 'text-red-500' : ''}`} style={{ color: isDelayed ? undefined : 'var(--textMuted)' }}>{task.progress}%</div>
                                 </div>

                                 {/* Action removed */}
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <div className="py-20 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: 'var(--border)' }}>
                        <p style={{ color: 'var(--textMuted)' }}>Nenhuma tarefa encontrada.</p>
                     </div>
                  )}
               </div>
            );
         case 'ponto':
            return <TimesheetCalendar userId={user.id} embedded={true} />;
      }
   };

   return (
      <div className="h-full flex flex-col rounded-2xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
         {/* Header */}
         <div className="px-8 py-6 border-b flex items-center gap-4 bg-gradient-to-r from-[#4c1d95] to-purple-600 sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
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
                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm border"
                     style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'rgba(255, 255, 255, 0.3)' }}>
                     {user.role === 'admin' ? 'Administrador' : 'Equipe'}
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
                  <div className="rounded-3xl p-6 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                     <h3 className="font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
                        Resumo
                     </h3>
                     <div className="space-y-4">
                        <button
                           onClick={() => setActiveTab('projects')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'projects' ? 'shadow-lg scale-[1.02]' : ''}`}
                           style={{
                              backgroundColor: activeTab === 'projects' ? 'var(--primary)' : 'var(--surface)',
                              borderColor: activeTab === 'projects' ? 'var(--primary)' : 'var(--border)',
                              color: activeTab === 'projects' ? 'white' : 'var(--text)'
                           }}
                        >
                           <div className="flex items-center gap-3">
                              <Briefcase className={`w-5 h-5 ${activeTab === 'projects' ? 'text-white' : 'text-[var(--primary)]'}`} />
                              <span className="text-sm font-bold">Projetos Vinculados</span>
                           </div>
                           <span className="font-black text-xl">{userProjects.length}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('tasks')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'tasks' ? 'shadow-lg scale-[1.02]' : ''}`}
                           style={{
                              backgroundColor: activeTab === 'tasks' ? 'var(--primary)' : 'var(--surface)',
                              borderColor: activeTab === 'tasks' ? 'var(--primary)' : 'var(--border)',
                              color: activeTab === 'tasks' ? 'white' : 'var(--text)'
                           }}
                        >
                           <div className="flex items-center gap-3">
                              <Clock className={`w-5 h-5 ${activeTab === 'tasks' ? 'text-white' : 'text-blue-500'}`} />
                              <span className="text-sm font-bold">Total de Tarefas</span>
                           </div>
                           <span className="font-black text-xl">{totalTasks}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('delayed')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'delayed' ? 'bg-red-500 border-red-500 text-white shadow-lg scale-[1.02]' : 'hover:border-red-300'}`}
                           style={{ backgroundColor: activeTab === 'delayed' ? undefined : 'var(--bgApp)', borderColor: activeTab === 'delayed' ? undefined : 'var(--border)', color: activeTab === 'delayed' ? 'white' : 'var(--textMuted)' }}
                        >
                           <div className="flex items-center gap-3">
                              <AlertCircle className={`w-5 h-5 ${activeTab === 'delayed' ? 'text-white' : 'text-red-500'}`} />
                              <span className="text-sm font-bold">Tarefas Atrasadas</span>
                           </div>
                           <span className="font-black text-xl">{delayedTasks.length}</span>
                        </button>

                        <button
                           onClick={() => setActiveTab('ponto')}
                           className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all duration-300 ${activeTab === 'ponto' ? 'bg-orange-500 border-orange-500 text-white shadow-lg scale-[1.02]' : 'hover:border-orange-300'}`}
                           style={{ backgroundColor: activeTab === 'ponto' ? undefined : 'var(--bgApp)', borderColor: activeTab === 'ponto' ? undefined : 'var(--border)', color: activeTab === 'ponto' ? 'white' : 'var(--textMuted)' }}
                        >
                           <div className="flex items-center gap-3">
                              <Timer className={`w-5 h-5 ${activeTab === 'ponto' ? 'text-white' : 'text-orange-500'}`} />
                              <span className="text-sm font-bold">Ponto</span>
                           </div>
                           <span className="font-black text-xl">{missingPontoDays}</span>
                        </button>
                     </div>

                     {/* Ações de Gestão */}
                     <div className="pt-6 border-t mt-6 flex gap-3" style={{ borderColor: 'var(--border)' }}>
                        <button
                           onClick={() => navigate(`/admin/team/${user.id}/edit`)}
                           className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border"
                           style={{
                              backgroundColor: 'var(--bgApp)',
                              borderColor: 'var(--border)',
                              color: 'var(--textTitle)'
                           }}
                        >
                           <Edit className="w-4 h-4" />
                           Editar
                        </button>
                        <button
                           onClick={() => setDeleteModalOpen(true)}
                           className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30"
                        >
                           <Trash2 className="w-4 h-4" />
                           Excluir
                        </button>
                     </div>
                  </div>
               </div>

               {/* Right Side: Tab Content */}
               <div className="lg:col-span-8 flex flex-col h-full rounded-3xl p-8 border overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}>
                  {renderContent()}
               </div>

            </div>
         </div>

         <ConfirmationModal
            isOpen={deleteModalOpen}
            title="Excluir Colaborador"
            message={`Tem certeza que deseja remover "${user.name}"?`}
            onConfirm={handleDeleteUser}
            onCancel={() => setDeleteModalOpen(false)}
         />
      </div>
   );
};

export default TeamMemberDetail;
