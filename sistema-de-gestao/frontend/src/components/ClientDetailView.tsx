import React, { useState, useMemo, useEffect } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { Client, Project, Task } from '@/types';
import { ArrowLeft, FolderKanban, CheckSquare, Info, Save, Edit, Briefcase, Globe, Phone, FileText, User } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

interface ClientDetailViewProps {
  client: Client;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onTaskClick: (taskId: string) => void;
  onProjectClick?: (projectId: string) => void;
  onOpenClientDetails?: (clientId: string) => void;
}

const ClientDetailView: React.FC<ClientDetailViewProps> = ({
  client,
  projects: initialProjects,
  tasks: initialTasks,
  onBack,
  onTaskClick,
  onProjectClick,
  onOpenClientDetails,
}) => {
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTab, setActiveTab] = useState<'details' | 'projects' | 'tasks'>('details'); // Default to details as requested
  const [statusFilter, setStatusFilter] = useState<'all' | 'todo' | 'inprogress' | 'review' | 'done'>('all');

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    logoUrl: '',
    contato_principal: '',
    cnpj: '',
    telefone: '',
    pais: '',
    tipo_cliente: 'cliente_final',
    active: true
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        logoUrl: client.logoUrl || '',
        contato_principal: client.contato_principal || '',
        cnpj: client.cnpj || '',
        telefone: client.telefone || '',
        pais: client.pais || '',
        tipo_cliente: client.tipo_cliente || 'cliente_final',
        active: client.active !== false
      });
    }
  }, [client]);

  // Realtime subscriptions
  useSupabaseRealtime('dim_projetos', (payload) => {
    if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
  });
  useSupabaseRealtime('fato_tarefas', (payload) => {
    if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
    else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
  });

  // Filtra projetos do cliente
  const clientProjects = useMemo(
    () => projects.filter(p => p.clientId === client.id),
    [projects, client.id]
  );

  // Filtra tarefas do cliente
  const clientTasks = useMemo(
    () => tasks.filter(t => t.clientId === client.id),
    [tasks, client.id]
  );

  // Aplica filtro de status nas tarefas
  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return clientTasks;
    const statusMap: { [key: string]: string } = {
      'todo': 'Todo',
      'inprogress': 'In Progress',
      'review': 'Review',
      'done': 'Done',
    };
    return clientTasks.filter(t => t.status === statusMap[statusFilter]);
  }, [clientTasks, statusFilter]);

  // Agrupa tarefas por status para display em kanban
  const tasksByStatus = useMemo(() => {
    return {
      'Todo': clientTasks.filter(t => t.status === 'Todo'),
      'In Progress': clientTasks.filter(t => t.status === 'In Progress'),
      'Review': clientTasks.filter(t => t.status === 'Review'),
      'Done': clientTasks.filter(t => t.status === 'Done'),
    };
  }, [clientTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'bg-slate-100 dark:bg-slate-800/50';
      case 'In Progress': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'Review': return 'bg-purple-50 dark:bg-purple-900/20';
      case 'Done': return 'bg-green-50 dark:bg-green-900/20';
      default: return 'bg-slate-100 dark:bg-slate-800/50';
    }
  };

  const getStatusHeaderColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'text-[var(--textMuted)]';
      case 'In Progress': return 'text-blue-600 dark:text-blue-400';
      case 'Review': return 'text-purple-600 dark:text-purple-400';
      case 'Done': return 'text-green-600 dark:text-green-400';
      default: return 'text-[var(--textMuted)]';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('dim_clientes')
        .update({
          NomeCliente: formData.name,
          logo_url: formData.logoUrl,
          contato_principal: formData.contato_principal,
          cnpj: formData.cnpj,
          telefone: formData.telefone,
          pais: formData.pais,
          tipo_cliente: formData.tipo_cliente,
          ativo: formData.active
        })
        .eq('ID_Cliente', client.id);

      if (error) throw error;
      alert('Cliente atualizado com sucesso!');
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      {/* Header with Integrated KPIs */}
      <div className="px-8 py-4 bg-gradient-to-r from-[#4c1d95] to-[#7c3aed] shadow-lg flex items-center justify-between text-white z-20 sticky top-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft />
          </button>
          <div className="flex items-center gap-4">
            {client.logoUrl && (
              <div className="w-12 h-12 bg-white rounded-xl p-1.5 shadow-xl">
                <img
                  src={client.logoUrl}
                  className="w-full h-full object-contain"
                  alt={client.name}
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-black uppercase bg-white/10 border border-white/20 px-2 py-0.5 rounded-full tracking-widest text-white/90">
                  {client.tipo_cliente === 'parceiro' ? 'PARCEIRO' : 'CLIENTE FINAL'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COMPACT KPI CARDS */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-center min-w-[120px] ${activeTab === 'details' ? 'border-white bg-white/20 shadow-md' : 'border-white/10 bg-black/10 hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <FileText size={12} className="text-white/70" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/70">INFORMAÇÕES</span>
            </div>
            <span className="text-xs font-black text-white leading-tight">Dados do Cliente</span>
          </div>

          <div
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-center min-w-[120px] ${activeTab === 'projects' ? 'border-white bg-white/20 shadow-md' : 'border-white/10 bg-black/10 hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Briefcase size={12} className="text-white/70" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/70">PROJETOS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white">{clientProjects.length}</span>
              <span className="text-[10px] font-bold text-white/50">ATIVOS</span>
            </div>
          </div>

          <div
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-center min-w-[120px] ${activeTab === 'tasks' ? 'border-white bg-white/20 shadow-md' : 'border-white/10 bg-black/10 hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <CheckSquare size={12} className="text-white/70" />
              <span className="text-[8px] font-bold uppercase tracking-widest text-white/70">TAREFAS</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white">{clientTasks.length}</span>
              <span className="text-[10px] font-bold text-white/50">TOTAL</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'details' && (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3 text-slate-800">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                    Dados do Cliente
                  </h3>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={`px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isEditing ? 'bg-slate-100 text-slate-600' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-200'}`}
                  >
                    {isEditing ? 'Cancelar Edição' : <> <Edit className="w-4 h-4" /> Editar Informações </>}
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                  <fieldset disabled={!isEditing} className="group-disabled:opacity-100 disabled:opacity-100 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Nome do Cliente / Empresa</label>
                        <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" required />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">URL do Logo</label>
                        <input type="text" value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" placeholder="https://..." />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Contato Principal</label>
                        <input type="text" value={formData.contato_principal} onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">CNPJ</label>
                        <input type="text" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Telefone</label>
                        <input type="text" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">País</label>
                        <input type="text" value={formData.pais} onChange={(e) => setFormData({ ...formData, pais: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none transition-all text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg" />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Tipo de Cliente</label>
                        <select value={formData.tipo_cliente} onChange={(e) => setFormData({ ...formData, tipo_cliente: e.target.value })} className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-xl outline-none text-slate-800 font-bold disabled:bg-transparent disabled:px-0 disabled:border-b-slate-200 disabled:rounded-none disabled:text-lg disabled:appearance-none">
                          <option value="cliente_final">Cliente Final</option>
                          <option value="parceiro">Parceiro</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
                      <label className="flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors">
                        <input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-5 h-5 rounded text-purple-600 focus:ring-purple-600 border-slate-300" disabled={!isEditing} />
                        <span className={`text-sm font-bold ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>Cliente Ativo</span>
                      </label>

                      {isEditing && (
                        <button type="submit" className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2">
                          <Save className="w-4 h-4" /> Salvar Alterações
                        </button>
                      )}
                    </div>
                  </fieldset>
                </form>
              </div>
            </div>
          )}

          {/* PROJECTS TAB */}
          {activeTab === 'projects' && (
            <div>
              <h2 className="text-lg font-bold text-[var(--textTitle)] mb-6">Projetos do Cliente</h2>
              {clientProjects.length === 0 ? (
                <div className="bg-[var(--bgApp)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
                  <FolderKanban className="w-12 h-12 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-[var(--textMuted)]">Nenhum projeto para este cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {clientProjects.map(project => (
                    <div
                      key={project.id}
                      onClick={() => onProjectClick?.(project.id)}
                      className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 hover:shadow-md hover:border-[#d8b4fe] dark:hover:border-purple-800 transition-all cursor-pointer"
                    >
                      <h3 className="text-lg font-semibold text-[var(--textTitle)]">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-[var(--textMuted)] mt-2 line-clamp-2">{project.description}</p>
                      )}
                      <div className="mt-4 flex items-center gap-2">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${project.status === 'Em andamento'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          }`}>
                          {project.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TASKS TAB */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-[var(--textTitle)]">Tarefas do Cliente</h2>
                <div className="flex gap-2">
                  {(['all', 'todo', 'inprogress', 'review', 'done'] as const).map(filter => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === filter
                        ? 'bg-[var(--brand)] text-white'
                        : 'bg-[var(--surfaceHover)] text-[var(--textMuted)] hover:bg-[var(--bgApp)]'
                        }`}
                    >
                      {filter === 'all' ? 'Todas' : filter === 'todo' ? 'Todo' : filter === 'inprogress' ? 'Em Progresso' : filter === 'review' ? 'Review' : 'Concluídas'}
                    </button>
                  ))}
                </div>
              </div>

              {clientTasks.length === 0 ? (
                <div className="bg-[var(--bgApp)] border border-dashed border-[var(--border)] rounded-2xl p-8 text-center">
                  <CheckSquare className="w-12 h-12 text-[var(--textMuted)] mx-auto mb-3" />
                  <p className="text-[var(--textMuted)]">Nenhuma tarefa para este cliente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-auto">
                  {(statusFilter === 'all'
                    ? Object.entries(tasksByStatus)
                    : Object.entries(tasksByStatus).filter(([key]) => {
                      const filterMap = { 'todo': 'Todo', 'inprogress': 'In Progress', 'review': 'Review', 'done': 'Done' };
                      return key === filterMap[statusFilter];
                    })
                  ).map(([status, statusTasks]) => {
                    const list = statusTasks as unknown as Task[];
                    return (
                      <div
                        key={status}
                        className={`${getStatusColor(status)} border border-[var(--border)] rounded-2xl p-4 flex flex-col`}
                      >
                        <h3 className={`font-bold text-sm uppercase tracking-wider mb-4 ${getStatusHeaderColor(status)}`}>
                          {status} ({list.length})
                        </h3>
                        <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                          {list.map(task => (
                            <div
                              key={task.id}
                              onClick={() => onTaskClick(task.id)}
                              className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:shadow-md hover:border-[#d8b4fe] dark:hover:border-purple-800 transition-all cursor-pointer group"
                            >
                              <h4 className="font-semibold text-sm text-[var(--textTitle)] line-clamp-2 group-hover:text-[var(--brand)]">
                                {task.title || "(Sem título)"}
                              </h4>
                              <div className="mt-2 flex items-center justify-between text-xs text-[var(--textMuted)]">
                                <span>{task.progress || 0}%</span>
                                <div className="w-16 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[var(--brand)]"
                                    style={{ width: `${task.progress || 0}%` }}
                                  />
                                </div>
                              </div>
                              {task.estimatedDelivery && (
                                <div className="mt-2 text-xs text-[var(--textMuted)]">
                                  Entrega: {new Date(task.estimatedDelivery).toLocaleDateString('pt-BR')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDetailView;
