// ProjectDetailView.tsx - Dashboard Unificado do Projeto
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import {
  ArrowLeft, Plus, Edit, CheckSquare, Clock, Filter, ChevronDown, Check,
  Trash2, LayoutGrid, Target, ShieldAlert, Link as LinkIcon, Users,
  Calendar, Info, Zap, RefreshCw, AlertTriangle, StickyNote, DollarSign,
  TrendingUp, BarChart2, Save, FileText, Settings, Shield
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    tasks, clients, projects, users, projectMembers, timesheetEntries,
    deleteProject, deleteTask, updateProject, getProjectMembers,
    addProjectMember, removeProjectMember
  } = useDataController();

  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'tasks' | 'technical'>('technical');
  const [isEditing, setIsEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  // --- FORM STATE ---
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    partnerId: '',
    status: 'Não Iniciado',
    description: '',
    managerClient: '',
    responsibleNicLabsId: '',
    startDate: '',
    estimatedDelivery: '',
    startDateReal: '',
    endDateReal: '',
    criticalDate: '',
    docLink: '',
    gapsIssues: '',
    importantConsiderations: '',
    weeklyStatusReport: '',
    valor_total_rs: 0,
    horas_vendidas: 0,
    complexidade: 'Média' as 'Alta' | 'Média' | 'Baixa',
    torre: ''
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        clientId: project.clientId || '',
        partnerId: project.partnerId || '',
        status: project.status || 'Não Iniciado',
        description: project.description || '',
        managerClient: project.managerClient || '',
        responsibleNicLabsId: project.responsibleNicLabsId || '',
        startDate: project.startDate || '',
        estimatedDelivery: project.estimatedDelivery || '',
        startDateReal: project.startDateReal || '',
        endDateReal: project.endDateReal || '',
        criticalDate: project.criticalDate || '',
        docLink: project.docLink || '',
        gapsIssues: project.gapsIssues || '',
        importantConsiderations: project.importantConsiderations || '',
        weeklyStatusReport: project.weeklyStatusReport || '',
        valor_total_rs: project.valor_total_rs || 0,
        horas_vendidas: project.horas_vendidas || 0,
        complexidade: project.complexidade || 'Média',
        torre: project.torre || ''
      });
      const members = getProjectMembers(project.id);
      setSelectedUsers(members);
    }
  }, [project, projectId]);

  const handleSaveProject = async () => {
    if (!project || !projectId) return;
    setLoading(true);
    try {
      await updateProject(projectId, { ...formData, active: true } as any);
      const initialMembers = getProjectMembers(projectId);
      const currentMembersSet = new Set(initialMembers);
      const newMembersSet = new Set(selectedUsers);
      const toAdd = selectedUsers.filter(uid => !currentMembersSet.has(uid));
      for (const userId of toAdd) await addProjectMember(projectId, userId);
      const toRemove = initialMembers.filter(uid => !newMembersSet.has(uid));
      for (const userId of toRemove) await removeProjectMember(projectId, userId);
      setIsEditing(false);
      alert('Projeto atualizado!');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const projectTasks = useMemo(() => {
    const pTasks = tasks.filter(t => t.projectId === projectId);
    if (currentUser && !isAdmin) {
      return pTasks.filter(t => t.developerId === currentUser.id || (t.collaboratorIds && t.collaboratorIds.includes(currentUser.id)));
    }
    return pTasks;
  }, [tasks, projectId, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    let t = projectTasks;
    if (selectedStatus !== 'Todos') t = t.filter(task => task.status === selectedStatus);
    return t.sort((a, b) => (new Date(a.estimatedDelivery || '2099-12-31').getTime() - new Date(b.estimatedDelivery || '2099-12-31').getTime()));
  }, [projectTasks, selectedStatus]);

  const performance = useMemo(() => {
    if (!project) return null;
    const pTimesheets = timesheetEntries.filter(e => e.projectId === projectId);
    const committedCost = pTimesheets.reduce((acc, entry) => {
      const u = users.find(u => u.id === entry.userId);
      return acc + (entry.totalHours * (u?.hourlyCost || 0));
    }, 0);
    const totalEstimated = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
    const weightedProgress = totalEstimated > 0
      ? projectTasks.reduce((acc, t) => acc + ((t.progress || 0) * (t.estimatedHours || 0)), 0) / totalEstimated
      : (projectTasks.reduce((acc, t) => acc + (t.progress || 0), 0) / (projectTasks.length || 1));

    let plannedProgress = 0;
    if (project.startDate && project.estimatedDelivery) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.estimatedDelivery).getTime();
      const now = Date.now();
      if (now > end) plannedProgress = 100;
      else if (now < start) plannedProgress = 0;
      else plannedProgress = ((now - start) / (end - start)) * 100;
    }
    return { committedCost, weightedProgress, totalEstimated, plannedProgress };
  }, [project, projectTasks, timesheetEntries, users, projectId]);

  if (!project) return <div className="p-20 text-center font-bold" style={{ color: 'var(--muted)' }}>Projeto não encontrado</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* HEADER */}
      <div className="px-8 py-6 bg-gradient-to-r from-[#1e1b4b] to-[#4c1d95] shadow-lg flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft /></button>
          <div className="flex items-center gap-4">
            {client?.logoUrl && <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-xl"><img src={client.logoUrl} className="w-full h-full object-contain" /></div>}
            <div>
              {isEditing ? (
                <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white/10 border-b border-white outline-none px-2 py-1 text-xl font-bold rounded" />
              ) : (
                <h1 className="text-xl font-bold">{project.name}</h1>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full tracking-tighter">{project.status}</span>
                <span className="text-xs text-white/60">{client?.name}</span>
                {isAdmin && (
                  <button onClick={() => setIsEditing(!isEditing)} className="ml-2 p-1 hover:bg-white/20 rounded transition-colors" title="Editar Projeto">
                    <Edit size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {/* TABS SELECTOR IN HEADER */}
          <div className="hidden md:flex bg-black/20 p-1 rounded-2xl gap-1">
            <button
              onClick={() => setActiveTab('technical')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'technical' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${activeTab === 'tasks' ? 'bg-white text-purple-900 shadow-sm' : 'text-white/60 hover:text-white'}`}
            >
              Tarefas
            </button>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-white/40">Progresso Real</p>
            <p className="text-2xl font-black">{Math.round(performance?.weightedProgress || 0)}%</p>
          </div>
          <button
            onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project.clientId}`)}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl font-bold flex items-center gap-2 transition-all backdrop-blur-md"
          >
            <Plus size={18} /> Nova Tarefa
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-8">

          <AnimatePresence mode="wait">
            {activeTab === 'technical' ? (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* KPI ROW */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                  {/* Saúde do Projeto - Prazo */}
                  <div className="p-8 rounded-[32px] border shadow-sm relative overflow-hidden transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Status de Entrega</h4>
                    {(() => {
                      const delta = (performance?.weightedProgress || 0) - (performance?.plannedProgress || 0);
                      const health = delta >= 0 ? { label: 'No Prazo', color: 'text-emerald-500', bg: 'bg-emerald-500' } :
                        delta >= -10 ? { label: 'Atraso Leve', color: 'text-amber-500', bg: 'bg-amber-500' } :
                          { label: 'Em Atraso', color: 'text-red-500', bg: 'bg-red-500' };
                      return (
                        <div className="flex flex-col items-center justify-center py-1">
                          <div className={`w-3 h-3 rounded-full ${health.bg} animate-pulse shadow-[0_0_12px_rgba(0,0,0,0.1)] mb-2`} />
                          <span className={`text-xl font-black uppercase tracking-tighter ${health.color}`}>{health.label}</span>
                          <span className="text-[9px] font-black mt-1 uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Desvio: {delta > 0 ? '+' : ''}{Math.round(delta)}%</span>
                        </div>
                      )
                    })()}
                  </div>

                  {/* Progresso vs Plano */}
                  <div className="p-8 rounded-[32px] border shadow-sm transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Progresso vs Plano</h4>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span style={{ color: 'var(--text)' }}>Real</span>
                          <span style={{ color: 'var(--success)' }}>{Math.round(performance?.weightedProgress || 0)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
                          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${performance?.weightedProgress || 0}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                          <span style={{ color: 'var(--text)' }}>Plano</span>
                          <span style={{ color: 'var(--info)' }}>{Math.round(performance?.plannedProgress || 0)}%</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
                          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${performance?.plannedProgress || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finanças (Visible only to Admin) */}
                  {isAdmin && (
                    <div className="p-8 rounded-[32px] border shadow-sm relative transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="absolute top-4 right-6">
                        {isEditing ? (
                          <select
                            value={formData.complexidade}
                            onChange={e => setFormData({ ...formData, complexidade: e.target.value as any })}
                            className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase border-none outline-none"
                            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                          >
                            <option value="Baixa">Baixa</option>
                            <option value="Média">Média</option>
                            <option value="Alta">Alta</option>
                          </select>
                        ) : (
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${project.complexidade === 'Alta' ? 'bg-red-500/10 text-red-500' : project.complexidade === 'Baixa' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                            {project.complexidade || 'Média'}
                          </span>
                        )}
                      </div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Finanças</h4>
                      {isEditing ? (
                        <div className="space-y-3">
                          <input type="number" value={formData.valor_total_rs} onChange={e => setFormData({ ...formData, valor_total_rs: Number(e.target.value) })} className="text-xl font-black w-full rounded p-1 outline-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--success)' }} />
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Horas:</span>
                            <input type="number" value={formData.horas_vendidas} onChange={e => setFormData({ ...formData, horas_vendidas: Number(e.target.value) })} className="w-16 text-xs font-bold outline-none border-b" style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text)' }} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-2xl font-black" style={{ color: 'var(--success)' }}>{(project.valor_total_rs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                          <div className="flex flex-col mt-2 gap-1">
                            <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--muted)' }}>Consumido: {performance?.committedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                            <div className="h-1 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
                              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((performance?.committedCost || 0) / (project.valor_total_rs || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="p-8 rounded-[32px] border shadow-sm relative transition-all hover:shadow-md" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: 'var(--muted)' }}>Timeline</h4>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="text-[10px] p-1 rounded w-full" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }} />
                        <input type="date" value={formData.estimatedDelivery} onChange={e => setFormData({ ...formData, estimatedDelivery: e.target.value })} className="text-[10px] p-1 rounded w-full font-bold" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }} />
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        <span className="text-xl font-black" style={{ color: 'var(--text)' }}>{project.estimatedDelivery ? new Date(project.estimatedDelivery).toLocaleDateString() : '?'}</span>
                        <span className="text-[9px] font-bold uppercase mt-1" style={{ color: 'var(--muted)' }}>Previsão de Entrega</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* MAIN GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="p-8 rounded-[32px] border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2" style={{ color: 'var(--primary)' }}><Info size={16} /> Detalhes Estruturais</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b" style={{ borderColor: 'var(--bg)' }}>
                        <div className="space-y-5">
                          <div>
                            <p className="text-[9px] font-black uppercase mb-1" style={{ color: 'var(--muted)' }}>Cliente & Parceiro</p>
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-[8px] font-bold" style={{ color: 'var(--muted)' }}>FINAL</p>
                                {isEditing ? (
                                  <select value={formData.clientId} onChange={e => setFormData({ ...formData, clientId: e.target.value })} className="p-1 rounded text-[11px] font-bold outline-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                ) : <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{clients.find(c => c.id === project.clientId)?.name || '--'}</p>}
                              </div>
                              <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
                              <div>
                                <p className="text-[8px] font-bold" style={{ color: 'var(--muted)' }}>PARCEIRO</p>
                                {isEditing ? (
                                  <select value={formData.partnerId} onChange={e => setFormData({ ...formData, partnerId: e.target.value })} className="p-1 rounded text-[11px] font-bold outline-none" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
                                    <option value="">Direto</option>
                                    {clients.filter(c => c.tipo_cliente === 'parceiro').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                ) : <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>{clients.find(c => c.id === project.partnerId)?.name || 'Nic-Labs'}</p>}
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase mb-1" style={{ color: 'var(--muted)' }}>Ponto Focal Nic-Labs</p>
                            {isEditing ? <select value={formData.responsibleNicLabsId} onChange={e => setFormData({ ...formData, responsibleNicLabsId: e.target.value })} className="w-full p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select> : <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{users.find(u => u.id === project.responsibleNicLabsId)?.name || '--'}</p>}
                          </div>
                          <div>
                            <p className="text-[9px] font-black uppercase mb-1" style={{ color: 'var(--muted)' }}>Stakeholder Cliente</p>
                            {isEditing ? <input value={formData.managerClient} onChange={e => setFormData({ ...formData, managerClient: e.target.value })} className="w-full p-2 rounded text-xs" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }} /> : <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{project.managerClient || '--'}</p>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="p-6 rounded-2xl border space-y-4" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                            <p className="text-[10px] font-black uppercase" style={{ color: 'var(--muted)' }}>Track record Real</p>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium" style={{ color: 'var(--text-2)' }}>Início Real:</span>
                              {isEditing ? <input type="date" value={formData.startDateReal} onChange={e => setFormData({ ...formData, startDateReal: e.target.value })} className="bg-transparent border-b outline-none text-right font-bold w-24" style={{ borderColor: 'var(--border)' }} /> : <span className="font-bold">{project.startDateReal ? new Date(project.startDateReal).toLocaleDateString() : 'Awaiting...'}</span>}
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-medium" style={{ color: 'var(--text-2)' }}>Fim do Projeto:</span>
                              {isEditing ? <input type="date" value={formData.endDateReal} onChange={e => setFormData({ ...formData, endDateReal: e.target.value })} className="bg-transparent border-b outline-none text-right font-bold w-24" style={{ borderColor: 'var(--border)' }} /> : <span className="font-bold" style={{ color: 'var(--success)' }}>{project.endDateReal ? new Date(project.endDateReal).toLocaleDateString() : 'Ativo'}</span>}
                            </div>
                            <div className="pt-2 border-t mt-2 flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                              <span className="font-black uppercase text-[9px]" style={{ color: 'var(--danger)' }}>Data Crítica:</span>
                              {isEditing ? <input type="date" value={formData.criticalDate} onChange={e => setFormData({ ...formData, criticalDate: e.target.value })} className="border rounded p-1 outline-none text-right font-bold w-24" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--danger-soft)', color: 'var(--danger)' }} /> : <span className="font-black underline text-xs" style={{ color: 'var(--danger)' }}>{project.criticalDate ? new Date(project.criticalDate).toLocaleDateString() : '--'}</span>}
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase mb-3" style={{ color: 'var(--muted)' }}>Visão de Escopo</p>
                        {isEditing ? <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full h-32 p-4 rounded-2xl border outline-none text-sm" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} /> : <p className="text-sm leading-relaxed italic p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-2)' }}>{project.description || 'Sem escopo detalhado.'}</p>}
                      </div>
                      {isEditing && (
                        <div className="mt-8 pt-8 border-t flex justify-end gap-3" style={{ borderColor: 'var(--bg)' }}>
                          <button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-xl font-bold text-sm" style={{ color: 'var(--muted)' }}>Cancelar</button>
                          <button onClick={handleSaveProject} disabled={loading} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20">{loading ? 'Salvando...' : <><Save size={16} /> Salvar Alterações</>}</button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* SAÚDE QUALITATIVA */}
                    <div className="p-6 rounded-[32px] border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text)' }}><StickyNote size={16} className="text-amber-500" /> Saúde & Status</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black uppercase mb-1" style={{ color: 'var(--muted)' }}>Status Report Semanal</p>
                          {isEditing ? (
                            <textarea value={formData.weeklyStatusReport} onChange={e => setFormData({ ...formData, weeklyStatusReport: e.target.value })} className="w-full h-20 p-2 rounded text-xs border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} placeholder="O que aconteceu esta semana?" />
                          ) : <p className="text-xs border-l-2 pl-3 py-1 rounded-r-lg" style={{ borderColor: 'var(--warning)', backgroundColor: 'var(--bg)', color: 'var(--text-2)' }}>{project.weeklyStatusReport || 'Sem reporte recente.'}</p>}
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase mb-1" style={{ color: 'var(--muted)' }}>Gaps & Impedimentos</p>
                          {isEditing ? (
                            <textarea value={formData.gapsIssues} onChange={e => setFormData({ ...formData, gapsIssues: e.target.value })} className="w-full h-20 p-2 rounded text-xs border" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} placeholder="Ex: Acesso bloqueado, falta de doc..." />
                          ) : <p className="text-xs font-medium" style={{ color: 'var(--danger)' }}>{project.gapsIssues || 'Nenhum impedimento listado.'}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-[32px] border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}><Users size={16} className="text-purple-500" /> Equipe Alocada</h3>
                      <div className="space-y-3">
                        {isEditing ? (
                          <div className="border rounded-2xl p-4 max-h-[400px] overflow-y-auto space-y-2 custom-scrollbar shadow-inner" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                            {users.filter(u => u.active !== false).sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                              <label key={user.id} className={`flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-hover)] p-2 rounded-xl transition-all border ${selectedUsers.includes(user.id) ? 'border-purple-500/30 bg-purple-500/5' : 'border-transparent opacity-60'}`}>
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUsers(prev => [...prev, user.id]);
                                    } else {
                                      setSelectedUsers(prev => prev.filter(id => id !== user.id));
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-[var(--border)] text-purple-600 focus:ring-purple-500"
                                />
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold overflow-hidden bg-[var(--surface-2)]" style={{ color: 'var(--text)' }}>
                                    {user.avatarUrl ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{user.name}</p>
                                    <p className="text-[8px] font-bold uppercase opacity-50" style={{ color: 'var(--muted)' }}>{user.cargo || user.role}</p>
                                  </div>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          projectMembers.filter(pm => pm.projectId === projectId).map(pm => {
                            const u = users.find(user => user.id === pm.userId);
                            return u ? (
                              <div key={u.id} className="flex items-center gap-3 p-2 rounded-xl border transition-all" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--bg)' }}>
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderWidth: 1 }}>
                                  {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black" style={{ color: 'var(--primary)' }}>{u.name.substring(0, 2).toUpperCase()}</div>}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>{u.name}</p>
                                  <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--primary)' }}>{u.torre || 'Consultor'}</p>
                                </div>
                              </div>
                            ) : null;
                          })
                        )}
                      </div>
                    </div>

                    <div className="p-6 rounded-[32px] border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}><FileText size={16} /> Documentação</h3>
                      {isEditing ? (
                        <div className="space-y-3">
                          <input value={formData.docLink} onChange={e => setFormData({ ...formData, docLink: e.target.value })} className="w-full text-[11px] p-2 rounded border outline-none" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }} placeholder="Link do Sharepoint/OneDrive" />
                        </div>
                      ) : (
                        project.docLink ? (
                          <a href={project.docLink} target="_blank" className="flex items-center justify-between p-3 rounded-2xl border transition-all" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info-text)', borderColor: 'var(--info)' }}>
                            <span className="text-[10px] font-black uppercase">Doc. Principal</span>
                            <LinkIcon size={14} />
                          </a>
                        ) : <p className="text-[10px] italic font-bold uppercase text-center py-2" style={{ color: 'var(--muted)' }}>Sem documentos.</p>
                      )}
                    </div>

                    {isEditing && (
                      <button onClick={() => setItemToDelete({ id: projectId, type: 'project' })} className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all" style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderColor: 'var(--danger)' }}><Trash2 size={14} className="inline mr-2" /> Deletar Projeto</button>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* FILTERS FOR TASKS TABS */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold uppercase tracking-tight" style={{ color: 'var(--text)' }}>Tarefas</h3>
                    <div className="px-3 py-1 rounded-full text-[10px] font-black" style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                      {filteredTasks.length} TAREFAS
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase" style={{ color: 'var(--muted)' }}>Filtrar por Status:</span>
                    <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                      {[
                        { label: 'Todos', value: 'Todos' },
                        { label: 'Não Iniciado', value: 'Todo' },
                        { label: 'Iniciado', value: 'In Progress' },
                        { label: 'Pendente', value: 'Review' },
                        { label: 'Concluído', value: 'Done' }
                      ].map(item => (
                        <button
                          key={item.value}
                          onClick={() => setSelectedStatus(item.value)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${selectedStatus === item.value ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'hover:bg-black/5'}`}
                          style={{ color: selectedStatus === item.value ? 'white' : 'var(--text-2)' }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map(task => (
                      <ProjectTaskCard
                        key={task.id}
                        task={task}
                        users={users}
                        timesheetEntries={timesheetEntries}
                        isAdmin={isAdmin}
                        onClick={() => navigate(`/tasks/${task.id}`)}
                      />
                    ))
                  ) : (
                    <div className="col-span-full py-24 text-center rounded-[32px] border-2 border-dashed" style={{ borderColor: 'var(--border)' }}>
                      <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--text)' }} />
                      <p className="font-bold uppercase text-xs tracking-widest" style={{ color: 'var(--muted)' }}>Nenhuma tarefa encontrada com os filtros atuais.</p>
                      <button
                        onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project.clientId}`)}
                        className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-xl font-bold text-sm"
                      >
                        Criar Nova Tarefa
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Confirmar Exclusão"
        message="Esta ação é definitiva. Deseja continuar?"
        onConfirm={async () => {
          if (itemToDelete?.type === 'project') {
            try {
              await deleteProject(itemToDelete.id);
              navigate(isAdmin ? '/admin/projects' : '/developer/projects');
            } catch (error: any) {
              alert(error.message || 'Erro ao excluir projeto.');
            }
          }
          setItemToDelete(null);
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div >
  );
};

// SUBCOMPONENT
const ProjectTaskCard: React.FC<{ task: any, users: any[], timesheetEntries: any[], isAdmin: boolean, onClick: () => void }> = ({ task, users, timesheetEntries, isAdmin, onClick }) => {
  const dev = users.find(u => u.id === task.developerId);
  const actualHours = timesheetEntries.filter(e => e.taskId === task.id).reduce((sum, e) => sum + e.totalHours, 0);

  const statusMap: Record<string, { label: string, color: string, bg: string }> = {
    'Todo': { label: 'Não Iniciado', color: 'text-slate-500', bg: 'bg-slate-500/10' },
    'In Progress': { label: 'Iniciado', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    'Review': { label: 'Pendente', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    'Done': { label: 'Concluído', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
  };

  const statusInfo = statusMap[task.status] || { label: task.status, color: 'text-slate-400', bg: 'bg-slate-400/10' };

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.01 }}
      onClick={onClick}
      className="cursor-pointer p-6 rounded-[32px] border transition-all relative overflow-hidden group shadow-sm hover:shadow-xl"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-600 opacity-0 group-hover:opacity-100 transition-all" />

      <div className="flex justify-between items-center mb-6">
        <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
        {task.priority === 'Critical' && (
          <div className="flex items-center gap-1.5 text-[9px] font-black text-red-500 uppercase tracking-tighter animate-pulse">
            <ShieldAlert size={14} /> CRÍTICO
          </div>
        )}
      </div>

      <h3 className="font-bold text-lg leading-tight mb-8 line-clamp-2 min-h-[50px] group-hover:text-purple-600 transition-colors" style={{ color: 'var(--text)' }}>
        {task.title}
      </h3>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between text-[10px] font-black uppercase mb-2" style={{ color: 'var(--muted)' }}>
            <span className="tracking-widest">Evolução</span>
            <span style={{ color: 'var(--primary)' }}>{task.progress}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress}%` }}
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t" style={{ borderColor: 'var(--bg)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden border-2 shadow-sm" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--surface)' }}>
              {dev?.avatarUrl ? <img src={dev.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black uppercase" style={{ color: 'var(--muted)' }}>{task.developer?.substring(0, 2) || '??'}</div>}
            </div>
            <div>
              <p className="text-[11px] font-bold" style={{ color: 'var(--text)' }}>{task.developer || 'Sem resp.'}</p>
              <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Responsável</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end">
              <span className="text-sm font-black tabular-nums" style={{ color: 'var(--text)' }}>{actualHours}h</span>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold opacity-40" style={{ color: 'var(--muted)' }}>
                    / {(() => {
                      if (!task.scheduledStart || !task.estimatedDelivery) return task.estimatedHours || 0;
                      const d1 = new Date(task.scheduledStart);
                      const d2 = new Date(task.estimatedDelivery);
                      const diff = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      return diff > 0 ? diff * 8 : (task.estimatedHours || 0);
                    })()}h
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDetailView;
