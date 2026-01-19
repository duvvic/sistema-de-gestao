import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { ArrowLeft, Plus, Edit, CheckSquare, Clock, Filter, Search, ChevronDown, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, users, projectMembers } = useDataController();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = useMemo(() => {
    const pTasks = tasks.filter(t => t.projectId === projectId);

    // Filtro para Developer / Standard (USER_REQUEST: só mostrar tarefas vinculadas a mim)
    if (currentUser && currentUser.role !== 'admin') {
      return pTasks.filter(t =>
        t.developerId === currentUser.id ||
        (t.collaboratorIds && t.collaboratorIds.includes(currentUser.id))
      );
    }

    return pTasks;
  }, [tasks, projectId, currentUser]);

  // Helper para enriquecer tasks com dados do user e collaborators
  const getTaskWithUser = (task: any) => {
    const dev = users.find(u => u.id === task.developerId);

    // Mapear avatars dos colaboradores extras
    const collaborators = (task.collaboratorIds || [])
      .map((id: string) => users.find(u => u.id === id))
      .filter(Boolean);

    return {
      ...task,
      developerAvatar: dev?.avatarUrl,
      developerName: dev?.name || task.developer,
      collaborators: collaborators // Passar lista enriquecida
    };
  };

  const [selectedStatus, setSelectedStatus] = React.useState<string>('Todos');
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const filteredTasks = useMemo(() => {
    let t = projectTasks;
    if (selectedStatus !== 'Todos') {
      t = t.filter(task => task.status === selectedStatus);
    }
    // Sorting: Done last, then by Date
    return t.sort((a, b) => {
      if (a.status === 'Done' && b.status !== 'Done') return 1;
      if (a.status !== 'Done' && b.status === 'Done') return -1;
      return new Date(a.estimatedDelivery || '2099-12-31').getTime() - new Date(b.estimatedDelivery || '2099-12-31').getTime();
    });
  }, [projectTasks, selectedStatus]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* ... (manter igual) ... */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--textTitle)] mb-2">Projeto não encontrado</h2>
          <button
            onClick={() => navigate(isAdmin ? '/admin/projects' : '/developer/projects')}
            className="text-[var(--brand)] hover:underline"
          >
            Voltar para projetos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 bg-[var(--bgApp)]">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {/* ... (manter igual) ... */}
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--textMuted)]" />
        </button>

        <div className="flex-1">
          {client && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-[var(--surface)] p-1 flex items-center justify-center">
                <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-[var(--textMuted)]">{client.name}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--textTitle)]">{project.name}</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-[var(--textMuted)] font-medium text-sm">{projectTasks.length} tarefas</p>
            <div className="h-4 w-px bg-[var(--border)]"></div>
            <div className="flex -space-x-1.5 overflow-hidden">
              {projectMembers
                .filter(pm => pm.projectId === projectId)
                .map(pm => {
                  const member = users.find(u => u.id === pm.userId);
                  if (!member) return null;
                  return (
                    <button
                      key={member.id}
                      onClick={() => navigate(`/admin/team/${member.id}`)}
                      className="w-6 h-6 rounded-full border border-[var(--bgApp)] bg-[var(--surface)] flex items-center justify-center overflow-hidden hover:z-10 hover:scale-110 transition-all cursor-pointer"
                      title={member.name}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-[var(--textMuted)]">
                          {member.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </button>
                  );
                })}
              {projectMembers.filter(pm => pm.projectId === projectId).length === 0 && (
                <span className="text-xs text-[var(--textMuted)] italic">Sem equipe</span>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => navigate(`/admin/projects/${projectId}/edit`)}
            className="px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surfaceHover)] flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </button>
        )}

        <button
          onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
          className="px-4 py-2 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brandHover)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Estatísticas */}
      {project.status && (
        <div className="mb-6 p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)]">
          <span className="text-sm text-[var(--textMuted)]">Status:</span>
          <span className="ml-2 font-medium text-[var(--textTitle)]">{project.status}</span>
        </div>
      )}

      {/* Tarefas por Status */}
      {/* Controle e Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative z-20">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex items-center gap-2 text-sm font-bold text-[var(--text)] min-w-[200px] justify-between shadow-sm"
          >
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--textMuted)]" />
              <span>
                {(() => {
                  const statusLabels: Record<string, string> = {
                    'Todos': 'Todos os Status',
                    'Todo': 'A Fazer',
                    'In Progress': 'Em Progresso',
                    'Review': 'Revisão',
                    'Done': 'Concluído'
                  };
                  return statusLabels[selectedStatus] || selectedStatus;
                })()}
              </span>
            </div>
            <ChevronDown size={14} className={`transition-transform ${showStatusMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showStatusMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowStatusMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl p-2 flex flex-col gap-1 z-[70]"
                >
                  {['Todos', 'Todo', 'In Progress', 'Review', 'Done'].map(status => {
                    const statusLabels: Record<string, string> = {
                      'Todos': 'Todos os Status',
                      'Todo': 'A Fazer',
                      'In Progress': 'Em Progresso',
                      'Review': 'Revisão',
                      'Done': 'Concluído'
                    };

                    const statusColors: Record<string, string> = {
                      'Todos': 'bg-[var(--brand)]',
                      'Todo': 'bg-slate-500',
                      'In Progress': 'bg-blue-500',
                      'Review': 'bg-amber-500',
                      'Done': 'bg-emerald-500'
                    };

                    const label = statusLabels[status] || status;
                    const colorClass = statusColors[status] || 'bg-gray-500';

                    return (
                      <button
                        key={status}
                        onClick={() => { setSelectedStatus(status); setShowStatusMenu(false); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-bold transition-colors ${selectedStatus === status ? 'bg-[var(--surface-active)] text-[var(--brand)]' : 'text-[var(--textMuted)] hover:bg-[var(--surfaceHover)]'}`}
                      >
                        <div className="flex items-center gap-2">
                          {status !== 'Todos' && (
                            <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                          )}
                          {label}
                        </div>
                        {selectedStatus === status && <Check size={14} className="text-[var(--brand)]" />}
                      </button>
                    );
                  })}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <span className="text-sm font-medium text-[var(--textMuted)]">
          {filteredTasks.length} tarefas encontradas
        </span>
      </div>

      {/* Grid de Tarefas - Estilo Card 2.0 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-[var(--textMuted)]">
            <CheckSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">Nenhuma tarefa encontrada</p>
            {selectedStatus !== 'Todos' && (
              <button onClick={() => setSelectedStatus('Todos')} className="text-[var(--brand)] text-sm font-bold mt-2 hover:underline">
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={getTaskWithUser(task)}
                project={project}
                client={client || undefined}
                onClick={() => navigate(`/tasks/${task.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: any;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps & { project?: any, client?: any }> = ({ task, project, client, onClick }) => {
  const navigate = useNavigate();

  const handleCreateTimesheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
  };

  const statusConfig = {
    'Todo': { label: 'A FAZER', bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-600 dark:text-slate-400' },
    'In Progress': { label: 'EM PROGRESSO', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    'Review': { label: 'REVISÃO', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    'Done': { label: 'CONCLUÍDO', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
  };

  const status = statusConfig[task.status as keyof typeof statusConfig] || statusConfig['Todo'];

  // Border Color Logic
  const getBorderColor = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (task.status === 'Done') return '#10b981'; // Green

    if (task.estimatedDelivery) {
      const due = new Date(task.estimatedDelivery);
      if (due < today) return '#ef4444'; // Red (Delayed)
    }

    if (task.status === 'In Progress') return '#f59e0b'; // Amber

    return 'var(--border)'; // Default
  };

  const borderColor = getBorderColor();

  return (
    <div
      className="w-full bg-[var(--surface)] border rounded-2xl p-5 hover:shadow-xl transition-all text-left flex flex-col group h-full relative overflow-hidden"
      style={{
        borderColor: borderColor,
        borderWidth: borderColor === 'var(--border)' ? '1px' : '2px',
        boxShadow: borderColor !== 'var(--border)' ? `0 4px 6px -1px ${borderColor}20` : undefined
      }}
    >
      {/* Header Badges */}
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${status.bg} ${status.text}`}>
          {status.label}
        </span>
        {task.priority && (
          <span className={`text-[10px] font-bold ${task.priority === 'Critical' ? 'text-red-500' :
            task.priority === 'High' ? 'text-orange-500' :
              task.priority === 'Medium' ? 'text-yellow-500' : 'text-slate-400'
            }`}>
            {task.priority}
          </span>
        )}
      </div>

      {/* Title */}
      <div onClick={onClick} className="cursor-pointer">
        <h3 className="text-base font-bold text-[var(--textTitle)] mb-1 leading-tight group-hover:text-[var(--brand)] transition-colors">
          {task.title || "(Sem título)"}
        </h3>

        {/* Project Context */}
        {(project || client) && (
          <div className="flex items-center gap-1.5 text-[var(--textMuted)] mb-4">
            <CheckSquare size={12} className="opacity-70" />
            <span className="text-[11px] font-medium truncate">
              {project?.name || client?.name}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${task.progress || 0}%`,
              backgroundColor: task.status === 'Done' ? 'var(--success)' : 'var(--brand)'
            }}
          />
        </div>
        <span className="text-[10px] font-bold text-[var(--textMuted)]">{task.progress || 0}%</span>
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--border)] flex flex-col gap-3">
        {/* Footer Info */}
        <div className="flex justify-between items-center">
          <div className="flex -space-x-2">
            {/* Developer Avatar */}
            <div className="w-6 h-6 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)] z-10" title={`Responsável: ${task.developerName}`}>
              {task.developerAvatar ? (
                <img src={task.developerAvatar} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[var(--textMuted)]">
                  {task.developerName?.charAt(0) || '?'}
                </div>
              )}
            </div>

            {/* Collaborators Avatars */}
            {task.collaborators?.map((col: any) => (
              <div key={col.id} className="w-6 h-6 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]" title={`Colaborador: ${col.name}`}>
                {col.avatarUrl ? (
                  <img src={col.avatarUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] font-bold text-[var(--textMuted)]">
                    {col.name.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs font-medium text-[var(--textMuted)] truncate max-w-[100px] ml-2">
            {task.developerName?.split(' ')[0]}
            {task.collaborators?.length > 0 && ` +${task.collaborators.length}`}
          </span>
        </div>

        {task.estimatedDelivery && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--textMuted)] font-medium">
            <Clock size={12} />
            {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
          </div>
        )}
      </div>

      {/* Action Button */}

    </div>
  );
};

export default ProjectDetailView;
