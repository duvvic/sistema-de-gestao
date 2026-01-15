// components/ProjectDetailView.tsx - Adaptado para Router
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { ArrowLeft, Plus, Edit, CheckSquare, Clock } from 'lucide-react';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, users, projectMembers } = useDataController();

  const project = projects.find(p => p.id === projectId);
  const client = project ? clients.find(c => c.id === project.clientId) : null;

  const projectTasks = useMemo(() =>
    tasks.filter(t => t.projectId === projectId),
    [tasks, projectId]
  );

  // Helper para enriquecer tasks com dados do user
  const getTaskWithUser = (task: any) => {
    const user = users.find(u => u.id === task.developerId);
    return {
      ...task,
      developerAvatar: user?.avatarUrl,
      developerName: user?.name || task.developer
    };
  };

  const tasksByStatus = useMemo(() => {
    return {
      Todo: projectTasks.filter(t => t.status === 'Todo').map(getTaskWithUser),
      InProgress: projectTasks.filter(t => t.status === 'In Progress').map(getTaskWithUser),
      Review: projectTasks.filter(t => t.status === 'Review').map(getTaskWithUser),
      Done: projectTasks.filter(t => t.status === 'Done').map(getTaskWithUser),
    };
  }, [projectTasks, users]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        {/* ... (manter igual) ... */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[var(--textTitle)] mb-2">Projeto não encontrado</h2>
          <button
            onClick={() => navigate('/admin/projects')}
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
          onClick={() => navigate(`/admin/clients/${project.clientId}`)}
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
                    <div
                      key={member.id}
                      className="w-6 h-6 rounded-full border border-[var(--bgApp)] bg-[var(--surface)] flex items-center justify-center overflow-hidden"
                      title={member.name}
                    >
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-bold text-[var(--textMuted)]">
                          {member.name.substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  );
                })}
              {projectMembers.filter(pm => pm.projectId === projectId).length === 0 && (
                <span className="text-xs text-[var(--textMuted)] italic">Sem equipe</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/admin/projects/${projectId}/edit`)}
          className="px-4 py-2 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surfaceHover)] flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Editar
        </button>

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
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold text-[var(--textTitle)] mb-4">Tarefas</h2>

        {projectTasks.length === 0 ? (
          <div className="text-center py-12 text-[var(--textMuted)]">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa cadastrada</p>
            <button
              onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
              className="mt-4 text-[var(--brand)] hover:underline"
            >
              Criar primeira tarefa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* A Fazer */}
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                A Fazer ({tasksByStatus.Todo.length})
              </h3>
              <div className="space-y-2">
                {tasksByStatus.Todo.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                ))}
              </div>
            </div>

            {/* Em Progresso */}
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                Em Progresso ({tasksByStatus.InProgress.length})
              </h3>
              <div className="space-y-2">
                {tasksByStatus.InProgress.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                ))}
              </div>
            </div>

            {/* Revisão */}
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                Revisão ({tasksByStatus.Review.length})
              </h3>
              <div className="space-y-2">
                {tasksByStatus.Review.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                ))}
              </div>
            </div>

            {/* Concluídas */}
            <div className="space-y-3">
              <h3 className="font-bold text-[var(--text)] text-sm flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Concluídas ({tasksByStatus.Done.length})
              </h3>
              <div className="space-y-2">
                {tasksByStatus.Done.map(task => (
                  <TaskCard key={task.id} task={task} onClick={() => navigate(`/tasks/${task.id}`)} />
                ))}
              </div>
            </div>
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

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const navigate = useNavigate();

  const handleCreateTimesheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 hover:border-[var(--brand)] hover:shadow-md transition-all text-left group">
      <div onClick={onClick} className="cursor-pointer">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-semibold text-[var(--textTitle)] truncate group-hover:text-[var(--brand)] flex-1">
            {task.title || "(Sem título)"}
          </p>
          {task.priority && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${task.priority === 'Critical' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
              task.priority === 'High' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                task.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              }`}>
              {task.priority === 'Critical' ? 'Crit' : task.priority}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 h-1 bg-[var(--border)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand)]"
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[var(--textMuted)]">{task.progress || 0}%</span>
        </div>

        {/* Rodapé com Responsável */}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 pb-2">
          <div className="flex items-center gap-2">
            {task.developerAvatar ? (
              <img src={task.developerAvatar} alt={task.developerName} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--surfaceHover)] text-[10px] flex items-center justify-center font-bold text-[var(--textMuted)]">
                {task.developerName ? task.developerName.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <span className="text-xs text-[var(--textMuted)] truncate max-w-[100px]" title={task.developerName}>
              {task.developerName?.split(' ')[0] || 'Sem Resp.'}
            </span>
          </div>

          {task.estimatedDelivery && (
            <span className="text-[10px] text-[var(--textMuted)] flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {task.status !== 'Done' && (
        <button
          onClick={handleCreateTimesheet}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-[var(--brand)] text-[var(--brand)] hover:text-white rounded-lg transition-all text-xs font-bold border border-purple-100 dark:border-purple-800 shadow-sm"
        >
          <Clock className="w-4 h-4" />
          Apontar Horas
        </button>
      )}
    </div>
  );
};

export default ProjectDetailView;
