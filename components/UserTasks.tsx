// components/UserTasks.tsx
import React, { useMemo, useState } from "react";
import { Task, Project, Client, User, TimesheetEntry } from "../types";
import { ArrowLeft, Plus, FolderKanban, Calendar, Building2 } from "lucide-react";

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
  timesheetEntries
}) => {

  const [viewFilter, setViewFilter] = useState<'all'|'concluded'|'delayed'|'inprogress'>('all');

  // ================================
  // 1) Filtra apenas tarefas do usuário
  // ================================
  const myTasks = useMemo(
    () => tasks.filter((t) => t.developerId === user.id),
    [tasks, user.id]
  );

  // ================================
  // 2) Filtra por projeto (se houver)
  // ================================
  const filteredTasks = useMemo(() => {
    if (!filterProjectId) return myTasks;
    return myTasks.filter((t) => t.projectId === filterProjectId);
  }, [myTasks, filterProjectId]);

  const isTaskDelayed = (task: Task) => {
    if (!task.estimatedDelivery) return false;
    if (task.actualDelivery) return false; // already done
    try {
      const due = new Date(task.estimatedDelivery);
      const today = new Date();
      // normalize dates (compare yyyy-mm-dd only)
      const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return dueDay < todayDay;
    } catch (e) {
      return false;
    }
  };


  // ================================
  // 3) Agrupar em 3 colunas: Em Progresso, Atrasadas, Concluídas
  // ================================
  const tasksByStatus = useMemo(() => {
    const concluded = filteredTasks.filter(t => !!t.actualDelivery || t.status === 'Done');
    const delayed = filteredTasks.filter(t => !concluded.includes(t) && isTaskDelayed(t));
    const inProgress = filteredTasks.filter(t => !concluded.includes(t) && !delayed.includes(t));

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
    <div className="h-full flex flex-col p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minhas Tarefas</h1>
          <p className="text-slate-500">
            {filterProjectId
              ? "Tarefas do projeto selecionado"
              : "Todas as suas tarefas"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 transition flex items-center gap-2"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          )}

          <button
            onClick={onNewTask}
            className="px-4 py-2 rounded-xl bg-[#4c1d95] text-white hover:bg-[#3b1675] transition flex items-center gap-2 shadow"
          >
            <Plus size={20} />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Top status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button onClick={() => setViewFilter('inprogress')} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
          <div className="text-sm text-slate-500">Em Progresso</div>
          <div className="text-2xl font-bold text-slate-800 mt-2">{tasksByStatus.InProgress.length}</div>
        </button>

        <button onClick={() => setViewFilter('delayed')} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
          <div className="text-sm text-slate-500">Atrasadas</div>
          <div className="text-2xl font-bold text-red-600 mt-2">{tasksByStatus.Delayed.length}</div>
        </button>

        <button onClick={() => setViewFilter('concluded')} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
          <div className="text-sm text-slate-500">Concluídas</div>
          <div className="text-2xl font-bold text-green-600 mt-2">{tasksByStatus.Concluded.length}</div>
        </button>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-8">
          <FolderKanban className="w-12 h-12 mb-4 text-slate-300" />
          <p>Nenhuma tarefa encontrada.</p>
        </div>
      )}

      {/* Kanban / Filtered Lists */}
      {filteredTasks.length > 0 && (
        <div className="h-full overflow-y-auto pb-4 custom-scrollbar">
          {viewFilter === 'all' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TaskColumn
                title="Em Progresso"
                tasks={tasksByStatus.InProgress}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
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
              />

              <TaskColumn
                title="Concluídas"
                tasks={tasksByStatus.Concluded}
                clients={clients}
                projects={projects}
                onTaskClick={onTaskClick}
                onCreateTimesheetForTask={onCreateTimesheetForTask}
                timesheetEntries={timesheetEntries}
                currentUserId={user.id}
              />
            </div>
          )}

          {viewFilter === 'concluded' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-700 mb-3">Tarefas Concluídas</h3>
                <div className="space-y-3">
                  {tasksByStatus.Concluded.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left bg-slate-50 hover:bg-slate-100 transition border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="font-bold text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-1">Entrega: {t.actualDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'delayed' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-red-600 mb-3">Tarefas Atrasadas</h3>
                <div className="space-y-3">
                  {tasksByStatus.Delayed.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left bg-slate-50 hover:bg-slate-100 transition border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="font-bold text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-1">Prevista: {t.estimatedDelivery}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {viewFilter === 'inprogress' && (
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-700 mb-3">Em Progresso</h3>
                <div className="space-y-3">
                  {tasksByStatus.InProgress.map(t => (
                    <button key={t.id} onClick={() => onTaskClick(t.id)} className="w-full text-left bg-slate-50 hover:bg-slate-100 transition border border-slate-200 rounded-xl p-4 shadow-sm">
                      <div className="font-bold text-slate-800">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-1">Prevista: {t.estimatedDelivery}</div>
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
}> = ({ title, tasks, clients, projects, onTaskClick, onCreateTimesheetForTask, timesheetEntries, currentUserId }) => {

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
      <h2 className="text-lg font-bold text-slate-700 mb-4">{title}</h2>

      <div className="space-y-3 overflow-y-auto custom-scrollbar">
        {tasks.map(task => {
          const project = projects.find(p => p.id === task.projectId);
          const client = clients.find(c => c.id === task.clientId);

          return (
            <div key={task.id} className="w-full bg-slate-50 hover:bg-slate-100 transition border border-slate-200 rounded-xl p-4 shadow-sm">
              <button
                onClick={() => onTaskClick(task.id)}
                className="w-full text-left"
              >
                <p className="font-bold text-slate-800">{task.title}</p>

                <div className="text-xs text-slate-500 mt-2 flex items-center gap-2">
                  <Calendar size={14} />
                  {task.estimatedDelivery}
                </div>

                <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                  <Building2 size={14} className="text-[#4c1d95]" />
                  {client?.name ?? "Cliente"}
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  Projeto: {project?.name ?? "Sem projeto"}
                </div>
              </button>

              {/* badge: show if user has no timesheet for this task today and task not done */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                const hasEntry = !!timesheetEntries?.some(e => e.taskId === task.id && e.date === today && e.userId === currentUserId);
                const show = !hasEntry && task.status !== 'Done';
                return show ? (
                  <div className="mt-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Sem Apont.</span>
                  </div>
                ) : null;
              })()}

              <div className="mt-3 flex items-center gap-2">
                {onCreateTimesheetForTask && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCreateTimesheetForTask(task); }}
                    className="px-3 py-1 rounded-lg bg-[#4c1d95] text-white text-sm hover:bg-[#3b1675] transition"
                  >
                    Apontar Hoje
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
