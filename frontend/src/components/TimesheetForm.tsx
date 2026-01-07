// components/TimesheetForm.tsx - Adaptado para Router
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { TimesheetEntry } from '@/types';
import { ArrowLeft, Save, Clock, Trash2, User as UserIcon, Briefcase, CheckSquare, Calendar, AlertCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';

const TimesheetForm: React.FC = () => {
  const { entryId } = useParams<{ entryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { users, clients, projects, tasks, timesheetEntries, createTimesheet, updateTimesheet, deleteTimesheet, updateTask } = useDataController();

  const isNew = !entryId || entryId === 'new';
  const initialEntry = !isNew ? timesheetEntries.find(e => e.id === entryId) : null;
  const preSelectedDate = searchParams.get('date');
  const preSelectedUserId = searchParams.get('userId');
  const preSelectedTaskId = searchParams.get('taskId');
  const preSelectedProjectId = searchParams.get('projectId');
  const preSelectedClientId = searchParams.get('clientId');
  const user = currentUser;

  const isAdmin = currentUser?.role === 'admin';
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
    lunchDeduction: false
  });

  const [taskProgress, setTaskProgress] = useState<number>(0);
  const [deductLunch, setDeductLunch] = useState(false);
  const [loading, setLoading] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<TimesheetEntry | null>(null);
  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

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
          userName: targetUser.name
        }));
      }
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        userId: user.id,
        userName: user.name,
        clientId: preSelectedClientId || prev.clientId,
        projectId: preSelectedProjectId || prev.projectId,
        taskId: preSelectedTaskId || prev.taskId,
        date: preSelectedDate || prev.date
      }));
    }
  }, [initialEntry, user, isAdmin, preSelectedUserId, users, preSelectedClientId, preSelectedProjectId, preSelectedTaskId, preSelectedDate]);

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

  const totalHours = calculateTotalHours(formData.startTime || '00:00', formData.endTime || '00:00');
  const adjustedTotalHours = deductLunch ? Math.max(0, totalHours - 1) : totalHours;
  const timeDisplay = calculateTimeDisplay(formData.startTime || '00:00', formData.endTime || '00:00', deductLunch);

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
  // Allow seeing all projects if admin, or filter by user assignment if restricted? 
  // For now assuming all projects are selectable if clientId matches
  const filteredProjects = projects.filter(p => !formData.clientId || p.clientId === formData.clientId);
  // Tasks filtered by project
  const filteredTasks = tasks.filter(t => !formData.projectId || t.projectId === formData.projectId);

  if (!user) return <div className="p-8">Usuário não identificado</div>;

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="px-8 py-6 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] border-b flex items-center justify-between sticky top-0 z-20 shadow-sm"
        style={{ borderColor: 'white/10' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 rounded-full transition-colors hover:bg-white/20 text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEditing ? '✏️ Editar Apontamento' : '➕ Novo Apontamento'}
            </h1>
            <p className="text-sm text-white/80 font-medium">Registre suas atividades e horas trabalhadas</p>
          </div>
        </div>
        <div className="flex gap-3">
          {isEditing && (
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 font-bold shadow-lg transform active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-[var(--primary)] px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 font-bold transform active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">

          {/* Context Card */}
          <div className="p-8 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <UserIcon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h2 className="font-bold text-lg uppercase tracking-wider text-sm">Informações do Projeto</h2>
            </div>

            <div>
              <label className="block text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Colaborador</label>
              {isAdmin ? (
                <select
                  value={formData.userId || ''}
                  onChange={(e) => {
                    const u = users.find(user => user.id === e.target.value);
                    markDirty();
                    setFormData({ ...formData, userId: u?.id || '', userName: u?.name || '' });
                  }}
                  className="w-full p-4 border rounded-xl outline-none font-medium transition-all focus:ring-2 focus:ring-[var(--ring)] shadow-sm"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Selecione um colaborador...</option>
                  {users.filter(u => u.active !== false).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.userName || ''}
                  disabled
                  className="w-full p-4 border rounded-xl cursor-not-allowed font-bold opacity-60 shadow-sm"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <Briefcase className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Cliente *
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, clientId: e.target.value, projectId: '', taskId: '' }); }}
                  className="w-full p-4 border rounded-xl outline-none font-bold transition-all focus:ring-2 focus:ring-[var(--ring)] shadow-sm"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <Briefcase className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Projeto *
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, projectId: e.target.value, taskId: '' }); }}
                  className="w-full p-4 border rounded-xl outline-none font-bold transition-all focus:ring-2 focus:ring-[var(--ring)] shadow-sm disabled:opacity-50"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  disabled={!formData.clientId}
                >
                  <option value="">Selecione um projeto...</option>
                  {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                <CheckSquare className="w-4 h-4" style={{ color: 'var(--primary)' }} /> Tarefa *
              </label>
              <select
                value={formData.taskId}
                onChange={(e) => { markDirty(); setFormData({ ...formData, taskId: e.target.value }); }}
                className="w-full p-4 border rounded-xl outline-none font-bold transition-all focus:ring-2 focus:ring-[var(--ring)] shadow-sm disabled:opacity-50"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                disabled={!formData.projectId}
              >
                <option value="">Selecione a tarefa...</option>
                {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
          </div>

          {/* Time Card */}
          <div className="p-8 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <Clock className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              <h3 className="font-bold text-lg uppercase tracking-wider text-sm">Horário e Data</h3>
            </div>

            <div>
              <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                <Calendar className="w-4 h-4 opacity-50" /> Data *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => { markDirty(); setFormData({ ...formData, date: e.target.value }); }}
                className="w-full p-4 border rounded-xl outline-none font-bold shadow-sm focus:ring-2 focus:ring-[var(--ring)] transition-all"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <Clock className="w-4 h-4 text-emerald-500" /> Início *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, startTime: e.target.value }); }}
                  className="w-full p-4 border rounded-xl outline-none font-bold shadow-sm focus:ring-2 focus:ring-[var(--ring)] transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold mb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <Clock className="w-4 h-4 text-red-500" /> Fim *
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, endTime: e.target.value }); }}
                  className="w-full p-4 border rounded-xl outline-none font-bold shadow-sm focus:ring-2 focus:ring-[var(--ring)] transition-all"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 rounded-2xl border cursor-pointer transition-all shadow-sm group"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}
              onClick={() => {
                setDeductLunch(!deductLunch);
                markDirty();
              }}>
              <input
                type="checkbox"
                id="lunch-deduction-check"
                checked={deductLunch}
                onChange={() => { }} // Controlled by div click
                className="w-5 h-5 border-slate-300 rounded focus:ring-[var(--ring)] pointer-events-none"
                style={{ color: 'var(--primary)' }}
              />
              <label
                htmlFor="lunch-deduction-check"
                className="font-bold cursor-pointer select-none text-sm group-hover:text-[var(--primary)] transition-colors"
                style={{ color: 'var(--text)' }}
              >
                🍽️ Descontar 1h de almoço
              </label>
            </div>

            <div className="flex justify-between items-center p-6 rounded-2xl border shadow-inner"
              style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                <span className="font-black uppercase tracking-widest text-sm" style={{ color: 'var(--text)' }}>Total:</span>
              </div>
              <span className="text-4xl font-black" style={{ color: 'var(--primary)' }}>{timeDisplay}</span>
            </div>

            {formData.taskId && (
              <div className="p-8 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <label className="block text-xs font-black mb-4 flex items-center justify-between uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
                  <span className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                    Progresso da Tarefa
                  </span>
                  <span className="text-2xl font-black" style={{ color: 'var(--primary)' }}>{taskProgress}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={taskProgress}
                  onChange={(e) => { markDirty(); setTaskProgress(Number(e.target.value)); }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                  style={{ backgroundColor: 'var(--border)' }}
                />
              </div>
            )}
          </div>

          <div className="p-8 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 border-b pb-4" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-lg uppercase tracking-wider text-sm">Notas</h3>
            </div>
            <textarea
              rows={4}
              value={formData.description || ''}
              onChange={(e) => { markDirty(); setFormData({ ...formData, description: e.target.value }); }}
              className="w-full p-4 border rounded-xl outline-none resize-none font-medium transition-all focus:ring-2 focus:ring-amber-500 shadow-sm"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
              placeholder="Descreva o que foi feito..."
            />
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
