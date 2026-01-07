// components/TimesheetAdminDashboard.tsx - Adaptado para Router
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Building2, ArrowRight, Clock, Briefcase, Users, TrendingUp, BarChart3, CheckSquare, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

const TimesheetAdminDashboard: React.FC = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const navigate = useNavigate();

   const { users, clients, projects, tasks, timesheetEntries: entries } = useDataController();

   const initialTab = (searchParams.get('tab') as 'projects' | 'collaborators' | 'status') || 'projects';
   const selectedClientId = searchParams.get('clientId');

   const [activeTab, setActiveTab] = useState<'projects' | 'collaborators' | 'status'>(initialTab);
   const [expandedCollaborators, setExpandedCollaborators] = useState<Set<string>>(new Set());

   // Sync URL State
   useEffect(() => {
      const params: any = {};
      if (activeTab) params.tab = activeTab;
      if (selectedClientId) params.clientId = selectedClientId;
      setSearchParams(params);
   }, [activeTab, selectedClientId, setSearchParams]);

   // Aggregate Logic - Total de todas as horas
   const totalAllHours = useMemo(() => {
      return entries.reduce((acc, curr) => acc + curr.totalHours, 0);
   }, [entries]);

   // Status dos Colaboradores - verificar dias em dia
   const collaboratorsStatus = useMemo(() => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Calcular dias úteis do mês até ontem
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const workDaysUntilYesterday: string[] = [];
      const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

      for (let d = new Date(firstDayOfMonth); d <= yesterday; d.setDate(d.getDate() + 1)) {
         const dayOfWeek = d.getDay();
         if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Seg-Sex
            workDaysUntilYesterday.push(d.toISOString().split('T')[0]);
         }
      }

      return users.filter(u => u.active !== false && (u.role === 'developer' || u.role === 'admin')).map(user => {
         const userEntries = entries.filter(e =>
            e.userId === user.id &&
            new Date(e.date).getMonth() === currentMonth &&
            new Date(e.date).getFullYear() === currentYear
         );

         const datesWithEntries = new Set(userEntries.map(e => e.date));
         const missingDays = workDaysUntilYesterday.filter(day => !datesWithEntries.has(day));

         return {
            user,
            totalDays: workDaysUntilYesterday.length,
            daysWithEntries: datesWithEntries.size,
            missingDays: missingDays.length,
            missingDates: missingDays,
            isUpToDate: missingDays.length === 0,
            totalHours: userEntries.reduce((acc, curr) => acc + curr.totalHours, 0)
         };
      }).sort((a, b) => b.missingDays - a.missingDays);
   }, [users, entries]);

   const getClientStats = (clientId: string) => {
      const clientEntries = entries.filter(e => e.clientId === clientId);
      const totalHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
      const activeProjectIds = new Set(clientEntries.map(e => e.projectId));
      return { totalHours, projectCount: activeProjectIds.size, entries: clientEntries };
   };

   // Dados do cliente selecionado
   const selectedClient = selectedClientId ? clients.find(c => c.id === selectedClientId) : null;
   const selectedClientData = selectedClientId ? getClientStats(selectedClientId) : null;

   // Projetos do cliente selecionado com horas
   const projectsWithHours = useMemo(() => {
      if (!selectedClientId) return [];
      const clientProjects = projects.filter(p => p.clientId === selectedClientId);
      return clientProjects.map(proj => {
         const projEntries = selectedClientData?.entries.filter(e => e.projectId === proj.id) || [];
         const hours = projEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
         return { ...proj, totalHours: hours, entryCount: projEntries.length };
      }).sort((a, b) => b.totalHours - a.totalHours);
   }, [selectedClientId, projects, selectedClientData]);

   // Colaboradores do cliente selecionado com horas e tarefas
   const collaboratorsWithHours = useMemo(() => {
      if (!selectedClientId) return [];

      const clientProjects = projects.filter(p => p.clientId === selectedClientId);
      const clientProjectIds = new Set(clientProjects.map(p => p.id));
      const clientTasks = tasks.filter(t => clientProjectIds.has(t.projectId));

      const collabMap = new Map<string, any>();

      clientTasks.forEach(task => {
         if (task.developerId) {
            // Tenta pegar nome do usuário real
            const realUser = users.find(u => u.id === task.developerId);
            const userName = realUser ? realUser.name : (task.developer || `Dev ${task.developerId.substring(0, 4)}`);

            if (!collabMap.has(task.developerId)) {
               collabMap.set(task.developerId, {
                  name: userName,
                  developerId: task.developerId,
                  entries: 0,
                  hours: 0,
                  taskEntries: []
               });
            }
         }
      });

      const clientEntries = selectedClientData?.entries || [];
      clientEntries.forEach(entry => {
         let developerId = entry.userId;
         // Se o usuário não existe no map ainda, adiciona
         if (!collabMap.has(developerId)) {
            const realUser = users.find(u => u.id === developerId);
            const userName = realUser ? realUser.name : (entry.userName || 'Sem nome');

            collabMap.set(developerId, {
               name: userName,
               developerId,
               entries: 0,
               hours: 0,
               taskEntries: []
            });
         }

         const collab = collabMap.get(developerId)!;
         collab.entries += 1;
         collab.hours += entry.totalHours;

         const task = tasks.find(t => t.id === entry.taskId);
         const taskName = task?.title || entry.description || 'Sem descrição';

         collab.taskEntries.push({
            taskName,
            taskId: entry.taskId,
            startTime: entry.startTime,
            endTime: entry.endTime,
            totalHours: entry.totalHours,
            date: entry.date
         });
      });

      collabMap.forEach(collab => {
         collab.taskEntries.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      return Array.from(collabMap.values()).sort((a: any, b: any) => b.hours - a.hours);
   }, [selectedClientId, selectedClientData, projects, tasks, users]);

   return (
      <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
         {/* Header */}
         <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] px-8 py-6 border-b border-white/10">
            <div className="flex items-center justify-between">
               <div>
                  <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                     {activeTab === 'status' ? '📊 Status Geral' : '⏰ Gestão de Horas'}
                  </h1>
                  <p className="text-white/80 text-sm mt-1">
                     {activeTab === 'status'
                        ? 'Acompanhe quem está em dia com os apontamentos'
                        : 'Resumo de horas por Cliente e Projeto'}
                  </p>
               </div>
               <div className="flex items-center gap-3">
                  <button
                     onClick={() => {
                        const newTab = activeTab === 'projects' ? 'status' : 'projects';
                        setActiveTab(newTab);
                        if (newTab === 'status' && selectedClientId) {
                           const params: any = { tab: 'status' };
                           setSearchParams(params);
                        }
                     }}
                     className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 border border-white/20 transition-all shadow-sm"
                  >
                     {activeTab === 'projects' ? <BarChart3 className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                     {activeTab === 'projects' ? 'Ver Status Geral' : 'Ver Clientes'}
                  </button>

                  {selectedClientId && (
                     <button
                        onClick={() => {
                           const params: any = { tab: 'projects' };
                           setSearchParams(params);
                        }}
                        className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition-all shadow-sm"
                     >
                        ← Voltar
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* Conteúdo */}
         {!selectedClientId && activeTab === 'projects' ? (
            // Lista de Clientes
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {clients.map(client => {
                     const stats = getClientStats(client.id);
                     const clientProjects = projects.filter(p => p.clientId === client.id);
                     return (
                        <div
                           key={client.id}
                           onClick={() => {
                              setSearchParams({ tab: 'projects', clientId: client.id });
                           }}
                           className="rounded-2xl border p-6 cursor-pointer hover:shadow-lg transition-all group flex flex-col h-full relative"
                           style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
                           <style>{`.group:hover { border-color: var(--primary) !important; transform: translateY(-4px); }`}</style>
                           <div className="flex items-start justify-between mb-4">
                              <div className="w-14 h-14 rounded-2xl border p-2 flex items-center justify-center flex-shrink-0 shadow-sm"
                                 style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                                 {client.logoUrl ? (
                                    <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                                 ) : (
                                    <div className="text-xl font-bold" style={{ color: 'var(--muted)' }}>{client.name.charAt(0)}</div>
                                 )}
                              </div>
                              <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                 style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--primary)' }}>
                                 <ArrowRight className="w-4 h-4" />
                              </div>
                              <style>{`.group:hover .rounded-full { background-color: var(--primary) !important; color: white !important; }`}</style>
                           </div>
                           <h3 className="text-lg font-bold mb-4 line-clamp-2" style={{ color: 'var(--text)' }}>{client.name}</h3>
                           <div className="mt-auto space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Horas Totais
                                 </span>
                                 <span className="text-lg font-black text-emerald-600">{stats.totalHours.toFixed(1)}h</span>
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wider flex items-center justify-between" style={{ color: 'var(--muted)' }}>
                                 <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" /> {clientProjects.length} Projetos</span>
                                 {stats.projectCount > 0 && <span className="font-black" style={{ color: 'var(--primary)' }}>{stats.projectCount} ativos</span>}
                              </div>
                           </div>
                        </div>
                     );
                  })}
               </div>
            </div>
         ) : !selectedClientId && activeTab === 'status' ? (
            // Aba Status dos Colaboradores
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <div className="mb-6 flex justify-between items-end">
                  <div>
                     <h2 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Status da Equipe</h2>
                     <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Resumo mensal • {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
                  </div>
               </div>

               {collaboratorsStatus.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-2xl"
                     style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                     <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                     <p>Nenhum colaborador encontrado</p>
                  </div>
               ) : (
                  <div className="space-y-4">
                     {collaboratorsStatus.map(status => (
                        <div
                           key={status.user.id}
                           className="border rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer transform hover:scale-[1.01]"
                           style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                           onClick={() => navigate(`/admin/team/${status.user.id}`)}
                        >
                           <div className="flex flex-col md:flex-row items-center gap-6">
                              {/* User Info */}
                              <div className="flex items-center gap-4 flex-1 w-full">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${status.isUpToDate ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                                    {status.isUpToDate ? <CheckSquare className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                                 </div>
                                 <div>
                                    <h3 className="font-bold" style={{ color: 'var(--text)' }}>{status.user.name}</h3>
                                    <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{status.user.cargo || 'Dev'}</p>
                                 </div>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-8 w-full md:w-auto justify-around md:justify-end">
                                 <div className="text-center">
                                    <p className="text-xl font-black" style={{ color: 'var(--primary)' }}>{status.daysWithEntries}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-black" style={{ color: 'var(--muted)' }}>dias ok</p>
                                 </div>

                                 {!status.isUpToDate && (
                                    <div className="text-center">
                                       <p className="text-xl font-black text-red-600">{status.missingDays}</p>
                                       <p className="text-[10px] uppercase tracking-wider font-black" style={{ color: 'var(--muted)' }}>falta</p>
                                    </div>
                                 )}

                                 <div className="text-center">
                                    <p className="text-xl font-black" style={{ color: 'var(--text)' }}>{status.totalHours.toFixed(1)}h</p>
                                    <p className="text-[10px] uppercase tracking-wider font-black" style={{ color: 'var(--muted)' }}>total</p>
                                 </div>
                              </div>

                              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm border ${status.isUpToDate ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800'}`}>
                                 {status.isUpToDate ? 'EM DIA' : 'ATENÇÃO'}
                              </div>
                           </div>

                           {!status.isUpToDate && status.missingDates.length > 0 && (
                              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                                 <p className="text-[10px] font-black mb-2 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>DIAS PENDENTES:</p>
                                 <div className="flex flex-wrap gap-2">
                                    {status.missingDates.slice(0, 12).map(date => (
                                       <span key={date} className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-800 text-[10px] font-bold font-mono shadow-sm">
                                          {new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </div>
         ) : (
            // Detalhe do Cliente com Abas
            <div className="flex-1 flex flex-col overflow-hidden">
               {/* Tabs */}
               <div className="px-8 py-2 border-b flex gap-6 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <button
                     onClick={() => setActiveTab('projects')}
                     className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2`}
                     style={{
                        borderColor: activeTab === 'projects' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'projects' ? 'var(--primary)' : 'var(--muted)'
                     }}
                  >
                     <Briefcase className="w-4 h-4" />
                     Projetos ({projectsWithHours.length})
                  </button>

                  <button
                     onClick={() => setActiveTab('collaborators')}
                     className={`py-4 font-black text-xs uppercase tracking-widest border-b-2 transition-all flex items-center gap-2`}
                     style={{
                        borderColor: activeTab === 'collaborators' ? 'var(--primary)' : 'transparent',
                        color: activeTab === 'collaborators' ? 'var(--primary)' : 'var(--muted)'
                     }}
                  >
                     <Users className="w-4 h-4" />
                     Colaboradores ({collaboratorsWithHours.length})
                  </button>
               </div>

               {/* Conteúdo das Abas */}
               <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                  {/* Aba Projetos */}
                  {activeTab === 'projects' && (
                     <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
                           {selectedClient?.logoUrl && <img src={selectedClient.logoUrl} className="w-10 h-10 object-contain p-1 bg-white rounded-lg shadow-sm border border-slate-100" />}
                           Projetos de {selectedClient?.name}
                        </h2>

                        {projectsWithHours.length === 0 ? (
                           <div className="text-center py-12 border-2 border-dashed rounded-2xl"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                              <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-30" />
                              <p>Nenhum projeto encontrado</p>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {projectsWithHours.map(proj => (
                                 <div key={proj.id} className={`rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer group transform hover:scale-[1.01] ${proj.entryCount > 0 ? '' : 'border-dashed opacity-75'}`}
                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                    onClick={() => navigate(`/admin/projects/${proj.id}`)}
                                 >
                                    <div className="flex justify-between items-start mb-2">
                                       <h3 className="font-bold transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--text)' }}>{proj.name}</h3>
                                       <span className={`text-lg font-black transition-colors ${proj.totalHours > 0 ? 'text-[var(--primary)]' : 'opacity-30'}`}>
                                          {proj.totalHours.toFixed(1)}h
                                       </span>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                                       {proj.entryCount} apontamentos
                                    </p>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}

                  {/* Aba Colaboradores */}
                  {activeTab === 'collaborators' && (
                     <div className="space-y-4">
                        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text)' }}>Colaboradores no Cliente</h2>

                        {collaboratorsWithHours.length === 0 ? (
                           <div className="text-center py-12 border-2 border-dashed rounded-2xl"
                              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                              <p>Nenhum colaborador encontrado</p>
                           </div>
                        ) : (
                           <div className="space-y-4">
                              {collaboratorsWithHours.map((collab: any, idx: number) => {
                                 const isExpanded = expandedCollaborators.has(`${idx}-${collab.name}`);
                                 const hasApontamentos = collab.entries > 0;
                                 const toggleExpand = () => {
                                    const newSet = new Set(expandedCollaborators);
                                    const key = `${idx}-${collab.name}`;
                                    if (newSet.has(key)) newSet.delete(key);
                                    else newSet.add(key);
                                    setExpandedCollaborators(newSet);
                                 };

                                 return (
                                    <div key={idx} className="rounded-2xl border overflow-hidden hover:shadow-md transition-all"
                                       style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                       <div
                                          className="p-5 flex items-center justify-between cursor-pointer transition-colors"
                                          onClick={toggleExpand}
                                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                       >
                                          <div className="flex items-center gap-4">
                                             <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shadow-sm"
                                                style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                                                {collab.name.charAt(0)}
                                             </div>
                                             <div>
                                                <h3 className="font-bold" style={{ color: 'var(--text)' }}>{collab.name}</h3>
                                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{collab.entries} apontamentos</p>
                                             </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                             <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>{collab.hours.toFixed(1)}h</span>
                                             {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
                                          </div>
                                       </div>

                                       {hasApontamentos && isExpanded && (
                                          <div className="border-t p-4 space-y-2 shadow-inner" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                                             {collab.taskEntries.map((task: any, tIdx: number) => (
                                                <div key={tIdx} className="p-3 rounded-xl border flex justify-between items-center text-sm shadow-sm transform hover:scale-[1.01] transition-all"
                                                   style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                                                   <div>
                                                      <p className="font-bold" style={{ color: 'var(--text)' }}>{task.taskName}</p>
                                                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{new Date(task.date).toLocaleDateString()} • {task.startTime} - {task.endTime}</p>
                                                   </div>
                                                   <span className="font-black text-[var(--primary)]">{task.totalHours.toFixed(2)}h</span>
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         )}
      </div>
   );
};

export default TimesheetAdminDashboard;
