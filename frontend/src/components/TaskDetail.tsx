import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import {
  ArrowLeft, Save, Calendar, Clock, Crown, Users, StickyNote, CheckSquare, Plus, Trash2, X, CheckCircle, Activity, Zap, AlertTriangle, Briefcase, Info, Target, LayoutGrid, Shield, User, FileSpreadsheet
} from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';
import BackButton from './shared/BackButton';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, createTask, updateTask, deleteTask } = useDataController();

  const isNew = !taskId || taskId === 'new';
  const task = !isNew ? tasks.find(t => t.id === taskId) : undefined;

  // Query params for defaults
  const preSelectedClientId = searchParams.get('clientId') || searchParams.get('client');
  const preSelectedProjectId = searchParams.get('projectId') || searchParams.get('project');

  const getDefaultDate = () => {
    return ''; // Removida sugestão de data fim conforme solicitado
  };

  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    status: 'Todo',
    progress: 0,
    estimatedDelivery: getDefaultDate(),
    description: '',
    clientId: preSelectedClientId || '',
    projectId: preSelectedProjectId || '',
    developer: '',
    developerId: '',
    notes: '',
    scheduledStart: '',
    actualStart: '',
    actualDelivery: '',
    priority: 'Medium',
    impact: 'Medium',
    risks: '',
    collaboratorIds: [],
    estimatedHours: 0
  });

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ force: boolean } | null>(null);
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Validação Reativa (Imediata)
  const isFieldMissing = (field: string) => {
    if (field === 'team') {
      const hasTeam = (formData.collaboratorIds && formData.collaboratorIds.length > 0) || !!formData.developerId;
      return !hasTeam;
    }
    if (field === 'developerId') {
      // Responsável é obrigatório APENAS se tiver equipe alocada (conforme regra de negócio: não mostra se não tiver equipe)
      // Se tiver equipe, TEM que ter responsável.
      const hasTeam = (formData.collaboratorIds && formData.collaboratorIds.length > 0) || !!formData.developerId;
      return hasTeam && !formData.developerId;
    }
    // Campos padrão
    const value = formData[field as keyof typeof formData];
    if (field === 'estimatedHours') return !value || Number(value) <= 0;
    return !value;
  };

  // Verificar se o cliente é NIC-LABS (projetos internos)
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const isNicLabs = selectedClient?.name?.toUpperCase().includes('NIC-LABS') || false;

  const hasError = (field: string) => {
    // Para NIC-LABS, apenas título e projeto são obrigatórios
    if (isNicLabs) {
      const mandatoryFields = ['projectId', 'title'];
      if (mandatoryFields.includes(field)) return isFieldMissing(field);
      return false; // Outros campos são opcionais para NIC-LABS
    }
    
    // Para outros clientes, validação completa
    const mandatoryFields = ['projectId', 'clientId', 'title', 'scheduledStart', 'estimatedDelivery', 'estimatedHours'];
    if (mandatoryFields.includes(field)) return isFieldMissing(field);
    if (field === 'developerId') return isFieldMissing('developerId');
    if (field === 'team') return isFieldMissing('team');
    return false;
  };

  // Função dummy para manter compatibilidade com chamadas existentes, mas agora o erro é visual direto
  const clearError = (field: string) => { };

  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

  // Init form data
  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        estimatedDelivery: task.estimatedDelivery?.split('T')[0] || getDefaultDate(),
        scheduledStart: task.scheduledStart,
        actualStart: task.actualStart,
        actualDelivery: task.actualDelivery,
        priority: task.priority || 'Medium',
        impact: task.impact || 'Medium',
        risks: task.risks || '',
        estimatedHours: task.estimatedHours || 0,
      });
    } else {
      const qClient = preSelectedClientId as string || '';
      const qProject = preSelectedProjectId as string || '';
      const proj = qProject ? projects.find(p => p.id === qProject) : null;
      const finalClient = qClient || (proj ? proj.clientId : '');

      setFormData(prev => ({
        ...prev,
        clientId: finalClient || prev.clientId,
        projectId: qProject || prev.projectId,
      }));
    }
  }, [task, preSelectedClientId, preSelectedProjectId, projects]);

  // Automação do Status baseada na Data
  useEffect(() => {
    if (formData.status === 'Review' || formData.status === 'Done') return;

    if (formData.scheduledStart) {
      const startParts = formData.scheduledStart.split('-');
      const start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const newStatus: Status = today >= start ? 'In Progress' : 'Todo';
      if (formData.status !== newStatus) {
        setFormData(prev => ({ ...prev, status: newStatus }));
      }
    }
  }, [formData.scheduledStart, formData.status]);

  // Cálculos
  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);
  }, [timesheetEntries, taskId, isNew]);

  const plannedProgress = useMemo(() => {
    if (!formData.scheduledStart || !formData.estimatedDelivery) return 0;
    const start = new Date(formData.scheduledStart);
    const end = new Date(formData.estimatedDelivery);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (today < start) return 0;
    if (today > end) return 100;

    const total = end.getTime() - start.getTime();
    if (total <= 0) return 0;

    const current = today.getTime() - start.getTime();
    return Math.round((current / total) * 100);
  }, [formData.scheduledStart, formData.estimatedDelivery]);

  const taskWeight = useMemo(() => {
    const project = projects.find(p => p.id === formData.projectId);

    // Cálculo baseado em dias (Duration)
    if (!project || !project.startDate || !project.estimatedDelivery || !formData.scheduledStart || !formData.estimatedDelivery) {
      return { weight: 0, soldHours: 0 };
    }

    const projStart = new Date(project.startDate).getTime();
    const projEnd = new Date(project.estimatedDelivery).getTime();
    const projDuration = projEnd - projStart;

    const taskStart = new Date(formData.scheduledStart).getTime();
    const taskEnd = new Date(formData.estimatedDelivery).getTime();
    const taskDuration = taskEnd - taskStart;

    if (projDuration <= 0 || taskDuration <= 0) return { weight: 0, soldHours: 0 };

    // Peso = (Duração da Tarefa / Duração do Projeto) * 100
    const weight = (taskDuration / projDuration) * 100;
    const soldHours = project.horas_vendidas > 0 ? (weight / 100) * project.horas_vendidas : 0;

    return { weight, soldHours };
  }, [formData.scheduledStart, formData.estimatedDelivery, formData.projectId, projects]);

  const taskTeamMetrics = useMemo(() => {
    if (!formData.projectId) return [];

    // Identificar todos os membros únicos
    const allMemberIds = Array.from(new Set([formData.developerId, ...(formData.collaboratorIds || [])].filter(Boolean)));
    const teamSize = allMemberIds.length;

    if (teamSize === 0) return [];

    // Calcular totais globais da tarefa
    const taskEntries = !isNew ? timesheetEntries.filter(entry => entry.taskId === taskId) : [];
    const totalSpentGlobal = taskEntries.reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);
    const totalEstimated = taskWeight.soldHours;

    // O que sobra da fatia vendida (Global)
    const remainingGlobal = totalEstimated - totalSpentGlobal;

    // A fatia futura de CADA UM é o que sobra dividido por todos
    // Se a sobra for negativa (estouro), a divisão também será negativa, reduzindo o limite visual
    const futureSharePerMember = remainingGlobal / teamSize;

    return allMemberIds.map(userId => {
      const u = users.find(user => user.id === userId);

      const userSpent = taskEntries
        .filter(entry => entry.userId === userId)
        .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);

      // O Limite dinâmico de cada um é: O que ele já gastou (garantido) + Sua parte na sobra
      // Exemplo: 80h total, 2 devs. 
      // Dev A gastou 60h. Total Gasto = 60. Sobra = 20. Divisão Sobra = 10.
      // Dev A Limite = 60 + 10 = 70h. (Ele gastou 60 de 70, ok)
      // Dev B Limite = 0 + 10 = 10h.  (Ele tem 10h restantes)
      // Soma dos Limites = 70 + 10 = 80h. (Fecha a conta)
      const dynamicLimit = userSpent + futureSharePerMember;

      return {
        id: userId!,
        name: u?.name || '?',
        avatarUrl: u?.avatarUrl,
        cargo: u?.cargo || 'Membro',
        spent: userSpent,
        limit: dynamicLimit,
        isResponsible: userId === formData.developerId,
        percent: dynamicLimit > 0 ? Math.min(100, (userSpent / dynamicLimit) * 100) : (userSpent > 0 ? 100 : 0)
      };
    });
  }, [formData.developerId, formData.collaboratorIds, formData.projectId, taskWeight.soldHours, users, timesheetEntries, taskId, isNew]);

  // Permissões
  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');
  const canEditEverything = isAdmin || isNew;
  // Permite que colaboradores também editem status, progresso e notas
  const canEditProgressStatus = isAdmin || isOwner || isCollaborator || isNew;
  const canAnyEdit = isAdmin || isOwner || isCollaborator || isNew;

  const getDelayDays = () => {
    if (formData.status === 'Done' || formData.status === 'Review' || !formData.estimatedDelivery) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parts = formData.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return today > due ? Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  };
  const daysDelayed = getDelayDays();

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação estrita dos campos obrigatórios NO SUBMIT
    const errors: string[] = [];
    if (isFieldMissing('projectId')) errors.push('projectId');
    if (isFieldMissing('clientId')) errors.push('clientId');
    if (isFieldMissing('title')) errors.push('title');
    if (isFieldMissing('team')) errors.push('team');
    if (isFieldMissing('developerId')) errors.push('developerId');
    if (isFieldMissing('scheduledStart')) errors.push('scheduledStart');
    if (isFieldMissing('estimatedDelivery')) errors.push('estimatedDelivery');
    if (isFieldMissing('estimatedHours')) errors.push('estimatedHours');

    if (errors.length > 0) {
      const missingFields = errors.map(e => {
        switch (e) {
          case 'projectId': return 'Projeto';
          case 'clientId': return 'Cliente';
          case 'title': return 'Título';
          case 'developerId': return 'Responsável';
          case 'team': return 'Equipe Alocada';
          case 'scheduledStart': return 'Previsão Início';
          case 'estimatedDelivery': return 'Previsão Entrega';
          case 'estimatedHours': return 'Horas Planejadas';
          default: return e;
        }
      });
      alert(`Campos obrigatórios faltando:\n- ${missingFields.join('\n- ')}\n\nPor favor, preencha os campos destacados em amarelo.`);
      return;
    }

    try {
      setLoading(true);
      const payload: any = { ...formData, progress: Number(formData.progress), estimatedHours: Number(formData.estimatedHours) };
      if (payload.status === 'In Progress' && !formData.actualStart) payload.actualStart = new Date().toISOString().split('T')[0];
      if (payload.status === 'Done' && !formData.actualDelivery) payload.actualDelivery = new Date().toISOString().split('T')[0];

      // Se for Pendente, mantemos o status Review no banco
      if (payload.status === 'Review') payload.status = 'Review';

      if (isNew) await createTask(payload);
      else if (taskId) await updateTask(taskId, payload);
      discardChanges(); navigate(-1);
    } catch (error) { alert("Erro ao salvar"); } finally { setLoading(false); }
  };

  const performDelete = async () => {
    if (!taskId || !deleteConfirmation) return;
    try {
      setLoading(true);
      await deleteTask(taskId, deleteConfirmation.force);
      discardChanges(); navigate(-1);
    } catch (error: any) {
      if (error.message?.includes("horas apontadas")) setDeleteConfirmation({ force: true });
      else alert("Erro ao excluir");
    } finally { setLoading(false); }
  };

  const handleTransferResponsibility = async (newOwnerId: string) => {
    const newOwner = users.find(u => u.id === newOwnerId);
    if (!task || !newOwner) return;
    try {
      setLoading(true);
      const collabs = [...(task.collaboratorIds || [])].filter(id => id !== newOwnerId);
      if (task.developerId && !collabs.includes(task.developerId)) collabs.push(task.developerId);
      await updateTask(task.id, { developerId: newOwnerId, developer: newOwner.name, collaboratorIds: collabs });
      setTransferModalOpen(false); navigate(-1);
    } catch (error) { alert("Erro ao transferir"); } finally { setLoading(false); }
  };

  const filteredClients = clients.filter(c => c.active !== false);
  const filteredProjects = projects.filter(p => p.active !== false && (!formData.clientId || p.clientId === formData.clientId));
  const responsibleUsers = useMemo(() => {
    if (!formData.projectId) return [];
    const membersIds = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId).map(pm => String(pm.id_colaborador));
    return users.filter(u => u.active !== false && (membersIds.includes(u.id) || u.id === formData.developerId));
  }, [users, projectMembers, formData.projectId, formData.developerId]);

  const currentDeveloper = useMemo(() => users.find(u => u.id === formData.developerId), [users, formData.developerId]);



  if (!isNew && !task) return <div className="p-8 text-center" style={{ color: 'var(--textMuted)' }}>Tarefa não encontrada.</div>;

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* HEADER - Replicating Project Dashboard Style */}
      <div className="px-8 py-6 shadow-lg flex items-center justify-between text-white z-20" style={{ background: 'linear-gradient(to right, #1e1b4b, #4c1d95)' }}>
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-xl font-bold flex items-center gap-3">
              {isNew ? 'Nova Tarefa' : 'Detalhes da Tarefa'}
              {daysDelayed > 0 && (
                <span className="flex items-center gap-1 text-[8px] px-2 py-0.5 rounded-full bg-red-500 text-white uppercase font-black animate-pulse align-middle">
                  <AlertTriangle size={10} /> {daysDelayed} dias de atraso
                </span>
              )}
            </h1>
            <div className="flex items-center gap-2 mt-1 opacity-60">
              <span className="text-xs font-medium uppercase tracking-tighter">Fluxo de Cadastro Premium</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isNew && (isAdmin || isOwner) && (
            <button
              onClick={() => setDeleteConfirmation({ force: false })}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-red-100 hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Trash2 size={16} /> EXCLUIR
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-white/10 text-white"
            disabled={loading}
          >
            CANCELAR
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 bg-white text-indigo-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xl hover:bg-indigo-50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
            disabled={loading}
          >
            <Save className="w-4 h-4 shadow-sm" />
            {loading ? 'SALVANDO...' : 'SALVAR TAREFA'}
          </button>
        </div>
      </div>

      {/* Main Content Area - Grid Layout matching Project Dashboard */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-4">

          {/* ROW 1: 4 KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1: Identificação */}
            <div className="p-5 rounded-[24px] border shadow-sm flex flex-col h-[260px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--muted)' }}>Identificação</h4>
                <Briefcase size={14} className="text-purple-500" />
              </div>
              <div className="space-y-3 flex-1">
                <div>
                  <label className={`text-[9px] font-black uppercase mb-1 block opacity-60 ${hasError('title') ? 'text-yellow-500 opacity-100' : ''}`}>Nome da Tarefa *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => { setFormData({ ...formData, title: e.target.value }); clearError('title'); }}
                    className={`w-full px-3 py-2 text-sm font-bold border rounded-xl outline-none transition-all ${hasError('title') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--bg)] border-[var(--border)]'}`}
                    style={{ color: 'var(--text)' }}
                    placeholder="Nome da Tarefa"
                    disabled={!canEditEverything}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm font-bold border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none"
                    style={{ color: 'var(--text)' }}
                  >
                    <option value="Todo">Não Iniciado</option>
                    <option value="In Progress">Iniciado</option>
                    <option value="Review">Pendente</option>
                    <option value="Done">Concluído</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 2: Gestão */}
            <div className="p-5 rounded-[24px] border shadow-sm flex flex-col h-[260px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--muted)' }}>Gestão</h4>
                <Shield size={14} className="text-emerald-500" />
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <label className={`text-[9px] font-black uppercase mb-1 block opacity-60 ${hasError('developerId') ? 'text-yellow-500 opacity-100' : ''}`}>Responsável *</label>
                  <select
                    value={formData.developerId}
                    onChange={e => {
                      const u = users.find(usr => usr.id === e.target.value);
                      setFormData({ ...formData, developerId: e.target.value, developer: u?.name || '' });
                      clearError('developerId');
                    }}
                    className={`w-full px-3 py-2 text-xs font-bold border rounded-xl outline-none transition-all ${hasError('developerId') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--bg)] border-[var(--border)]'}`}
                    style={{ color: 'var(--text)' }}
                    disabled={!canEditEverything}
                  >
                    <option value="">Selecione...</option>
                    {responsibleUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm font-bold border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none"
                    style={{ color: 'var(--text)' }}
                  >
                    <option value="Low">Baixa</option>
                    <option value="Medium">Média</option>
                    <option value="High">Alta</option>
                    <option value="Critical">Crítica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 3: Esforço */}
            <div className="p-5 rounded-[24px] border shadow-sm flex flex-col h-[260px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--muted)' }}>Esforço</h4>
                <Activity size={14} className="text-amber-500" />
              </div>
              <div className="space-y-3">
                {isNicLabs && (
                  <div className="text-[8px] font-bold text-amber-400 opacity-60 italic">
                    ℹ️ Projeto interno - Horas opcionais
                  </div>
                )}
                <div>
                  <label className={`text-[9px] font-black uppercase mb-1 block opacity-60 ${hasError('estimatedHours') ? 'text-yellow-500 opacity-100' : ''}`}>
                    Horas Estimadas {!isNicLabs && '*'}
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                    <input
                      type="number"
                      value={formData.estimatedHours || ''}
                      onChange={e => { setFormData({ ...formData, estimatedHours: Number(e.target.value) }); clearError('estimatedHours'); }}
                      className={`w-full pl-9 pr-3 py-4 text-xl font-black border rounded-2xl outline-none transition-all tabular-nums ${hasError('estimatedHours') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--bg)] border-[var(--border)]'}`}
                      style={{ color: 'var(--text)' }}
                      placeholder="0"
                      disabled={!canEditEverything}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Progresso (%)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.progress}
                      onChange={e => setFormData({ ...formData, progress: Number(e.target.value) })}
                      className="flex-1 h-2 rounded-full appearance-none bg-slate-800 accent-purple-500 cursor-pointer"
                    />
                    <span className="text-sm font-black text-purple-400 w-12 text-right">{formData.progress}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Timeline */}
            <div className="p-5 rounded-[24px] border shadow-sm flex flex-col h-[260px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--muted)' }}>Timeline</h4>
                <Calendar size={14} className="text-blue-500" />
              </div>
              <div className="space-y-3">
                {isNicLabs && (
                  <div className="text-[8px] font-bold text-blue-400 opacity-60 italic">
                    ℹ️ Projeto interno - Datas opcionais
                  </div>
                )}
                <div className="p-4 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                  <label className="text-[9px] font-black uppercase mb-2 block text-blue-500">Planejado {!isNicLabs && '(Obrigatório)'}</label>
                  <div className="space-y-3">
                    <input
                      type="date"
                      value={formData.scheduledStart}
                      onChange={e => { setFormData({ ...formData, scheduledStart: e.target.value }); clearError('scheduledStart'); }}
                      className={`w-full text-xs font-bold p-2 rounded-lg border outline-none ${hasError('scheduledStart') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-transparent border-[var(--border)]'}`}
                      style={{ color: 'var(--text)' }}
                      disabled={!canEditEverything}
                    />
                    <input
                      type="date"
                      value={formData.estimatedDelivery}
                      onChange={e => { setFormData({ ...formData, estimatedDelivery: e.target.value }); clearError('estimatedDelivery'); }}
                      className={`w-full text-xs font-bold p-2 rounded-lg border outline-none ${hasError('estimatedDelivery') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-purple-500/10 border-purple-500/50 text-purple-500'}`}
                      style={{ color: hasError('estimatedDelivery') ? 'var(--text)' : undefined }}
                      disabled={!canEditEverything}
                    />
                  </div>
                </div>
                <div className="p-4 rounded-2xl border border-dotted" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}>
                  <label className="text-[9px] font-black uppercase mb-2 block opacity-40">Realizado</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={formData.actualStart} onChange={e => setFormData({ ...formData, actualStart: e.target.value })} className="text-[9px] font-bold p-1 bg-transparent border-b border-[var(--border)] outline-none" style={{ color: 'var(--text)' }} />
                    <input type="date" value={formData.actualDelivery} onChange={e => setFormData({ ...formData, actualDelivery: e.target.value })} className="text-[9px] font-bold p-1 bg-transparent border-b border-[var(--border)] outline-none" style={{ color: 'var(--text)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: DOCUMENTATION & SQUAD */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Documentation Card (2/3 width) */}
            <div className="lg:col-span-2 p-6 rounded-[24px] border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                <FileSpreadsheet size={14} /> Documentação
              </div>

              <div>
                <label className="text-[9px] font-black uppercase opacity-40 block mb-2">Link do Sharepoint/OneDrive</label>
                <input
                  type="url"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-4 py-3 text-xs border rounded-2xl bg-[var(--bg)] border-[var(--border)] outline-none transition-all focus:ring-2 focus:ring-indigo-500/20"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            </div>

            {/* Squad Card (1/3 width) with Scroll */}
            <div className="p-5 rounded-[24px] border shadow-sm flex flex-col max-h-[320px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  <Users size={14} /> Equipe Alocada
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(true)}
                  className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                {/* Developer / Owner */}
                <div>
                  <label className="text-[8px] font-black uppercase opacity-40 mb-2 block">Responsável Principal</label>
                  {currentDeveloper ? (
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-500/5 border border-indigo-500/20">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-500 shadow-lg shadow-indigo-500/20">
                        {currentDeveloper.avatarUrl ? <img src={currentDeveloper.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)] font-bold text-xs">{currentDeveloper.name.substring(0, 2).toUpperCase()}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-indigo-400 truncate">{currentDeveloper.name}</p>
                        <p className="text-[8px] font-black uppercase opacity-40 truncate">{currentDeveloper.cargo || 'Responsável'}</p>
                      </div>
                      <button type="button" onClick={() => setFormData({ ...formData, developerId: '' })} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500/50 hover:text-red-500 transition-all"><X size={12} /></button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setIsAddMemberOpen(true)} className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center gap-2 opacity-50 hover:opacity-100 hover:bg-[var(--surface-hover)] transition-all">
                      <User size={16} />
                      <span className="text-[9px] font-black uppercase">Definir Responsável</span>
                    </button>
                  )}
                </div>

                {/* Collaborators */}
                <div className="pt-4 border-t border-[var(--border)]">
                  <label className="text-[8px] font-black uppercase opacity-40 mb-2 block">Colaboradores ({formData.collaboratorIds.length})</label>
                  <div className="space-y-2">
                    {formData.collaboratorIds.map(id => {
                      const collab = users.find(u => u.id === id);
                      if (!collab) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg)] border border-[var(--border)]">
                          <div className="w-6 h-6 rounded-lg overflow-hidden shrink-0">
                            {collab.avatarUrl ? <img src={collab.avatarUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)] text-[8px] font-bold">{collab.name.substring(0, 2).toUpperCase()}</div>}
                          </div>
                          <p className="flex-1 text-[10px] font-bold truncate" style={{ color: 'var(--text)' }}>{collab.name}</p>
                          <button type="button" onClick={() => setFormData({ ...formData, collaboratorIds: formData.collaboratorIds.filter(cid => cid !== id) })} className="p-1 rounded-lg hover:bg-red-500/10 text-red-500/30 hover:text-red-500 transition-all"><X size={10} /></button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={() => setIsAddMemberOpen(true)} className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-[8px] font-black uppercase opacity-40 hover:opacity-100 hover:bg-[var(--surface-hover)] transition-all">+ Adicionar Colaborador</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>

        <ConfirmationModal
          isOpen={!!deleteConfirmation}
          title={deleteConfirmation?.force ? "Exclusão Forçada" : "Excluir Tarefa"}
          message={deleteConfirmation?.force ? "Esta tarefa possui horas apontadas. Deseja excluir tudo permanentemente?" : "Tem certeza que deseja excluir esta tarefa?"}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={performDelete}
          onCancel={() => setDeleteConfirmation(null)}
        />

        {showPrompt && (
          <ConfirmationModal
            isOpen={true}
            title="Descartar alterações?"
            message="Existem alterações não salvas. Deseja sair sem salvar?"
            confirmText="Continuar Editando"
            cancelText="Descartar"
            onConfirm={continueEditing}
            onCancel={() => { discardChanges(); navigate(-1); }}
          />
        )}

        {isAddMemberOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md" style={{ backgroundColor: 'var(--overlay)' }} onClick={() => setIsAddMemberOpen(false)}>
            <div className="border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }} onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                <h4 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text)' }}>Alocar Colaborador</h4>
                <button onClick={() => setIsAddMemberOpen(false)} className="transition-colors" style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
              <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar space-y-2">
                {users.filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) && u.id !== formData.developerId && !formData.collaboratorIds?.includes(u.id)).map(u => (
                  <button
                    key={u.id}
                    onClick={() => {
                      markDirty();
                      const newCollabs = [...(formData.collaboratorIds || []), u.id];
                      setFormData({ ...formData, collaboratorIds: newCollabs });
                      clearError('team');
                      setIsAddMemberOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all group"
                    style={{ backgroundColor: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm group-hover:scale-105 transition-transform overflow-hidden" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}>
                      {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold uppercase" style={{ color: 'var(--text)' }}>{u.name}</p>
                      <p className="text-[9px] opacity-40 uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{u.cargo}</p>
                    </div>
                  </button>
                ))}
                {users.filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) && u.id !== formData.developerId && !formData.collaboratorIds?.includes(u.id)).length === 0 && (
                  <div className="py-8 text-center opacity-40">
                    <p className="text-[10px] font-bold uppercase">Nenhum membro do projeto disponível</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetail;
