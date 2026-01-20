// services/projectService.ts
// CRUD de Projetos no Supabase

import { supabase } from './supabaseClient';
import { Project } from '@/types';

// ===========================
// CREATE
// ===========================
export async function createProject(data: Partial<Project>): Promise<number> {
  const payload = {
    NomeProjeto: data.name || "(Sem nome)",
    ID_Cliente: Number(data.clientId),
    StatusProjeto: data.status || "Em andamento",
    ativo: true,
    budget: data.budget || null,
    description: data.description || null,
    estimatedDelivery: data.estimatedDelivery || null,
    manager: data.manager || null,
    startDate: data.startDate || null,
    valor_total_rs: data.valor_total_rs || null,
  };

  const { data: inserted, error } = await supabase
    .from("dim_projetos")
    .insert(payload)
    .select("ID_Projeto")
    .single();

  if (error) {

    throw error;
  }

  return inserted.ID_Projeto;
}

// ===========================
// UPDATE
// ===========================
export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.NomeProjeto = data.name;
  if (data.clientId !== undefined) payload.ID_Cliente = Number(data.clientId);
  if (data.status !== undefined) payload.StatusProjeto = data.status;
  if (data.budget !== undefined) payload.budget = data.budget;
  if (data.description !== undefined) payload.description = data.description;
  if (data.estimatedDelivery !== undefined) payload.estimatedDelivery = data.estimatedDelivery;
  if (data.manager !== undefined) payload.manager = data.manager;
  if (data.startDate !== undefined) payload.startDate = data.startDate;
  if (data.valor_total_rs !== undefined) payload.valor_total_rs = data.valor_total_rs;

  const { error } = await supabase
    .from("dim_projetos")
    .update(payload)
    .eq("ID_Projeto", Number(projectId));

  if (error) {

    throw error;
  }

}

// ===========================
// DELETE (Soft Delete - marca como inativo)
// ===========================
export async function deleteProject(projectId: string): Promise<void> {

  const { error } = await supabase
    .from("dim_projetos")
    .update({ ativo: false })
    .eq("ID_Projeto", Number(projectId));

  if (error) {

    throw error;
  }

}

// ===========================
// DELETE (Hard Delete - remove do banco)
// ===========================
export async function hardDeleteProject(projectId: string): Promise<void> {

  const { error } = await supabase
    .from("dim_projetos")
    .delete()
    .eq("ID_Projeto", Number(projectId));

  if (error) {

    throw error;
  }

}
