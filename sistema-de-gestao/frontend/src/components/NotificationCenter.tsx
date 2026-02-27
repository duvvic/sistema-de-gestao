// NotificationCenter.tsx - Notification Dropdown Component
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  Briefcase,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { tasks, projects, users, absences } = useDataController();
  const { currentUser } = useAuth();

  // Generate notifications based on data
  const notifications = useMemo(() => {
    const notifs: Array<{
      id: string;
      type: 'task' | 'project' | 'team' | 'absence';
      title: string;
      message: string;
      timestamp: Date;
      priority: 'high' | 'medium' | 'low';
      action?: () => void;
    }> = [];

    // Overdue tasks
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'Done' || !t.estimatedDelivery) return false;
      return new Date(t.estimatedDelivery) < new Date();
    });

    if (overdueTasks.length > 0) {
      notifs.push({
        id: 'overdue-tasks',
        type: 'task',
        title: 'Tarefas Atrasadas',
        message: `${overdueTasks.length} tarefa(s) estão atrasadas e precisam de atenção`,
        timestamp: new Date(),
        priority: 'high',
        action: () => {
          navigate('/tasks');
          onClose();
        }
      });
    }

    // Tasks due soon (next 3 days)
    const upcomingTasks = tasks.filter(t => {
      if (t.status === 'Done' || !t.estimatedDelivery) return false;
      const dueDate = new Date(t.estimatedDelivery);
      const today = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(today.getDate() + 3);
      return dueDate > today && dueDate <= threeDaysFromNow;
    });

    if (upcomingTasks.length > 0) {
      notifs.push({
        id: 'upcoming-tasks',
        type: 'task',
        title: 'Prazos Próximos',
        message: `${upcomingTasks.length} tarefa(s) vencem nos próximos 3 dias`,
        timestamp: new Date(),
        priority: 'medium',
        action: () => {
          navigate('/tasks');
          onClose();
        }
      });
    }

    // Pending absences for approval
    const pendingAbsences = absences.filter(a => a.status === 'sugestao');
    if (pendingAbsences.length > 0) {
      notifs.push({
        id: 'pending-absences',
        type: 'absence',
        title: 'Solicitações Pendentes',
        message: `${pendingAbsences.length} solicitação(ões) de férias aguardando aprovação`,
        timestamp: new Date(),
        priority: 'medium',
        action: () => {
          navigate('/admin/rh');
          onClose();
        }
      });
    }

    // Projects over budget
    const projectsOverBudget = projects.filter(p => {
      if (p.active === false) return false;
      const pTimesheets = tasks.filter(t => t.projectId === p.id);
      // Simplified check
      return (p.horas_vendidas || 0) > 0 && pTimesheets.length > (p.horas_vendidas || 0) * 1.1;
    });

    if (projectsOverBudget.length > 0) {
      notifs.push({
        id: 'projects-over-budget',
        type: 'project',
        title: 'Projetos Acima do Orçamento',
        message: `${projectsOverBudget.length} projeto(s) estão consumindo mais horas que o previsto`,
        timestamp: new Date(),
        priority: 'high',
        action: () => {
          navigate('/admin/projects');
          onClose();
        }
      });
    }

    // Team members with no tasks
    const idleUsers = users.filter(u => {
      if (u.active === false) return false;
      const userTasks = tasks.filter(t => t.developerId === u.id && t.status !== 'Done');
      return userTasks.length === 0 && u.role?.toLowerCase() === 'developer';
    });

    if (idleUsers.length > 0) {
      notifs.push({
        id: 'idle-users',
        type: 'team',
        title: 'Desenvolvedores Disponíveis',
        message: `${idleUsers.length} desenvolvedor(es) sem tarefas atribuídas`,
        timestamp: new Date(),
        priority: 'low',
        action: () => {
          navigate('/admin/team');
          onClose();
        }
      });
    }

    return notifs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, projects, users, absences, navigate, onClose]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'task': return Clock;
      case 'project': return Briefcase;
      case 'team': return Users;
      case 'absence': return CheckCircle;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'var(--danger)';
      case 'medium': return 'var(--warning)';
      case 'low': return 'var(--info)';
      default: return 'var(--muted)';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full right-0 mt-2 w-96 rounded-2xl border shadow-2xl z-50 overflow-hidden"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)'
          }}
        >
          {/* Header */}
          <div
            className="px-6 py-4 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'var(--primary-soft)' }}
              >
                <Bell className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <h3 className="font-black text-lg" style={{ color: 'var(--text)' }}>
                  Notificações
                </h3>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {notifications.length} {notifications.length === 1 ? 'nova' : 'novas'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-opacity-10 transition-all"
              style={{ color: 'var(--muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <CheckCircle
                  className="w-12 h-12 mx-auto mb-4 opacity-30"
                  style={{ color: 'var(--success)' }}
                />
                <p className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                  Nenhuma notificação nova
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  Você está em dia com tudo!
                </p>
              </div>
            ) : (
              notifications.map(notif => {
                const Icon = getIcon(notif.type);
                const priorityColor = getPriorityColor(notif.priority);

                return (
                  <div
                    key={notif.id}
                    onClick={notif.action}
                    className="px-6 py-4 border-b cursor-pointer hover:bg-opacity-50 transition-all relative"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Priority indicator */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: priorityColor }}
                    />

                    <div className="flex gap-4">
                      <div
                        className="p-2 rounded-lg h-fit"
                        style={{
                          backgroundColor: `${priorityColor}1A`,
                          color: priorityColor
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text)' }}>
                          {notif.title}
                        </h4>
                        <p className="text-xs mb-2" style={{ color: 'var(--text-2)' }}>
                          {notif.message}
                        </p>
                        <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>
                          Agora mesmo
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-6 py-3 border-t text-center"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}
            >
              <button
                className="text-xs font-bold uppercase tracking-wider transition-all"
                style={{ color: 'var(--primary)' }}
              >
                Marcar todas como lidas
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default NotificationCenter;
