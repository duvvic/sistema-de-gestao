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

type ViewTab = 'tasks' | 'technical' | 'edit';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const {
    tasks, clients, projects, users, projectMembers, timesheetEntries,
    deleteProject, deleteTask, updateProject, getProjectMembers,
    addProjectMember, removeProjectMember
  } = useDataController();

  const { currentUser, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<ViewTab>('tasks');
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  // --- FORM STATE (Para aba de edição) ---
  const [formData, setFormData] = useState({
    name: '',
    clientId: '',
    partnerId: '',
    status: 'Planejamento',
    description: '',
    managerClient: '',
    responsibleNicLabsId: '',
    startDate: '',
    estimatedDelivery: '',
    startDateReal: '',
    endDateReal: '',
    risks: '',
    successFactor: '',
    criticalDate: '',
    docLink: '',
    gaps_issues: '',
    important_considerations: '',
    weekly_status_report: '',
    valor_total_rs: 0
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        clientId: project.clientId || '',
        partnerId: project.partnerId || '',
        status: project.status || 'Planejamento',
        description: project.description || '',
        managerClient: project.managerClient || '',
        responsibleNicLabsId: project.responsibleNicLabsId || '',
        startDate: project.startDate || '',
        estimatedDelivery: project.estimatedDelivery || '',
        startDateReal: project.startDateReal || '',
        endDateReal: project.endDateReal || '',
        risks: project.risks || '',
        successFactor: project.successFactor || '',
        criticalDate: project.criticalDate || '',
        docLink: project.docLink || '',
        gaps_issues: (project as any).gapsIssues || (project as any).gaps_issues || '',
        important_considerations: (project as any).importantConsiderations || (project as any).important_considerations || '',
        weekly_status_report: (project as any).weeklyStatusReport || (project as any).weekly_status_report || '',
        valor_total_rs: (project as any).valor_total_rs || 0
      });
      const members = getProjectMembers(project.id);
      setSelectedUsers(members);
    }
  }, [project, projectId]);

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !projectId) return;

    setLoading(true);
    try {
      // 1. Atualizar dados básicos
      await updateProject(projectId, {
        ...formData,
        active: true
      } as any);

      // 2. Sincronizar Membros
      const initialMembers = getProjectMembers(projectId);
      const currentMembersSet = new Set(initialMembers);
      const newMembersSet = new Set(selectedUsers);

      const toAdd = selectedUsers.filter(uid => !currentMembersSet.has(uid));
      for (const userId of toAdd) await addProjectMember(projectId, userId);

      const toRemove = initialMembers.filter(uid => !newMembersSet.has(uid));
      for (const userId of toRemove) await removeProjectMember(projectId, userId);

      alert('Projeto atualizado com sucesso!');
      setActiveTab('tasks'); // Volta para tarefas após salvar
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar projeto: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE TAREFAS ---
  const projectTasks = useMemo(() => {
    const pTasks = tasks.filter(t => t.projectId === projectId);
    if (currentUser && !isAdmin) {
      return pTasks.filter(t =>
        t.developerId === currentUser.id ||
        (t.collaboratorIds && t.collaboratorIds.includes(currentUser.id))
      );
    }
    return pTasks;
  }, [tasks, projectId, currentUser, isAdmin]);

  const filteredTasks = useMemo(() => {
    let t = projectTasks;
    if (selectedStatus !== 'Todos') {
      t = t.filter(task => task.status === selectedStatus);
    }
    return t.sort((a, b) => {
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      return new Date(a.estimatedDelivery || '2099-12-31').getTime() - new Date(b.estimatedDelivery || '2099-12-31').getTime();
    });
  }, [projectTasks, selectedStatus]);

  // --- KPI CALCULATIONS ---
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

    return { committedCost, weightedProgress, totalEstimated };
  }, [project, projectTasks, timesheetEntries, users, projectId]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-400 mb-2">Projeto não encontrado</h2>
          <button onClick={() => navigate(-1)} className="text-purple-500 hover:underline">Voltar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--bgApp)' }}>

      {/* HEADER UNIFICADO (Estilo Premium) */}
      <div className="px-8 py-6 border-b flex items-center justify-between gap-4 bg-gradient-to-r from-[#1e1b4b] to-[#4c1d95] sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {client && <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-lg"><img src={client.logoUrl} className="w-full h-full object-contain" alt="" /></div>}
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{project.name}</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/10 uppercase tracking-widest leading-none flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${project.status === 'Concluído' ? 'bg-emerald-400' : project.status === 'Em Pausa' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                  {project.status || 'Ativo'}
                </span>
                <div className="flex -space-x-1.5 overflow-hidden ml-2">
                  {projectMembers
                    .filter(pm => pm.projectId === projectId)
                    .map(pm => {
                      const member = users.find(u => u.id === pm.userId);
                      if (!member) return null;
                      return (
                        <div key={member.id} className="w-5 h-5 rounded-full border border-purple-900 bg-white/20 flex items-center justify-center overflow-hidden" title={member.name}>
                          {member.avatarUrl ? <img src={member.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-[7px] font-bold text-white">{member.name.substring(0, 2).toUpperCase()}</span>}
                        </div>
                      );
                    })}
                </div>
                {client && <span className="text-xs text-white/60 font-medium tracking-tight">• {client.name}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Execução Física</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{Math.round(performance?.weightedProgress || 0)}%</span>
            </div>
          </div>
          <button
            onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-emerald-900/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={18} /> Nova Tarefa
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* 1. SELETOR DE ABAS (ESTILO CARD) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div onClick={() => setActiveTab('tasks')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'tasks' ? 'ring-2 ring-purple-600 bg-purple-50 border-purple-200' : 'bg-white border-slate-200 hover:border-purple-300'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operacional</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black ${activeTab === 'tasks' ? 'text-purple-800' : 'text-slate-800'}`}>{projectTasks.length}</span>
                <span className="text-xs font-bold text-slate-400 uppercase">Tarefas</span>
              </div>
            </div>

            <div onClick={() => setActiveTab('technical')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'technical' ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:border-blue-300'} shadow-sm`}>
              <div className="flex items-center gap-2 mb-2">
                <Target className={`w-4 h-4 ${activeTab === 'technical' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estratégico</span>
              </div>
              <span className={`text-lg font-bold ${activeTab === 'technical' ? 'text-blue-700' : 'text-slate-700'}`}>Monitoramento & Report</span>
            </div>

            {isAdmin && (
              <div onClick={() => setActiveTab('edit')} className={`cursor-pointer p-5 rounded-2xl border transition-all ${activeTab === 'edit' ? 'ring-2 ring-slate-600 bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300'} shadow-sm`}>
                <div className="flex items-center gap-2 mb-2">
                  <Settings className={`w-4 h-4 ${activeTab === 'edit' ? 'text-slate-600' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Configuração</span>
                </div>
                <span className={`text-lg font-bold ${activeTab === 'edit' ? 'text-slate-700' : 'text-slate-700'}`}>Editar Projeto</span>
              </div>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* --- ABA 1: TAREFAS (GRID) --- */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(!showStatusMenu)}
                      className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-3 text-sm font-bold text-slate-700 min-w-[220px] justify-between shadow-sm hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <Filter size={14} className="text-slate-400" />
                        <span>{selectedStatus === 'Todos' ? 'Todos os Status' : selectedStatus}</span>
                      </div>
                      <ChevronDown size={14} className={`text-slate-400 transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showStatusMenu && (
                      <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-[30] animate-in zoom-in-95 duration-200">
                        {['Todos', 'Todo', 'In Progress', 'Review', 'Done'].map(st => (
                          <button key={st} onClick={() => { setSelectedStatus(st); setShowStatusMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-purple-600 transition-all">{st === 'Todos' ? 'Todos os Status' : st}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-black uppercase text-slate-400 tracking-widest">{filteredTasks.length} tarefas filtradas</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredTasks.map(task => (
                    <ProjectTaskCard key={task.id} task={task} users={users} timesheetEntries={timesheetEntries} onClick={() => navigate(`/tasks/${task.id}`)} />
                  ))}
                  {filteredTasks.length === 0 && (
                    <div className="col-span-full py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 text-center">
                      <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-4 opacity-50" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Nenhuma tarefa encontrada no filtro</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ABA 2: ESTRATÉGICO (DETALHES TÉCNICOS) --- */}
            {activeTab === 'technical' && (
              <div className="space-y-8">
                {/* KPI ROW INTERNA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Eficiência Orçamentária</h4>
                    <p className="text-2xl font-black text-slate-800">{performance?.committedCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Custos Diretos (Horas Realizadas)</span>
                  </div>
                  <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Investimento Total (RS)</h4>
                    <p className="text-2xl font-black text-emerald-600">{(project.valor_total_rs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Valor em Contrato</span>
                  </div>
                  <div className="p-6 bg-white rounded-[32px] border border-slate-200 shadow-sm">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Timeline Prevista</h4>
                    <p className="text-lg font-bold text-slate-800">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '?'} → {project.estimatedDelivery ? new Date(project.estimatedDelivery).toLocaleDateString() : '?'}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase mt-1 block">Período de Execução</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* SCOPE & RELEVANT DATA */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-6 flex items-center gap-2"><Info size={16} /> Escopo e Detalhes Executivos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pb-8 border-b border-slate-50">
                        <div>
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">Liderança do Projeto</label>
                          <div className="space-y-4">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Ponto Focal Nic-Labs</p>
                              <p className="text-sm font-bold text-slate-700">{users.find(u => u.id === project.responsibleNicLabsId)?.name || 'Não definido'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stakeholder Cliente</p>
                              <p className="text-sm font-bold text-slate-700">{project.managerClient || 'Não informado'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                          <label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Cronograma Real</label>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Início Real:</span>
                              <span className="font-black text-slate-700">{project.startDateReal ? new Date(project.startDateReal).toLocaleDateString() : 'Não registrado'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-500">Conclusão:</span>
                              <span className="font-black text-emerald-600">{project.endDateReal ? new Date(project.endDateReal).toLocaleDateString() : 'Em Aberto'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-slate-400 block mb-3">Descrição Detalhada do Escopo</label>
                        <div className="bg-slate-50 p-5 rounded-2xl text-sm text-slate-600 leading-relaxed border border-slate-100 italic">
                          {project.description || 'Sem descrição cadastrada.'}
                        </div>
                      </div>
                    </div>

                    {/* WEEKLY REPORT BOX */}
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest mb-6 flex items-center gap-2"><RefreshCw size={16} /> Último Status Report</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div>
                          <h5 className="flex items-center gap-2 text-[10px] font-black text-red-500 uppercase bg-red-50 px-2 py-1 rounded-md w-fit mb-3"><AlertTriangle size={12} /> Gaps & Impedimentos</h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{project.gapsIssues || 'Nenhum impedimento relatado.'}</p>
                        </div>
                        <div>
                          <h5 className="flex items-center gap-2 text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit mb-3"><Zap size={12} /> Considerações</h5>
                          <p className="text-sm text-slate-600 leading-relaxed">{project.importantConsiderations || 'Sem considerações adicionais.'}</p>
                        </div>
                      </div>
                      <div className="bg-[#f8fafc] p-6 rounded-2xl border-2 border-dashed border-blue-100">
                        <label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-3 block">Mensagem Estratégica Semanal</label>
                        <p className="text-sm font-medium text-slate-700 italic">"{project.weeklyStatusReport || 'Aguardando preenchimento do relatório semanal.'}"</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* RISKS */}
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldAlert size={40} className="text-red-500" /></div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Shield size={16} className="text-red-500" /> Riscos de Projeto</h3>
                      <p className="text-sm text-slate-600 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-50">{project.risks || 'Nenhum risco crítico identificado.'}</p>
                    </div>

                    {/* SUCCESS FACTORS */}
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Target size={16} className="text-emerald-500" /> Sucesso & Entrega</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Principal Fator</p>
                          <p className="text-sm font-bold text-slate-700">{project.successFactor || 'Critérios padrão'}</p>
                        </div>
                        {project.criticalDate && (
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                            <p className="text-[9px] font-black text-amber-600 uppercase">Data Limite Crítica</p>
                            <p className="text-sm font-black text-amber-700">{new Date(project.criticalDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* LINKS & DOCS */}
                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><LinkIcon size={16} className="text-blue-500" /> Links Externos</h3>
                      {project.docLink ? (
                        <a href={project.docLink} target="_blank" className="flex items-center gap-3 p-3 bg-blue-50 text-blue-700 rounded-2xl hover:bg-blue-100 transition-all font-bold text-xs uppercase shadow-sm">
                          <FileText size={14} /> Acessar Documentação
                        </a>
                      ) : <p className="text-xs text-slate-400 italic">Sem documentação vinculada.</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* --- ABA 3: EDIÇÃO (INTEGRADA DO PROJECTFORM) --- */}
            {activeTab === 'edit' && isAdmin && (
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 p-10 max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
                  <div className="p-3 bg-slate-100 rounded-2xl text-slate-600"><Settings size={28} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800">Parâmetros do Projeto</h3>
                    <p className="text-sm text-slate-400">Modifique configurações, prazos e equipe alocada</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProject} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* Seção 1: Identidade */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-purple-600 tracking-[0.2em]">Identificação e Cliente</h4>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Nome do Projeto</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none transition-all font-bold text-slate-800" required />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Status Operacional</label>
                        <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none transition-all font-bold text-slate-800">
                          <option value="Planejamento">Planejamento</option>
                          <option value="Em Andamento">Em Andamento</option>
                          <option value="Em Pausa">Em Pausa</option>
                          <option value="Concluído">Concluído</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Investimento Total (Total RS)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">R$</div>
                          <input type="number" step="0.01" value={formData.valor_total_rs || ''} onChange={e => setFormData({ ...formData, valor_total_rs: Number(e.target.value) })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-bold text-slate-800" />
                        </div>
                      </div>
                    </div>

                    {/* Seção 2: Timeline */}
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Prazos e Datas</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Início Previsto</label>
                          <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Entrega Prevista</label>
                          <input type="date" value={formData.estimatedDelivery} onChange={e => setFormData({ ...formData, estimatedDelivery: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Início Real</label>
                          <input type="date" value={formData.startDateReal} onChange={e => setFormData({ ...formData, startDateReal: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Fim Real</label>
                          <input type="date" value={formData.endDateReal} onChange={e => setFormData({ ...formData, endDateReal: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-xl font-bold text-slate-700 outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-2">Responsável Interno (Nic)</label>
                        <select value={formData.responsibleNicLabsId} onChange={e => setFormData({ ...formData, responsibleNicLabsId: e.target.value })} className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-purple-500 rounded-2xl outline-none font-bold text-slate-800">
                          <option value="">Não definido</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Seção 3: Equipe Multi-seleção */}
                    <div className="md:col-span-2">
                      <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-4">Membros Alocados no Projeto</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-48 overflow-y-auto p-4 bg-slate-50 rounded-[24px] border border-slate-100">
                        {users.filter(u => u.active !== false).map(user => (
                          <label key={user.id} className="flex items-center gap-2 p-2 rounded-xl hover:bg-white cursor-pointer transition-colors group">
                            <input type="checkbox" checked={selectedUsers.includes(user.id)} onChange={e => {
                              if (e.target.checked) setSelectedUsers([...selectedUsers, user.id]);
                              else setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }} className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500" />
                            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 truncate">{user.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Seção 4: Relatórios */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Gaps / Impedimentos</label>
                        <textarea value={formData.gaps_issues} onChange={e => setFormData({ ...formData, gaps_issues: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl h-24 font-medium text-slate-700"></textarea>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Considerações</label>
                        <textarea value={formData.important_considerations} onChange={e => setFormData({ ...formData, important_considerations: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl h-24 font-medium text-slate-700"></textarea>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Report Semanal Oficial</label>
                        <textarea value={formData.weekly_status_report} onChange={e => setFormData({ ...formData, weekly_status_report: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent rounded-xl h-24 font-medium text-slate-700"></textarea>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-10 border-t border-slate-100">
                    <button type="button" onClick={() => setItemToDelete({ id: projectId, type: 'project' })} className="px-6 py-4 text-red-500 hover:bg-red-50 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">Excluir Projeto</button>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setActiveTab('tasks')} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                      <button type="submit" disabled={loading} className="px-10 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black shadow-2xl shadow-purple-200 transition-all flex items-center gap-3">
                        <Save size={20} /> {loading ? 'Sincronizando...' : 'Sincronizar Projeto'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={`Excluir ${itemToDelete?.type === 'project' ? 'Projeto' : 'Tarefa'}`}
        message={`Esta ação é irreversível. Todas as tarefas e históricos vinculados serão removidos. Continuar?`}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            if (itemToDelete.type === 'project') {
              await deleteProject(itemToDelete.id);
              navigate(isAdmin ? '/admin/projects' : '/developer/projects');
            } else {
              await deleteTask(itemToDelete.id);
            }
            setItemToDelete(null);
          } catch (err) {
            console.error(err);
            alert('Erro ao excluir item.');
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
};

// --- SUB-COMPONENTE: CARD DE TAREFA ---
const ProjectTaskCard: React.FC<{ task: any, users: any[], timesheetEntries: any[], onClick: () => void }> = ({ task, users, timesheetEntries, onClick }) => {
  const dev = users.find(u => u.id === task.developerId);
  const actualHours = timesheetEntries.filter(e => e.taskId === task.id).reduce((sum, e) => sum + e.totalHours, 0);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={`cursor-pointer bg-white p-6 rounded-[32px] border transition-all group ${task.status === 'Done' ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-200 hover:border-purple-300 hover:shadow-xl'}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${task.status === 'Done' ? 'bg-emerald-100 text-emerald-700' :
          task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
            task.status === 'Review' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
          }`}>{task.status}</span>
        {task.priority && <span className={`text-[10px] font-bold ${task.priority === 'Critical' ? 'text-red-500' : 'text-slate-400'}`}>{task.priority}</span>}
      </div>
      <h3 className="font-bold text-slate-800 text-lg leading-tight mb-6 group-hover:text-purple-600 transition-colors line-clamp-2 min-h-[50px]">{task.title}</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-1.5">
            <span>Progresso</span>
            <span className="text-purple-600">{task.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${task.status === 'Done' ? 'bg-emerald-500' : 'bg-purple-600'}`} style={{ width: `${task.progress}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shadow-sm">
              {dev?.avatarUrl ? <img src={dev.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-slate-500 uppercase">{task.developer?.substring(0, 2)}</div>}
            </div>
            <span className="text-[11px] font-bold text-slate-500 truncate max-w-[80px]">{task.developer || 'Sem resp.'}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-700">{actualHours}h <span className="text-slate-300 font-normal">/ {task.estimatedHours || 0}h</span></span>
            <span className="text-[9px] font-bold text-slate-400 mt-0.5">{task.estimatedDelivery ? new Date(task.estimatedDelivery).toLocaleDateString() : '--/--'}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProjectDetailView;
