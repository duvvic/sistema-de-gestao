import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTasks, fetchUsers, updateTask, deleteTask, createTask, DbTaskRow } from '@/services/api';
import { Task, Status, Priority, Impact } from '@/types';

// =====================================================
// HELPER FUNCTIONS (Copiadas do useAppData para manter consistência)
// =====================================================

function normalizeStatus(raw: string | null): Status {
    if (!raw) return "Todo";
    const s = raw.toLowerCase().trim();
    if (s.includes("conclu") || s.includes("done") || s.includes("finaliz")) return "Done";
    if (s.includes("andamento") || s.includes("progresso") || s.includes("progress") || s.includes("execu")) return "In Progress";
    if (s.includes("revis") || s.includes("review") || s.includes("valida")) return "Review";
    return "Todo";
}

function normalizePriority(raw: string | null): Priority | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().trim();
    if (s.includes("crítica") || s.includes("critica") || s.includes("critical") || s.includes("urgente")) return "Critical";
    if (s.includes("alta") || s.includes("high")) return "High";
    if (s.includes("média") || s.includes("media") || s.includes("medium")) return "Medium";
    if (s.includes("baixa") || s.includes("low")) return "Low";
    return undefined;
}

function normalizeImpact(raw: string | null): Impact | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().trim();
    if (s.includes("alto") || s.includes("high")) return "High";
    if (s.includes("médio") || s.includes("medio") || s.includes("medium")) return "Medium";
    if (s.includes("baixo") || s.includes("low")) return "Low";
    return undefined;
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        return defaultDate.toISOString().split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date.toISOString().split("T")[0];
    } catch { }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString().split("T")[0];
}

// =====================================================
// HOOK
// =====================================================

export const useTasks = (filters?: { projectId?: string; userId?: string; clientId?: string }) => {
    const queryClient = useQueryClient();

    const tasksQuery = useQuery({
        queryKey: ['tasks', filters],
        queryFn: async () => {
            // Buscamos Tarefas E Usuários para garantir que temos os nomes dos devs
            const [rawTasks, users] = await Promise.all([
                fetchTasks(filters),
                fetchUsers() // Isso pode ser cacheado pelo React Query se usássemos useUsers aqui, mas direto é mais seguro pro atomic
            ]);

            // Mapeamento / Normalização
            const tasksMapped: Task[] = rawTasks.map((row: DbTaskRow) => {
                let developerName: string | undefined = undefined;
                if (row.ID_Colaborador) {
                    const developer = users.find((u) => u.id === String(row.ID_Colaborador));
                    developerName = developer?.name;
                }

                return {
                    id: String(row.id_tarefa_novo),
                    title: row.Afazer || "(Sem título)",
                    projectId: String(row.ID_Projeto),
                    clientId: String(row.ID_Cliente),
                    developer: developerName,
                    developerId: row.ID_Colaborador ? String(row.ID_Colaborador) : undefined,
                    status: normalizeStatus(row.StatusTarefa),
                    estimatedDelivery: formatDate(row.entrega_estimada),
                    actualDelivery: row.entrega_real || undefined,
                    scheduledStart: row.inicio_previsto || undefined,
                    actualStart: row.inicio_real || undefined,
                    progress: Math.min(100, Math.max(0, Number(row.Porcentagem) || 0)),
                    priority: normalizePriority(row.Prioridade),
                    impact: normalizeImpact(row.Impacto),
                    risks: row.Riscos || undefined,
                    notes: row["Observações"] || undefined,
                    attachment: row.attachment || undefined,
                    description: row.description || undefined,
                    daysOverdue: (() => {
                        if (!row.entrega_estimada) return 0;
                        const deadline = new Date(row.entrega_estimada);
                        deadline.setHours(0, 0, 0, 0);
                        const now = new Date();
                        now.setHours(0, 0, 0, 0);
                        const status = normalizeStatus(row.StatusTarefa);
                        if (status === 'Done') {
                            if (row.entrega_real) {
                                const delivery = new Date(row.entrega_real);
                                delivery.setHours(0, 0, 0, 0);
                                return Math.ceil((delivery.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                            }
                            return 0;
                        }
                        return Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                    })(),
                };
            });

            return tasksMapped;
        },
    });

    const updateTaskMutation = useMutation({
        mutationFn: async ({ taskId, updates }: { taskId: string; updates: Partial<Task> }) => {
            const payload: any = {};
            if (updates.status) payload.StatusTarefa = updates.status;
            if (updates.progress !== undefined) payload.Porcentagem = updates.progress;
            if (updates.title) payload.Afazer = updates.title;
            if (updates.actualDelivery) payload.entrega_real = updates.actualDelivery;
            // Add other fields as necessary mapped to DB columns

            await updateTask(taskId, payload);
        },
        onMutate: async ({ taskId, updates }) => {
            await queryClient.cancelQueries({ queryKey: ['tasks'] });
            const previousTasks = queryClient.getQueryData<Task[]>(['tasks', filters]);

            if (previousTasks) {
                queryClient.setQueryData<Task[]>(['tasks', filters], (old) => {
                    return old?.map(t => t.id === taskId ? { ...t, ...updates } : t) || [];
                });
            }

            return { previousTasks };
        },
        onError: (err, variables, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(['tasks', filters], context.previousTasks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async (taskId: string) => {
            await deleteTask(taskId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    const createTaskMutation = useMutation({
        mutationFn: async (taskData: Partial<Task>) => {
            const payload: any = {
                ...taskData,
                Afazer: taskData.title,
                ID_Projeto: Number(taskData.projectId),
                ID_Cliente: Number(taskData.clientId),
                StatusTarefa: taskData.status,
                Prioridade: taskData.priority,
                Impacto: taskData.impact,
                Riscos: taskData.risks,
                "Observações": taskData.notes,
                attachment: taskData.attachment,
                description: taskData.description,
                entrega_estimada: taskData.estimatedDelivery,
                ID_Colaborador: taskData.developerId ? Number(taskData.developerId) : null,
                Porcentagem: taskData.progress
            };

            await createTask(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        }
    });

    return {
        tasks: tasksQuery.data || [],
        isLoading: tasksQuery.isLoading,
        isError: tasksQuery.isError,
        isUpdating: updateTaskMutation.isPending || createTaskMutation.isPending,
        createTask: createTaskMutation.mutateAsync,
        updateTask: updateTaskMutation.mutateAsync,
        deleteTask: deleteTaskMutation.mutateAsync,
    };
};
