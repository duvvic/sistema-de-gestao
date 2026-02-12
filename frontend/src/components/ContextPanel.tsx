// ContextPanel.tsx - Sidebar lateral inteligente com contexto
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Activity,
  Target,
  CheckSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  Calendar,
  User as UserIcon
} from 'lucide-react';

export const ContextPanel: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { tasks, projects, timesheetEntries } = useDataController();

  // Atividade recente (últimas mudanças de status de tarefas)
  const recentActivity = useMemo(() => {
    return tasks
      .filter(t => t.actualStart || t.actualDelivery)
      .sort((a, b) => {
        const dateA = a.actualDelivery || a.actualStart || '';
        const dateB = b.actualDelivery || b.actualStart || '';
        return dateB.localeCompare(dateA);
      })
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        title: t.title,
        project: t.projectName || 'Projeto',
        time: t.actualDelivery || t.actualStart || '',
        type: t.actualDelivery ? 'completed' : 'started'
      }));
  }, [tasks]);

  // Próximas tarefas do usuário
  const myUpcomingTasks = useMemo(() => {
    return tasks
      .filter(t =>
        t.developerId === currentUser?.id &&
        t.status !== 'Done' &&
        t.estimatedDelivery
      )
      .sort((a, b) => a.estimatedDelivery!.localeCompare(b.estimatedDelivery!))
      .slice(0, 5);
  }, [tasks, currentUser]);

  // Projeto em foco (com mais horas recentes)
  const focusProject = useMemo(() => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    const recentEntries = timesheetEntries.filter(e => {
      const entryDate = new Date(e.date);
      return entryDate >= last7Days;
    });

    const projectHours: Record<string, number> = {};
    recentEntries.forEach(e => {
      projectHours[e.projectId] = (projectHours[e.projectId] || 0) + (Number(e.totalHours) || 0);
    });

    const topProjectId = Object.entries(projectHours)
      .sort(([, a], [, b]) => b - a)[0]?.[0];

    if (!topProjectId) return null;

    const project = projects.find(p => p.id === topProjectId);
    if (!project) return null;

    const projectTasks = tasks.filter(t => t.projectId === topProjectId);
    const progress = (() => {
      if (projectTasks.length === 0) return 0;
      let totalDuration = 0;
      let weightedSum = 0;
      projectTasks.forEach(t => {
        const tStart = t.scheduledStart ? new Date(t.scheduledStart) : new Date();
        const tEnd = t.estimatedDelivery ? new Date(t.estimatedDelivery) : tStart;
        const duration = Math.max(1, Math.ceil((tEnd.getTime() - tStart.getTime()) / (1000 * 60 * 60 * 24)));
        totalDuration += duration;
        weightedSum += (t.progress || 0) * duration;
      });
      return totalDuration > 0 ? weightedSum / totalDuration : 0;
    })();

    return {
      ...project,
      progress,
      hoursThisWeek: projectHours[topProjectId]
    };
  }, [projects, tasks, timesheetEntries]);

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours < 24) return `há ${diffHours}h`;
    return `há ${diffDays}d`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short'
    });
  };

  return (
    <div
      className="w-96 border-l overflow-y-auto custom-scrollbar p-6 space-y-6"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderColor: 'var(--border)'
      }}
    >
      {/* Timeline de Atividades */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            Atividade Recente
          </h3>
        </div>

        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma atividade recente
            </p>
          ) : (
            recentActivity.map(activity => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative pl-6 pb-3 border-l-2"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="absolute left-0 top-1 -translate-x-1/2 w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: activity.type === 'completed' ? 'var(--success)' : 'var(--info)'
                  }}
                />
                <div
                  className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)'
                  }}
                  onClick={() => navigate(`/tasks/${activity.id}`)}
                >
                  <div className="font-medium text-xs mb-1" style={{ color: 'var(--text)' }}>
                    {activity.title}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {activity.project} • {formatTimeAgo(activity.time)}
                  </div>
                  <div
                    className="text-xs font-medium mt-1"
                    style={{
                      color: activity.type === 'completed' ? 'var(--success)' : 'var(--info)'
                    }}
                  >
                    {activity.type === 'completed' ? '✓ Concluída' : '→ Iniciada'}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </section>

      {/* Projeto em Foco */}
      {focusProject && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
              Projeto em Foco
            </h3>
          </div>

          <div
            className="rounded-xl p-4 border cursor-pointer hover:shadow-lg transition-all"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--primary)',
              borderWidth: '2px'
            }}
            onClick={() => navigate(`/admin/projects/${focusProject.id}`)}
          >
            <div className="font-bold mb-2" style={{ color: 'var(--text)' }}>
              {focusProject.name}
            </div>
            <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
              {focusProject.hoursThisWeek.toFixed(1)}h esta semana
            </div>
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-2)' }}>
                <span>Progresso</span>
                <span className="font-bold">{Math.round(focusProject.progress)}%</span>
              </div>
              <div
                className="h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--surface-2)' }}
              >
                <div
                  className="h-full transition-all duration-300 rounded-full"
                  style={{
                    width: `${focusProject.progress}%`,
                    backgroundColor: 'var(--primary)'
                  }}
                />
              </div>
            </div>
            {focusProject.estimatedDelivery && (
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--muted)' }}>
                <Calendar className="w-3 h-3" />
                Entrega: {formatDate(focusProject.estimatedDelivery)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Próximas Tarefas */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          <h3 className="font-bold text-sm" style={{ color: 'var(--text)' }}>
            Próximas Tarefas
          </h3>
        </div>

        <div className="space-y-2">
          {myUpcomingTasks.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma tarefa pendente
            </p>
          ) : (
            myUpcomingTasks.map(task => {
              const isOverdue = task.estimatedDelivery && new Date(task.estimatedDelivery) < new Date();
              const priorityColor = task.priority === 'Critical' || task.priority === 'High'
                ? 'var(--danger)'
                : task.priority === 'Medium'
                  ? 'var(--warning)'
                  : 'var(--success)';

              return (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all flex items-start gap-3"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: isOverdue ? 'var(--danger)' : 'var(--border)',
                    borderLeftWidth: '3px',
                    borderLeftColor: priorityColor
                  }}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <div
                    className="w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs mb-1 truncate" style={{ color: 'var(--text)' }}>
                      {task.title}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                      {task.projectName}
                    </div>
                    <div
                      className="text-xs mt-1 font-medium"
                      style={{ color: isOverdue ? 'var(--danger)' : 'var(--muted)' }}
                    >
                      {isOverdue ? '⚠️ ' : '📅 '}
                      {formatDate(task.estimatedDelivery!)}
                    </div>
                  </div>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: priorityColor }}
                  />
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};
