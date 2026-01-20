// services/clientService.ts
// CRUD de Clientes no Supabase

import { supabase } from './supabaseClient';
import { Client } from '@/types';

// ===========================
// CREATE
// ===========================
export async function createClient(data: Partial<Client>): Promise<number> {
  // Datas: Criado (sempre hoje). Contrato (opcional: hoje + N meses se informado)
  const extra: any = data as any;
  const now = new Date();
  const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

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
    ativo: true,
    Criado: toDateStr(now),
  };
  if (contratoDateStr) payload.Contrato = contratoDateStr;
  if (data.pais) payload.pais = data.pais;
  if (data.contato_principal) payload.contato_principal = data.contato_principal;

  const { data: inserted, error } = await supabase
    .from("dim_clientes")
    .insert(payload)
    .select("ID_Cliente")
    .single();

  if (error) {

    throw error;
  }

  return inserted.ID_Cliente;
}

// ===========================
// UPDATE
// ===========================
export async function updateClient(clientId: string, data: Partial<Client>): Promise<void> {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.NomeCliente = data.name;
  if (data.logoUrl !== undefined) payload.NewLogo = data.logoUrl;
  if (data.active !== undefined) payload.ativo = data.active;
  if (data.pais !== undefined) payload.pais = data.pais;
  if (data.contato_principal !== undefined) payload.contato_principal = data.contato_principal;

  const { error } = await supabase
    .from("dim_clientes")
    .update(payload)
    .eq("ID_Cliente", Number(clientId));

  if (error) {

    throw error;
  }

}

// ===========================
// DELETE (Soft Delete - marca como inativo)
// ===========================
export async function deleteClient(clientId: string): Promise<void> {

  // Soft delete: apenas marca como inativo
  const { error } = await supabase
    .from("dim_clientes")
    .update({ ativo: false })
    .eq("ID_Cliente", Number(clientId));

  if (error) {

    throw error;
  }

}

// ===========================
// DELETE (Hard Delete - remove do banco)
// ===========================
export async function hardDeleteClient(clientId: string): Promise<void> {

  const { error } = await supabase
    .from("dim_clientes")
    .delete()
    .eq("ID_Cliente", Number(clientId));

  if (error) {

    throw error;
  }

}
