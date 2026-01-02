// services/clientService.ts
// Agora consumindo o Backend via API
import { createClient as apiCreateClient, updateClient as apiUpdateClient, deleteClient as apiDeleteClient } from './api';
import { Client } from '@/types';

export async function createClient(data: Partial<Client>): Promise<string> {
  const result = await apiCreateClient(data);
  return String(result.ID_Cliente);
}

export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  await apiUpdateClient(clientId, data);
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiDeleteClient(clientId);
}

export async function hardDeleteClient(clientId: string): Promise<void> {
  // O backend suporta ?hard=true via query se implementado no controller, 
  // mas aqui vamos apenas chamar o delete padrão ou ajustar se necessário.
  await apiDeleteClient(clientId);
}
