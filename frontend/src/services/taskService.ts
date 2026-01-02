// services/taskService.ts
// Agora consumindo o Backend via API
import { createTask as apiCreateTask, updateTask as apiUpdateTask, deleteTask as apiDeleteTask } from './api';
import { Task } from '@/types';
import { DbTaskRow } from './api';

export async function createTask(data: Partial<Task>): Promise<string> {
  // Convert Task to DbTaskRow if needed, though api.ts handles some mapping
  // We'll trust createTasks in api.ts to handle the payload mapping or pass it through.
  // Actually, createTask in api.ts takes Partial<DbTaskRow>.
  // So we might need a small mapping here if the data doesn't match DbTaskRow.

  const payload: any = {
    ...data,
    Afazer: data.title,
    ID_Projeto: data.projectId ? Number(data.projectId) : undefined,
    ID_Cliente: data.clientId ? Number(data.clientId) : undefined,
  };

  const result = await apiCreateTask(payload);
  return String(result.id_tarefa_novo);
}

export async function updateTask(taskId: string, data: Partial<Task>): Promise<void> {
  const payload: any = {
    ...data,
    Afazer: data.title,
  };
  await apiUpdateTask(taskId, payload);
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiDeleteTask(taskId);
}
