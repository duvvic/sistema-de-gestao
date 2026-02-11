import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import { ArrowLeft, Save, Calendar, Clock, ChevronDown, Crown, Users, StickyNote, AlertTriangle, ShieldAlert, CheckSquare, Plus, Trash2, UserCheck, X, CheckCircle, Activity } from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, createTask, updateTask, deleteTask } = useDataController();
  const isDeveloper = !isAdmin;

  const isNew = !taskId || taskId === 'new';
  const task = !isNew ? tasks.find(t => t.id === taskId) : undefined;

  // Query params for defaults
  const preSelectedClientId = searchParams.get('clientId') || searchParams.get('client');
  const preSelectedProjectId = searchParams.get('projectId') || searchParams.get('project');

  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
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

  // Cálculos de Horas e Progresso
  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + entry.totalHours, 0);
  }, [timesheetEntries, taskId, isNew]);

  // Data do primeiro apontamento como fallback para Início Real
  const firstTimesheetDate = useMemo(() => {
    if (isNew) return null;
    const taskEntries = timesheetEntries.filter(entry => entry.taskId === taskId && entry.date);
    if (taskEntries.length === 0) return null;
    const dates = taskEntries.map(e => new Date(e.date).getTime());
    return new Date(Math.min(...dates)).toISOString().split('T')[0];
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

  // Métricas de Equipe (Horas por Colaborador)
  const taskTeamMetrics = useMemo(() => {
    if (!formData.projectId) return [];

    // Lista de IDs: Responsável + Colaboradores
    const allMemberIds = [
      formData.developerId,
      ...(formData.collaboratorIds || [])
    ].filter(Boolean);

    // IDs únicos
    const uniqueIds = Array.from(new Set(allMemberIds));

    // Buscar membros do projeto para % de alocação
    const projMembers = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId);

    return uniqueIds.map(userId => {
      const u = users.find(user => user.id === userId);
      const pm = projMembers.find(member => String(member.id_colaborador) === userId);

      const allocationPerc = pm ? Number(pm.allocation_percentage) || 0 : 0;
      // O limite é proporcional à alocação do membro no projeto aplicada às horas da tarefa
      const limit = (allocationPerc / 100) * (formData.estimatedHours || 0);

      const spent = !isNew ? timesheetEntries
        .filter(entry => entry.taskId === taskId && entry.userId === userId)
        .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0) : 0;

      const remaining = limit - spent;

      return {
        id: userId,
        name: u?.name || '?',
        avatarUrl: u?.avatarUrl,
        cargo: u?.cargo || 'Membro',
        limit: limit || 0,
        spent: spent || 0,
        remaining: Math.max(0, remaining),
        isResponsible: userId === formData.developerId,
        percent: limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
      };
    });
  }, [formData.developerId, formData.collaboratorIds, formData.projectId, formData.estimatedHours, projectMembers, users, timesheetEntries, taskId, isNew]);

  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);

  // Verifica se a tarefa está concluída 
  const isTaskCompleted = !isNew && task?.status === 'Done';

  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

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
      // Defaults for new task
      const qClient = preSelectedClientId as string || '';
      const qProject = preSelectedProjectId as string || '';

      const proj = qProject ? projects.find(p => p.id === qProject) : null;
      const finalClient = qClient || (proj ? proj.clientId : '');

      setFormData(prev => ({
        ...prev,
        clientId: finalClient || prev.clientId,
        projectId: qProject || prev.projectId,
        developer: '',
        developerId: ''
      }));
    }
  }, [task, preSelectedClientId, preSelectedProjectId, projects]);

  // Automação do Status baseada na Data
  useEffect(() => {
    if (formData.status !== 'Review' && formData.status !== 'Done' && formData.scheduledStart) {
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent standard form submission


    if (!formData.projectId || !formData.clientId || !formData.title || !formData.developerId) {
      alert("Preencha todos os campos obrigatórios (Título, Cliente, Projeto e Responsável)");
      return;
    }

    try {
      setLoading(true);
      const taskPayload: any = {
        ...formData,
        status: (formData.status as Status) || 'Todo',
        progress: Number(formData.progress) || 0,
        estimatedDelivery: formData.estimatedDelivery!,
        estimatedHours: Number(formData.estimatedHours) || 0,
        developerId: formData.developerId,
        developer: formData.developer
      };

      // Automatizar datas reais baseadas no status
      // Se mudou para "In Progress" e não tem início real, registrar agora
      if (taskPayload.status === 'In Progress' && !task?.actualStart && !formData.actualStart) {
        taskPayload.actualStart = new Date().toISOString().split('T')[0];
      }

      // Se mudou para "Done" e não tem fim real, registrar agora
      if (taskPayload.status === 'Done' && !task?.actualDelivery && !formData.actualDelivery) {
        taskPayload.actualDelivery = new Date().toISOString().split('T')[0];
      }

      if (isNew) {
        await createTask(taskPayload);
        alert("Tarefa criada com sucesso!");
      } else if (taskId) {
        await updateTask(taskId, taskPayload);
        alert("Tarefa atualizada com sucesso!");
      }

      discardChanges();
      navigate(-1);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      alert("Erro ao salvar tarefa. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    const canGoBack = requestBack();
    if (canGoBack) navigate(-1);
  }, [requestBack, navigate]);

  const handleTransferResponsibility = async (newOwnerId: string) => {
    if (!task || !currentUser) return;

    try {
      setLoading(true);

      // Get new owner info
      const newOwner = users.find(u => u.id === newOwnerId);
      if (!newOwner) {
        alert('Colaborador não encontrado');
        return;
      }

      // Update task: swap owner and add old owner as collaborator
      const updatedCollaboratorIds = [...(task.collaboratorIds || [])];

      // Remove new owner from collaborators if present
      const newOwnerIndex = updatedCollaboratorIds.indexOf(newOwnerId);
      if (newOwnerIndex > -1) {
        updatedCollaboratorIds.splice(newOwnerIndex, 1);
      }

      // Add old owner as collaborator (always the current task.developerId)
      const oldOwnerId = task.developerId;
      if (oldOwnerId && !updatedCollaboratorIds.includes(oldOwnerId)) {
        updatedCollaboratorIds.push(oldOwnerId);
      }

      await updateTask(task.id, {
        developerId: newOwnerId,
        developer: newOwner.name,
        collaboratorIds: updatedCollaboratorIds.filter(id => id !== newOwnerId)
      });

      setTransferModalOpen(false);
      alert(`Responsabilidade transferida para ${newOwner.name} com sucesso!`);
      navigate(-1);
    } catch (error) {
      console.error('Erro ao transferir responsabilidade:', error);
      alert('Erro ao transferir responsabilidade. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = () => {
    if (!taskId || isNew) return;
    setDeleteConfirmation({ force: false });
  };

  const performDelete = async () => {
    if (!taskId || !deleteConfirmation) return;
    const isForce = deleteConfirmation.force;

    setLoading(true);
    setDeleteConfirmation(null); // Close modal

    try {
      await deleteTask(taskId, isForce);
      alert(isForce ? "Tarefa e horas excluídas com sucesso!" : "Tarefa excluída com sucesso!");
      discardChanges();
      navigate(-1);
    } catch (error: any) {
      const errorMsg = error.message || "";
      const isHoursError = !isForce && (errorMsg.includes("horas apontadas") || errorMsg.includes("hasHours"));

      if (isHoursError) {
        console.warn("[TaskDetail] Exclusão impedida por horas apontadas. Aguardando confirmação de força.");
        setDeleteConfirmation({ force: true });
      } else {
        console.error("Erro ao excluir tarefa:", error);
        alert("Erro ao excluir tarefa: " + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Derived values
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedProject = projects.find(p => p.id === formData.projectId);


  const responsibleUsers = useMemo(() => {
    if (!formData.projectId) return [];

    const membersIds = projectMembers
      .filter(pm => String(pm.id_projeto) === formData.projectId)
      .map(pm => String(pm.id_colaborador));

    return users.filter(u => {
      const isActive = u.active !== false;
      const isCurrent = u.id === formData.developerId;
      const isMember = membersIds.includes(String(u.id));
      return isActive && (isMember || isCurrent);
    });
  }, [users, projectMembers, formData.projectId, formData.developerId]);

  const availableProjectsIds = React.useMemo(() => {
    if (isAdmin) return projects.map(p => p.id);
    return projects
      .filter(p => projectMembers.some(pm => String(pm.id_projeto) === p.id && String(pm.id_colaborador) === currentUser?.id))
      .map(p => p.id);
  }, [projects, isAdmin, projectMembers, currentUser]);

  const availableClientIds = React.useMemo(() => {
    if (isAdmin) return clients.map(c => c.id);
    const userProjects = projects.filter(p => availableProjectsIds.includes(p.id));
    return [...new Set(userProjects.map(p => p.clientId))];
  }, [clients, projects, availableProjectsIds, isAdmin]);

  const filteredClients = clients.filter(c => c.active !== false && availableClientIds.includes(c.id));

  const filteredProjects = projects.filter(p =>
    availableProjectsIds.includes(p.id) &&
    p.active !== false &&
    (!formData.clientId || p.clientId === formData.clientId)
  );

  const getDelayDays = () => {
    if (formData.status === 'Done' || formData.status === 'Review') return 0;
    if (!formData.estimatedDelivery) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = formData.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));

    if (today <= due) return 0;
    const diffTime = today.getTime() - due.getTime();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysDelayed = getDelayDays();

  // --- ACCESS CONTROL & PERMISSIONS ---
  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');

  // Regras de Acesso:
  // 1. Somente Admin altera tudo.
  // 2. Responsável altera apenas Progresso e Status.
  const canEditEverything = isAdmin || isNew;
  const canEditProgressStatus = isAdmin || isOwner || isNew;
  const canAnyEdit = isAdmin || isOwner || isCollaborator || isNew;

  // --- RENDER METHODS ---

  const renderHeader = () => (
    <div className="px-4 py-2 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-1.5 rounded-full transition-colors"
          style={{ color: 'var(--muted)' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            {isNew ? 'Nova Tarefa' : 'Detalhes'}
            {daysDelayed > 0 && (
              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500 uppercase">
                Atrasada
              </span>
            )}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!isNew && (isAdmin || isOwner) && (
          <button
            onClick={handleDeleteTask}
            disabled={loading}
            className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            title="Excluir Tarefa"
          >
            <Trash2 size={16} />
          </button>
        )}
        {canAnyEdit && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-white px-4 py-1.5 rounded-lg shadow-md transition-all flex items-center gap-2 text-[10px] font-black uppercase disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Save className="w-3 h-3" />
            {loading ? '...' : 'Salvar'}
          </button>
        )}
      </div>
    </div>
  );

  const renderIdentification = () => (
    <div className="h-full">
      <div className="p-3 rounded-[18px] border border-[var(--border)] shadow-lg h-full flex flex-col bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-3xl pointer-events-none" />

        {daysDelayed > 0 && (
          <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white text-[7px] font-black uppercase tracking-widest rounded-bl-lg shadow-lg z-10">
            Atrasado
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/10">
            <CheckSquare size={14} />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50">Identificação</h3>
        </div>

        <div className="space-y-3 flex-1 flex flex-col">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-40 ml-1">Cliente</label>
              <select
                value={formData.clientId || ''}
                onChange={(e) => { markDirty(); setFormData({ ...formData, clientId: e.target.value, projectId: '' }); }}
                className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none appearance-none focus:border-purple-500/30 transition-all"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything || !!preSelectedClientId}
              >
                <option value="">Cliente</option>
                {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase opacity-40 ml-1">Projeto</label>
              <select
                value={formData.projectId || ''}
                onChange={(e) => {
                  markDirty();
                  const newProjectId = e.target.value;
                  const isStillMember = projectMembers.some(pm => String(pm.id_projeto) === newProjectId && String(pm.id_colaborador) === formData.developerId);
                  setFormData({
                    ...formData,
                    projectId: newProjectId,
                    developerId: isStillMember ? formData.developerId : '',
                    developer: isStillMember ? (formData.developer || '') : ''
                  });
                }}
                className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none appearance-none focus:border-purple-500/30 transition-all"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything || !formData.clientId || !!preSelectedProjectId}
              >
                <option value="">{formData.clientId ? 'Projeto' : '--'}</option>
                {formData.clientId && filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)]/30 grid grid-cols-2 gap-2.5">
            <div className="col-span-1 space-y-1">
              <label className="text-[8px] font-black uppercase opacity-40 ml-1 block">Responsável</label>
              <select
                value={formData.developerId || ''}
                onChange={(e) => {
                  markDirty();
                  const u = users.find(user => user.id === e.target.value);
                  setFormData({ ...formData, developerId: e.target.value, developer: u?.name || '' });
                }}
                className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none appearance-none focus:border-purple-500/30 transition-all"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything}
              >
                <option value="">{formData.projectId ? 'Selecionar...' : 'Selecione um projeto primeiro'}</option>
                {responsibleUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-1 space-y-1">
              <label className="text-[8px] font-black uppercase opacity-40 ml-1 block">Prioridade</label>
              <select
                value={formData.priority || 'Medium'}
                onChange={(e) => { markDirty(); setFormData({ ...formData, priority: e.target.value as Priority }); }}
                className="w-full bg-[var(--bg)]/50 p-2 rounded-lg text-[10px] font-bold border border-[var(--border)] outline-none appearance-none focus:border-purple-500/30 transition-all"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything}
              >
                <option value="Low">Baixa</option>
                <option value="Medium">Média</option>
                <option value="High">Alta</option>
                <option value="Critical">Crítica</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)]/30">
            <label className="text-[8px] font-black uppercase opacity-40 ml-1 mb-0.5 block">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => { markDirty(); setFormData({ ...formData, title: e.target.value }); }}
              className="w-full bg-transparent border-none p-0 text-base font-black outline-none focus:ring-0 text-slate-100 placeholder:opacity-20"
              placeholder="Digite o título..."
              disabled={!canEditEverything}
            />
          </div>

          <div className="flex-1 flex flex-col pt-2 overflow-hidden">
            <label className="text-[8px] font-black uppercase opacity-40 ml-1 mb-0.5 block">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
              className="flex-1 w-full p-2.5 bg-[var(--bg)]/30 border border-[var(--border)] rounded-lg outline-none resize-none text-[11px] font-medium leading-relaxed custom-scrollbar focus:border-purple-500/30 transition-colors"
              style={{ color: 'var(--text)' }}
              placeholder="..."
              disabled={!canEditEverything}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStatusPriorityBlock = () => (
    <div className="flex-1 flex flex-col">
      <div className="p-3 rounded-[18px] border border-[var(--border)] shadow-xl h-full flex flex-col bg-gradient-to-b from-[var(--surface)] to-[var(--bg)] relative overflow-hidden group">
        <div className="flex justify-between items-center mb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20">
              <Activity size={14} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50">Estado</h3>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { markDirty(); setFormData({ ...formData, status: 'Review' }); }}
                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all duration-300 ${formData.status === 'Review' ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/10' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-purple-500/30'}`}
                disabled={!canEditProgressStatus}
              >
                <Clock size={16} className="mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">Pendente</span>
              </button>

              <button
                type="button"
                onClick={() => { markDirty(); setFormData({ ...formData, status: 'Done' }); }}
                className={`flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all duration-300 ${formData.status === 'Done' ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/10' : 'bg-[var(--surface-2)] border-[var(--border)] opacity-60 hover:opacity-100 hover:border-emerald-500/30'}`}
                disabled={!canEditProgressStatus}
              >
                <CheckCircle size={16} className="mb-0.5" />
                <span className="text-[9px] font-black uppercase tracking-wide">Concluído</span>
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black uppercase opacity-40 ml-1">Prioridade</label>
            <div className="grid grid-cols-4 gap-1">
              {(['Low', 'Medium', 'High', 'Critical'] as Priority[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { markDirty(); setFormData({ ...formData, priority: p }); }}
                  className={`py-1.5 rounded-lg text-[7.5px] font-black uppercase border transition-all duration-200 ${formData.priority === p ? 'bg-white text-slate-900 border-white shadow-md' : 'bg-[var(--surface-2)] border-[var(--border)] text-slate-400 hover:border-slate-500'}`}
                  disabled={!canEditEverything}
                >
                  {p === 'Low' ? 'Baixa' : p === 'Medium' ? 'Média' : p === 'High' ? 'Alta' : 'Crítica'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 w-full p-2.5 rounded-xl border border-dashed border-[var(--border)] bg-slate-900/40 relative group overflow-hidden flex flex-col min-h-[60px]">
            <div className="flex items-center gap-1.5 mb-1.5 opacity-30 group-hover:opacity-60 transition-opacity">
              <StickyNote size={10} className="text-amber-500" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Bloco de Notas</span>
            </div>
            <textarea
              className="flex-1 w-full bg-transparent border-none p-0 text-[11px] font-medium outline-none focus:ring-0 resize-none leading-relaxed custom-scrollbar text-slate-300 placeholder:text-slate-700"
              value={formData.notes || ''}
              onChange={(e) => { markDirty(); setFormData({ ...formData, notes: e.target.value }); }}
              placeholder="Digite aqui suas observações..."
              disabled={!canEditEverything}
            />
          </div>

          <div className="pt-2.5 border-t border-[var(--border)]/30 space-y-2.5">
            <div className="space-y-1">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-[8px] font-black uppercase opacity-40">Progresso Atual</span>
                <span className="text-[10px] font-black text-purple-400 tabular-nums">{formData.progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => { markDirty(); setFormData({ ...formData, progress: Number(e.target.value) }); }}
                className="w-full h-1 rounded-full appearance-none cursor-pointer bg-slate-800 accent-purple-500 focus:outline-none"
                disabled={!canEditProgressStatus}
              />
            </div>

            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-1000 ${formData.progress! >= plannedProgress ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]'}`}
                  style={{ width: `${plannedProgress}%` }}
                />
              </div>
              <div className="flex justify-center">
                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tighter italic opacity-50">Expectativa vs Realidade</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeamMetricsBlock = () => (
    <div className="p-3 rounded-[18px] border border-[var(--border)] shadow-lg flex flex-col bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] backdrop-blur-md h-full group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/10">
            <Users size={14} />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50">Equipe</h3>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1 pb-1.5">
          {taskTeamMetrics.map(metric => (
            <div
              key={metric.id}
              onClick={() => isAdmin && setActiveMemberId(activeMemberId === metric.id ? null : metric.id)}
              className={`relative p-2 rounded-xl border transition-all cursor-pointer group/member ${activeMemberId === metric.id ? 'bg-purple-500/10 border-purple-500/40' : 'bg-[var(--bg)]/40 border-[var(--border)] hover:border-purple-500/30'}`}
            >
              {activeMemberId === metric.id && isAdmin && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex items-center justify-center gap-2.5 rounded-xl animate-in fade-in zoom-in duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (metric.isResponsible) return;
                      markDirty();
                      const currentCollabs = formData.collaboratorIds || [];
                      const oldDevId = formData.developerId;
                      let newCollabs = currentCollabs.filter(id => id !== metric.id);
                      if (oldDevId && oldDevId !== metric.id && !newCollabs.includes(oldDevId)) newCollabs.push(oldDevId);
                      setFormData({ ...formData, developerId: metric.id, developer: metric.name, collaboratorIds: newCollabs });
                      setActiveMemberId(null);
                    }}
                    title="Responsável"
                    className="p-2 rounded-lg bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-lg"
                  >
                    <Crown size={14} />
                  </button>
                  {!metric.isResponsible && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markDirty();
                        const current = formData.collaboratorIds || [];
                        setFormData({ ...formData, collaboratorIds: current.filter(id => id !== metric.id) });
                        setActiveMemberId(null);
                      }}
                      title="Remover"
                      className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setActiveMemberId(null); }} className="absolute top-1 right-1 p-1 text-slate-500 hover:text-slate-300">
                    <X size={10} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg overflow-hidden border transition-colors ${metric.isResponsible ? 'border-yellow-500/50' : 'border-purple-500/20'}`}>
                    {metric.avatarUrl ? (
                      <img src={metric.avatarUrl} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700 text-white font-black text-[10px]">
                        {metric.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  {metric.isResponsible && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-md p-0.5 border border-slate-900 shadow-lg">
                      <Crown size={8} className="text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <div>
                      <p className="text-[10px] font-black text-slate-100 truncate">{metric.name}</p>
                      <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider">{metric.cargo}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-purple-400 tabular-nums">{metric.spent}h</p>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-slate-800 overflow-hidden border border-white/5">
                    <div className={`h-full transition-all duration-700 ${metric.percent > 90 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(metric.percent, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isAdmin && (
            <button
              onClick={() => setIsAddMemberOpen(!isAddMemberOpen)}
              className="w-full py-2 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] hover:border-purple-500/40 hover:bg-purple-500/5 transition-all group/add"
            >
              <Plus size={14} className="text-slate-500 group-hover/add:text-purple-500 transition-transform" />
              <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-500 group-hover/add:text-purple-400">Adicionar</span>
            </button>
          )}

          {taskTeamMetrics.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-2xl bg-slate-900/40 p-4 opacity-40">
              <Users size={20} className="mb-2 text-slate-600" />
              <p className="text-[8px] font-black uppercase text-slate-600">Vazio</p>
            </div>
          )}
        </div>
      </div>

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsAddMemberOpen(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 flex justify-between items-center">
              <h4 className="text-[9px] font-black uppercase tracking-widest">Selecionar</h4>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-slate-500 hover:text-slate-300"><X size={14} /></button>
            </div>
            <div className="p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
              {users
                .filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) && u.id !== formData.developerId && !formData.collaboratorIds?.includes(u.id))
                .map(u => (
                  <button
                    key={u.id}
                    onClick={() => { markDirty(); const current = formData.collaboratorIds || []; setFormData({ ...formData, collaboratorIds: [...current, u.id] }); setIsAddMemberOpen(false); }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                  >
                    <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[8px] font-black">
                      {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name.substring(0, 1)}
                    </div>
                    <span className="text-[10px] font-bold">{u.name}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTimelineBlock = () => {
    // Cálculo para visual preenchimento
    const totalDays = formData.scheduledStart && formData.estimatedDelivery
      ? Math.ceil((new Date(formData.estimatedDelivery).getTime() - new Date(formData.scheduledStart).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const daysUsed = formData.scheduledStart
      ? Math.ceil((new Date().getTime() - new Date(formData.scheduledStart).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const progressPercent = totalDays > 0 ? Math.min(Math.max((daysUsed / totalDays) * 100, 0), 100) : 0;

    return (
      <div className="h-full">
        <div className="p-3 rounded-[18px] border border-[var(--border)] shadow-xl flex flex-col bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] backdrop-blur-md h-full group">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Calendar size={14} />
            </div>
            <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50">Cronograma</h3>
          </div>

          <div className="space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase opacity-40 ml-1 block">Início</label>
                <input
                  type="date"
                  value={formData.scheduledStart || ''}
                  onChange={e => { markDirty(); setFormData({ ...formData, scheduledStart: e.target.value }); }}
                  className="w-full bg-[var(--bg)]/50 p-2 rounded-lg border border-[var(--border)] font-bold text-[10px] outline-none focus:border-blue-500/30 transition-all"
                  style={{ color: 'var(--text)' }}
                  disabled={!canEditEverything}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase opacity-40 ml-1 block">Entrega</label>
                <input
                  type="date"
                  value={formData.estimatedDelivery || ''}
                  onChange={e => { markDirty(); setFormData({ ...formData, estimatedDelivery: e.target.value }); }}
                  className={`w-full p-2 rounded-lg border font-bold text-[10px] outline-none transition-all ${daysDelayed > 0 ? 'bg-red-500/10 border-red-500/40 text-red-500' : 'bg-[var(--bg)]/50 border-[var(--border)] focus:border-blue-500/30'}`}
                  style={{ color: 'var(--text)' }}
                  disabled={!canEditEverything}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-[var(--border)]/30 border-dashed relative overflow-hidden group/journey">
              <div className="flex justify-between items-center text-[8px] font-black uppercase mb-1.5 px-0.5">
                <span className="opacity-40 tracking-widest">Jornada</span>
                <span className={`px-1.5 py-0.5 rounded-md ${daysDelayed > 0 ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"}`}>
                  {daysDelayed > 0 ? `${daysDelayed}d Atraso` : `${Math.max(0, totalDays - daysUsed)}d`}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
                <div
                  className={`h-full transition-all duration-1000 ${daysDelayed > 0 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-r from-blue-600 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.3)]'}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-[var(--border)]/30">
                <p className="text-[7.5px] font-black uppercase opacity-30 mb-0.5">Real Início</p>
                <p className="text-[10px] font-black text-blue-400 tabular-nums">{formData.actualStart ? formData.actualStart.split('-').reverse().slice(0, 2).join('/') : '--/--'}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/40 border border-[var(--border)]/30">
                <p className="text-[7.5px] font-black uppercase opacity-30 mb-0.5">Real Entrega</p>
                <p className="text-[10px] font-black text-emerald-400 tabular-nums">{formData.actualDelivery ? formData.actualDelivery.split('-').reverse().slice(0, 2).join('/') : '--/--'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderEffortBlock = () => (
    <div className={`p-3 rounded-[18px] border shadow-xl transition-all bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] h-full flex flex-col ${canEditEverything ? '' : 'opacity-60 cursor-not-allowed'}`} style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/10">
            <Clock size={14} />
          </div>
          <h3 className="text-[9px] font-black uppercase tracking-widest opacity-50">Esforço</h3>
        </div>
        {actualHoursSpent > (formData.estimatedHours || 0) && (
          <div className="px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[7px] font-black uppercase shadow-lg shadow-red-500/20">Excedido</div>
        )}
      </div>

      <div className="space-y-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/40 border border-[var(--border)]/30 group/est">
            <label className="text-[8px] font-black uppercase opacity-40 mb-1">Estimadas</label>
            <div className="relative w-full">
              <input
                type="number"
                value={formData.estimatedHours || ''}
                onChange={e => { markDirty(); setFormData({ ...formData, estimatedHours: Number(e.target.value) }); }}
                className="w-full bg-transparent border-none p-0 text-2xl font-black text-center outline-none focus:ring-0 text-slate-100 tabular-nums group-hover/est:text-emerald-400 transition-colors"
                style={{ color: 'var(--text)' }}
                disabled={!canEditEverything}
              />
            </div>
          </div>

          <div className="flex flex-col items-center p-2 rounded-xl bg-slate-900/40 border border-[var(--border)]/30 group/real">
            <label className="text-[8px] font-black uppercase opacity-40 mb-1">Realizadas</label>
            <div className={`text-2xl font-black tabular-nums group-hover/real:scale-105 transition-transform ${actualHoursSpent > (formData.estimatedHours || 0) ? 'text-red-500' : 'text-emerald-500'}`}>
              {actualHoursSpent}h
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="flex justify-between items-center text-[8px] font-black uppercase px-0.5">
            <span className="opacity-40 tracking-widest">Conclusão Real</span>
            <span className="text-emerald-400 tracking-wider">meta: {plannedProgress}%</span>
          </div>
          <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div
              className={`h-full transition-all duration-1000 ${formData.progress! >= plannedProgress ? 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-blue-600 to-indigo-500'}`}
              style={{ width: `${formData.progress}%` }}
            />
          </div>
          <p className="text-[7px] font-bold text-center opacity-30 italic uppercase tracking-tighter">Progresso Real vs Meta Diária</p>
        </div>
      </div>
    </div>
  );

  const renderModals = () => (
    <>
      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja continuar editando ou descartar?"
          confirmText="Continuar editando"
          cancelText="Descartar alterações"
          onConfirm={continueEditing}
          onCancel={() => {
            discardChanges();
            navigate(-1);
          }}
        />
      )}

      {task && isOwner && !isAdmin && (
        <TransferResponsibilityModal
          isOpen={transferModalOpen}
          currentOwner={{ id: currentUser?.id || '', name: currentUser?.name || '' }}
          collaborators={(task.collaboratorIds || [])
            .map(id => users.find(u => u.id === id))
            .filter((u): u is typeof users[0] => !!u)
            .map(u => ({ id: u.id, name: u.name }))}
          onConfirm={handleTransferResponsibility}
          onCancel={() => setTransferModalOpen(false)}
        />
      )}
      {deleteConfirmation && (
        <ConfirmationModal
          isOpen={!!deleteConfirmation}
          title={deleteConfirmation.force ? "Exclusão Forçada de Tarefa" : "Excluir Tarefa"}
          message={
            deleteConfirmation.force
              ? "Esta tarefa possui horas apontadas. Deseja realizar a EXCLUSÃO FORÇADA, removendo a tarefa e TODOS os apontamentos de horas vinculados? Esta ação é irreversível."
              : "Tem certeza que deseja excluir esta tarefa permanentemente?"
          }
          confirmText={deleteConfirmation.force ? "Sim, excluir tudo" : "Sim, excluir"}
          cancelText="Cancelar"
          onConfirm={() => performDelete().catch(console.error)}
          onCancel={() => setDeleteConfirmation(null)}
        />
      )}
    </>
  );

  if (!isNew && !task) {
    return <div className="p-8 text-center" style={{ color: 'var(--textMuted)' }}>Tarefa não encontrada.</div>;
  }

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {renderHeader()}

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-7xl mx-auto space-y-4">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch h-full">
            {/* LADO ESQUERDO (2/3) - Grade interna de cards compactos */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {renderIdentification()}
              {renderTimelineBlock()}
              <div className="md:col-span-1 h-full">
                {renderTeamMetricsBlock()}
              </div>
              <div className="md:col-span-1 h-full">
                {renderEffortBlock()}
              </div>
            </div>

            {/* LADO DIREITO (1/3) - ESTICADO ATÉ O CHÃO */}
            <div className="lg:col-span-1 h-full">
              {renderStatusPriorityBlock()}
            </div>
          </div>
        </div>
      </div>

      {renderModals()}
    </div>
  );
};

export default TaskDetail;
