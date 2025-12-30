// components/KanbanBoard.tsx - Adaptado para Router
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Task, Client, Project, Status } from '@/types';
import { Calendar, User as UserIcon, AlertCircle, Search, Trash2, ArrowLeft, GripVertical, Clock } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const STATUS_COLUMNS: { id: Status; title: string; color: string; bg: string; borderColor: string }[] = [
  { id: 'Todo', title: 'A Fazer', color: 'text-slate-600', bg: 'bg-slate-50', borderColor: 'border-slate-200' },
  { id: 'In Progress', title: 'Em Progresso', color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'Review', title: 'Revisão', color: 'text-purple-600', bg: 'bg-purple-50', borderColor: 'border-purple-200' },
  { id: 'Done', title: 'Concluído', color: 'text-green-600', bg: 'bg-green-50', borderColor: 'border-green-200' },
];

/* ================== CARD ================== */
const KanbanCard = ({
  task,
  client,
  project,
  onTaskClick,
  onDelete,
  isAdmin,
  isHighlighted
}: {
  task: Task;
  client?: Client;
  project?: Project;
  onTaskClick: (id: string) => void;
  onDelete?: (e: React.MouseEvent, t: Task) => void;
  isAdmin: boolean;
  isHighlighted?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDelayed = useMemo(() => {
    if (task.status === 'Done') return false;
    if (!task.estimatedDelivery) return false;
    const parts = task.estimatedDelivery.split('-');
    if (parts.length !== 3) return false;
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > due;
  }, [task]);

  const handleCreateTimesheet = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `/timesheet/new?taskId=${task.id}&projectId=${task.projectId}&clientId=${task.clientId}&date=${new Date().toISOString().split('T')[0]}`;
    onTaskClick('__NAVIGATE__:' + url);
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl h-[180px] w-full"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="space-y-2"
    >
      <div
        {...attributes}
        {...listeners}
        className={`
          relative group flex flex-col gap-3 p-4 rounded-xl border bg-white shadow-sm cursor-grab active:cursor-grabbing
          transition-all duration-500 ease-out
          ${isHighlighted
            ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50 shadow-purple-100 scale-[1.02]'
            : isDelayed
              ? 'border-red-200 bg-red-50/30'
              : 'bg-white border-slate-100 hover:border-purple-200 hover:shadow-md'
          }
          touch-none
        `}
        onClick={() => onTaskClick(task.id)}
      >
        <div className="flex justify-between items-start text-left">
          <div className="flex items-center gap-2 max-w-[85%]">
            <div className="text-slate-300 hover:text-slate-500">
              <GripVertical size={14} />
            </div>
            {client?.logoUrl && (
              <img src={client.logoUrl} className="w-4 h-4 rounded-sm object-contain" alt="" />
            )}
            <span className="text-[10px] uppercase font-bold text-slate-500 truncate">
              {client?.name || 'Sem Empresa'}
            </span>
          </div>
          {isDelayed && (
            <div className="text-red-500" title="Atrasado">
              <AlertCircle size={14} />
            </div>
          )}
        </div>

        {isAdmin && onDelete && (
          <button
            onClick={(e) => onDelete(e, task)}
            className="absolute top-2 right-2 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        )}

        <div className="flex text-left">
          <span className="text-[10px] font-bold tracking-wide uppercase text-[#4c1d95] bg-purple-50 px-2 py-1 rounded-md max-w-full truncate">
            {project?.name || 'Geral'}
          </span>
        </div>

        <h4 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2 text-left">
          {task.title}
        </h4>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isDelayed ? 'bg-red-500' : 'bg-[#4c1d95]'}`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-slate-500">{task.progress || 0}%</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-50 mt-1">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
              <UserIcon size={10} />
            </div>
            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[80px]">
              {task.developer || 'N/A'}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-400'}`}>
            <Calendar size={10} />
            <span>
              {task.estimatedDelivery
                ? new Date(task.estimatedDelivery).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '-'}
            </span>
          </div>
        </div>
      </div>

      {task.status !== 'Done' && (
        <button
          onClick={handleCreateTimesheet}
          className="w-full flex items-center justify-center gap-2 py-2 bg-purple-50 hover:bg-[#4c1d95] text-[#4c1d95] hover:text-white rounded-lg transition-all text-[11px] font-bold border border-purple-100 shadow-sm"
        >
          <Clock size={12} />
          Apontar Horas
        </button>
      )}
    </div>
  );
};

