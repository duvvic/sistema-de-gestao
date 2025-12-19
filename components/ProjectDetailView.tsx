// components/ProjectDetailView.tsx - Adaptado para Router
import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { ArrowLeft, Plus, Edit, CheckSquare, Clock } from 'lucide-react';

const ProjectDetailView: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, clients, tasks, users } = useDataController();

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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Projeto não encontrado</h2>
          <button
            onClick={() => navigate('/admin/projects')}
            className="text-[#4c1d95] hover:underline"
          >
            Voltar para projetos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {/* ... (manter igual) ... */}
        <button
          onClick={() => navigate(`/admin/clients/${project.clientId}`)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex-1">
          {client && (
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-slate-100 p-1 flex items-center justify-center">
                <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
              </div>
              <span className="text-sm text-slate-500">{client.name}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="text-slate-500">{projectTasks.length} tarefas</p>
        </div>

        <button
          onClick={() => navigate(`/admin/projects/${projectId}/edit`)}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Editar
        </button>

        <button
          onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
          className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg hover:bg-[#3b1675] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Tarefa
        </button>
      </div>

      {/* Estatísticas */}
      {project.status && (
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <span className="text-sm text-slate-600">Status:</span>
          <span className="ml-2 font-medium text-slate-800">{project.status}</span>
        </div>
      )}

      {/* Tarefas por Status */}
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Tarefas</h2>

        {projectTasks.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma tarefa cadastrada</p>
            <button
              onClick={() => navigate(`/tasks/new?project=${projectId}&client=${project?.clientId}`)}
              className="mt-4 text-[#4c1d95] hover:underline"
            >
              Criar primeira tarefa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* A Fazer */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
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
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
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
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
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
              <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
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
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 rounded-lg p-3 hover:border-[#4c1d95] hover:shadow-md transition-all text-left group"
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[#4c1d95] flex-1">
          {task.title}
        </p>
        {task.priority && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${task.priority === 'Critical' ? 'bg-red-100 text-red-700' :
            task.priority === 'High' ? 'bg-orange-100 text-orange-700' :
              task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
            }`}>
            {task.priority === 'Critical' ? 'Crit' : task.priority}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4c1d95]"
            style={{ width: `${task.progress || 0}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-600">{task.progress || 0}%</span>
      </div>

      {/* Rodapé com Responsável */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-2">
        <div className="flex items-center gap-2">
          {task.developerAvatar ? (
            <img src={task.developerAvatar} alt={task.developerName} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-slate-200 text-[10px] flex items-center justify-center font-bold text-slate-600">
              {task.developerName ? task.developerName.charAt(0).toUpperCase() : '?'}
            </div>
          )}
          <span className="text-xs text-slate-500 truncate max-w-[100px]" title={task.developerName}>
            {task.developerName?.split(' ')[0] || 'Sem Resp.'}
          </span>
        </div>

        {task.estimatedDelivery && (
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
          </span>
        )}
      </div>
    </button>
  );
};

export default ProjectDetailView;
