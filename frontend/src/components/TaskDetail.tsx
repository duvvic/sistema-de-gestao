// components/TaskDetail.tsx - Adaptado para Router
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import { ArrowLeft, Save, Calendar, PieChart, Briefcase, Image as ImageIcon, User as UserIcon, StickyNote, AlertTriangle, ShieldAlert, CheckSquare } from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, clients, projects, users, createTask, updateTask } = useDataController();

  const isNew = !taskId || taskId === 'new';
  const task = !isNew ? tasks.find(t => t.id === taskId) : undefined;

  // Query params for defaults
  const preSelectedClientId = searchParams.get('clientId') || searchParams.get('client');
  const preSelectedProjectId = searchParams.get('projectId') || searchParams.get('project');

  const isAdmin = currentUser?.role === 'admin';
  const isDeveloper = currentUser?.role === 'developer';

  // Verifica se a tarefa está concluída
  const isTaskCompleted = !isNew && (task?.status === 'Done' || task?.actualDelivery != null);

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
    attachment: '',
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
    collaboratorIds: []
  });

  const [attachmentName, setAttachmentName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

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
      });
    } else {
      // Defaults for new task
      let newForm: Partial<Task> = { ...formData };
      if (preSelectedClientId) newForm.clientId = preSelectedClientId;
      if (preSelectedProjectId) newForm.projectId = preSelectedProjectId;

      if (isDeveloper && currentUser?.name) {
        newForm.developer = currentUser.name;
        newForm.developerId = currentUser.id;
      }
      setFormData(prev => ({ ...prev, ...newForm }));
    }
  }, [task, currentUser, preSelectedClientId, preSelectedProjectId]);

  const handleFileChange = (file?: File) => {
    if (!file) return;
    const allowed = ['image/', 'application/pdf'];
    const ok = allowed.some(prefix => file.type.startsWith(prefix));
    if (!ok) {
      alert('Apenas imagens (jpg/png/webp) ou PDF são aceitos como anexo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFormData(prev => ({ ...prev, attachment: result }));
      setAttachmentName(file.name);
      markDirty();
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent standard form submission
    console.log("Submit clicked");

    if (!formData.projectId || !formData.clientId || !formData.title) {
      alert("Preencha todos os campos obrigatórios (Título, Cliente, Projeto)");
      return;
    }

    try {
      setLoading(true);
      const taskPayload = {
        ...formData,
        status: (formData.status as Status) || 'Todo',
        progress: Number(formData.progress) || 0,
        estimatedDelivery: formData.estimatedDelivery!,
        developerId: formData.developerId || (isDeveloper ? currentUser?.id : undefined),
        developer: formData.developer || (isDeveloper ? currentUser?.name : undefined)
      };

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

  // Derived values
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedProject = projects.find(p => p.id === formData.projectId);

  const { projectMembers } = useDataController();

  const availableProjectsIds = React.useMemo(() => {
    if (isAdmin) return projects.map(p => p.id);
    return projectMembers
      .filter(pm => pm.userId === currentUser?.id)
      .map(pm => pm.projectId);
  }, [projectMembers, currentUser, isAdmin, projects]);

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
    if (formData.status === 'Done') return 0;
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

  const canEdit = isAdmin || (task && task.developerId === currentUser?.id) || isNew;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');

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
                  <ShieldAlert className="w-3 h-3" /> Colaborador (Apenas Apontamento)
                </span>
              )}
            </h1>
            <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              {isNew ? 'Preencha os dados para iniciar' : `ID: #${task?.id.slice(0, 8)}`}
            </p>
          </div>
        </div>
        {!isTaskCompleted && canEdit && (
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
            Finalizada
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
                    disabled={!isNew && !isAdmin}
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
                    disabled={!formData.clientId || (!isNew && !isAdmin)}
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
                  disabled={isTaskCompleted}
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
                  disabled={isTaskCompleted}
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
                  disabled={isTaskCompleted}
                />
              </div>

              {/* Attachment Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Anexo</label>
                </div>
                <div className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden group transition-colors"
                  style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                  {formData.attachment ? (
                    <>
                      {formData.attachment.startsWith('data:image') ? (
                        <img src={formData.attachment} alt="Attachment" className="max-h-[300px] w-auto object-contain rounded-xl shadow-md" />
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-slate-500 shadow-sm" style={{ backgroundColor: 'var(--surface)' }}>PDF</div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{attachmentName || 'Anexo'}</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                        <button
                          type="button"
                          onClick={() => { setFormData({ ...formData, attachment: '' }); setAttachmentName(undefined); markDirty(); }}
                          className="bg-red-500 text-white px-5 py-2 rounded-xl font-bold shadow-lg hover:bg-red-600 transition-all transform active:scale-95"
                        >
                          Remover
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" style={{ color: 'var(--muted)' }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>Nenhum anexo disponível</p>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <label className="text-sm font-bold hover:opacity-80 cursor-pointer px-4 py-2 rounded-xl transition-all shadow-sm border border-[var(--border)]" style={{ color: 'var(--primary)', backgroundColor: 'var(--surface)' }}>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => handleFileChange(e.target.files?.[0])}
                            className="hidden"
                          />
                          Fazer upload
                        </label>
                      </div>
                    </div>
                  )}
                </div>
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
                  disabled={isTaskCompleted}
                >
                  <option value="Todo">A Fazer</option>
                  <option value="In Progress">Em Progresso</option>
                  <option value="Review">Revisão</option>
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
                  disabled={isTaskCompleted}
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
                {isAdmin ? (
                  <select
                    value={formData.developerId || ''}
                    onChange={(e) => {
                      markDirty();
                      const selected = users.find(u => u.id === e.target.value);
                      setFormData({
                        ...formData,
                        developerId: selected?.id || '',
                        developer: selected?.name || '',
                      });
                    }}
                    className="w-full p-3 border rounded-xl outline-none transition-all shadow-sm focus:ring-2 focus:ring-[var(--ring)]"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Selecione um responsável...</option>
                    {users.filter(u => u.active !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData.developer || ''}
                    readOnly
                    className="w-full p-3 border rounded-xl outline-none opacity-60 shadow-sm"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  />
                )}
              </div>

              {/* Multiple Collaborators Selection */}
              <div>
                <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
                  <UserIcon className="w-4 h-4" /> Colaboradores Extras
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-3 border rounded-xl shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  {(() => {
                    const projectMemberIds = projectMembers
                      .filter(pm => pm.projectId === formData.projectId)
                      .map(pm => pm.userId);

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
                          disabled={!canEdit || isTaskCompleted}
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
            </div>

            {/* Dates Block */}
            <div className="p-6 rounded-2xl border shadow-sm space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <h3 className="text-sm font-bold border-b pb-3 flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
                <Calendar className="w-4 h-4 text-[var(--primary)]" /> Cronograma
              </h3>
              <div>
                <label className="block text-[10px] font-black mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Entrega Estimada</label>
                <input
                  type="date"
                  value={formData.estimatedDelivery}
                  onChange={(e) => { markDirty(); setFormData({ ...formData, estimatedDelivery: e.target.value }); }}
                  className={`w-full p-3 border rounded-xl text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-[var(--ring)] transition-all`}
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: daysDelayed > 0 ? 'var(--danger)' : 'var(--border)',
                    color: daysDelayed > 0 ? 'var(--danger)' : 'var(--text)'
                  }}
                />
              </div>
            </div>
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
    </div>
  );
};

export default TaskDetail;
