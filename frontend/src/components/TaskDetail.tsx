import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import { ArrowLeft, Save, Calendar, PieChart, Briefcase, User as UserIcon, StickyNote, AlertTriangle, ShieldAlert, CheckSquare, Clock } from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, projectMembers, timesheetEntries, createTask, updateTask } = useDataController();
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

  // Cálculos de Horas e Progresso
  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + entry.totalHours, 0);
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
        developer: prev.developer || currentUser?.name || '',
        developerId: prev.developerId || currentUser?.id || ''
      }));
    }
  }, [task, currentUser, preSelectedClientId, preSelectedProjectId, projects]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent standard form submission


    if (!formData.projectId || !formData.clientId || !formData.title) {
      alert("Preencha todos os campos obrigatórios (Título, Cliente, Projeto)");
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
        // Garante que o responsável seja o usuário logado na criação se nenhum for selecionado
        developerId: formData.developerId || (isNew ? currentUser?.id : formData.developerId),
        developer: formData.developer || (isNew ? currentUser?.name : formData.developer)
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

  // Derived values
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedProject = projects.find(p => p.id === formData.projectId);


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

  if (!isNew && !task) {
    return <div className="p-8 text-center" style={{ color: 'var(--textMuted)' }}>Tarefa não encontrada.</div>;
  }

  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');
  const canEdit = isAdmin || isOwner || isCollaborator || isNew;

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="px-8 py-6 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              {isNew ? 'Criar Nova Tarefa' : 'Detalhes da Tarefa'}
              {daysDelayed > 0 && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--danger-soft)', color: 'var(--danger)' }}>
                  <AlertTriangle className="w-3 h-3" /> Atrasada ({daysDelayed} dias)
                </span>
              )}
              {isCollaborator && !isAdmin && (
                <span className="text-[10px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--info-soft)', color: 'var(--info)' }}>
                  <ShieldAlert className="w-3 h-3" /> Colaborador
                </span>
              )}
            </h1>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              {isNew ? 'Preencha os dados para iniciar' : `ID: #${task?.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-white px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-bold disabled:opacity-50 transform active:scale-95"
            style={{ backgroundColor: 'var(--primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        )}

        {isTaskCompleted && (
          <div className="px-6 py-2.5 rounded-xl flex items-center gap-2 font-bold border shadow-sm"
            style={{ backgroundColor: 'var(--success-soft)', color: 'var(--success)', borderColor: 'var(--success)' }}>
            <CheckSquare className="w-4 h-4" />
            Finalizada {task?.actualDelivery && ` em ${task.actualDelivery.split('-').reverse().slice(0, 2).join('/')}`}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Main Form Area (Center) */}
          <div className="lg:col-span-3 space-y-8">

            {/* Context Section (Client/Project) */}
            <div className={`p-6 rounded-2xl border shadow-sm space-y-6 transition-all`}
              style={{
                backgroundColor: daysDelayed > 0 ? 'var(--danger-soft)' : 'var(--surface)',
                borderColor: daysDelayed > 0 ? 'var(--danger)' : 'var(--border)'
              }}>
              <h3 className={`text-sm font-bold flex items-center gap-2 uppercase tracking-wider`}
                style={{ color: daysDelayed > 0 ? 'var(--danger)' : 'var(--text)' }}>
                <Briefcase className={`w-4 h-4`} style={{ color: daysDelayed > 0 ? 'var(--danger)' : 'var(--primary)' }} />
                Contexto do Projeto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Cliente *</label>
                  <select
                    value={formData.clientId || ''}
                    onChange={(e) => { markDirty(); setFormData({ ...formData, clientId: e.target.value, projectId: '' }); }}
                    className="w-full p-3 border rounded-xl outline-none transition-all disabled:opacity-60 shadow-sm focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    disabled={!isNew || !!preSelectedClientId}
                  >
                    <option value="">Selecione um cliente...</option>
                    {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Projeto *</label>
                  <select
                    value={formData.projectId || ''}
                    onChange={(e) => { markDirty(); setFormData({ ...formData, projectId: e.target.value }); }}
                    className="w-full p-3 border rounded-xl outline-none transition-all disabled:opacity-60 shadow-sm focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    disabled={!formData.clientId || !isNew || !!preSelectedProjectId}
                  >
                    <option value="">{formData.clientId ? 'Selecione um projeto...' : 'Selecione um cliente primeiro'}</option>
                    {formData.clientId && filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Task Details Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Nome da Tarefa *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, title: e.target.value }); }}
                  placeholder="Ex: Criar Wireframes da Home"
                  className="w-full p-4 text-lg font-bold border rounded-xl outline-none shadow-sm transition-all disabled:opacity-60 focus:ring-2 focus:ring-[var(--ring)]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  disabled={!canEdit || (isCollaborator && !isAdmin && !isOwner)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Descrição</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
                  rows={4}
                  className="w-full p-4 border rounded-xl outline-none shadow-sm resize-none transition-all disabled:opacity-60 focus:ring-2 focus:ring-[var(--ring)]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  placeholder="Detalhes adicionais sobre a tarefa..."
                  disabled={isCollaborator && !isAdmin && !isOwner}
                />
              </div>

              {/* Notes Field */}
              <div>
                <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <StickyNote className="w-4 h-4 opacity-50" /> Observações Rápidas
                </label>
                <input
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, notes: e.target.value }); }}
                  placeholder="Ex: Aguardando aprovação do cliente"
                  className="w-full p-3 border rounded-xl outline-none transition-all disabled:opacity-60 shadow-sm focus:ring-2 focus:ring-[var(--ring)]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  disabled={!canEdit || (isCollaborator && !isAdmin && !isOwner)}
                />
              </div>

            </div>
          </div>

          {/* Sidebar / Metadata (Right) */}
          <div className="space-y-6">

            {/* Status Block */}
            <div className="p-6 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-bold border-b pb-3 uppercase tracking-wider" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>Status & Entrega</h3>
              <div>
                <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <PieChart className="w-4 h-4" /> Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, status: e.target.value as Status }); }}
                  className="w-full p-3 border rounded-xl outline-none transition-all disabled:opacity-60 shadow-sm focus:ring-2 focus:ring-[var(--ring)]"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  disabled={isCollaborator && !isAdmin && !isOwner}
                >
                  <option value="Todo">Não Iniciado</option>
                  <option value="In Progress">Iniciado</option>
                  <option value="Review">Pendente</option>
                  <option value="Done">Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-3 flex justify-between uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <span>Progresso</span>
                  <span className="font-black" style={{ color: 'var(--primary)' }}>{formData.progress}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.progress}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, progress: Number(e.target.value) }); }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--border)' }}
                  disabled={!canEdit}
                />
              </div>

              {/* Priority - Admin Only */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Prioridade</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => { markDirty(); setFormData({ ...formData, priority: e.target.value as Priority }); }}
                    className="w-full p-3 border rounded-xl text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Low">Baixa</option>
                    <option value="Medium">Média</option>
                    <option value="High">Alta</option>
                    <option value="Critical">Crítica</option>
                  </select>
                </div>
              )}

              {/* Developer Assignment */}
              <div>
                <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <UserIcon className="w-4 h-4" /> Responsável
                </label>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center group">
                    {(() => {
                      const dev = users.find(u => u.id === formData.developerId);
                      return (
                        <>
                          <div
                            className="w-11 h-11 rounded-full border-2 border-[var(--primary)] p-0.5 flex items-center justify-center overflow-hidden z-10 bg-[var(--surface)] shadow-lg"
                          >
                            {dev?.avatarUrl ? (
                              <img src={dev.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                            ) : (
                              <div className="w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-xs font-black">
                                {formData.developer?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 -ml-4 pl-7 pr-4 py-2.5 rounded-r-2xl border border-l-0 shadow-sm transition-all"
                            style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                            <span className="text-sm font-black tracking-tight" style={{ color: 'var(--text)' }}>
                              {formData.developer || 'Sem responsável'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {isAdmin && (
                    <select
                      value={formData.developerId || ''}
                      onChange={(e) => {
                        const nextOwnerId = e.target.value;
                        const selectedUser = users.find(u => u.id === nextOwnerId);
                        const oldOwnerId = formData.developerId;

                        markDirty();

                        // New collaborator list: remove new owner, add old owner
                        let newCollabs = [...(formData.collaboratorIds || [])];
                        if (nextOwnerId) {
                          newCollabs = newCollabs.filter(id => id !== nextOwnerId);
                        }
                        if (oldOwnerId && !newCollabs.includes(oldOwnerId) && oldOwnerId !== nextOwnerId) {
                          newCollabs.push(oldOwnerId);
                        }

                        setFormData({
                          ...formData,
                          developerId: nextOwnerId,
                          developer: selectedUser?.name || '',
                          collaboratorIds: newCollabs
                        });
                      }}
                      className="w-full p-2.5 border rounded-xl text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">Trocar responsável...</option>
                      {users
                        .filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))
                      }
                    </select>
                  )}
                </div>
              </div>

              {/* Multiple Collaborators Selection - Somente Admin ou Responsável */}
              {(isAdmin || isOwner || isNew) && (
                <div>
                  <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                    <UserIcon className="w-4 h-4" /> Colaboradores Extras
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-xl shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {(() => {
                      const projectMemberIds = projectMembers
                        .filter(pm => String(pm.id_projeto) === formData.projectId)
                        .map(pm => String(pm.id_colaborador));

                      const filteredUsers = users.filter(u =>
                        u.active !== false &&
                        projectMemberIds.includes(u.id) &&
                        u.id !== formData.developerId // Não listar o dono
                      );

                      if (filteredUsers.length === 0) {
                        return <p className="text-[10px] text-center py-2" style={{ color: 'var(--muted)' }}>Nenhum outro membro no projeto</p>;
                      }

                      return filteredUsers.map(u => (
                        <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            disabled={!(isAdmin || formData.developerId === currentUser?.id)}
                            checked={formData.collaboratorIds?.includes(u.id) || false}
                            onChange={(e) => {
                              markDirty();
                              const current = formData.collaboratorIds || [];
                              if (e.target.checked) {
                                setFormData({ ...formData, collaboratorIds: [...current, u.id] });
                              } else {
                                setFormData({ ...formData, collaboratorIds: current.filter(id => id !== u.id) });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span className="text-xs" style={{ color: 'var(--text)' }}>{u.name}</span>
                        </label>
                      ));
                    })()}
                  </div>
                  <p className="text-[9px] mt-1 italic" style={{ color: 'var(--muted)' }}>* Apenas membros do mesmo projeto podem ser adicionados.</p>
                </div>
              )}

              {/* Transfer Responsibility Button - Only for owners with collaborators */}
              {isOwner && !isAdmin && !isNew && task && (task.collaboratorIds || []).length > 0 && (
                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="w-full p-3 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 mt-4"
                  style={{
                    backgroundColor: 'var(--warning-soft)',
                    borderColor: 'var(--warning)',
                    color: 'var(--warning-text)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--warning)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--warning-soft)'}
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                  Transferir Responsabilidade
                </button>
              )}
            </div>

            {/* Dates Block */}
            <div className="p-6 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-bold border-b pb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                <Calendar className="w-4 h-4 text-[var(--primary)]" /> Cronograma
              </h3>
              <div>
                <label className="block text-[10px] font-black mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Início Previsto</label>
                <input
                  type="date"
                  value={formData.scheduledStart || ''}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, scheduledStart: e.target.value }); }}
                  className="w-full p-3 border border-[var(--border)] rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all disabled:opacity-60"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  disabled={isCollaborator && !isAdmin && !isOwner}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Entrega Estimada (Fim)</label>
                <input
                  type="date"
                  value={formData.estimatedDelivery}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, estimatedDelivery: e.target.value }); }}
                  className={`w-full p-3 border rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all disabled:opacity-60`}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: daysDelayed > 0 ? 'var(--danger)' : 'var(--border)',
                    color: daysDelayed > 0 ? 'var(--danger)' : 'var(--text)'
                  }}
                  disabled={isCollaborator && !isAdmin && !isOwner}
                />
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-wider text-blue-500">Início Real</label>
                    <input
                      type="date"
                      value={formData.actualStart || ''}
                      className="w-full p-2 border border-[var(--border)] rounded-lg text-xs font-bold outline-none bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                      style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}
                      disabled
                      readOnly
                      title="Preenchido automaticamente quando a tarefa muda para 'Iniciado'"
                    />
                    <p className="text-[8px] text-slate-400 mt-1 italic">Auto: ao iniciar tarefa</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black mb-1 uppercase tracking-wider text-green-500">Fim Real</label>
                    <input
                      type="date"
                      value={formData.actualDelivery || ''}
                      className="w-full p-2 border border-[var(--border)] rounded-lg text-xs font-bold outline-none bg-slate-50 dark:bg-slate-800 cursor-not-allowed"
                      style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}
                      disabled
                      readOnly
                      title="Preenchido automaticamente quando a tarefa muda para 'Concluído'"
                    />
                    <p className="text-[8px] text-slate-400 mt-1 italic">Auto: ao concluir tarefa</p>
                  </div>
                </div>
              )}
            </div>

            {/* Gestão de Horas - Somente Admin */}
            {isAdmin && (
              <div className="p-6 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="text-sm font-bold border-b pb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                  <Clock className="w-4 h-4 text-emerald-500" /> Gestão de Esforço
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Horas Previstas</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.estimatedHours || 0}
                      onChange={(e) => { markDirty(); setFormData({ ...formData, estimatedHours: Number(e.target.value) }); }}
                      className="w-full p-3 border border-[var(--border)] rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-emerald-400"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Consumido (Real)</label>
                    <div className="w-full p-3 border rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-sm transition-all"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
                      <span className={actualHoursSpent > (formData.estimatedHours || 0) ? 'text-red-500' : 'text-emerald-500'}>
                        {actualHoursSpent}h
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>/ {formData.estimatedHours || 0}h</span>
                    </div>
                  </div>
                </div>

                {/* Progress Summary */}
                <div className="bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400">Progresso Planejado</span>
                    <span className="text-xs font-black text-slate-600">{plannedProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 transition-all" style={{ width: `${plannedProgress}%` }} />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-purple-400">Progresso Real</span>
                    <span className="text-xs font-black text-purple-600">{formData.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600 transition-all" style={{ width: `${formData.progress}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
    </div>
  );
};



export default TaskDetail;
