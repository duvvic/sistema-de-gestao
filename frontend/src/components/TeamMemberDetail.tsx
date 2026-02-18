// components/TeamMemberDetail.tsx - Reestruturado: Resumo Topo + Edição Principal
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Task, Role } from '@/types';
import { User as UserIcon, Mail, Briefcase, Shield, Edit, Save, Trash2, ArrowLeft, CheckCircle, Clock, AlertCircle, Calendar, Zap, Info, LayoutGrid, ChevronRight } from 'lucide-react';
import OrganizationalStructureSelector from './OrganizationalStructureSelector';
import ConfirmationModal from './ConfirmationModal';
import { getRoleDisplayName, formatDecimalToTime } from '@/utils/normalizers';
import { supabase } from '@/services/supabaseClient';

import TimesheetCalendar from './TimesheetCalendar';
import AbsenceManager from './AbsenceManager';
import * as CapacityUtils from '@/utils/capacity';

type ViewTab = 'details' | 'projects' | 'tasks' | 'delayed' | 'ponto' | 'absences';

const TeamMemberDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const { users, tasks, projects, projectMembers, timesheetEntries, deleteUser, absences } = useDataController();

   // Get initial tab from URL query parameter, default to 'details'
   const initialTab = (searchParams.get('tab') as ViewTab) || 'details';
   const [activeTab, setActiveTab] = useState<ViewTab>(initialTab);
   const [deleteModalOpen, setDeleteModalOpen] = useState(false);

   const user = users.find(u => u.id === userId);

   // --- FORM STATE ---
   const [loading, setLoading] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [formData, setFormData] = useState({
      name: '',
      email: '',
      cargo: '',
      nivel: '',
      role: 'developer' as Role,
      active: true,
      avatarUrl: '',
      torre: '',
      hourlyCost: 0,
      dailyAvailableHours: 8,
      monthlyAvailableHours: 160
   });

   useEffect(() => {
      if (user) {
         setFormData({
            name: user.name,
            email: user.email,
            cargo: user.cargo || '',
            nivel: user.nivel || '',
            role: user.role,
            active: user.active !== false,
            avatarUrl: user.avatarUrl || '',
            torre: user.torre || '',
            hourlyCost: user.hourlyCost || 0,
            dailyAvailableHours: user.dailyAvailableHours || 8,
            monthlyAvailableHours: user.monthlyAvailableHours || 160
         });
      }
   }, [user]);

   const handleSave = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name || !formData.email) {
         alert('Por favor, preencha nome e email.');
         return;
      }
      setLoading(true);
      try {
         const payload = {
            NomeColaborador: formData.name,
            email: formData.email,
            Cargo: formData.cargo,
            nivel: formData.nivel,
            role: formData.role,
            ativo: formData.active,
            avatar_url: formData.avatarUrl,
            torre: formData.torre,
            custo_hora: Number(String(formData.hourlyCost).replace(',', '.')),
            horas_disponiveis_dia: Number(String(formData.dailyAvailableHours).replace(',', '.')),
            horas_disponiveis_mes: Number(String(formData.monthlyAvailableHours).replace(',', '.'))
         };

         const { error } = await supabase
            .from('dim_colaboradores')
            .update(payload)
            .eq('ID_Colaborador', Number(userId));

         if (error) throw error;
         alert('Dados atualizados com sucesso!');
         setIsEditing(false);
      } catch (error: any) {
         console.error(error);
         alert('Erro ao salvar: ' + error.message);
      } finally {
         setLoading(false);
      }
   };

   // --- HELPERS ---
   const getDelayDays = (task: Task) => (task.daysOverdue ?? 0);
   const currentWorkingDays = useMemo(() => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let count = 0;
      for (let i = 1; i <= daysInMonth; i++) {
         const date = new Date(year, month, i);
         const day = date.getDay();
         if (day !== 0 && day !== 6) count++;
      }
      return count;
   }, []);

   const handleNumberChange = (field: keyof typeof formData, value: string) => {
      const cleanValue = value.replace(/[^0-9.,]/g, '');
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
   };

   const handleDeleteUser = async () => {
      if (user && deleteUser) {
         await deleteUser(user.id);
         navigate('/admin/team');
      }
   };

   if (!user) return <div className="p-4 text-xs font-bold text-slate-500">Colaborador não encontrado.</div>;

   let userTasks = tasks.filter(t => t.developerId === user.id || (t.collaboratorIds && t.collaboratorIds.includes(user.id)));
   const linkedProjectIds = projectMembers.filter(pm => String(pm.id_colaborador) === user.id).map(pm => String(pm.id_projeto));
   const userProjects = projects.filter(p => linkedProjectIds.includes(p.id) && p.active !== false);
   const delayedTasks = userTasks.filter(t => getDelayDays(t) > 0 && t.status !== 'Review');

   return (
      <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
         {/* CABEÇALHO SUPERIOR - COM PROFUNDIDADE */}
         <div className="px-8 py-3.5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)] sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-4">
               <button type="button" onClick={() => navigate(-1)} className="p-1.5 hover:bg-[var(--surface-2)] rounded-lg transition-colors text-[var(--muted)]">
                  <ArrowLeft className="w-5 h-5" />
               </button>
               <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] border border-[var(--border)] shadow-sm overflow-hidden flex items-center justify-center text-sm font-black text-[var(--primary)]">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}
               </div>
               <div>
                  <h1 className="text-base font-black text-[var(--text)] tracking-tight leading-tight">{user.name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded bg-[var(--primary)] text-white">{user.cargo || 'Operacional'}</span>
                     <span className="text-[var(--muted)] opacity-30">•</span>
                     <span className="text-[11px] font-bold text-[var(--text-2)]">{getRoleDisplayName(user.role)}</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-3">
               {activeTab === 'details' && (
                  <button
                     type="button"
                     onClick={() => setIsEditing(!isEditing)}
                     className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${isEditing ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black'}`}
                  >
                     {isEditing ? 'Cancelar Edição' : 'Editar Perfil'}
                  </button>
               )}
            </div>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* SUB-NAVEGAÇÃO - ESTILO TABS */}
            <div className="flex gap-1 border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--bg)]/80 backdrop-blur-md px-8 pt-2">
               {[
                  { id: 'details', label: 'Geral', count: null },
                  { id: 'projects', label: 'Projetos', count: userProjects.length },
                  { id: 'tasks', label: 'Tarefas', count: userTasks.length },
                  { id: 'delayed', label: 'Atrasos', count: delayedTasks.length },
                  { id: 'ponto', label: 'Ponto', count: null },
                  { id: 'absences', label: 'Ausências', count: null }
               ].map(tab => (
                  <button
                     key={tab.id}
                     type="button"
                     onClick={() => setActiveTab(tab.id as ViewTab)}
                     className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 relative ${activeTab === tab.id
                        ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--surface)] rounded-t-lg'
                        : 'border-transparent text-[var(--muted)] hover:text-[var(--text)]'
                        }`}
                  >
                     {tab.label} {tab.count !== null && <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] ${tab.id === 'delayed' && tab.count > 0 ? 'bg-red-500 text-white' : 'bg-[var(--surface-2)] opacity-60'}`}>{tab.count}</span>}
                  </button>
               ))}
            </div>

            <div className="p-6">
               {activeTab === 'details' && (
                  <div className="max-w-4xl mx-auto space-y-6">
                     <div className="ui-card p-6">
                        <div className="flex items-center gap-3 mb-8">
                           <div className="w-10 h-10 rounded-xl bg-[var(--primary-soft)] flex items-center justify-center text-[var(--primary)]">
                              <UserIcon className="w-5 h-5" />
                           </div>
                           <div>
                              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text)]">Dados Cadastrais</h3>
                              <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider">Informações básicas e acesso ao sistema</p>
                           </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-8">
                           <fieldset disabled={!isEditing} className="disabled:opacity-100 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Nome Completo</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all disabled:bg-transparent disabled:px-0 disabled:border-none disabled:text-base" required />
                                 </div>

                                 <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Email Profissional</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all disabled:bg-transparent disabled:px-0 disabled:border-none disabled:text-base" required />
                                 </div>

                                 <div className="col-span-full pt-8 border-t border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-6">
                                       <LayoutGrid className="w-4 h-4 text-[var(--primary)]" />
                                       <h3 className="text-[11px] font-black text-[var(--text)] uppercase tracking-widest">Enquadramento Funcional</h3>
                                    </div>

                                    <OrganizationalStructureSelector
                                       initialCargo={formData.cargo}
                                       initialLevel={formData.nivel}
                                       initialTorre={formData.torre}
                                       isEditing={isEditing}
                                       onChange={({ cargo, nivel, torre }) => setFormData(prev => ({ ...prev, cargo, nivel, torre }))}
                                    />
                                 </div>

                                 <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Nível de Acesso</label>
                                    <select
                                       value={formData.role}
                                       onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                       disabled={!isEditing}
                                       className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:bg-transparent disabled:px-0 disabled:border-none disabled:appearance-none disabled:text-[var(--primary)]"
                                    >
                                       <option value="developer">Operacional / Consultor</option>
                                       <option value="tech_lead">Tech Lead / Liderança</option>
                                       <option value="pmo">Planejamento / PMO</option>
                                       <option value="executive">Gestão Executiva / Executivo</option>
                                       <option value="system_admin">Administrador TI (System Admin)</option>
                                       <option value="ceo">Diretoria Geral / CEO</option>
                                    </select>
                                 </div>
                              </div>

                              <div className="border-t border-[var(--border)] pt-8 space-y-6">
                                 <h4 className="text-[11px] font-black uppercase text-[var(--text)] tracking-widest flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500" /> Custos e Metas Meta (Restrito)</h4>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                       <label className="block text-[10px] font-black text-[var(--muted)] uppercase">Custo Hora (IDL)</label>
                                       <div className="relative">
                                          {!isEditing && <span className="text-emerald-600 font-black">R$ {formData.hourlyCost}</span>}
                                          {isEditing && (
                                             <>
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">R$</span>
                                                <input type="text" value={formData.hourlyCost || ''} onChange={(e) => handleNumberChange('hourlyCost', e.target.value)} placeholder="0,00" className="w-full pl-10 pr-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-emerald-600 font-black focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                                             </>
                                          )}
                                       </div>
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="block text-[10px] font-black text-[var(--muted)] uppercase">Hrs Meta Dia</label>
                                       <input type="text" value={formData.dailyAvailableHours || ''} onChange={(e) => handleNumberChange('dailyAvailableHours', e.target.value)} placeholder="0" className="w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-bold focus:ring-2 focus:ring-[var(--primary)]/20 outline-none disabled:bg-transparent disabled:px-0 disabled:border-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                       <label className="block text-[10px] font-black text-[var(--muted)] uppercase">Hrs Meta Mês</label>
                                       {(() => {
                                          const currentMonth = new Date().toISOString().slice(0, 7);
                                          const workingDays = CapacityUtils.getWorkingDaysInMonth(currentMonth);
                                          const calculatedMonthly = (formData.dailyAvailableHours || 0) * workingDays;
                                          return (
                                             <div className="w-full px-4 py-3 bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl text-sm text-[var(--text)] font-black">
                                                {calculatedMonthly}
                                             </div>
                                          );
                                       })()}
                                       <p className="text-[8px] font-bold uppercase opacity-40 mt-1">Base: {CapacityUtils.getWorkingDaysInMonth(new Date().toISOString().slice(0, 7))} dias úteis</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="border-t border-[var(--border)] pt-8 space-y-6">
                                 <h4 className="text-[11px] font-black uppercase text-[var(--text)] tracking-widest flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[var(--primary)]" /> Gestão de Status e Acesso
                                 </h4>

                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* TOGGLE: PARTICIPAR DO FLUXO */}
                                    <div className={`p-4 rounded-2xl border transition-all ${formData.torre !== 'N/A' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-500/5 border-slate-500/20'}`}>
                                       <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.torre !== 'N/A' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                                <Zap className="w-4 h-4" />
                                             </div>
                                             <div>
                                                <p className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest">Operacional</p>
                                                <p className="text-xs font-black text-[var(--text)]">Participação no Fluxo</p>
                                             </div>
                                          </div>
                                          {isEditing && (
                                             <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, torre: prev.torre === 'N/A' ? '' : 'N/A' }))}
                                                className={`w-12 h-6 rounded-full relative transition-all ${formData.torre !== 'N/A' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                             >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${formData.torre !== 'N/A' ? 'left-7' : 'left-1'}`} />
                                             </button>
                                          )}
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${formData.torre !== 'N/A' ? 'bg-emerald-500 text-white' : 'bg-slate-500 text-white'}`}>
                                             {formData.torre !== 'N/A' ? 'Ativo no Board' : 'Oculto no Board'}
                                          </span>
                                       </div>
                                    </div>

                                    {/* TOGGLE: STATUS DA CONTA (DESLIGAR) */}
                                    <div className={`p-4 rounded-2xl border transition-all ${formData.active ? 'bg-blue-500/5 border-blue-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                                       <div className="flex items-center justify-between mb-4">
                                          <div className="flex items-center gap-3">
                                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.active ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                                                <Shield className="w-4 h-4" />
                                             </div>
                                             <div>
                                                <p className="text-[10px] font-black uppercase text-[var(--muted)] tracking-widest">Controle de Acesso</p>
                                                <p className="text-xs font-black text-[var(--text)]">Desligar Colaborador</p>
                                             </div>
                                          </div>
                                          {isEditing && (
                                             <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, active: !prev.active }))}
                                                className={`w-12 h-6 rounded-full relative transition-all ${formData.active ? 'bg-blue-500' : 'bg-red-500'}`}
                                             >
                                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${formData.active ? 'left-7' : 'left-1'}`} />
                                             </button>
                                          )}
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${formData.active ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'}`}>
                                             {formData.active ? 'Conta Habilitada' : 'CONTA DESLIGADA'}
                                          </span>
                                       </div>
                                    </div>
                                 </div>

                                 {isEditing && (
                                    <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between gap-6">
                                       <div className="flex flex-col">
                                          <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Ações Irreversíveis</p>
                                          <p className="text-[11px] text-[var(--muted)] font-medium">Cuidado ao remover registros permanentes.</p>
                                       </div>
                                       <div className="flex items-center gap-3">
                                          <button type="button" onClick={() => setDeleteModalOpen(true)} className="px-6 py-3 text-red-500 hover:bg-red-500/5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-red-500/20 hover:border-red-500">Excluir Colaborador</button>
                                          <button type="submit" className="px-8 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20 transition-all flex items-center gap-2">
                                             <Save className="w-4 h-4" /> Salvar Alterações
                                          </button>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </fieldset>
                        </form>
                     </div>
                  </div>
               )}

               {activeTab === 'projects' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {userProjects.map(p => {
                        const userProjectTasks = tasks.filter(t => t.projectId === p.id && (t.developerId === user.id || t.collaboratorIds?.includes(user.id)));
                        const userEstimated = userProjectTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
                        const userReported = timesheetEntries
                           .filter(e => e.projectId === p.id && e.userId === user.id)
                           .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
                        const remaining = Math.max(0, userEstimated - userReported);

                        return (
                           <div onClick={() => navigate(`/admin/projects/${p.id}`)} key={p.id} className="cursor-pointer ui-card p-6 group space-y-4">
                              <div className="flex items-center justify-between">
                                 <span className="text-[9px] px-2 py-1 rounded-md bg-[var(--surface-2)] uppercase font-black text-[var(--muted)]">{p.status}</span>
                                 <ChevronRight className="w-4 h-4 text-[var(--muted)] opacity-30 group-hover:translate-x-1 group-hover:text-[var(--primary)] transition-all" />
                              </div>

                              <h4 className="font-black text-[var(--text)] text-sm group-hover:text-[var(--primary)] transition-colors line-clamp-2">{p.name}</h4>

                              <div className="pt-4 border-t border-[var(--border)] space-y-3">
                                 <div className="flex justify-between items-end">
                                    <p className="text-[10px] uppercase font-black text-[var(--muted)]">Minha Alocação</p>
                                    <p className="text-xs font-black text-[var(--text)]">{formatDecimalToTime(userReported)} <span className="text-[var(--muted)] font-bold text-[10px]">/ {userEstimated}h</span></p>
                                 </div>
                                 <div className="w-full h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                                    <div
                                       className={`h-full transition-all ${userReported > userEstimated ? 'bg-red-500' : 'bg-emerald-500'}`}
                                       style={{ width: `${Math.min(100, userEstimated > 0 ? (userReported / userEstimated) * 100 : 0)}%` }}
                                    />
                                 </div>
                                 <div className="flex justify-between text-[9px] font-bold">
                                    <span style={{ color: userReported > userEstimated ? 'var(--danger)' : 'var(--success)' }}>
                                       {Math.round(userEstimated > 0 ? (userReported / userEstimated) * 100 : 0)}% Consumido
                                    </span>
                                    <span style={{ color: 'var(--muted)' }}>
                                       Restam {formatDecimalToTime(remaining)}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        );
                     })}
                     {userProjects.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
                           <p className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Nenhum projeto vinculado a este usuário.</p>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'tasks' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                     {userTasks.map(t => (
                        <div onClick={() => navigate(`/tasks/${t.id}`)} key={t.id} className="cursor-pointer ui-card p-5 flex justify-between items-center group">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] flex items-center justify-center text-[var(--muted)] group-hover:text-[var(--primary)] group-hover:bg-[var(--primary-soft)] transition-all">
                                 <LayoutGrid className="w-5 h-5" />
                              </div>
                              <div>
                                 <p className="font-black text-[var(--text)] text-sm group-hover:text-[var(--primary)] transition-all">{t.title}</p>
                                 <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-[9px] text-[var(--primary)] font-black uppercase tracking-widest">{t.status}</span>
                                    <span className="text-[var(--border)]">•</span>
                                    <span className="text-[9px] text-[var(--muted)] font-bold">{t.estimatedDelivery || 'Sem prazo'}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <div className="text-xs font-black text-[var(--primary)]">{t.progress}%</div>
                              <div className="w-20 h-1.5 bg-[var(--surface-2)] rounded-full mt-1.5 overflow-hidden">
                                 <div className="h-full bg-[var(--primary)]" style={{ width: `${t.progress}%` }}></div>
                              </div>
                           </div>
                        </div>
                     ))}
                     {userTasks.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-[var(--border)] rounded-2xl">
                           <p className="text-xs font-black text-[var(--muted)] uppercase tracking-widest">Nenhuma tarefa atribuída.</p>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'delayed' && (
                  <div className="space-y-4 max-w-4xl mx-auto">
                     {delayedTasks.map(t => (
                        <div onClick={() => navigate(`/tasks/${t.id}`)} key={t.id} className="cursor-pointer bg-red-500/5 border border-red-500/20 p-6 rounded-2xl hover:bg-red-500/10 transition-all flex justify-between items-center group">
                           <div>
                              <p className="font-black text-red-900 dark:text-red-400 text-sm">{t.title}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Atraso Crítico: {getDelayDays(t)} dias</p>
                              </div>
                           </div>
                           <ChevronRight className="w-5 h-5 text-red-200" />
                        </div>
                     ))}
                     {delayedTasks.length === 0 && (
                        <div className="text-center py-20 bg-emerald-500/5 rounded-2xl border-2 border-dashed border-emerald-500/20">
                           <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                              <CheckCircle className="w-8 h-8 text-emerald-500" />
                           </div>
                           <p className="text-emerald-700 font-black text-sm uppercase tracking-widest">Monitoramento Impecável</p>
                           <p className="text-xs text-emerald-600 font-bold mt-1 opacity-70 italic">Sem nenhum atraso registrado.</p>
                        </div>
                     )}
                  </div>
               )}

               {activeTab === 'ponto' && (
                  <div className="ui-card p-6">
                     <TimesheetCalendar userId={user.id} embedded={true} />
                  </div>
               )}

               {activeTab === 'absences' && (
                  <div className="ui-card p-6">
                     <AbsenceManager targetUserId={user.id} targetUserName={user.name} />
                  </div>
               )}
            </div>
         </div>

         <ConfirmationModal
            isOpen={deleteModalOpen}
            title="Excluir Colaborador"
            message={`Tem certeza que deseja remover permanentemente "${user.name}"? Esta ação não pode ser desfeita.`}
            onConfirm={handleDeleteUser}
            onCancel={() => setDeleteModalOpen(false)}
         />
      </div>
   );
};

export default TeamMemberDetail;
