// components/ClientDetailsView.tsx - Adaptado para Router
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, Briefcase, CheckSquare, Clock, Edit, LayoutGrid, ListTodo, Filter, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ClientDetailsView: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { clients, projects, tasks, users, getClientById, projectMembers, deleteProject, deleteTask } = useDataController();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'project' | 'task' } | null>(null);

  const client = clientId ? getClientById(clientId) : null;
  const clientProjects = useMemo(() =>
    projects.filter(p => p.clientId === clientId),
    [projects, clientId]
  );

  const clientTasks = useMemo(() =>
    tasks.filter(t => t.clientId === clientId),
    [tasks, clientId]
  );

  const filteredTasks = useMemo(() => {
    if (!selectedDeveloperId) return clientTasks;
    return clientTasks.filter(t => t.developerId === selectedDeveloperId);
  }, [clientTasks, selectedDeveloperId]);

  const developersWithTasks = useMemo(() => {
    const devIds = new Set(clientTasks.map(t => t.developerId).filter(id => id));
    return users.filter(u => devIds.has(u.id));
  }, [clientTasks, users]);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--textTitle)' }}>Cliente não encontrado</h2>
          <button
            onClick={() => navigate('/admin/clients')}
            className="hover:underline"
            style={{ color: 'var(--brand)' }}
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full transition-colors hover:bg-white/10"
          style={{ color: 'var(--textMuted)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border-2 p-2 flex items-center justify-center"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--textTitle)' }}>{client.name}</h1>
            <p style={{ color: 'var(--textMuted)' }}>{clientProjects.length} projetos • {clientTasks.length} tarefas</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/admin/clients/${clientId}/edit`)}
          className="px-4 py-2 border rounded-lg transition-colors flex items-center gap-2"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surfaceHover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
        >
          <Edit className="w-4 h-4" />
          Editar
        </button>

        <button
          onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)}
          className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg hover:bg-[#3b1675] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b mb-6" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2`}
          style={{
            color: activeTab === 'projects' ? 'var(--brand)' : 'var(--textMuted)',
            borderColor: activeTab === 'projects' ? 'var(--brand)' : 'transparent'
          }}
        >
          <LayoutGrid className="w-4 h-4" />
          Projetos
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2`}
          style={{
            color: activeTab === 'tasks' ? 'var(--brand)' : 'var(--textMuted)',
            borderColor: activeTab === 'tasks' ? 'var(--brand)' : 'transparent'
          }}
        >
          <ListTodo className="w-4 h-4" />
          Tarefas
        </button>
      </div>

      {/* Contract Info Stats */}
      {
        client && client.Criado && (
          <div className="mx-8 mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--textMuted)' }}>Início do Contrato</p>
                <p className="text-lg font-bold" style={{ color: 'var(--textTitle)' }}>
                  {new Date(client.Criado).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="border rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className={`p-3 rounded-lg ${client.Contrato ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                <Briefcase className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--textMuted)' }}>Término Previsto</p>
                <p className="text-lg font-bold" style={{ color: 'var(--textTitle)' }}>
                  {client.Contrato ? new Date(client.Contrato).toLocaleDateString('pt-BR') : 'Indeterminado'}
                </p>
              </div>
            </div>

            {client.Contrato && (
              <div className="border rounded-xl p-4 flex items-center gap-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--textMuted)' }}>Tempo Restante</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--textTitle)' }}>
                    {(() => {
                      const end = new Date(client.Contrato);
                      const now = new Date();
                      const diff = end.getTime() - now.getTime();
                      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

                      if (days < 0) return "Expirado";
                      if (days > 365) return `${Math.floor(days / 365)} anos`;
                      if (days > 30) return `${Math.floor(days / 30)} meses`;
                      return `${days} dias`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Content: Projetos */}
      {
        activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto">
            {clientProjects.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum projeto cadastrado</p>
                <button
                  onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)}
                  className="mt-4 text-[#4c1d95] hover:underline"
                >
                  Criar primeiro projeto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientProjects.map(project => {
                  const projectTasks = tasks.filter(t => t.projectId === project.id);
                  const doneTasks = projectTasks.filter(t => t.status === 'Done').length;

                  // DEBUG TEMPORÁRIO
                  if (project.id === '21') {
                    console.log('[ClientDetailsView] Projeto 21:', {
                      projectId: project.id,
                      tasksTotal: tasks.length,
                      projectTasksFound: projectTasks.length,
                      firstTaskProjectId: tasks[0]?.projectId,
                      typeOfProjectId: typeof tasks[0]?.projectId
                    });
                  }

                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate(`/admin/projects/${project.id}`)}
                      className="border-2 rounded-xl p-6 hover:shadow-lg transition-all text-left group relative"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      {/* Delete Project Button */}
                      {isAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete({ id: project.id, type: 'project' });
                          }}
                          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all z-10 opacity-0 group-hover:opacity-100"
                          title="Excluir Projeto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--brand)] transition-colors pr-8" style={{ color: 'var(--textTitle)' }}>
                        {project.name}
                      </h3>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--textMuted)' }}>
                          <CheckSquare className="w-4 h-4 text-green-500" />
                          <span>{doneTasks}/{projectTasks.length} tarefas concluídas</span>
                        </div>

                        {project.status && (
                          <div className="text-xs" style={{ color: 'var(--textMuted)' }}>
                            Status: <span className="font-medium">{project.status}</span>
                          </div>
                        )}
                      </div>

                      {/* Equipe do Projeto */}
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--textMuted)' }}>Equipe do Projeto</p>
                        <div className="flex flex-wrap gap-2">
                          {projectMembers
                            .filter(pm => pm.projectId === project.id)
                            .map(pm => {
                              const member = users.find(u => u.id === pm.userId);
                              if (!member) return null;
                              return (
                                <div
                                  key={member.id}
                                  className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border transition-colors dark:hover:border-purple-500/50 dark:hover:bg-purple-500/10"
                                  style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)' }}
                                  title={member.cargo || 'Colaborador'}
                                >
                                  <div className="w-5 h-5 rounded-full border flex items-center justify-center overflow-hidden text-[8px] font-bold"
                                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--textMuted)' }}>
                                    {member.avatarUrl ? (
                                      <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                                    ) : (
                                      member.name.substring(0, 2).toUpperCase()
                                    )}
                                  </div>
                                  <span className="text-xs font-medium truncate max-w-[100px]" style={{ color: 'var(--text)' }}>
                                    {member.name.split(' ')[0]}
                                  </span>
                                </div>
                              );
                            })}
                          {projectMembers.filter(pm => pm.projectId === project.id).length === 0 && (
                            <span className="text-xs italic" style={{ color: 'var(--textMuted)' }}>Nenhum colaborador vinculado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      }

      {/* Content: Tarefas */}
      {
        activeTab === 'tasks' && (
          <div className="flex-1 overflow-y-auto">
            {/* Filters */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 p-1.5 rounded-lg border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <Filter className="w-4 h-4 ml-2" style={{ color: 'var(--textMuted)' }} />
                <select
                  value={selectedDeveloperId}
                  onChange={(e) => setSelectedDeveloperId(e.target.value)}
                  className="bg-transparent text-sm outline-none p-1.5 min-w-[200px]"
                  style={{ color: 'var(--text)' }}
                >
                  <option value="" className="text-slate-800">Todos os Colaboradores</option>
                  {developersWithTasks
                    .filter(u => u.active !== false)
                    .map(u => (
                      <option key={u.id} value={u.id} className="text-slate-800">{u.name}</option>
                    ))
                  }
                </select>
              </div>

              <div className="text-sm" style={{ color: 'var(--textMuted)' }}>
                {filteredTasks.length} tarefas encontradas
              </div>
            </div>

            {clientTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma tarefa cadastrada para este cliente.</p>
                <button
                  onClick={() => navigate(`/tasks/new?client=${clientId}`)}
                  className="mt-4 text-[#4c1d95] hover:underline"
                >
                  Criar primeira tarefa
                </button>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p>Nenhuma tarefa encontrada com este filtro.</p>
                <button
                  onClick={() => setSelectedDeveloperId('')}
                  className="mt-2 text-[#4c1d95] hover:underline text-sm"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTasks.map(task => {
                  const project = projects.find(p => p.id === task.projectId);
                  const developerUser = users.find(u => u.id === task.developerId);

                  const handleCreateTimesheet = (e: React.MouseEvent) => {
                    e.stopPropagation();
                    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
                  };

                  return (
                    <div
                      key={task.id}
                      className="w-full border rounded-xl p-4 hover:shadow-md transition-all text-left group flex flex-col h-full"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                      <div
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className="cursor-pointer flex-1 flex flex-col"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.status === 'Done' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                            task.status === 'In Progress' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              task.status === 'Review' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}>
                            {task.status === 'Todo' ? 'A Fazer' :
                              task.status === 'In Progress' ? 'Em Progresso' :
                                task.status === 'Review' ? 'Revisão' : 'Concluído'}
                          </span>

                          <div className="flex items-center gap-2">
                            {task.priority && (
                              <span className={`text-[10px] font-bold ${task.priority === 'Critical' ? 'text-red-600 dark:text-red-400' :
                                task.priority === 'High' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500'
                                }`}>
                                {task.priority === 'Critical' ? 'CRÍTICA' : task.priority}
                              </span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setItemToDelete({ id: task.id, type: 'task' });
                                }}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                title="Excluir Tarefa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <h4 className="font-semibold group-hover:text-[var(--brand)] mb-1 line-clamp-2 pr-4" style={{ color: 'var(--textTitle)' }}>
                          {task.title || "(Sem título)"}
                        </h4>

                        {project && (
                          <div className="text-xs mb-3 flex items-center gap-1" style={{ color: 'var(--textMuted)' }}>
                            <Briefcase className="w-3 h-3" />
                            {project.name}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 border-t mt-auto pb-3" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-2">
                            {developerUser?.avatarUrl ? (
                              <img src={developerUser.avatarUrl} className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ backgroundColor: 'var(--bgApp)', color: 'var(--textMuted)' }}>
                                {task.developer?.substring(0, 2).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="text-xs truncate max-w-[80px]" style={{ color: 'var(--textMuted)' }}>
                              {task.developer || 'Sem resp.'}
                            </span>
                          </div>

                          {task.estimatedDelivery && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--textMuted)' }}>
                              <Clock className="w-3 h-3" />
                              {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                            </div>
                          )}
                        </div>
                      </div>


                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      }
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!itemToDelete}
        title={`Excluir ${itemToDelete?.type === 'project' ? 'Projeto' : 'Tarefa'}`}
        message={`Tem certeza que deseja excluir esta ${itemToDelete?.type === 'project' ? 'projeto' : 'tarefa'}? Esta ação não pode ser desfeita.`}
        onConfirm={async () => {
          if (!itemToDelete) return;
          try {
            if (itemToDelete.type === 'project') {
              await deleteProject(itemToDelete.id);
            } else {
              await deleteTask(itemToDelete.id);
            }
            setItemToDelete(null);
          } catch (err) {
            console.error('Erro ao excluir:', err);
            alert('Erro ao excluir item.');
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    </div >
  );
};

export default ClientDetailsView;
