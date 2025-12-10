// services/clientService.ts
// CRUD de Clientes no Supabase

import { supabase } from './supabaseClient';
import { Client } from '../types';

// ===========================
// CREATE
// ===========================
export async function createClient(data: Partial<Client>): Promise<number> {
  const payload = {
    NomeCliente: data.name || "(Sem nome)",
    NewLogo: data.logoUrl || "https://via.placeholder.com/150?text=Logo",
    ativo: true,
  };

  console.log("📤 Criando cliente:", payload);

  const { data: inserted, error } = await supabase
    .from("dim_clientes")
    .insert(payload)
    .select("ID_Cliente")
    .single();

  if (error) {
    console.error("❌ Erro ao criar cliente:", error);
    throw error;
  }

  console.log("✅ Cliente criado com ID:", inserted.ID_Cliente);
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

  console.log("📤 Atualizando cliente", clientId, ":", payload);

  const { error } = await supabase
    .from("dim_clientes")
    .update(payload)
    .eq("ID_Cliente", Number(clientId));

  if (error) {
    console.error("❌ Erro ao atualizar cliente:", error);
    throw error;
  }

  console.log("✅ Cliente atualizado com sucesso");
}

// ===========================
// DELETE (Soft Delete - marca como inativo)
// ===========================
export async function deleteClient(clientId: string): Promise<void> {
  console.log("🗑️ Desativando cliente:", clientId);

  // Soft delete: apenas marca como inativo
  const { error } = await supabase
    .from("dim_clientes")
    .update({ ativo: false })
    .eq("ID_Cliente", Number(clientId));

  if (error) {
    console.error("❌ Erro ao desativar cliente:", error);
    throw error;
  }

  console.log("✅ Cliente desativado com sucesso");
}

// ===========================
// DELETE (Hard Delete - remove do banco)
// ===========================
export async function hardDeleteClient(clientId: string): Promise<void> {
  console.log("🗑️ Deletando cliente permanentemente:", clientId);

  const { error } = await supabase
    .from("dim_clientes")
    .delete()
    .eq("ID_Cliente", Number(clientId));

  if (error) {
    console.error("❌ Erro ao deletar cliente:", error);
    throw error;
  }

  console.log("✅ Cliente deletado permanentemente");
}