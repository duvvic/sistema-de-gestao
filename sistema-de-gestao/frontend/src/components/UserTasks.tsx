// components/UserTasks.tsx
import React, { useMemo, useState } from "react";
import { Task, Project, Client, User, TimesheetEntry } from '@/types';
import { ArrowLeft, Plus, FolderKanban, Calendar, Building2, TrendingUp, Clock, User as UserIcon } from "lucide-react";

interface UserTasksProps {
  user: User;
  tasks: Task[];
  projects: Project[];
  clients: Client[];
  filterProjectId?: string | null;

  onTaskClick: (taskId: string) => void;
  onNewTask: () => void;
  onCreateTimesheetForTask?: (task: Task) => void;
  timesheetEntries?: TimesheetEntry[];
  users: User[];

  onBack?: () => void;
}

const UserTasks: React.FC<UserTasksProps> = ({
  user,
  tasks,
  projects,
  clients,
  filterProjectId,
  onTaskClick,
  onNewTask,
  onBack,
  onCreateTimesheetForTask,
  timesheetEntries,
  users
}) => {

  const [viewFilter, setViewFilter] = useState<'all' | 'concluded' | 'delayed' | 'inprogress'>('all');

  // ================================
  // 1) Filtra apenas tarefas do usuário
  // ================================
  const myTasks = useMemo(
    () => tasks.filter((t) => t.developerId === user.id || t.collaboratorIds?.includes(user.id)),
    [tasks, user.id]
  );

  // ================================
  // 2) Filtra por projeto (se houver)
  // ================================
  const filteredTasks = useMemo(() => {
    if (!filterProjectId) return myTasks;
    return myTasks.filter((t) => t.projectId === filterProjectId);
  }, [myTasks, filterProjectId]);

  const isTaskDelayed = (task: Task) => (task.daysOverdue ?? 0) > 0;


  // ================================
  // 3) Agrupar em 3 colunas: Em Progresso, Atrasadas, Concluídas
  // ================================
  const tasksByStatus = useMemo(() => {
    const concluded = filteredTasks.filter(t => !!t.actualDelivery || t.status === 'Done' || t.status === 'Review');
    const delayed = filteredTasks.filter(t => !concluded.some(c => c.id === t.id) && isTaskDelayed(t));
    const inProgress = filteredTasks.filter(t => !concluded.some(c => c.id === t.id) && !delayed.some(d => d.id === t.id));

    return {
      InProgress: inProgress,
      Delayed: delayed,
      Concluded: concluded,
    };
  }, [filteredTasks]);


  // ================================
  // 4) Render
  // ================================
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] rounded-2xl px-8 py-6 mb-6 shadow-md border border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              📋 Minhas Tarefas
            </h1>
            <p className="text-white/80 text-sm mt-2">
              {filterProjectId
                ? "Tarefas do projeto selecionado"
                : "Todas as suas tarefas atribuídas"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNewTask}
              className="px-5 py-2.5 rounded-xl bg-white text-[var(--primary)] hover:bg-slate-100 transition-all flex items-center gap-2 shadow-sm font-bold transform hover:scale-102"
            >
              <Plus size={20} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </div>

      {/* Top status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Em Progresso</div>
              <div className="text-3xl font-black mt-2 text-blue-600">⚙️ {tasksByStatus.InProgress.length}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-300" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Atrasadas</div>
              <div className="text-3xl font-black mt-2 text-red-600">⏰ {tasksByStatus.Delayed.length}</div>
            </div>
            <Clock className="w-8 h-8 text-red-300" />
          </div>
        </div>

        <div className="p-5 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Concluído</div>
              <div className="text-3xl font-black mt-2 text-emerald-600">✅ {tasksByStatus.Concluded.length}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-emerald-300" />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          <FolderKanban className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-semibold">Nenhuma tarefa encontrada.</p>
          <p className="text-sm mt-2">Crie uma nova tarefa para começar</p>
        </div>
      )}

      {/* Kanban / Filtered Lists */}
      {filteredTasks.length > 0 && (
        <div className="flex-1 overflow-x-auto pb-4 custom-scrollbar">
          {viewFilter === 'all' && (
            <div className="flex gap-4 h-full min-w-max md:min-w-0">
              <TaskColumn
                title="Em Progresso"
                tasks={tasksByStatus.InProgress}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
                users={users}
                accentColor="#3b82f6"
              />

              <TaskColumn
                title="Atrasadas"
                tasks={tasksByStatus.Delayed}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
                users={users}
                accentColor="#ef4444"
              />

              <TaskColumn
                title="Concluído"
                tasks={tasksByStatus.Concluded}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
                users={users}
                accentColor="#10b981"
              />
            </div>
          )}

          {viewFilter === 'concluded' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Concluído</h3>
                <div className="space-y-3">
                  {tasksByStatus.Concluded.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Entrega: {t.actualDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'delayed' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold text-red-600 mb-3">Tarefas Atrasadas</h3>
                <div className="space-y-3">
                  {tasksByStatus.Delayed.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Prevista: {t.estimatedDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'inprogress' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-2xl border p-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <h3 className="font-bold mb-3" style={{ color: 'var(--text)' }}>Em Progresso</h3>
                <div className="space-y-3">
                  {tasksByStatus.InProgress.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left transition border rounded-xl p-4 shadow-sm"
                      style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                      <div className="font-bold" style={{ color: 'var(--text)' }}>{t.title}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Prevista: {t.estimatedDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserTasks;


// ================================================
// COMPONENTE: COLUNA DO KANBAN
// ================================================
const TaskColumn: React.FC<{
  title: string;
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (id: string) => void;
  onCreateTimesheetForTask?: (task: Task) => void;
  timesheetEntries?: TimesheetEntry[];
  currentUserId?: string;
  users: User[];
  accentColor?: string;
}> = ({ title, tasks, clients, projects, onTaskClick, onCreateTimesheetForTask, timesheetEntries, currentUserId, users, accentColor }) => {

  return (
    <div className="flex-1 min-w-[320px] rounded-2xl border p-4 flex flex-col" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
      <h2 className="text-sm font-bold mb-4 uppercase tracking-wider" style={{ color: 'var(--text)' }}>{title} ({tasks.length})</h2>

      <div className="space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
        {tasks.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const client = clients.find(c => c.id === task.clientId);

          return (
            <div key={task.id} className="w-full transition border rounded-xl p-4 shadow-sm group hover:shadow-md relative overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: accentColor || 'var(--border)',
                borderLeftWidth: accentColor ? '4px' : '1px'
              }}>
              <button
                onClick={() => onTaskClick(task.id)}
                className="w-full text-left"
              >
                <p className="font-bold text-sm leading-tight group-hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--text)' }}>{task.title || "(Sem título)"}</p>

                <div className="text-[11px] mt-2 flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                  <Calendar size={13} />
                  {(() => {
                    if (task.status === 'Done') return '-';
                    if (!task.estimatedDelivery) return '-';

                    const parts = task.estimatedDelivery.split('-');
                    const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                    const formattedDate = deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                    // Se for review (pendente), apenas mostra a data
                    if (task.status === 'Review') return formattedDate;

                    const now = new Date();
                    now.setHours(0, 0, 0, 0);

                    const diffTime = deadline.getTime() - now.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    let countdown = '';
                    if (diffDays < 0) countdown = 'Atrasado';
                    else if (diffDays === 0) countdown = 'Hoje';
                    else if (diffDays === 1) countdown = 'Amanhã';
                    else if (diffDays <= 3) countdown = `Faltam ${diffDays}d`;

                    return countdown ? `${formattedDate} • ${countdown}` : formattedDate;
                  })()}
                </div>

                <div className="text-[11px] mt-1 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Building2 size={13} style={{ color: 'var(--primary)' }} />
                  {client?.name ?? "Cliente"}
                </div>

                <div className="text-[11px] mt-1 truncate" style={{ color: 'var(--muted)' }}>
                  Projeto: {project?.name ?? "Sem projeto"}
                </div>

                {/* Equipe / Avatares */}
                <div className="flex -space-x-1.5 mt-3 overflow-hidden">
                  {/* Responsável Principal */}
                  {(() => {
                    const dev = users.find(u => u.id === task.developerId);
                    return (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center border hover:z-10 transition-all bg-white overflow-hidden"
                        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                        title={`Responsável: ${dev?.name || task.developer || 'N/A'}`}
                      >
                        {dev?.avatarUrl ? (
                          <img src={dev.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={12} />
                        )}
                      </div>
                    );
                  })()}

                  {/* Colaboradores Extras */}
                  {(task.collaboratorIds || [])
                    .filter(uid => uid !== task.developerId) // Evitar duplicar o dono
                    .slice(0, 3).map(uid => {
                      const u = users.find(user => user.id === uid);
                      return (
                        <div
                          key={uid}
                          className="w-6 h-6 rounded-full flex items-center justify-center border hover:z-10 transition-all bg-slate-50 overflow-hidden"
                          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                          title={`Colaborador: ${u?.name || uid}`}
                        >
                          {u?.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={12} />
                          )}
                        </div>
                      );
                    })}

                  {(task.collaboratorIds?.length || 0) > 3 && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center border bg-slate-100 text-[8px] font-bold"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    >
                      +{task.collaboratorIds!.length - 3}
                    </div>
                  )}
                </div>
              </button>

              {/* badge: show if user has no timesheet for this task today and task not done */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const hasEntry = !!timesheetEntries?.some(e => e.taskId === task.id && e.date === today && e.userId === currentUserId);
                const show = !hasEntry && task.status !== 'Done';
                return show ? (
                  <div className="mt-3">
                    <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">Sem Apontamento</span>
                  </div>
                ) : null;
              })()}

              {task.status !== 'Done' && task.actualDelivery == null && (
                <div className="mt-3 flex items-center gap-2">
                  {onCreateTimesheetForTask && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onCreateTimesheetForTask(task); }}
                      className="w-full px-3 py-1.5 rounded-lg text-white text-[11px] font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                    >
                      <Plus size={14} />
                      Apontar Hoje
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
