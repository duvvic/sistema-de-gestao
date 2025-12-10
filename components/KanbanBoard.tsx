// components/KanbanBoard.tsx

import React, { useState } from "react";
import { Task, Client, Project, User } from "../types";
import { Calendar, User as UserIcon, StickyNote, Trash2, AlertCircle } from "lucide-react";
import ConfirmationModal from "./ConfirmationModal";

interface KanbanBoardProps {
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (taskId: string) => void;
  onNewTask: () => void;
  onNewProject?: () => void;
  filteredClientId?: string | null;
  onBackToAdmin?: () => void;
  onDeleteTask?: (taskId: string) => void;
  user?: User;
}

// =====================================================
// COLUNA DO KANBAN
// =====================================================

const KanbanColumn: React.FC<{
  title: string;
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  color: string;
  onTaskClick: (taskId: string) => void;
  onDeleteClick?: (e: React.MouseEvent, task: Task) => void;
  isAdmin: boolean;
}> = ({ title, tasks, clients, projects, color, onTaskClick, onDeleteClick, isAdmin }) => {
  return (
    <div className={`flex-1 min-w-[300px] flex flex-col rounded-2xl p-4 ${color}`}>
      
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
        <span className="bg-white/60 px-2 py-1 rounded-md text-xs font-bold shadow-sm">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-3 space-y-3 custom-scrollbar">
        {tasks.map((task) => {
          const client = clients.find((c) => c.id === task.clientId);
          const project = projects.find((p) => p.id === task.projectId);

          return (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className={`p-4 rounded-xl shadow-sm border bg-white hover:shadow-md cursor-pointer group relative`}
            >
              {/* ⚠️ Ícone de atraso */}
              {title === "Atrasados" && (
                <div className="absolute top-0 right-0 bg-red-100 text-red-600 p-1 rounded-bl-lg z-10">
                  <AlertCircle className="w-3 h-3" />
                </div>
              )}

              {/* Botão excluir (admin only) */}
              {isAdmin && onDeleteClick && (
                <button
                  onClick={(e) => onDeleteClick(e, task)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Empresa */}
              <div className="flex items-center gap-2 mb-2">
                {client?.logoUrl && (
                  <img
                    src={client.logoUrl}
                    className="w-5 h-5 object-contain rounded-sm"
                  />
                )}
                <span className="text-xs font-bold text-slate-700 truncate">{client?.name}</span>
              </div>

              {/* Projeto */}
              <div className="text-[10px] font-bold uppercase text-[#4c1d95] bg-purple-50 w-fit px-2 py-1 rounded mb-2 truncate">
                {project?.name}
              </div>

              {/* Título */}
              <h4 className="font-semibold text-slate-800 text-sm leading-snug mb-3">
                {task.title}
              </h4>

              {/* Barra de progresso */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${title === "Atrasados" ? "bg-red-500" : "bg-[#4c1d95]"}`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-slate-500">{task.progress}%</span>
              </div>

              {/* Rodapé */}
              <div className="flex justify-between items-center border-t pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>

                  {task.notes && <StickyNote className="w-3 h-3 text-slate-400" />}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full bg-slate-50">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {task.estimatedDelivery
                      ? new Date(task.estimatedDelivery).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "--"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// =====================================================
// COMPONENTE PRINCIPAL DO KANBAN
// =====================================================

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  clients,
  projects,
  onTaskClick,
  onNewTask,
  onNewProject,
  filteredClientId,
  onBackToAdmin,
  onDeleteTask,
  user
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const isAdmin = user?.role === "admin";

  // =====================================================
  // CLASSIFICAÇÃO BASEADA EM DATAS
  // =====================================================

  const now = new Date();

  const filteredTasks = tasks.filter((t) =>
    filteredClientId ? t.clientId === filteredClientId : true
  );

  const doing = filteredTasks.filter(
    (t) => !t.actualDelivery && new Date(t.estimatedDelivery) >= now
  );

  const delayed = filteredTasks.filter(
    (t) => !t.actualDelivery && new Date(t.estimatedDelivery) < now
  );

  const done = filteredTasks.filter(
    (t) => t.actualDelivery !== undefined && t.actualDelivery !== null
  );

  const handleDeleteClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete && onDeleteTask) {
      onDeleteTask(taskToDelete.id);
    }
    setDeleteModalOpen(false);
  };

  return (
    <div className="h-full flex flex-col">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Board de Projetos</h1>

        <div className="flex gap-3">
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="bg-white border border-slate-300 hover:bg-slate-100 px-4 py-2 rounded-xl shadow"
            >
              + Novo Projeto
            </button>
          )}

          <button
            onClick={onNewTask}
            className="bg-[#4c1d95] text-white hover:bg-[#3b1675] px-4 py-2 rounded-xl shadow"
          >
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* COLUNAS */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">

        <KanbanColumn
          title="Em Andamento"
          color="bg-slate-50"
          tasks={doing}
          clients={clients}
          projects={projects}
          onTaskClick={onTaskClick}
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />

        <KanbanColumn
          title="Atrasados"
          color="bg-red-50"
          tasks={delayed}
          clients={clients}
          projects={projects}
          onTaskClick={onTaskClick}
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />

        <KanbanColumn
          title="Concluídos"
          color="bg-green-50"
          tasks={done}
          clients={clients}
          projects={projects}
          onTaskClick={onTaskClick}
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />

      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Tarefa"
        message={`Deseja realmente excluir a tarefa "${taskToDelete?.title}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default KanbanBoard;