/* ================== COLUMN ================== */
const KanbanColumn = ({
  col,
  tasks,
  clients,
  projects,
  onTaskClick,
  onDelete,
  isAdmin,
  highlightedTaskId
}: {
  col: typeof STATUS_COLUMNS[0];
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (id: string) => void;
  onDelete?: (e: React.MouseEvent, t: Task) => void;
  isAdmin: boolean;
  highlightedTaskId?: string | null;
}) => {
  const { setNodeRef } = useSortable({
    id: col.id,
    data: { type: 'Column', column: col },
  });

  return (
    <div className={`flex flex-col flex-1 min-w-[250px] h-full rounded-2xl ${col.bg} border ${col.borderColor} p-3`}>
      <div className={`flex items-center justify-between mb-3 px-1 ${col.color}`}>
        <h3 className="font-bold text-sm uppercase tracking-wider">{col.title}</h3>
        <span className="bg-white/60 px-2 py-0.5 rounded-md text-xs font-bold shadow-sm border border-black/5">
          {tasks.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-1 space-y-3 custom-scrollbar min-h-[100px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard
              key={task.id} // Key usada aqui corretamente
              task={task}
              client={clients.find(c => c.id === task.clientId)}
              project={projects.find(p => p.id === task.projectId)}
              onTaskClick={onTaskClick}
              onDelete={onDelete}
              isAdmin={isAdmin}
              isHighlighted={highlightedTaskId === task.id}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

/* ================== BOARD ================== */
const KanbanBoard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { tasks, clients, projects, updateTask, deleteTask } = useDataController();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === "admin";
  const filteredClientId = searchParams.get('clientId');

  // Highlight
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  // Filter
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Se não for admin, mostrar apenas as tarefas do usuário logado
      const userFilter = isAdmin || t.developerId === currentUser?.id;

      return userFilter &&
        (!filteredClientId || t.clientId === filteredClientId) &&
        (t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [tasks, filteredClientId, searchTerm, isAdmin, currentUser]);

  const currentClient = useMemo(() =>
    filteredClientId ? clients.find(c => c.id === filteredClientId) : null
    , [filteredClientId, clients]);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeTask = tasks.find(t => t.id === activeId);

    if (!activeTask) return;

    const isOverColumn = STATUS_COLUMNS.some(col => col.id === overId);
    const overTask = tasks.find(t => t.id === overId);

    let newStatus: Status | null = null;

    if (isOverColumn) {
      newStatus = overId as Status;
    } else if (tasks.some(t => t.id === overId) && overTask) {
      newStatus = overTask.status;
    }

    if (newStatus && newStatus !== activeTask.status) {
      setHighlightedTaskId(activeId);
      // Atualizar via Controller
      await updateTask(activeId, { status: newStatus });
    }
  };

  const activeTask = useMemo(() => tasks.find(t => t.id === activeId), [activeId, tasks]);

  const handleDeleteClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete.id);
    }
    setDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {filteredClientId && (
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-[#4c1d95] text-slate-700 hover:text-white rounded-xl transition-all font-medium flex items-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {currentClient ? (
                <>
                  {currentClient.logoUrl && (
                    <img
                      src={currentClient.logoUrl}
                      alt={currentClient.name}
                      className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-1"
                    />
                  )}
                  {currentClient.name}
                </>
              ) : 'Quadro de Tarefas'}
            </h1>
            <p className="text-slate-500 text-sm">
              {currentClient ? 'Gerenciamento de entregas' : 'Visão geral de todas as tarefas'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm transition-all"
            />
          </div>

          <button
            className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold text-sm whitespace-nowrap active:scale-95"
            onClick={() => navigate('/tasks/new')}
          >
            + Nova Tarefa
          </button>
        </div>
      </div>

      {/* Kanban Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 px-2 custom-scrollbar h-full">
          {STATUS_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id} // Key usada aqui corretamente
              col={col}
              tasks={filteredTasks.filter(t => t.status === col.id)}
              clients={clients}
              projects={projects}
              onTaskClick={(id) => {
                if (id.startsWith('__NAVIGATE__:')) {
                  navigate(id.replace('__NAVIGATE__:', ''));
                } else {
                  navigate(`/tasks/${id}`);
                }
              }}
              onDelete={handleDeleteClick}
              isAdmin={isAdmin}
              highlightedTaskId={highlightedTaskId}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } },
          }),
        }}>
          {activeTask ? (
            <div className="w-[300px]">
              <KanbanCard
                task={activeTask}
                client={clients.find(c => c.id === activeTask.clientId)}
                project={projects.find(p => p.id === activeTask.projectId)}
                onTaskClick={() => { }}
                isAdmin={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default KanbanBoard;
