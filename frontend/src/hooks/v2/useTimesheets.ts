import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTimesheets, createTimesheet, updateTimesheet, deleteTimesheet, DbTimesheetRow } from '@/services/api';
import { TimesheetEntry } from '@/types';

export const useTimesheets = () => {
    const queryClient = useQueryClient();

    // Query para buscar apontamentos
    const timesheetsQuery = useQuery({
        queryKey: ['timesheets'],
        queryFn: async () => {
            const rawTimesheets = await fetchTimesheets();

            // Normalização dos dados (igual ao useAppData)
            return (rawTimesheets || []).map((r: DbTimesheetRow) => ({
                id: String(r.ID_Horas_Trabalhadas || crypto.randomUUID()),
                userId: String(r.ID_Colaborador || ''),
                userName: r.dim_colaboradores?.NomeColaborador || (r as any).userName || '',
                clientId: String(r.ID_Cliente || ''),
                projectId: String(r.ID_Projeto || ''),
                taskId: String(r.id_tarefa_novo || ''),
                date: r.Data || (new Date()).toISOString().split('T')[0],
                startTime: r.Hora_Inicio || '09:00',
                endTime: r.Hora_Fim || '18:00',
                totalHours: Number(r.Horas_Trabalhadas || 0),
                lunchDeduction: !!r.Almoco_Deduzido,
                description: r.Descricao || undefined,
            })) as TimesheetEntry[];
        },
    });

    const createTimesheetMutation = useMutation({
        mutationFn: async (entry: Partial<TimesheetEntry>) => {
            const dbPayload: Partial<DbTimesheetRow> = {
                ID_Colaborador: Number(entry.userId),
                ID_Cliente: Number(entry.clientId),
                ID_Projeto: Number(entry.projectId),
                id_tarefa_novo: Number(entry.taskId),
                Data: entry.date,
                Horas_Trabalhadas: entry.totalHours,
                Hora_Inicio: entry.startTime,
                Hora_Fim: entry.endTime,
                Almoco_Deduzido: entry.lunchDeduction,
                Descricao: entry.description
            };

            await createTimesheet(dbPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        },
    });

    const updateTimesheetMutation = useMutation({
        mutationFn: async (entry: Partial<TimesheetEntry> & { id: string }) => {
            const dbPayload: Partial<DbTimesheetRow> = {};
            // Only add fields that are present
            if (entry.userId) dbPayload.ID_Colaborador = Number(entry.userId);
            if (entry.clientId) dbPayload.ID_Cliente = Number(entry.clientId);
            if (entry.projectId) dbPayload.ID_Projeto = Number(entry.projectId);
            if (entry.taskId) dbPayload.id_tarefa_novo = Number(entry.taskId);
            if (entry.date) dbPayload.Data = entry.date;
            if (entry.totalHours !== undefined) dbPayload.Horas_Trabalhadas = entry.totalHours;
            if (entry.startTime) dbPayload.Hora_Inicio = entry.startTime;
            if (entry.endTime) dbPayload.Hora_Fim = entry.endTime;
            if (entry.lunchDeduction !== undefined) dbPayload.Almoco_Deduzido = entry.lunchDeduction;
            if (entry.description !== undefined) dbPayload.Descricao = entry.description;

            await updateTimesheet(entry.id, dbPayload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        }
    });

    const deleteTimesheetMutation = useMutation({
        mutationFn: async (id: string) => {
            await deleteTimesheet(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        }
    });

    return {
        timesheets: timesheetsQuery.data || [],
        isLoading: timesheetsQuery.isLoading,
        isError: timesheetsQuery.isError,
        createTimesheet: createTimesheetMutation.mutateAsync,
        updateTimesheet: updateTimesheetMutation.mutateAsync,
        deleteTimesheet: deleteTimesheetMutation.mutateAsync,
        isCreating: createTimesheetMutation.isPending,
        isUpdating: updateTimesheetMutation.isPending,
    };
};
