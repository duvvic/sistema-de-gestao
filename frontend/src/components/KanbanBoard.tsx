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
import {
  Calendar,
  User as UserIcon,
  AlertCircle,
  Search,
  Trash2,
  ArrowLeft,
  GripVertical,
  Clock,
  ChevronDown,
  Check,
  Filter,
  CheckSquare,
  Plus,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';
import { TaskCreationModal } from './TaskCreationModal';

const STATUS_COLUMNS: { id: Status; title: string; color: string; bg: string; badgeColor: string }[] = [
  { id: 'Todo', title: 'Não Iniciado', color: 'var(--text)', bg: 'var(--status-todo)', badgeColor: 'var(--muted)' },
  { id: 'In Progress', title: 'Iniciado', color: 'var(--info-text)', bg: 'var(--status-progress)', badgeColor: 'var(--info)' },
  { id: 'Review', title: 'Pendente', color: 'var(--warning-text)', bg: 'var(--status-review)', badgeColor: 'var(--warning-text)' },
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
  isHighlighted,
  users,
  currentUserId
}: {
  task: Task;
  client?: Client;
  project?: Project;
  onTaskClick: (id: string) => void;
  onDelete?: (e: React.MouseEvent, t: Task) => void;
  isAdmin: boolean;
  isHighlighted?: boolean;
  users: User[];
  currentUserId?: string;
}) => {
  const navigate = useNavigate();
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
    disabled: !isAdmin && task.developerId !== currentUserId
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDelayed = useMemo(() => {
    if (task.status === 'Done' || task.status === 'Review' || (task.progress || 0) >= 100) return false;
    if (!task.estimatedDelivery) return false;
    const parts = task.estimatedDelivery.split('-');
    if (parts.length !== 3) return false;
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > due;
  }, [task]);

  const isStudy = useMemo(() => {
    const name = (project?.name || '').toLowerCase();
    return name.includes('treinamento') || name.includes('capacitação');
  }, [project]);

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
          relative group flex flex-col gap-3 p-4 rounded-xl border shadow-sm ${(!isAdmin && task.developerId !== currentUserId) ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
          transition-all duration-300 ease-out
        `}
        style={{
          backgroundColor: isHighlighted ? 'var(--surface-hover)' : 'var(--surface)',
          borderColor: isHighlighted
            ? 'var(--primary)'
            : isDelayed
              ? '#ef4444'
              : task.status === 'Review'
                ? 'var(--warning-text)'
                : task.status === 'Done'
                  ? 'var(--success)'
                  : isStudy
                    ? '#3b82f6'
                    : 'var(--border)',
          boxShadow: isHighlighted ? '0 0 0 2px var(--primary)' : 'var(--shadow)',
          transform: isHighlighted ? 'scale(1.02)' : 'none',
          borderTopWidth: (isDelayed || isStudy || task.status === 'Review' || task.status === 'Done') ? '4px' : '1px'
        }}
        onClick={() => onTaskClick(task.id)}
      >
        <div className="flex justify-between items-start text-left">
          <div className="flex items-center gap-2 max-w-[85%]">
            <div style={{ color: 'var(--muted)' }}>
              {(!isAdmin && task.developerId !== currentUserId) ? (
                <div className="w-3.5" /> // Spacer
              ) : (
                <GripVertical size={14} />
              )}
            </div>
            {client?.logoUrl && (
              <img
                src={client.logoUrl}
                className="w-4 h-4 rounded-sm object-contain"
                alt=""
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.style.display = 'none';
                }}
              />
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

        {(isAdmin || (task.developerId === currentUserId)) && onDelete && (
          <button
            onClick={(e) => onDelete(e, task)}
            className="absolute top-2 right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
          {task.title || "(Sem título)"}
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
          <div className="flex -space-x-1.5 overflow-hidden">
            {/* Responsável Principal */}
            {(() => {
              const dev = users.find(u => u.id === task.developerId);
              return (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(`/admin/team/${dev?.id || task.developerId}`); }}
                  className="w-6 h-6 rounded-full flex items-center justify-center border hover:z-10 transition-all cursor-pointer bg-white overflow-hidden active:scale-95"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                  title={`Responsável: ${dev?.name || task.developer || 'N/A'}`}
                >
                  {dev?.avatarUrl ? (
                    <img
                      src={dev.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev?.name || task.developer || 'Dev')}&background=f8fafc&color=475569`;
                      }}
                    />
                  ) : (
                    <UserIcon size={12} />
                  )}
                </button>
              );
            })()}

            {/* Colaboradores Extras */}
            {(task.collaboratorIds || [])
              .filter(uid => uid !== task.developerId) // Evitar duplicar o dono se ele estiver no array
              .slice(0, 3).map(uid => {
                const u = users.find(user => user.id === uid);
                return (
                  <button
                    key={uid}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/team/${uid}`); }}
                    className="w-6 h-6 rounded-full flex items-center justify-center border hover:z-10 transition-all cursor-pointer bg-slate-50 overflow-hidden active:scale-95"
                    style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                    title={`Colaborador: ${u?.name || uid}`}
                  >
                    {u?.avatarUrl ? (
                      <img
                        src={u.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.name || uid)}&background=f8fafc&color=475569`;
                        }}
                      />
                    ) : (
                      <UserIcon size={12} />
                    )}
                  </button>
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
          <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md`}
            style={{
              backgroundColor: isDelayed ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)',
              color: isDelayed ? 'var(--danger)' : 'var(--muted)',
              border: isDelayed ? '1px solid var(--danger)' : '1px solid var(--border)'
            }}>
            <Calendar size={10} />
            <span>
              {(() => {
                if (task.status === 'Done') {
                  if (!task.actualDelivery) return 'Concluído';
                  const parts = task.actualDelivery.split('-');
                  if (parts.length !== 3) return 'Concluído';
                  return `Entregue ${parts[2]}/${parts[1]}`;
                }

                if (!task.estimatedDelivery) return '-';

                const parts = task.estimatedDelivery.split('-');
                const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const formattedDate = deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

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
            </span>
          </div>
        </div>

        {task.status !== 'Done' && !isAdmin && (
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
  highlightedTaskId,
  users,
  onLoadMore,
  hasMore,
  totalCount,
  currentUserId,
  onClientFilterChange,
  selectedClientFilter,
  availableClients
}: {
  col: typeof STATUS_COLUMNS[0];
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (id: string) => void;
  onDelete: (e: React.MouseEvent, t: Task) => void;
  isAdmin: boolean;
  highlightedTaskId: string | null;
  users: User[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  totalCount?: number;
  currentUserId?: string;
  onClientFilterChange?: (clientId: string) => void;
  selectedClientFilter?: string;
  availableClients?: Client[];
}) => {
  const { setNodeRef } = useSortable({
    id: col.id,
    data: { type: 'Column', status: col.id },
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 min-w-[200px] rounded-2xl flex flex-col h-full transition-all"
      style={{
        backgroundColor: col.bg,
        border: '1px solid var(--border)'
      }}
    >
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2" style={{ color: col.badgeColor }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.badgeColor }} />
          {col.title}
        </h3>
        <div className="flex items-center gap-2">
          {/* Filtro de Empresas - Apenas para coluna Done */}
          {col.id === 'Done' && onClientFilterChange && availableClients && availableClients.length > 0 && (
            <select
              value={selectedClientFilter || ''}
              onChange={(e) => onClientFilterChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 text-[10px] font-bold rounded-lg border transition-all"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              <option value="">Todas</option>
              {availableClients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--bg)', color: col.badgeColor, border: '1px solid var(--border)' }}>
            {totalCount !== undefined ? totalCount : tasks.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <KanbanCard
              key={task.id}
              task={task}
              client={clients.find((c) => c.id === task.clientId)}
              project={projects.find((p) => p.id === task.projectId)}
              onTaskClick={onTaskClick}
              onDelete={onDelete}
              isAdmin={isAdmin}
              isHighlighted={highlightedTaskId === task.id}
              users={users}
              currentUserId={currentUserId}
            />
          ))}
        </SortableContext>
        {onLoadMore && hasMore && (
          <button
            onClick={onLoadMore}
            className="w-full py-2 mb-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all hover:bg-black/5 active:scale-95 flex items-center justify-center gap-2"
            style={{ color: col.badgeColor }}
          >
            <Plus className="w-4 h-4" />
            Carregar mais 10
          </button>
        )}
      </div>
    </div>
  );
};

/* ================== BOARD ================== */
export const KanbanBoard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, isAdmin } = useAuth();
  const { tasks, clients, projects, users, updateTask, deleteTask, loading } = useDataController();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTaskCreationModal, setShowTaskCreationModal] = useState(false);
  const [showOnlyDelayed, setShowOnlyDelayed] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'all' | '7' | '15' | '30'>('all');
  const [doneLimit, setDoneLimit] = useState(10);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('');

  // Auxiliar para detectar atraso
  const isTaskDelayed = (t: Task) => {
    if (t.status === 'Done' || t.status === 'Review' || (t.progress || 0) >= 100) return false;
    if (!t.estimatedDelivery) return false;
    const parts = t.estimatedDelivery.split('-');
    if (parts.length !== 3) return false;
    const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today > due;
  };

  // Memo para identificar desenvolvedores com atrasos
  const lateDevelopers = useMemo(() => {
    const devMap = new Map<string, { user: User; count: number }>();
    tasks.forEach(t => {
      if (isTaskDelayed(t) && t.developerId) {
        const u = users.find(user => user.id === t.developerId);
        if (u) {
          const existing = devMap.get(t.developerId) || { user: u, count: 0 };
          devMap.set(t.developerId, { ...existing, count: existing.count + 1 });
        }
      }
    });
    return Array.from(devMap.values()).sort((a, b) => b.count - a.count);
  }, [tasks, users]);

  // Filters from Query Params
  const filteredClientId = searchParams.get('clientId') || searchParams.get('client');
  const filteredProjectId = searchParams.get('projectId') || searchParams.get('project');
  const filteredDeveloperId = searchParams.get('developerId') || searchParams.get('developer');

  // New local state for additional filtering
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>(filteredDeveloperId || '');

  // Reset local developer filter if query param clears
  useEffect(() => {
    setSelectedDeveloperId(filteredDeveloperId || '');
  }, [filteredDeveloperId]);

  const filteredTasks = useMemo(() => {
    let result = tasks.filter((t) => {
      // 1. Core filters (Admin sees all, Dev sees own + collaborators)
      const isOwner = t.developerId === currentUser?.id;
      const isCollaborator = t.collaboratorIds?.includes(currentUser?.id || '');
      const hasPermission = isAdmin || isOwner || isCollaborator;

      if (!hasPermission) return false;

      // 2. Client/Project context (from URL)
      if (filteredClientId && t.clientId !== filteredClientId) return false;
      if (filteredProjectId && t.projectId !== filteredProjectId) return false;

      // 3. User Filter (from Select)
      if (selectedDeveloperId) {
        const isSelectedOwner = t.developerId === selectedDeveloperId;
        const isSelectedCollaborator = t.collaboratorIds?.includes(selectedDeveloperId);
        if (!isSelectedOwner && !isSelectedCollaborator) return false;
      }

      // 4. Delayed Filter
      if (showOnlyDelayed && !isTaskDelayed(t)) return false;

      // 5. Period Filter (based on task creation/update date)
      if (periodFilter !== 'all') {
        const daysAgo = parseInt(periodFilter);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        cutoffDate.setHours(0, 0, 0, 0);

        // Try to parse the task's estimated delivery or use a fallback
        // Since we don't have a createdAt field visible, we'll use estimatedDelivery as a proxy
        // Or we can filter based on whether the task was created recently
        // For now, let's assume we want to show tasks with recent estimated delivery dates
        if (t.estimatedDelivery) {
          const parts = t.estimatedDelivery.split('-');
          if (parts.length === 3) {
            const taskDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (taskDate < cutoffDate) return false;
          }
        }
      }

      // 6. Global Search
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        return t.title.toLowerCase().includes(lowerSearch) ||
          t.description?.toLowerCase().includes(lowerSearch) ||
          t.developer?.toLowerCase().includes(lowerSearch);
      }

      return true;
    });

    return result;
  }, [tasks, currentUser, isAdmin, filteredClientId, filteredProjectId, selectedDeveloperId, showOnlyDelayed, periodFilter, searchTerm]);

  // Calcular empresas disponíveis para filtro (apenas empresas onde o usuário concluiu tarefas)
  const availableClientsForDoneFilter = useMemo(() => {
    if (!currentUser) return [];

    const doneTasks = filteredTasks.filter(t => t.status === 'Done');
    const clientIds = new Set(doneTasks.map(t => t.clientId));

    return clients
      .filter(c => clientIds.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredTasks, clients, currentUser]);

  const currentClient = useMemo(() => clients.find(c => c.id === filteredClientId), [clients, filteredClientId]);
  const currentProject = useMemo(() => projects.find(p => p.id === filteredProjectId), [projects, filteredProjectId]);

  // Highlight effect
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId) {
      setHighlightedTaskId(highlightId);
      const timer = setTimeout(() => setHighlightedTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // DND Kit setup
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

    let newStatus: Status;
    if (STATUS_COLUMNS.some(col => col.id === overId)) {
      newStatus = overId as Status;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      newStatus = overTask?.status as Status;
    }

    if (activeTask.status !== newStatus) {
      // Calcular novo progresso automático
      let newProgress = activeTask.progress;
      // Progress calculation removed to allow manual control only

      try {
        const updatePayload: any = {
          status: newStatus,
          progress: newProgress,
        };

        // Automatizar datas reais baseadas no status
        // Se mudou para "In Progress" e não tem início real, registrar agora
        if (newStatus === 'In Progress' && !activeTask.actualStart) {
          updatePayload.actualStart = new Date().toISOString().split('T')[0];
        }

        // Se mudou para "Done" e não tem fim real, registrar agora
        if (newStatus === 'Done' && !activeTask.actualDelivery) {
          updatePayload.actualDelivery = new Date().toISOString().split('T')[0];
        }

        // Atualizar via Controller
        await updateTask(activeId, updatePayload);
      } catch (error) {
        console.error("Erro ao mover tarefa:", error);
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
      try {
        await deleteTask(taskToDelete.id);
        setDeleteModalOpen(false);
        setTaskToDelete(null);
      } catch (error: any) {
        console.error('Erro ao excluir tarefa:', error);
        const msg = error.message || "";
        if (msg.includes("horas apontadas") || msg.includes("hasHours")) {
          if (window.confirm("Esta tarefa possui horas apontadas. Deseja excluir a tarefa e TODOS os apontamentos de horas vinculados? Esta ação é irreversível.")) {
            try {
              await deleteTask(taskToDelete.id, true);
              setDeleteModalOpen(false);
              setTaskToDelete(null);
            } catch (forceErr: any) {
              alert('Erro na exclusão forçada: ' + (forceErr.message || 'Erro desconhecido'));
            }
          }
        } else {
          alert(msg || 'Erro ao excluir tarefa.');
        }
      }
    }
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
                  <span style={{ color: 'var(--muted)' }}>Tarefas de</span> {currentClient.name}
                  {(currentProject || projects.find(p => p.id === filteredProjectId)) && <span className="opacity-40">/ {(currentProject || projects.find(p => p.id === filteredProjectId))?.name}</span>}
                </>
              ) : (
                'Gestão de Tarefas'
              )}
            </h1>
          </div>
        </div>

        {/* Period Filter Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold uppercase tracking-wider opacity-50 mr-2" style={{ color: 'var(--muted)' }}>
            Período:
          </span>
          {[
            { value: 'all' as const, label: 'Todas' },
            { value: '7' as const, label: '7 dias' },
            { value: '15' as const, label: '15 dias' },
            { value: '30' as const, label: '30 dias' }
          ].map(period => (
            <button
              key={period.value}
              onClick={() => setPeriodFilter(period.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodFilter === period.value
                ? 'shadow-md'
                : 'opacity-60 hover:opacity-100'
                }`}
              style={{
                backgroundColor: periodFilter === period.value ? 'var(--primary)' : 'var(--surface)',
                color: periodFilter === period.value ? 'white' : 'var(--text)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: periodFilter === period.value ? 'var(--primary)' : 'var(--border)'
              }}
            >
              {period.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Custom PREMIUM Developer Filter */}
          {isAdmin && (
            <div className="relative min-w-[240px]">
              <button
                type="button"
                onClick={() => setShowDevMenu(!showDevMenu)}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border transition-all shadow-lg group"
                style={{
                  backgroundColor: 'var(--surface)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)'
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedDeveloperId ? (
                      users.find(u => u.id === selectedDeveloperId)?.avatarUrl ? (
                        <img
                          src={users.find(u => u.id === selectedDeveloperId)?.avatarUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            const name = users.find(u => u.id === selectedDeveloperId)?.name || 'Dev';
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f8fafc&color=475569`;
                          }}
                        />
                      ) : (
                        <span className="text-[10px] font-black text-purple-400">
                          {users.find(u => u.id === selectedDeveloperId)?.name.charAt(0).toUpperCase()}
                        </span>
                      )
                    ) : (
                      <UserIcon size={12} className="text-slate-400" />
                    )}
                  </div>
                  <span className="text-sm font-bold truncate tracking-tight">
                    {selectedDeveloperId ? users.find(u => u.id === selectedDeveloperId)?.name : 'Todos os Colaboradores'}
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showDevMenu ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showDevMenu && (
                  <>
                    <div className="fixed inset-0 z-[60]" onClick={() => setShowDevMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-full max-h-[400px] border rounded-2xl shadow-2xl z-[70] p-2 flex flex-col gap-1 overflow-hidden"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      <div className="p-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Pesquisar nome..."
                          className="w-full border rounded-lg pl-10 pr-4 py-2 text-xs outline-none focus:border-purple-500 transition-all font-bold"
                          style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="overflow-y-auto flex-1 custom-scrollbar pr-1">
                        <button
                          type="button"
                          onClick={() => { setSelectedDeveloperId(''); setShowDevMenu(false); setSearchTerm(''); }}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${!selectedDeveloperId ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                        >
                          <span>Todos os Colaboradores</span>
                          {!selectedDeveloperId && <Check size={14} />}
                        </button>

                        <div className="h-px bg-white/5 my-1 mx-2" />

                        {(() => {
                          const activeRoles = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'ceo', 'tech_lead'];
                          return users
                            .filter(u => u.active !== false &&
                              (u.torre !== 'N/A' || activeRoles.includes(u.role?.toLowerCase() || '')) &&
                              (searchTerm === '' || u.name.toLowerCase().includes(searchTerm.toLowerCase())))
                            .filter(u => !showOnlyDelayed || lateDevelopers.some(ld => ld.user.id === u.id))
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(user => (
                              <button
                                key={user.id}
                                onClick={() => {
                                  // Update URL with selected developer
                                  const newParams = new URLSearchParams(searchParams);
                                  if (selectedDeveloperId === user.id) {
                                    setSelectedDeveloperId('');
                                    newParams.delete('developerId');
                                  } else {
                                    setSelectedDeveloperId(user.id);
                                    newParams.set('developerId', user.id);
                                  }
                                  setSearchParams(newParams);
                                  setShowDevMenu(false);
                                  setSearchTerm('');
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedDeveloperId === user.id ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                              >
                                <div className="flex items-center gap-3 truncate">
                                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {user.avatarUrl ? (
                                      <img
                                        src={user.avatarUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.onerror = null;
                                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f8fafc&color=475569`;
                                        }}
                                      />
                                    ) : (
                                      <span className="text-[10px] uppercase font-black">{user.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <span className="truncate">{user.name}</span>
                                </div>
                                {selectedDeveloperId === user.id && <Check size={14} />}
                              </button>
                            ));
                        })()}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Botão Atrasados Toggle (Apenas Admin) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowOnlyDelayed(!showOnlyDelayed)}
              className={`px-4 py-2.5 rounded-xl border font-bold text-sm transition-all flex items-center gap-2 shadow-lg ${showOnlyDelayed ? 'bg-red-500 text-white border-red-400' : ''}`}
              style={{
                backgroundColor: showOnlyDelayed ? 'var(--danger)' : 'var(--surface)',
                borderColor: showOnlyDelayed ? 'var(--danger)' : 'var(--border)',
                color: showOnlyDelayed ? 'white' : 'var(--text)'
              }}
            >
              <AlertCircle size={16} className={showOnlyDelayed ? 'animate-pulse' : ''} />
              <span className="hidden sm:inline">{showOnlyDelayed ? 'Mostrando Atrasados' : 'Ver Atrasados'}</span>
            </button>
          )}



          {/* Botão Nova Tarefa (Minhas Tarefas - Modal) */}
          {location.pathname.includes('/developer/tasks') && (
            <button
              className="text-white px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-2 font-bold text-sm whitespace-nowrap active:scale-95"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
              onClick={() => setShowTaskCreationModal(true)}
            >
              + Nova Tarefa
            </button>
          )}
        </div>
      </div>

      <TaskCreationModal
        isOpen={showTaskCreationModal}
        onClose={() => setShowTaskCreationModal(false)}
        preSelectedClientId={filteredClientId || undefined}
        preSelectedProjectId={filteredProjectId || undefined}
      />

      {/* NOVO: Lista de Avatares Atrasados */}
      <AnimatePresence>
        {showOnlyDelayed && lateDevelopers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-4 mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-2xl overflow-hidden"
          >
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Em Atraso</span>
              <span className="text-xs text-slate-400 font-bold">{lateDevelopers.length} Colaboradores</span>
            </div>
            <div className="h-8 w-px bg-[var(--border)] mx-2" />
            <div className="flex items-center gap-3 overflow-x-auto pb-2 custom-scrollbar-thin">
              {lateDevelopers.map(({ user, count }) => (
                <button
                  key={user.id}
                  onClick={() => {
                    if (selectedDeveloperId === user.id) {
                      // Deselect if clicking on already selected user
                      setSelectedDeveloperId('');
                    } else {
                      // Select the user
                      setSelectedDeveloperId(user.id);
                    }
                  }}
                  className="flex-shrink-0 relative group"
                  title={`Filtrar tarefas de ${user.name}`}
                >
                  <div className={`w-12 h-12 rounded-full border-2 p-0.5 transition-all duration-300 shadow-lg ${selectedDeveloperId === user.id
                    ? 'border-red-500 ring-2 ring-red-500/50 scale-110'
                    : 'border-red-500/50 group-hover:border-red-500'
                    }`}>
                    <div className="w-full h-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--surface-2)' }}>
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=f8fafc&color=475569`;
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-white bg-gradient-to-br from-red-600 to-amber-600">
                          {user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Badge de Contador */}
                  <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-lg" style={{ borderColor: 'var(--bg)' }}>
                    {count}
                  </div>
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-[9px] px-1.5 py-0.5 rounded text-white whitespace-nowrap z-10">
                    {user.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Area */}
      {
        loading ? (
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
              {STATUS_COLUMNS
                .filter(col => !showOnlyDelayed || col.id !== 'Done')
                .map((col) => {
                  let columnTasks = filteredTasks.filter(t => t.status === col.id);
                  const isDone = col.id === 'Done';

                  // Aplicar filtro de cliente para tarefas concluídas
                  if (isDone && selectedClientFilter) {
                    columnTasks = columnTasks.filter(t => t.clientId === selectedClientFilter);
                  }

                  const displayedTasks = isDone
                    ? columnTasks
                      .sort((a, b) => {
                        const dateA = a.actualDelivery ? new Date(a.actualDelivery).getTime() : 0;
                        const dateB = b.actualDelivery ? new Date(b.actualDelivery).getTime() : 0;
                        return dateB - dateA;
                      })
                      .slice(0, doneLimit)
                    : columnTasks;

                  return (
                    <KanbanColumn
                      key={col.id}
                      col={col}
                      tasks={displayedTasks}
                      totalCount={isDone ? columnTasks.length : undefined}
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
                      users={users}
                      currentUserId={currentUser?.id}
                      onLoadMore={isDone ? () => setDoneLimit(prev => prev + 10) : undefined}
                      hasMore={isDone ? displayedTasks.length < columnTasks.length : false}
                      onClientFilterChange={isDone ? setSelectedClientFilter : undefined}
                      selectedClientFilter={isDone ? selectedClientFilter : undefined}
                      availableClients={isDone ? availableClientsForDoneFilter : undefined}
                    />
                  );
                })}
            </div>

            <DragOverlay dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: { active: { opacity: '0.5' } },
              }),
            }}>
              {activeTask ? (
                <div className="w-[280px]">
                  <KanbanCard
                    task={activeTask}
                    client={clients.find(c => c.id === activeTask.clientId)}
                    project={projects.find(p => p.id === activeTask.projectId)}
                    onTaskClick={() => { }}
                    isAdmin={false}
                    users={users}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )
      }

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja excluir "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div >
  );
};

export default KanbanBoard;
