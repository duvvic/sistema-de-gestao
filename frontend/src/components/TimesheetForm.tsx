// components/TimesheetForm.tsx - Adaptado para Router
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { TimesheetEntry } from '@/types';
import { ArrowLeft, Save, Clock, Trash2, User as UserIcon, Briefcase, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import TimePicker from './TimePicker';

const TimesheetForm: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const { users, clients, projects, tasks, timesheetEntries, createTimesheet, updateTimesheet, deleteTimesheet, updateTask } = useDataController();

  const isNew = !entryId || entryId === 'new';
  const initialEntry = !isNew ? timesheetEntries.find(e => e.id === entryId) : null;
  const preSelectedDate = searchParams.get('date');
  const preSelectedUserId = searchParams.get('userId');
  const preSelectedTaskId = searchParams.get('taskId');
  const preSelectedProjectId = searchParams.get('projectId');
  const preSelectedClientId = searchParams.get('clientId');
  const user = currentUser;


  const isEditing = !!initialEntry;

  const [formData, setFormData] = useState<Partial<TimesheetEntry>>({
    clientId: '',
    projectId: '',
    taskId: '',
    date: preSelectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    description: '',
    userId: user?.id,
    userName: user?.name,
    lunchDeduction: true
  });

  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [deductLunch, setDeductLunch] = useState(true);
  const [loading, setLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<TimesheetEntry | null>(null);
  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

  // Validate time range 07:30 - 19:00
  const validateAndSetTime = (field: 'startTime' | 'endTime', val: string) => {
    markDirty();
    let newVal = val;

    if (newVal < "07:30") newVal = "07:30";
    if (newVal > "19:00") newVal = "19:00";

    setFormData(prev => ({ ...prev, [field]: newVal }));
  };

  // Init form
  useEffect(() => {
    if (initialEntry) {
      setFormData(initialEntry);
      if (initialEntry.lunchDeduction !== undefined) {
        setDeductLunch(initialEntry.lunchDeduction);
      }
    } else if (isAdmin && preSelectedUserId) {
      const targetUser = users.find(u => u.id === preSelectedUserId);
      if (targetUser) {
        setFormData(prev => ({
          ...prev,
          userId: targetUser.id,
          userName: targetUser.name,
          lunchDeduction: true
        }));
      }
    } else if (user) {
      // SMART DEFAULT: Find existing entries for this user on this day to suggest a start time
      const targetDate = preSelectedDate || new Date().toISOString().split('T')[0];
      const targetUserId = preSelectedUserId || user.id;

      const dayEntries = timesheetEntries
        .filter(e => e.date === targetDate && e.userId === targetUserId)
        .sort((a, b) => (b.endTime || '').localeCompare(a.endTime || ''));

      const lastEndTime = dayEntries.length > 0 ? dayEntries[0].endTime : '09:00';
      const suggestedEnd = lastEndTime === '18:00' ? '18:00' : (lastEndTime > '18:00' ? lastEndTime : '18:00');

      setFormData(prev => ({
        ...prev,
        userId: targetUserId,
        userName: isAdmin ? (users.find(u => u.id === targetUserId)?.name || user.name) : user.name,
        clientId: preSelectedClientId || prev.clientId,
        projectId: preSelectedProjectId || prev.projectId,
        taskId: preSelectedTaskId || prev.taskId,
        date: targetDate,
        startTime: lastEndTime,
        endTime: suggestedEnd,
        lunchDeduction: dayEntries.length === 0 // Default to true only for the first entry of the day
      }));
    }
  }, [initialEntry, user, isAdmin, preSelectedUserId, users, preSelectedClientId, preSelectedProjectId, preSelectedTaskId, preSelectedDate, timesheetEntries]);

  // Update progress when task changes
  useEffect(() => {
    if (formData.taskId) {
      const selectedTask = tasks.find(t => t.id === formData.taskId);
      if (selectedTask) {
        setTaskProgress(selectedTask.progress || 0);
      }
    }
  }, [formData.taskId, tasks]);

  // Helpers
  const calculateTotalHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    return Number((diffMinutes / 60).toFixed(2));
  };

  const calculateTimeDisplay = (start: string, end: string, deduct: boolean) => {
    if (!start || !end) return '0h 0min';
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    if (deduct) diffMinutes = Math.max(0, diffMinutes - 60);

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return minutes > 0 ? `${hours}h${minutes.toString().padStart(2, '0')}` : `${hours}h`;
  };

  // Determine the display hours: if we have both times, calculate. Otherwise, use what's in the DB (formData.totalHours).
  const hasTimes = !!formData.startTime && !!formData.endTime;

  const totalHours = hasTimes
    ? calculateTotalHours(formData.startTime!, formData.endTime!)
    : (formData.totalHours || 0);

  const adjustedTotalHours = hasTimes && deductLunch ? Math.max(0, totalHours - 1) : totalHours;

  const timeDisplay = hasTimes
    ? calculateTimeDisplay(formData.startTime!, formData.endTime!, deductLunch)
    : `${formData.totalHours || 0}h`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.projectId || !formData.taskId || !formData.date || !formData.startTime || !formData.endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const selectedTask = tasks.find(t => t.id === formData.taskId);
    const isTaskCurrentlyDone = selectedTask?.status === 'Done' || selectedTask?.actualDelivery != null;
    const willBeCompleted = !isTaskCurrentlyDone && taskProgress === 100;

    const entry: TimesheetEntry = {
      id: initialEntry?.id || crypto.randomUUID(),
      userId: formData.userId || user?.id || '',
      userName: formData.userName || user?.name || '',
      clientId: formData.clientId!,
      projectId: formData.projectId!,
      taskId: formData.taskId!,
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      totalHours: adjustedTotalHours,
      description: formData.description,
      lunchDeduction: deductLunch,
    };

    if (willBeCompleted) {
      setPendingSave(entry);
      setCompletionModalOpen(true);
      return;
    }

    if (adjustedTotalHours > 11) {
      setPendingSave(entry);
      setWarningModalOpen(true);
      return;
    }

    await saveEntry(entry, selectedTask && !isTaskCurrentlyDone ? taskProgress : undefined);
  };

  const saveEntry = async (entry: TimesheetEntry, progressToUpdate?: number) => {
    setLoading(true);
    try {
      // Update task progress if needed
      if (progressToUpdate !== undefined && entry.taskId) {
        await updateTask(entry.taskId, { progress: progressToUpdate });
      }

      if (isNew) {
        await createTimesheet(entry);
        alert("Apontamento criado com sucesso!");
      } else {
        await updateTimesheet(entry);
        alert("Apontamento atualizado!");
      }

      discardChanges();
      navigate(-1);
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!pendingSave) return;
    // Mark as Done (100%)
    if (pendingSave.taskId) {
      await updateTask(pendingSave.taskId, { progress: 100, status: 'Done', actualDelivery: new Date().toISOString() });
    }
    await saveEntry(pendingSave);
    setCompletionModalOpen(false);
    setPendingSave(null);
  };

  const handleDelete = async () => {
    if (!initialEntry) return;
    setLoading(true);
    try {
      await deleteTimesheet(initialEntry.id);
      setDeleteModalOpen(false);
      navigate(-1);
    } catch (e) {
      alert("Erro ao excluir.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = useCallback(() => {
    const canGoBack = requestBack();
    if (canGoBack) navigate(-1);
  }, [requestBack, navigate]);

  // Filter Logic
  const { projectMembers } = useDataController();

  const availableProjectsIds = React.useMemo(() => {
    if (isAdmin) return projects.map(p => p.id);

    // Projetos onde o usuário é membro oficial
    const memberProjectIds = projectMembers
      .filter(pm => pm.userId === user?.id)
      .map(pm => pm.projectId);

    // Projetos que contêm tarefas vinculadas ao usuário
    const taskProjectIds = tasks
      .filter(t => t.developerId === user?.id || t.collaboratorIds?.includes(user?.id || ''))
      .map(t => t.projectId);

    // Combinar ambos e remover duplicatas
    return [...new Set([...memberProjectIds, ...taskProjectIds])];
  }, [projectMembers, tasks, user, isAdmin, projects]);

  const availableProjects = projects.filter(p =>
    availableProjectsIds.includes(p.id) &&
    (!formData.clientId || p.clientId === formData.clientId)
  );

  const availableClientIds = React.useMemo(() => {
    if (isAdmin) return clients.map(c => c.id);

    const activeCargos = ['desenvolvedor', 'infraestrutura de ti'];
    const isOperational = activeCargos.includes(currentUser?.cargo?.toLowerCase() || '');

    if (!isOperational) {
      return clients
        .filter(c => c.name.toLowerCase().includes('nic-labs'))
        .map(c => c.id);
    }

    const userProjects = projects.filter(p => availableProjectsIds.includes(p.id));
    return [...new Set(userProjects.map(p => p.clientId))];
  }, [clients, projects, availableProjectsIds, isAdmin, currentUser]);

  const filteredClients = clients.filter(c => availableClientIds.includes(c.id));
  const filteredProjects = availableProjects;

  // Filtrar tarefas: mostrar apenas as vinculadas ao usuário (exceto para admin)
  const filteredTasks = tasks.filter(t => {
    // Primeiro filtro: deve pertencer ao projeto selecionado (se houver)
    if (formData.projectId && t.projectId !== formData.projectId) return false;

    // Se for admin, mostra todas as tarefas do projeto
    if (isAdmin) return true;

    // Para usuários normais: mostrar apenas tarefas onde ele é desenvolvedor ou colaborador
    const isTaskDeveloper = t.developerId === user?.id;
    const isTaskCollaborator = t.collaboratorIds?.includes(user?.id || '');

    return isTaskDeveloper || isTaskCollaborator;
  });

  const isTaskLogMode = !!preSelectedTaskId;
  const canEnterTime = !!formData.clientId && !!formData.projectId && !!formData.taskId;
  const currentTaskTitle = tasks.find(t => t.id === formData.taskId)?.title;

  if (!user) return <div className="p-8">Usuário não identificado</div>;

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
      {/* Compact Header */}
      <div className="px-6 py-3 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] border-b flex items-center justify-between sticky top-0 z-20 shadow-sm shrink-0"
        style={{ borderColor: 'white/10' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-1.5 rounded-full transition-colors hover:bg-white/20 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="leading-tight">
            {isTaskLogMode ? (
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">Apontando em</span>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  {currentTaskTitle || 'Tarefa Selecionada'}
                </h1>
              </div>
            ) : (
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {isEditing ? '✏️ Editar' : '➕ Novo'} Apontamento
              </h1>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 font-bold shadow-sm text-sm"
            >
              <Trash2 className="w-3 h-3" />
              Excluir
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !canEnterTime}
            className="bg-white hover:bg-slate-50 text-[var(--primary)] px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-2 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3 h-3" />
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        <div className={`grid gap-4 h-full ${isTaskLogMode ? 'grid-cols-1 max-w-xl mx-auto w-full' : 'grid-cols-1 lg:grid-cols-2'}`}>

          {/* Left Column: Project Info (Hidden in Task Log Mode) */}
          {!isTaskLogMode && (
            <div className="flex flex-col gap-4 min-h-0">
              <div className="p-5 rounded-xl border shadow-sm flex-1 flex flex-col gap-4 overflow-y-auto" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                  <UserIcon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <h2 className="font-bold text-sm uppercase tracking-wider">Projeto & Dados</h2>
                </div>

                <div className="space-y-3 flex-1 flex flex-col">
                  {/* Collaborator */}
                  <div>
                    <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Colaborador</label>
                    {isAdmin ? (
                      <select
                        value={formData.userId || ''}
                        onChange={(e) => {
                          const u = users.find(user => user.id === e.target.value);
                          markDirty();
                          setFormData({ ...formData, userId: u?.id || '', userName: u?.name || '' });
                        }}
                        disabled={isEditing}
                        className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ backgroundColor: isEditing ? 'var(--surface-2)' : 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Selecione...</option>
                        {users.filter(u => u.active !== false).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full p-2.5 border rounded-lg font-bold text-sm opacity-80"
                        style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                        {formData.userName || ''}
                      </div>
                    )}
                  </div>

                  {/* Client & Project Row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Cliente *</label>
                      <select
                        value={formData.clientId}
                        onChange={(e) => { markDirty(); setFormData({ ...formData, clientId: e.target.value, projectId: '', taskId: '' }); }}
                        disabled={isEditing}
                        className="w-full p-2.5 border rounded-lg outline-none font-bold text-sm transition-all focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ backgroundColor: isEditing ? 'var(--surface-2)' : 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Selecione...</option>
                        {filteredClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Projeto *</label>
                      <select
                        value={formData.projectId}
                        onChange={(e) => { markDirty(); setFormData({ ...formData, projectId: e.target.value, taskId: '' }); }}
                        disabled={!formData.clientId || isEditing}
                        className="w-full p-2.5 border rounded-lg outline-none font-bold text-sm transition-all focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: isEditing ? 'var(--surface-2)' : 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Selecione...</option>
                        {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Task */}
                  <div>
                    <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Tarefa *</label>
                    <select
                      value={formData.taskId}
                      onChange={(e) => { markDirty(); setFormData({ ...formData, taskId: e.target.value }); }}
                      disabled={!formData.projectId || isEditing}
                      className="w-full p-2.5 border rounded-lg outline-none font-bold text-sm transition-all focus:ring-1 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: isEditing ? 'var(--surface-2)' : 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">Selecione a tarefa...</option>
                      {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                    </select>
                  </div>

                  {/* Notes in Standard Mode */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <label className="block text-[10px] font-bold mb-1 flex items-center gap-2 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>
                      <AlertCircle className="w-3 h-3" /> Notas
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
                      className="w-full p-3 border rounded-lg outline-none resize-none font-medium text-sm transition-all focus:ring-1 focus:ring-amber-500 flex-1"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="Descrição da atividade..."
                    />
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* Right Column: Time Info */}
          <div className="relative flex flex-col min-h-0">
            {!canEnterTime && !isTaskLogMode && (
              <div className="absolute inset-0 z-10 backdrop-blur-sm bg-[var(--bg)]/50 flex flex-col items-center justify-center text-center p-6 border rounded-xl border-dashed" style={{ borderColor: 'var(--border)' }}>
                <div className="w-12 h-12 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6 text-[var(--muted)]" />
                </div>
                <h3 className="font-bold text-[var(--text)]">Aguardando Dados</h3>
                <p className="text-sm text-[var(--muted)] max-w-xs mt-1">Selecione um cliente, projeto e tarefa para liberar o apontamento de horas.</p>
              </div>
            )}

            <div className={`p-5 rounded-xl border shadow-sm flex flex-col gap-4 overflow-y-auto h-full ${!canEnterTime && !isTaskLogMode ? 'opacity-40 pointer-events-none' : ''}`} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              {isTaskLogMode && (
                // Minimal Project Info Header for Task Mode
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-dashed" style={{ borderColor: 'var(--border)' }}>
                  <Briefcase className="w-3 h-3 text-[var(--muted)]" />
                  <span className="text-xs font-bold text-[var(--muted)]">
                    {clients.find(c => c.id === formData.clientId)?.name}
                    <span className="mx-1">/</span>
                    {projects.find(p => p.id === formData.projectId)?.name}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                <Clock className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                <h2 className="font-bold text-sm uppercase tracking-wider">Horário & Jornada</h2>
              </div>

              <div className="space-y-4 flex-1">
                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Data *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => { markDirty(); setFormData({ ...formData, date: e.target.value }); }}
                    className="w-full p-2.5 border rounded-lg outline-none font-bold text-sm shadow-sm focus:ring-1 focus:ring-[var(--ring)]"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <TimePicker
                    label="Início *"
                    icon={<Clock className="w-3 h-3 text-emerald-500" />}
                    value={formData.startTime || '09:00'}
                    onChange={(val) => validateAndSetTime('startTime', val)}
                  />
                  <TimePicker
                    label="Fim *"
                    icon={<Clock className="w-3 h-3 text-red-500" />}
                    value={formData.endTime || '18:00'}
                    onChange={(val) => validateAndSetTime('endTime', val)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setFormData(prev => ({ ...prev, startTime: '08:00', endTime: '17:00' }));
                    }}
                    className="flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border hover:bg-[var(--surface-hover)] hover:shadow-sm"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    Turno 1 (08-17)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setFormData(prev => ({ ...prev, startTime: '08:30', endTime: '17:30' }));
                    }}
                    className="flex-1 py-2 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border hover:bg-[var(--surface-hover)] hover:shadow-sm"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                  >
                    Turno 2 (08:30-17:30)
                  </button>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer hover:bg-[var(--surface-2)] transition-colors"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                  onClick={() => { setDeductLunch(!deductLunch); markDirty(); }}>
                  <input
                    type="checkbox"
                    checked={deductLunch}
                    onChange={() => { }}
                    className="w-4 h-4 rounded text-[var(--primary)] pointer-events-none"
                  />
                  <span className="text-xs font-bold select-none" style={{ color: 'var(--text)' }}>Descontar 1h de almoço</span>
                </div>

                {/* Total & Progress */}
                <div className="flex justify-between items-center p-4 rounded-xl border shadow-inner mt-2"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  <div className="flex flex-col">
                    <span className="font-extrabold text-[10px] uppercase tracking-widest opacity-50" style={{ color: 'var(--text)' }}>Total deste lançamento:</span>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>
                      {deductLunch ? '(Considerando 1h de almoço)' : '(Sem desconto de almoço)'}
                    </span>
                  </div>
                  <div className={`text-4xl font-black transition-all ${adjustedTotalHours > 11 ? 'text-red-500 scale-110' : ''}`} style={{ color: adjustedTotalHours > 11 ? undefined : 'var(--primary)' }}>
                    {timeDisplay}
                  </div>
                </div>

                {formData.taskId && (
                  <div className="pt-2">
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>Progresso</label>
                      <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>{taskProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={taskProgress}
                      onChange={(e) => { markDirty(); setTaskProgress(Number(e.target.value)); }}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                      style={{ backgroundColor: 'var(--border)' }}
                    />
                  </div>
                )}

                {/* Notes in Task Mode (moved from left column) */}
                {isTaskLogMode && (
                  <div className="mt-4">
                    <label className="block text-[10px] font-bold mb-1 flex items-center gap-2 uppercase tracking-wider opacity-70" style={{ color: 'var(--muted)' }}>
                      <AlertCircle className="w-3 h-3" /> Notas
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
                      className="w-full p-3 border rounded-lg outline-none resize-none font-medium text-sm transition-all focus:ring-1 focus:ring-amber-500 h-24"
                      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      placeholder="Descrição da atividade..."
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={completionModalOpen}
        title="Concluir Tarefa?"
        message="A tarefa atingiu 100% de progresso. Deseja marcá-la como concluída e salvar?"
        onConfirm={handleConfirmCompletion}
        onCancel={() => { setCompletionModalOpen(false); setPendingSave(null); }}
      />
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Apontamento"
        message="Confirmar exclusão?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
      <ConfirmationModal
        isOpen={warningModalOpen}
        title="Jornada Excessiva!"
        message="Você apontou mais de 11 horas neste registro. Isso é incomum. Deseja realmente salvar?"
        confirmText="Sim, Salvar"
        cancelText="Revisar"
        onConfirm={async () => {
          if (pendingSave) {
            setWarningModalOpen(false);
            await saveEntry(pendingSave, tasks.find(t => t.id === pendingSave.taskId)?.progress);
            setPendingSave(null);
          }
        }}
        onCancel={() => { setWarningModalOpen(false); setPendingSave(null); }}
      />
      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Você tem alterações não salvas. Deseja continuar editando ou descartar?"
          confirmText="Continuar editando"
          cancelText="Descartar alterações"
          onConfirm={continueEditing}
          onCancel={() => { discardChanges(); handleBack(); }}
        />
      )}
    </div>
  );
};

export default TimesheetForm;
