// services/taskService.ts
// CRUD de Tarefas no Supabase

import { supabase } from './supabaseClient';
import { Task } from '@/types';

// ===========================
// HELPER: Buscar ID do colaborador pelo nome
// ===========================
async function getCollaboratorIdByName(name: string | undefined): Promise<number | null> {
  if (!name) return null;

  const { data, error } = await supabase
    .from("dim_colaboradores")
    .select("ID_Colaborador")
    .eq("NomeColaborador", name)
    .single();

  if (error || !data) {

    return null;
  }

  return data.ID_Colaborador;
}

// ===========================
// HELPER: Mapear status do front para o banco
// ===========================
function mapStatusToDb(status: string | undefined): string {
  switch (status) {
    case 'Done': return 'Concluído';
    case 'In Progress': return 'Em Andamento';
    case 'Review': return 'Revisão';
    case 'Todo':
    default: return 'A Fazer';
  }
}

// ===========================
// HELPER: Mapear prioridade do front para o banco
// ===========================
function mapPriorityToDb(priority: string | undefined): string | null {
  if (!priority) return null;
  switch (priority) {
    case 'Critical': return 'Crítica';
    case 'High': return 'Alta';
    case 'Medium': return 'Média';
    case 'Low': return 'Baixa';
    default: return null;
  }
}

// ===========================
// HELPER: Mapear impacto do front para o banco
// ===========================
function mapImpactToDb(impact: string | undefined): string | null {
  if (!impact) return null;
  switch (impact) {
    case 'High': return 'Alto';
    case 'Medium': return 'Médio';
    case 'Low': return 'Baixo';
    default: return null;
  }
}

// ===========================
// CREATE
// ===========================
export async function createTask(data: Partial<Task>): Promise<number> {
  // Busca o ID do colaborador pelo nome (developer)
  const collaboratorId = await getCollaboratorIdByName(data.developer);

  const payload = {
    Afazer: data.title || "(Sem título)",
    ID_Projeto: Number(data.projectId),
    ID_Cliente: Number(data.clientId),
    ID_Colaborador: collaboratorId,
    StatusTarefa: mapStatusToDb(data.status),
    entrega_estimada: data.estimatedDelivery || null,
    entrega_real: data.actualDelivery || null,
    inicio_previsto: data.scheduledStart || null,
    inicio_real: data.actualStart || null,
    Porcentagem: data.progress ?? 0,
    Prioridade: mapPriorityToDb(data.priority),
    Impacto: mapImpactToDb(data.impact),
    Riscos: data.risks || null,
    // Atenção: coluna no banco utiliza cedilha
    "Observações": data.notes || null,
    attachment: data.attachment || null,
    description: data.description || null,
  };

  const { data: inserted, error } = await supabase
    .from("fato_tarefas")
    .insert(payload)
    .select("id_tarefa_novo")
    .single();

  if (error) {

    throw error;
  }

  return inserted.id_tarefa_novo;
}

// ===========================
// UPDATE
// ===========================
export async function updateTask(taskId: string, data: Partial<Task>): Promise<void> {
  // Monta o payload apenas com os campos fornecidos
  const payload: Record<string, any> = {};

  // Só inclui título se fornecido
  if (data.title !== undefined) {
    payload.Afazer = data.title;
  }

  // Só busca e atualiza colaborador se fornecido
  if (data.developer !== undefined) {
    const collaboratorId = await getCollaboratorIdByName(data.developer);
    payload.ID_Colaborador = collaboratorId;
  }

  // Só atualiza status se fornecido
  if (data.status !== undefined) {
    payload.StatusTarefa = mapStatusToDb(data.status);
  }

  // Só atualiza datas se fornecidas
  if (data.estimatedDelivery !== undefined) {
    payload.entrega_estimada = data.estimatedDelivery || null;
  }
  if (data.actualDelivery !== undefined) {
    payload.entrega_real = data.actualDelivery || null;
  }
  if (data.scheduledStart !== undefined) {
    payload.inicio_previsto = data.scheduledStart || null;
  }
  if (data.actualStart !== undefined) {
    payload.inicio_real = data.actualStart || null;
  }

  // Só atualiza progresso se fornecido
  if (data.progress !== undefined) {
    payload.Porcentagem = data.progress;
  }

  // Só atualiza prioridade se fornecida
  if (data.priority !== undefined) {
    payload.Prioridade = mapPriorityToDb(data.priority);
  }

  // Só atualiza impacto se fornecido
  if (data.impact !== undefined) {
    payload.Impacto = mapImpactToDb(data.impact);
  }

  // Só atualiza riscos se fornecidos
  if (data.risks !== undefined) {
    payload.Riscos = data.risks || null;
  }

  // Só atualiza observações se fornecidas
  if (data.notes !== undefined) {
    payload["Observações"] = data.notes || null;
  }

  // Só atualiza anexo se fornecido
  if (data.attachment !== undefined) {
    payload.attachment = data.attachment || null;
  }

  // Só atualiza descrição se fornecida
  if (data.description !== undefined) {
    payload.description = data.description || null;
  }

  // Se não há nada para atualizar, retorna
  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("fato_tarefas")
    .update(payload)
    .eq("id_tarefa_novo", Number(taskId));

  if (error) {
    throw error;
  }
}

// ===========================
// DELETE
// ===========================
export async function deleteTask(taskId: string): Promise<void> {

  const { error } = await supabase
    .from("fato_tarefas")
    .delete()
    .eq("id_tarefa_novo", Number(taskId));

  if (error) {

    throw error;
  }

}
