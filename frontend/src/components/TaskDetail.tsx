import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Task, Status, Priority, Impact } from '@/types';
import {
  ArrowLeft, Save, Calendar, Clock, Users, StickyNote, CheckSquare, Plus, Trash2, X, CheckCircle, Activity, Zap, AlertTriangle, Briefcase, Info, Target, LayoutGrid, Shield, FileSpreadsheet, Crown, ExternalLink, Flag
} from 'lucide-react';
import { useUnsavedChangesPrompt } from '@/hooks/useUnsavedChangesPrompt';
import ConfirmationModal from './ConfirmationModal';
import TransferResponsibilityModal from './TransferResponsibilityModal';
import BackButton from './shared/BackButton';
import { formatDecimalToTime } from '@/utils/normalizers';

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
    return '';
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
    estimatedHours: 0,
    link_ef: '',
    is_impediment: false
  });

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ force: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Validação Reativa
  const isFieldMissing = (field: string) => {
    if (field === 'team') {
      const hasTeam = (formData.collaboratorIds && formData.collaboratorIds.length > 0) || !!formData.developerId;
      return !hasTeam;
    }
    if (field === 'developerId') {
      const hasTeam = (formData.collaboratorIds && formData.collaboratorIds.length > 0) || !!formData.developerId;
      return hasTeam && !formData.developerId;
    }
    const value = formData[field as keyof typeof formData];
    return !value;
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const isNicLabs = selectedClient?.name?.toUpperCase().includes('NIC-LABS') || false;

  const hasError = (field: string) => {
    const mandatoryFields = ['projectId', 'clientId', 'title', 'developerId', 'team'];
    if (mandatoryFields.includes(field)) return isFieldMissing(field);
    return false;
  };

  const clearError = (field: string) => { };

  const { isDirty, showPrompt, markDirty, requestBack, discardChanges, continueEditing } = useUnsavedChangesPrompt();

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
        description: task.description || '',
        link_ef: task.link_ef || '',
        estimatedHours: task.estimatedHours || 0,
        is_impediment: !!task.is_impediment
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

  const actualHoursSpent = useMemo(() => {
    if (isNew) return 0;
    return timesheetEntries
      .filter(entry => entry.taskId === taskId)
      .reduce((sum, entry) => sum + (Number(entry.totalHours) || 0), 0);
  }, [timesheetEntries, taskId, isNew]);


  const taskWeight = useMemo(() => {
    const project = projects.find(p => p.id === formData.projectId);
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
    const weight = (taskDuration / projDuration) * 100;
    const soldHours = project.horas_vendidas > 0 ? (weight / 100) * project.horas_vendidas : 0;
    return { weight, soldHours };
  }, [formData.scheduledStart, formData.estimatedDelivery, formData.projectId, projects]);

  const isOwner = task && task.developerId === currentUser?.id;
  const isCollaborator = !isNew && task && task.collaboratorIds?.includes(currentUser?.id || '');
  const canEditEverything = isAdmin || isNew;
  const canEditProgressStatus = isAdmin || isOwner || isCollaborator || isNew;

  const getDelayDays = () => {
    if (formData.status === 'Done' || formData.status === 'Review' || !formData.estimatedDelivery) return 0;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parts = formData.estimatedDelivery.split('-');
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return today > due ? Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  };
  const daysDelayed = getDelayDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];
    if (isFieldMissing('projectId')) errors.push('projectId');
    if (isFieldMissing('clientId')) errors.push('clientId');
    if (isFieldMissing('title')) errors.push('title');
    if (isFieldMissing('team')) errors.push('team');
    if (isFieldMissing('developerId')) errors.push('developerId');

    if (errors.length > 0) {
      const missingFields = errors.map(e => {
        switch (e) {
          case 'projectId': return 'Projeto';
          case 'clientId': return 'Cliente';
          case 'title': return 'Título';
          case 'developerId': return 'Responsável';
          case 'team': return 'Equipe Alocada';
          default: return e;
        }
      });
      alert('Campos obrigatórios faltando: \n - ' + missingFields.join('\n - ') + ' \n\nPor favor, preencha os campos destacados em amarelo.');
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        ...formData,
        progress: Number(formData.progress),
        notes: formData.notes,
        link_ef: formData.link_ef,
        is_impediment: formData.is_impediment
      };
      if (payload.status === 'In Progress' && !formData.actualStart) payload.actualStart = new Date().toISOString().split('T')[0];
      if (payload.status === 'Done' && !formData.actualDelivery) payload.actualDelivery = new Date().toISOString().split('T')[0];
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

  const responsibleUsers = useMemo(() => {
    if (!formData.projectId) return [];
    const membersIds = projectMembers.filter(pm => String(pm.id_projeto) === formData.projectId).map(pm => String(pm.id_colaborador));
    return users.filter(u => u.active !== false && (membersIds.includes(u.id) || u.id === formData.developerId));
  }, [users, projectMembers, formData.projectId, formData.developerId]);

  if (!isNew && !task) return <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Tarefa não encontrada.</div>;

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
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
              <span className="text-xs font-medium uppercase tracking-tighter">Gerenciamento de Atividades</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isNew && (isAdmin || isOwner) && (
            <button onClick={() => setDeleteConfirmation({ force: false })} className="px-4 py-2.5 rounded-xl font-bold text-xs text-red-100 hover:bg-white/10 transition-all flex items-center gap-2">
              <Trash2 size={16} /> EXCLUIR
            </button>
          )}
          <button type="button" onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-white/10 text-white">CANCELAR</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-white text-indigo-950 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xl hover:bg-indigo-50 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50" disabled={loading}>
            <Save className="w-4 h-4" /> {loading ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Card 1: Identificação */}
            <div className="p-6 rounded-[24px] border shadow-sm flex flex-col h-[280px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--muted)' }}>Identificação</h4>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10"><Briefcase size={14} className="text-purple-500" /></div>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <label className={`text-[9px] font-black uppercase mb-2 block opacity-60 ${hasError('title') ? 'text-yellow-500' : ''}`}>Nome da Tarefa *</label>
                  <input type="text" value={formData.title} onChange={e => { setFormData({ ...formData, title: e.target.value }); markDirty(); }} className={`w-full px-4 py-2.5 text-sm font-bold border rounded-xl outline-none transition-all ${hasError('title') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--bg)] border-[var(--border)]'}`} style={{ color: 'var(--text)' }} />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-2 block opacity-60">Status</label>
                  <select value={formData.status} onChange={e => { setFormData({ ...formData, status: e.target.value as any }); markDirty(); }} className="w-full px-4 py-2.5 text-sm font-bold border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none" style={{ color: 'var(--text)' }}>
                    <option value="Todo">Pré-Projeto</option>
                    <option value="Review">Análise</option>
                    <option value="In Progress">Andamento</option>
                    <option value="Done">Concluído</option>
                  </select>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => { setFormData({ ...formData, is_impediment: !formData.is_impediment }); markDirty(); }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all font-bold text-xs ${formData.is_impediment ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-transparent border-[var(--border)] opacity-60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <Flag size={14} className={formData.is_impediment ? "fill-orange-500" : ""} />
                      IMPEDIMENTO
                    </div>
                    {formData.is_impediment && <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded">ATIVO</span>}
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Gestão */}
            <div className="p-6 rounded-[24px] border shadow-sm flex flex-col h-[280px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--muted)' }}>Gestão</h4>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10"><Shield size={14} className="text-emerald-500" /></div>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <label className={`text-[9px] font-black uppercase mb-2 flex items-center gap-1.5 opacity-60 ${hasError('developerId') ? 'text-yellow-500' : ''}`}>
                    <Crown size={10} className={formData.developerId ? "text-yellow-500" : ""} /> Responsável *
                  </label>
                  <select
                    value={formData.developerId}
                    onChange={e => {
                      const selectedId = e.target.value;
                      const u = users.find(usr => usr.id === selectedId);
                      let updatedCollabs = formData.collaboratorIds || [];
                      if (selectedId && !updatedCollabs.includes(selectedId)) updatedCollabs = [...updatedCollabs, selectedId];
                      setFormData({ ...formData, developerId: selectedId, developer: u?.name || '', collaboratorIds: updatedCollabs });
                      markDirty();
                    }}
                    className={`w-full px-4 py-2.5 text-xs font-bold border rounded-xl outline-none transition-all ${hasError('developerId') ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-[var(--bg)] border-[var(--border)]'}`}
                    style={{ color: 'var(--text)' }}
                    disabled={!formData.projectId}
                  >
                    <option value="">Selecione...</option>
                    {responsibleUsers.map(u => <option key={u.id} value={u.id}>{u.name.split(' (')[0]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-2 block opacity-60">Prioridade</label>
                  <select value={formData.priority} onChange={e => { setFormData({ ...formData, priority: e.target.value as any }); markDirty(); }} className="w-full px-4 py-2.5 text-xs font-bold border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none" style={{ color: 'var(--text)' }}>
                    <option value="Low">Baixa</option>
                    <option value="Medium">Média</option>
                    <option value="High">Alta</option>
                    <option value="Critical">Crítica</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card 3: Esforço */}
            <div className="p-6 rounded-[24px] border shadow-sm flex flex-col h-[280px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--muted)' }}>Esforço</h4>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10"><Activity size={14} className="text-amber-500" /></div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Horas Apontadas (Total)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 text-emerald-500" />
                    <div className="w-full pl-9 pr-3 py-3 text-lg font-black border rounded-xl bg-emerald-500/5 border-emerald-500/20 text-emerald-500 flex items-baseline gap-2">
                      <span>{formatDecimalToTime(actualHoursSpent)}</span>
                      <span className="text-[10px] opacity-40 font-normal">({actualHoursSpent.toFixed(2)}h decimal)</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Progresso ({formData.progress}%)</label>
                  <input type="range" min="0" max="100" value={formData.progress} onChange={e => { setFormData({ ...formData, progress: Number(e.target.value) }); markDirty(); }} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                </div>
              </div>
            </div>

            {/* Card 4: Timeline */}
            <div className="p-6 rounded-[24px] border shadow-sm flex flex-col h-auto min-h-[280px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: 'var(--muted)' }}>Timeline</h4>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10"><Calendar size={14} className="text-blue-500" /></div>
              </div>

              <div className="space-y-6">
                {/* Seção Planejado */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Planejado</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                      <label className="text-[8px] font-bold opacity-40 mb-1 block">Início</label>
                      <input
                        type="date"
                        value={formData.scheduledStart}
                        onChange={e => { setFormData({ ...formData, scheduledStart: e.target.value }); markDirty(); }}
                        className="w-full p-2.5 text-[11px] font-bold rounded-xl border outline-none bg-[var(--bg)] border-[var(--border)] focus:ring-1 focus:ring-blue-500/30 transition-all"
                        style={{ color: 'var(--text)' }}
                      />
                    </div>
                    <div className="relative group">
                      <label className="text-[8px] font-bold opacity-40 mb-1 block">Entrega</label>
                      <input
                        type="date"
                        value={formData.estimatedDelivery}
                        onChange={e => { setFormData({ ...formData, estimatedDelivery: e.target.value }); markDirty(); }}
                        className="w-full p-2.5 text-[11px] font-bold rounded-xl border outline-none bg-[var(--bg)] border-[var(--border)] focus:ring-1 focus:ring-blue-500/30 transition-all"
                        style={{ color: 'var(--text)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção Realizado */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[9px] font-black uppercase tracking-wider opacity-60">Executado (Real)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold opacity-40">Início Real</label>
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl border bg-[var(--bg)] border-[var(--border)] opacity-80 min-h-[38px] ${formData.actualStart ? 'text-emerald-500' : 'text-[var(--muted)]'}`}>
                        <Zap size={12} className={formData.actualStart ? 'animate-pulse' : 'opacity-20'} />
                        <span className="text-[11px] font-bold">
                          {formData.actualStart ? new Date(formData.actualStart + 'T12:00:00').toLocaleDateString('pt-BR') : 'Aguardando...'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold opacity-40">Entrega Real</label>
                      <div className={`flex items-center gap-2 p-2.5 rounded-xl border bg-[var(--bg)] border-[var(--border)] opacity-80 min-h-[38px] ${formData.actualDelivery ? 'text-emerald-600' : 'text-[var(--muted)]'}`}>
                        <CheckSquare size={12} className={formData.actualDelivery ? '' : 'opacity-20'} />
                        <span className="text-[11px] font-bold">
                          {formData.actualDelivery ? new Date(formData.actualDelivery + 'T12:00:00').toLocaleDateString('pt-BR') : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-[24px] border shadow-sm flex flex-col gap-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <LayoutGrid size={14} className="text-indigo-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Descrição da Atividade</h4>
                </div>
                <textarea
                  value={formData.description}
                  onChange={e => { setFormData({ ...formData, description: e.target.value }); markDirty(); }}
                  className="w-full h-20 p-4 text-xs border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none transition-all focus:ring-1 focus:ring-indigo-500/30"
                  style={{ color: 'var(--text)' }}
                  placeholder="Instruções e detalhamento..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <StickyNote size={14} className="text-amber-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500">Anotações Internas</h4>
                  </div>
                  <textarea
                    value={formData.notes}
                    onChange={e => { setFormData({ ...formData, notes: e.target.value }); markDirty(); }}
                    className="w-full h-20 p-4 text-xs border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none transition-all focus:ring-1 focus:ring-amber-500/30"
                    style={{ color: 'var(--text)' }}
                    placeholder="Observações técnicas, credenciais..."
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet size={14} className="text-blue-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Link de Documentação</h4>
                    </div>
                    {formData.link_ef && (
                      <a
                        href={formData.link_ef.startsWith('http') ? formData.link_ef : `https://${formData.link_ef}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1"
                      >
                        ABRIR <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.link_ef}
                      onChange={e => { setFormData({ ...formData, link_ef: e.target.value }); markDirty(); }}
                      className="w-full p-4 pr-10 text-xs border rounded-xl bg-[var(--bg)] border-[var(--border)] outline-none transition-all focus:ring-1 focus:ring-blue-500/30 font-mono"
                      style={{ color: 'var(--text)' }}
                      placeholder="https://docs.google.com/..."
                    />
                    <Zap size={14} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-20 text-blue-500" />
                  </div>
                  <p className="mt-2 text-[9px] opacity-40 italic">Cole aqui o link direto para o documento ou repositório.</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-[24px] border shadow-sm flex flex-col max-h-[340px]" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Users size={14} className="text-indigo-500" />
                  {/* Inclui o responsável principal no contador se ele existir */}
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    Equipe ({Array.from(new Set([formData.developerId, ...(formData.collaboratorIds || [])])).filter(Boolean).length})
                  </h4>
                </div>
                <button type="button" onClick={() => setIsAddMemberOpen(true)} className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Plus size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {Array.from(new Set([formData.developerId, ...(formData.collaboratorIds || [])]))
                  .filter(Boolean)
                  .map(id => {
                    const u = users.find(usr => usr.id === id);
                    if (!u) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 p-2 rounded-xl border bg-[var(--bg)] border-[var(--border)]">
                        <div className="w-6 h-6 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-[8px] font-bold overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : u.name[0]}
                        </div>
                        <span className="text-[10px] font-bold flex-1 truncate" style={{ color: 'var(--text)' }}>{u.name.split(' (')[0]}</span>
                        {id === formData.developerId ? (
                          <Crown size={12} className="text-yellow-500 shrink-0" />
                        ) : (
                          <button type="button" onClick={() => setFormData({ ...formData, collaboratorIds: formData.collaboratorIds?.filter(cid => cid !== id) })} className="p-1 text-red-500/50 hover:text-red-500"><X size={10} /></button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </form>
      </div>

      <ConfirmationModal
        isOpen={!!deleteConfirmation}
        title={deleteConfirmation?.force ? "Excluir com Horas?" : "Excluir Tarefa"}
        message={deleteConfirmation?.force ? "Esta tarefa possui horas. Excluir mesmo assim?" : "Deseja realmente excluir esta tarefa?"}
        onConfirm={performDelete}
        onCancel={() => setDeleteConfirmation(null)}
      />

      {showPrompt && (
        <ConfirmationModal
          isOpen={true}
          title="Descartar alterações?"
          message="Existem alterações não salvas."
          confirmText="Ficar"
          cancelText="Sair"
          onConfirm={continueEditing}
          onCancel={() => { discardChanges(); navigate(-1); }}
        />
      )}

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/50" onClick={() => setIsAddMemberOpen(false)}>
          <div className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-3xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-xs font-black uppercase">Adicionar Colaborador</h4>
              <button onClick={() => setIsAddMemberOpen(false)}><X size={18} /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.filter(u => u.active !== false && projectMembers.some(pm => String(pm.id_projeto) === formData.projectId && String(pm.id_colaborador) === u.id) && u.id !== formData.developerId && !formData.collaboratorIds?.includes(u.id)).map(u => (
                <button key={u.id} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--surface-hover)]" onClick={() => { setFormData({ ...formData, collaboratorIds: [...(formData.collaboratorIds || []), u.id] }); setIsAddMemberOpen(false); markDirty(); }}>
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] flex items-center justify-center font-bold text-xs">{u.name[0]}</div>
                  <div className="text-left font-bold text-xs uppercase">{u.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
