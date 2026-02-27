// components/TimesheetAdminDashboard.tsx - Adaptado para Router
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Building2, ArrowRight, Clock, Briefcase, Users, TrendingUp, BarChart3, CheckSquare, ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from 'lucide-react';
import { Project } from '@/types';
import { formatDecimalToTime } from '@/utils/normalizers';

const TimesheetAdminDashboard: React.FC = () => {
   const [searchParams, setSearchParams] = useSearchParams();
   const navigate = useNavigate();

   const { users, clients, projects, tasks, timesheetEntries: entries, absences } = useDataController();

   const initialTab = (searchParams.get('tab') as 'projects' | 'collaborators' | 'status') || 'projects';
   const selectedClientId = searchParams.get('clientId');

   const { projectMembers } = useDataController();


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
         if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Seg-Mex
            workDaysUntilYesterday.push(d.toISOString().split('T')[0]);
         }
      }

      const activeRoles = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'ceo', 'tech_lead'];
      const monitoredCollaborators = users.filter(u =>
         u.active !== false && (u.torre !== 'N/A' || activeRoles.includes(u.role?.toLowerCase() || ''))
      );

      return monitoredCollaborators.map(user => {
         const userEntries = entries.filter(e =>
            e.userId === user.id &&
            new Date(e.date).getMonth() === currentMonth &&
            new Date(e.date).getFullYear() === currentYear
         );

         const datesWithEntries = new Set(userEntries.map(e => e.date));

         const isExempt = ['ceo', 'diretoria', 'executive'].includes(user.role?.toLowerCase() || '');
         const missingDays = isExempt ? [] : workDaysUntilYesterday.filter(day => !datesWithEntries.has(day));

         const dailyGoal = user.dailyAvailableHours || 8;
         const expectedHours = workDaysUntilYesterday.length * dailyGoal;

         // Check absence today
         const userAbsences = absences.filter(a => a.userId === user.id && a.status === 'finalizada_dp');
         const now = new Date();
         const absentToday = userAbsences.find(a => {
            const start = new Date(a.startDate + 'T00:00:00');
            start.setHours(0, 0, 0, 0);
            const end = new Date(a.endDate + 'T23:59:59');
            end.setHours(23, 59, 59, 999);
            return now >= start && now <= end;
         });

         return {
            user,
            absenceData: absentToday,
            totalDays: workDaysUntilYesterday.length,
            daysWithEntries: datesWithEntries.size,
            missingDays: missingDays.length,
            missingDates: missingDays,
            isUpToDate: missingDays.length === 0,
            totalHours: userEntries.reduce((acc, curr) => acc + curr.totalHours, 0),
            expectedHours,
            dailyGoal
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

      collabMap.forEach((collab, userId) => {
         const user = users.find(u => u.id === userId);
         const activeRoles = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'ceo', 'tech_lead'];

         // Se o usuário existir e tiver horas, nós o mantemos para fins de histórico.
         // Se for inativo ou de outra torre, mas tiver horas, ele deve aparecer no histórico do projeto.
         const hasHours = collab.hours > 0;
         const isParticipant = user && (user.active !== false && (user.torre !== 'N/A' || activeRoles.includes(user.role?.toLowerCase() || '')));

         if (!isParticipant && !hasHours) {
            collabMap.delete(userId);
            return;
         }
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
                              <div className="flex flex-col items-end gap-2">
                                 <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                                    style={{ backgroundColor: 'var(--surface-hover)', color: 'var(--primary)' }}>
                                    <ArrowRight className="w-4 h-4" />
                                 </div>

                              </div>
                              <style>{`.group:hover .rounded-full { background-color: var(--primary) !important; color: white !important; }`}</style>
                           </div>
                           <h3 className="text-lg font-bold mb-4 line-clamp-2" style={{ color: 'var(--text)' }}>{client.name}</h3>
                           <div className="mt-auto space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex justify-between items-center">
                                 <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                                    <TrendingUp className="w-3 h-3 text-emerald-500" /> Horas Totais
                                 </span>
                                 <span className="text-lg font-black text-emerald-600">{formatDecimalToTime(stats.totalHours)}</span>
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
            // Aba Status dos Colaboradores - VISÃO 3 COLUNAS (Original Design)
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
               <style>{`
                  .status-column {
                    flex: 1;
                    min-width: 320px;
                    border-radius: 1.5rem;
                    border: 1px solid var(--border);
                    display: flex;
                    flex-col: column;
                    gap: 1.5rem;
                    padding: 1.5rem;
                    height: 100%;
                  }
                  .status-card {
                     background: var(--surface);
                     border: 1px solid var(--border);
                     border-radius: 1rem;
                     padding: 1rem;
                     display: flex;
                     align-items: center;
                     gap: 1rem;
                     box-shadow: var(--shadow-sm);
                     transition: all 0.2s ease;
                  }
                  .status-card:hover {
                     transform: translateY(-2px);
                     box-shadow: var(--shadow-md);
                     border-color: var(--primary);
                  }
                `}</style>
               <div className="flex flex-col md:flex-row gap-6 h-full min-h-[600px]">
                  {/* COLUNA: LIVRES */}
                  <div className="status-column" style={{ backgroundColor: 'var(--success-bg)' }}>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'var(--success)' }}>
                           <CheckSquare className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold" style={{ color: 'var(--success-text)' }}>Livres</h3>
                           <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--success-text)', opacity: 0.8 }}>Disponíveis</p>
                        </div>
                     </div>

                     {(() => {
                        const freeCollabs = collaboratorsStatus.filter(s => s.isUpToDate && tasks.filter(t => t.developerId === s.user.id && t.status !== 'Done').length === 0);
                        return freeCollabs.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center italic text-sm text-center px-4" style={{ color: 'var(--success-text)', opacity: 0.5 }}>
                              Nenhum colaborador livre
                           </div>
                        ) : (
                           <div className="flex flex-col gap-3 overflow-y-auto">
                              {freeCollabs.map(s => (
                                 <div key={s.user.id} className="status-card" onClick={() => navigate(`/admin/team/${s.user.id}`)}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border shadow-inner"
                                       style={{ backgroundColor: 'var(--surface)', color: 'var(--success)', borderColor: 'var(--success-bg)' }}>
                                       {s.user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{s.user.name}</p>
                                       {s.absenceData ? (
                                          <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 inline-block mt-0.5">
                                             Ausente: {s.absenceData.type}
                                          </span>
                                       ) : (
                                          <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{s.user.cargo || 'Desenvolvedor'}</p>
                                       )}
                                    </div>
                                    <div className="text-right">
                                       <p className="text-sm font-black" style={{ color: 'var(--success-text)' }}>{formatDecimalToTime(s.totalHours)}</p>
                                       <p className="text-[8px] font-black uppercase" style={{ color: 'var(--muted)' }}>v. {formatDecimalToTime(s.expectedHours)}</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        );
                     })()}
                  </div>

                  {/* COLUNA: OCUPADOS */}
                  <div className="status-column" style={{ backgroundColor: 'var(--warning-bg)' }}>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'var(--warning-text)' }}>
                           <Clock className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold" style={{ color: 'var(--warning-text)' }}>Ocupados</h3>
                           <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>Em atividade</p>
                        </div>
                     </div>

                     {(() => {
                        const busyCollabs = collaboratorsStatus.filter(s => s.isUpToDate && tasks.filter(t => t.developerId === s.user.id && t.status !== 'Done').length > 0);
                        return busyCollabs.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center italic text-sm text-center px-4" style={{ color: 'var(--warning-text)', opacity: 0.5 }}>
                              Nenhum colaborador ocupado
                           </div>
                        ) : (
                           <div className="flex flex-col gap-3 overflow-y-auto">
                              {busyCollabs.map(s => {
                                 const activeTasks = tasks.filter(t => t.developerId === s.user.id && t.status !== 'Done');
                                 return (
                                    <div key={s.user.id} className="status-card" onClick={() => navigate(`/admin/team/${s.user.id}`)}>
                                       <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border shadow-inner"
                                          style={{ backgroundColor: 'var(--surface)', color: 'var(--warning-text)', borderColor: 'var(--warning-bg)' }}>
                                          {s.user.name.charAt(0)}
                                       </div>
                                       <div className="min-w-0 flex-1">
                                          <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{s.user.name}</p>
                                          {s.absenceData ? (
                                             <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-orange-100 text-orange-700">
                                                Ausente: {s.absenceData.type}
                                             </span>
                                          ) : (
                                             <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{s.user.cargo || 'Desenvolvedor'}</p>
                                          )}
                                       </div>
                                       <div className="text-right">
                                          <div className="flex flex-col items-end">
                                             <p className="text-sm font-black" style={{ color: 'var(--warning-text)' }}>{formatDecimalToTime(s.totalHours)}</p>
                                             <p className="text-[8px] font-black uppercase" style={{ color: 'var(--muted)' }}>v. {formatDecimalToTime(s.expectedHours)}</p>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        );
                     })()}
                  </div>

                  {/* COLUNA: AUSENTES */}
                  <div className="status-column" style={{ backgroundColor: 'var(--danger-bg)' }}>
                     <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: 'var(--danger)' }}>
                           <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                           <h3 className="font-bold" style={{ color: 'var(--danger-text)' }}>Ausentes</h3>
                           <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: 'var(--danger-text)', opacity: 0.8 }}>Sem apontamentos</p>
                        </div>
                     </div>

                     {(() => {
                        const absentCollabs = collaboratorsStatus.filter(s => !s.isUpToDate);
                        return absentCollabs.length === 0 ? (
                           <div className="flex-1 flex items-center justify-center italic text-sm text-center px-4" style={{ color: 'var(--danger-text)', opacity: 0.5 }}>
                              Todos estão em dia!
                           </div>
                        ) : (
                           <div className="flex flex-col gap-3 overflow-y-auto">
                              {absentCollabs.map(s => (
                                 <div key={s.user.id} className="status-card" onClick={() => navigate(`/admin/team/${s.user.id}`)}>
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold border shadow-inner"
                                       style={{ backgroundColor: 'var(--surface)', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}>
                                       {s.user.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <p className="font-bold truncate" style={{ color: 'var(--text)' }}>{s.user.name}</p>
                                       {s.absenceData ? (
                                          <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 inline-block mt-0.5">
                                             Ausente: {s.absenceData.type}
                                          </span>
                                       ) : (
                                          <p className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{s.user.cargo || 'Desenvolvedor'}</p>
                                       )}
                                    </div>
                                    <div className="text-right">
                                       <p className="text-sm font-black" style={{ color: 'var(--danger)' }}>{s.missingDays}</p>
                                       <p className="text-[8px] font-black uppercase" style={{ color: 'var(--muted)' }}>dias faltando</p>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        );
                     })()}
                  </div>
               </div>
            </div>
         ) : (
            // Detalhe do Cliente com Abas
            <div className="flex-1 flex flex-col overflow-hidden">
               {/* NAVEGAÇÃO DE SUB-MENUS (VERSÃO COMPACTA & FUNCIONAL) */}
               <div className="px-8 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
                  <div className="flex bg-[var(--surface-2)] p-1 rounded-lg border border-[var(--border)] w-fit">
                     <button
                        onClick={() => setActiveTab('projects')}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'projects'
                           ? 'bg-slate-800 text-white shadow-sm'
                           : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                           }`}
                     >
                        Projetos <span className="ml-1 opacity-60">({projectsWithHours.length})</span>
                     </button>

                     <button
                        onClick={() => setActiveTab('collaborators')}
                        className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === 'collaborators'
                           ? 'bg-slate-800 text-white shadow-sm'
                           : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                           }`}
                     >
                        Colaboradores <span className="ml-1 opacity-60">({collaboratorsWithHours.length})</span>
                     </button>
                  </div>
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
                                       <div className="flex items-center gap-2">
                                          <h3 className="font-bold transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--text)' }}>{proj.name}</h3>

                                       </div>
                                       <span className={`text-lg font-black transition-colors ${proj.totalHours > 0 ? 'text-[var(--primary)]' : 'opacity-30'}`}>
                                          {formatDecimalToTime(proj.totalHours)}
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
                                             <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>{formatDecimalToTime(collab.hours)}</span>
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
                                                   <span className="font-black text-[var(--primary)]">{formatDecimalToTime(task.totalHours)}</span>
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
