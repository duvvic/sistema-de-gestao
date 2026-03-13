// services/clientService.ts
// CRUD de Clientes via Backend Express

import { apiRequest } from './apiClient';
import { Client } from '@/types';

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const safeNum = (val: any) => {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'undefined') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
};

// ===========================
// CREATE
// ===========================
export async function createClient(data: Partial<Client>): Promise<number> {
  // Datas: Criado (sempre hoje). Contrato (opcional: hoje + N meses se informado)
  const extra: any = data as any;
  const now = new Date();

  let contratoDateStr: string | null = null;
  const choice = extra?.contractChoice as 'sim' | 'nao' | undefined;
  const months = Number(extra?.contractMonths);
  if (choice === 'sim' && months && months > 0) {
    const d = new Date(now);
    d.setMonth(d.getMonth() + months);
    contratoDateStr = toDateStr(d);
  }

  const payload: Record<string, any> = {
    NomeCliente: data.name || "(Sem nome)",
    NewLogo: data.logoUrl || "https://placehold.co/150?text=Logo",
    ativo: data.active !== undefined ? data.active : true,
    Criado: toDateStr(now),
  };
  if (contratoDateStr) payload.Contrato = contratoDateStr;
  if (data.pais) payload.Pais = data.pais;
  if (data.contato_principal) payload.contato_principal = data.contato_principal;
  if (data.cnpj) payload.cnpj = data.cnpj;
  if (data.telefone) payload.telefone = data.telefone;
  if (data.tipo_cliente) payload.tipo_cliente = data.tipo_cliente;
  if (data.partner_id) payload.partner_id = data.partner_id;
  if (data.responsavel_interno_id) payload.responsavel_interno_id = data.responsavel_interno_id;
  if (data.responsavel_externo) payload.responsavel_externo = data.responsavel_externo;
  if (data.email_contato) payload.email_contato = data.email_contato;

  const result = await apiRequest<any>('/clients', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  if (!result || !result.ID_Cliente) {
    throw new Error("Erro ao criar cliente: ID não retornado pelo servidor.");
  }

  return result.ID_Cliente;
}

// ===========================
// UPDATE
// ===========================
export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.NomeCliente = data.name;
  if (data.logoUrl !== undefined) payload.NewLogo = data.logoUrl;
  if (data.active !== undefined) payload.ativo = data.active;
  if (data.pais !== undefined) payload.Pais = data.pais;
  if (data.contato_principal !== undefined) payload.contato_principal = data.contato_principal;
  if (data.cnpj !== undefined) payload.cnpj = data.cnpj;
  if (data.telefone !== undefined) payload.telefone = data.telefone;
  if (data.tipo_cliente !== undefined) payload.tipo_cliente = data.tipo_cliente;
  if (data.partner_id !== undefined) payload.partner_id = data.partner_id;
  if (data.responsavel_interno_id !== undefined) payload.responsavel_interno_id = data.responsavel_interno_id;
  if (data.responsavel_externo !== undefined) payload.responsavel_externo = data.responsavel_externo;
  if (data.email_contato !== undefined) payload.email_contato = data.email_contato;

  await apiRequest(`/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

// ===========================
// DELETE (Soft Delete - marca como inativo)
// ===========================
export async function deleteClient(clientId: string): Promise<void> {
  // Soft delete: via API chamando o update
  await apiRequest(`/clients/${clientId}`, {
    method: 'PUT',
    body: JSON.stringify({ ativo: false })
  });
}

// ===========================
// DELETE (Hard Delete - remove do banco)
// ===========================
export async function hardDeleteClient(clientId: string): Promise<void> {
  await apiRequest(`/clients/${clientId}`, {
    method: 'DELETE'
  });
}

