// components/KanbanBoard.tsx - Adaptado para Router
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
import { Task, Client, Project, Status, User } from '@/types';
import { Calendar, User as UserIcon, AlertCircle, Search, Trash2, ArrowLeft, GripVertical, Clock } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const STATUS_COLUMNS: { id: Status; title: string; color: string; bg: string; badgeColor: string }[] = [
  { id: 'Todo', title: 'A Fazer', color: 'var(--text)', bg: 'var(--status-todo)', badgeColor: 'var(--muted)' },
  { id: 'In Progress', title: 'Em Progresso', color: 'var(--info-text)', bg: 'var(--status-progress)', badgeColor: 'var(--info)' },
  { id: 'Review', title: 'Revisão', color: 'var(--primary)', bg: 'var(--status-review)', badgeColor: 'var(--primary)' },
  { id: 'Done', title: 'Concluído', color: 'var(--success-text)', bg: 'var(--status-done)', badgeColor: 'var(--success)' },
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
        style={{ ...style, borderColor: 'var(--muted)' }}
        className="opacity-40 border-2 border-dashed rounded-xl h-[180px] w-full"
      />
    );
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        className={`
          relative group flex flex-col gap-3 p-4 rounded-xl border shadow-sm cursor-grab active:cursor-grabbing
          transition-all duration-300 ease-out
        `}
        style={{
          backgroundColor: isHighlighted ? 'var(--surface-hover)' : 'var(--surface)',
          borderColor: isHighlighted ? 'var(--primary)' : (isDelayed ? 'var(--danger)' : 'var(--border)'),
          boxShadow: isHighlighted ? '0 0 0 2px var(--primary)' : 'var(--shadow)',
          transform: isHighlighted ? 'scale(1.02)' : 'none'
        }}
        onClick={() => onTaskClick(task.id)}
        onMouseEnter={(e) => {
          if (!isHighlighted && !isDelayed) {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isHighlighted && !isDelayed) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            e.currentTarget.style.transform = 'none';
          }
        }}
      >
        <div className="flex justify-between items-start text-left">
          <div className="flex items-center gap-2 max-w-[85%]">
            <div style={{ color: 'var(--muted)' }}>
              <GripVertical size={14} />
            </div>
            {client?.logoUrl && (
              <img src={client.logoUrl} className="w-4 h-4 rounded-sm object-contain" alt="" />
            )}
            <span className="text-[10px] uppercase font-bold truncate" style={{ color: 'var(--muted)' }}>
              {client?.name || 'Sem Empresa'}
            </span>
          </div>
          {isDelayed && (
            <div style={{ color: 'var(--danger)' }} title="Atrasado">
              <AlertCircle size={14} />
            </div>
          )}
        </div>

        {isAdmin && onDelete && (
          <button
            onClick={(e) => onDelete(e, task)}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            <Trash2 size={14} />
          </button>
        )}

        <div className="flex text-left">
          <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-1 rounded-md max-w-full truncate"
            style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid var(--border)' }}>
            {project?.name || 'Geral'}
          </span>
        </div>

        <h4 className="font-semibold text-sm leading-snug line-clamp-2 text-left" style={{ color: 'var(--text)' }}>
          {task.title}
        </h4>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
            <div
              className={`h-full rounded-full`}
              style={{
                width: `${task.progress || 0}%`,
                backgroundColor: isDelayed ? 'var(--danger)' : 'var(--primary)'
              }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: 'var(--muted)' }}>{task.progress || 0}%</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t mt-1" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center border"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              <UserIcon size={10} />
            </div>
            <span className="text-[10px] font-medium truncate max-w-[80px]" style={{ color: 'var(--muted)' }}>
              {task.developer || 'N/A'}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md`}
            style={{
              backgroundColor: isDelayed ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
              color: isDelayed ? 'var(--danger)' : 'var(--muted)',
              border: isDelayed ? '1px solid var(--danger)' : '1px solid var(--border)'
            }}>
            <Calendar size={10} />
            <span>
              {task.estimatedDelivery
                ? new Date(task.estimatedDelivery).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '-'}
            </span>
          </div>
        </div>

        {task.status !== 'Done' && (
          <button
            onClick={handleCreateTimesheet}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-all text-[11px] font-bold border shadow-sm"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--primary)',
              color: 'var(--primary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
          >
            <Clock size={12} />
            Apontar Tarefa
          </button>
        )}
      </div>
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
    <div className={`flex flex-col flex-1 min-w-[300px] h-full rounded-2xl border p-4 shadow-sm transition-all`}
      style={{ backgroundColor: col.bg, borderColor: 'var(--border)' }}>
      <div className={`flex items-center justify-between mb-4 px-1`}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.badgeColor }}></div>
          <h3 className="font-black text-xs uppercase tracking-widest" style={{ color: col.color || 'var(--text)' }}>{col.title}</h3>
        </div>
        <span className="px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm border"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
          {tasks.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex-1 overflow-y-auto px-1 space-y-3 custom-scrollbar min-h-[100px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <KanbanCard
              key={task.id}
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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { tasks, clients, projects, users, updateTask, deleteTask, loading } = useDataController();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');
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
      const userPermission = isAdmin || t.developerId === currentUser?.id;

      // Filtro de colaborador selecionado (apenas para visualização)
      const developerFilter = !selectedDeveloperId || t.developerId === selectedDeveloperId;

      return userPermission &&
        developerFilter &&
        (!filteredClientId || t.clientId === filteredClientId) &&
        (t.title.toLowerCase().includes(searchTerm.toLowerCase()));
    });
  }, [tasks, filteredClientId, searchTerm, isAdmin, currentUser, selectedDeveloperId]);

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

      // Calcular novo progresso automático
      let newProgress = activeTask.progress;
      if (newStatus === 'Todo') newProgress = 10;
      else if (newStatus === 'In Progress') newProgress = 30;
      else if (newStatus === 'Review') newProgress = 80;
      else if (newStatus === 'Done') newProgress = 100;

      try {
        // Atualizar via Controller
        await updateTask(activeId, {
          status: newStatus,
          progress: newProgress,
          // Se concluiu, definir data de entrega real se não houver
          ...(newStatus === 'Done' ? { actualDelivery: new Date().toISOString() } : {})
        });
      } catch (error) {
        console.error("Erro ao mover tarefa:", error);
        alert("Erro ao atualizar tarefa. Verifique sua conexão e tente novamente.");
        // O estado não atualizou, então o card deve voltar sozinho ao renderizar novamente.
        // Forçar atualização da lista para garantir sincronia
        window.location.reload();
      }
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
    <div className="h-full flex flex-col p-4" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {filteredClientId && (
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-xl transition-all font-medium flex items-center gap-2 shadow-sm"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--primary)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--surface)';
                e.currentTarget.style.color = 'var(--text)';
              }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              {currentClient ? (
                <>
                  {currentClient.logoUrl && (
                    <img
                      src={currentClient.logoUrl}
                      alt={currentClient.name}
                      className="w-8 h-8 rounded-lg object-contain p-1 border shadow-sm"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    />
                  )}
                  {currentClient.name}
                </>
              ) : 'Quadro de Tarefas'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {currentClient ? 'Gerenciamento de entregas' : 'Visão geral de todas as tarefas'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none text-sm shadow-sm transition-all"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            />
          </div>

          {isAdmin && (
            <div className="relative md:w-48">
              <select
                value={selectedDeveloperId}
                onChange={(e) => setSelectedDeveloperId(e.target.value)}
                className="w-full pl-3 pr-8 py-2.5 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none text-sm shadow-sm transition-all appearance-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <option value="">Todos os Colaboradores</option>
                {users.filter(u => u.active !== false).map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
              <UserIcon className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted)' }} />
            </div>
          )}

          {!location.pathname.includes('/developer/tasks') && isAdmin && (
            <button
              className="text-white px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold text-sm whitespace-nowrap active:scale-95"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
              onClick={() => navigate('/tasks/new')}
            >
              + Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Kanban Area */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
            <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando quadro de tarefas...</p>
          </div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="flex-1 flex gap-4 overflow-x-auto overflow-y-hidden pb-4 px-2 custom-scrollbar h-full">
            {STATUS_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
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
      )}

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
