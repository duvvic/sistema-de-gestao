// services/allocationService.ts
// CRUD para task_member_allocations
// Reserva EXPLÍCITA de horas por membro. Sem proporcionalidade automática.

import { supabase } from './supabaseClient';
import { TaskMemberAllocation } from '@/types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const toFrontend = (row: any): TaskMemberAllocation => ({
    id: String(row.id),
    taskId: String(row.task_id),
    userId: String(row.user_id),
    reservedHours: Number(row.reserved_hours),
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

/**
 * Busca TODAS as alocações (para uso no contexto global).
 * Limite alto pois a tabela cresce proporcionalmente a tarefas × membros.
 */
export async function fetchAllAllocations(): Promise<TaskMemberAllocation[]> {
    const { data, error } = await supabase
        .from('task_member_allocations')
        .select('id, task_id, user_id, reserved_hours')
        .order('task_id', { ascending: true });

    if (error) {
        console.error('[AllocationService] fetchAllAllocations error:', error);
        return [];
    }

    return (data || []).map(toFrontend);
}

/**
 * Busca alocações de uma tarefa específica.
 */
export async function fetchAllocationsForTask(taskId: string): Promise<TaskMemberAllocation[]> {
    const { data, error } = await supabase
        .from('task_member_allocations')
        .select('id, task_id, user_id, reserved_hours')
        .eq('task_id', Number(taskId));

    if (error) {
        console.error('[AllocationService] fetchAllocationsForTask error:', error);
        return [];
    }

    return (data || []).map(toFrontend);
}

// ─── Upsert (cria ou atualiza) ────────────────────────────────────────────────

/**
 * Salva (cria ou atualiza) a reserva de horas de um membro em uma tarefa.
 * Se reservedHours === 0, remove o registro (sem saldo não há reserva).
 */
export async function upsertAllocation(
    taskId: string,
    userId: string,
    reservedHours: number
): Promise<TaskMemberAllocation | null> {
    if (reservedHours <= 0) {
        // Reserva zerada = remover
        await deleteAllocation(taskId, userId);
        return null;
    }

    const { data, error } = await supabase
        .from('task_member_allocations')
        .upsert(
            {
                task_id: Number(taskId),
                user_id: Number(userId),
                reserved_hours: reservedHours,
            },
            { onConflict: 'task_id, user_id' }
        )
        .select('id, task_id, user_id, reserved_hours')
        .single();

    if (error) {
        console.error('[AllocationService] upsertAllocation error:', error);
        throw error;
    }

    return data ? toFrontend(data) : null;
}

/**
 * Salva múltiplas alocações de uma vez (batch upsert).
 * Ideal ao salvar a tarefa inteira.
 * Remove alocações de membros que não aparecem mais no payload.
 */
export async function saveTaskAllocations(
    taskId: string,
    allocations: { userId: string; reservedHours: number }[]
): Promise<TaskMemberAllocation[]> {
    // 1. Deletar alocações existentes para a tarefa (reset limpo)
    const { error: delError } = await supabase
        .from('task_member_allocations')
        .delete()
        .eq('task_id', Number(taskId));

    if (delError) {
        console.error('[AllocationService] saveTaskAllocations delete error:', delError);
        throw delError;
    }

    // 2. Filtrar apenas membros com reserva > 0
    const toInsert = allocations
        .filter(a => a.reservedHours > 0)
        .map(a => ({
            task_id: Number(taskId),
            user_id: Number(a.userId),
            reserved_hours: a.reservedHours,
        }));

    if (toInsert.length === 0) return [];

    const { data, error: insError } = await supabase
        .from('task_member_allocations')
        .insert(toInsert)
        .select('id, task_id, user_id, reserved_hours');

    if (insError) {
        console.error('[AllocationService] saveTaskAllocations insert error:', insError);
        throw insError;
    }

    return (data || []).map(toFrontend);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAllocation(taskId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('task_member_allocations')
        .delete()
        .match({ task_id: Number(taskId), user_id: Number(userId) });

    if (error) {
        console.error('[AllocationService] deleteAllocation error:', error);
        throw error;
    }
}

export async function deleteAllocationsForTask(taskId: string): Promise<void> {
    const { error } = await supabase
        .from('task_member_allocations')
        .delete()
        .eq('task_id', Number(taskId));

    if (error) {
        console.error('[AllocationService] deleteAllocationsForTask error:', error);
        throw error;
    }
}
