// services/taskService.ts
// CRUD de Tarefas no Supabase

import { supabase } from './supabaseClient';
import { Task } from '@/types';
import { apiRequest } from './apiClient';

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
    case 'In Progress': return 'Andamento';
    case 'Review': return 'Análise';
    case 'Testing': return 'Teste';
    case 'Todo':
    default: return 'Pré-Projeto';
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
  // Prioriza o ID se disponível, senão busca pelo nome (legado/fallback)
  let collaboratorId: number | null = data.developerId ? Number(data.developerId) : null;

  if (!collaboratorId && data.developer) {
    collaboratorId = await getCollaboratorIdByName(data.developer);
  }

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
    em_testes: data.em_testes ? 1 : 0,
    link_ef: data.link_ef || null,
    estimated_hours: data.estimatedHours || null,
    is_impediment: data.is_impediment ?? false,
  };

  const { data: inserted, error } = await supabase
    .from("fato_tarefas")
    .insert(payload)
    .select("id_tarefa_novo")
    .single();

  if (error) {
    throw error;
  }

  const newTaskId = inserted.id_tarefa_novo;

  // Insere colaboradores se houver
  if (data.collaboratorIds && data.collaboratorIds.length > 0) {
    await updateTaskCollaborators(newTaskId, data.collaboratorIds);
  }

  return newTaskId;
}

/**
 * Helper para atualizar vínculos de colaboradores
 */
async function updateTaskCollaborators(taskId: number, collaboratorIds: string[]): Promise<void> {
  // 1. Remove vínculos antigos
  await supabase
    .from('tarefa_colaboradores')
    .delete()
    .eq('id_tarefa', taskId);

  // 2. Insere novos vínculos
  if (collaboratorIds.length > 0) {
    const inserts = collaboratorIds.map(id => ({
      id_tarefa: taskId,
      id_colaborador: Number(id)
    }));

    const { error } = await supabase
      .from('tarefa_colaboradores')
      .insert(inserts);

    if (error) throw error;
  }
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

  // Prioriza o ID se disponível
  if (data.developerId !== undefined) {
    payload.ID_Colaborador = data.developerId ? Number(data.developerId) : null;
  } else if (data.developer !== undefined) {
    // Fallback apenas se developer (nome) for enviado mas developerId não
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

  // Só atualiza em_testes se fornecido
  if (data.em_testes !== undefined) {
    payload.em_testes = data.em_testes ? 1 : 0;
  }

  // Só atualiza link_ef se fornecido
  if (data.link_ef !== undefined) {
    payload.link_ef = data.link_ef || null;
  }
  if (data.estimatedHours !== undefined) {
    payload.estimated_hours = data.estimatedHours || null;
  }
  if (data.is_impediment !== undefined) {
    payload.is_impediment = data.is_impediment;
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

  // Atualiza colaboradores se fornecido
  if (data.collaboratorIds !== undefined) {
    await updateTaskCollaborators(Number(taskId), data.collaboratorIds);
  }
}

// ===========================
// DELETE
// ===========================

export async function deleteTask(taskId: string, force: boolean = false, deleteHours: boolean = false): Promise<void> {
  const params = new URLSearchParams();
  if (force) params.append('force', 'true');
  if (deleteHours) params.append('deleteHours', 'true');

  const query = params.toString() ? `?${params.toString()}` : '';
  await apiRequest(`/admin/tasks/${taskId}${query}`, {
    method: 'DELETE'
  });
}

