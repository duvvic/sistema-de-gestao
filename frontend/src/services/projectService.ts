// services/projectService.ts
// CRUD de Projetos no Supabase

import { supabase } from './supabaseClient';
import { Project } from '@/types';

// ===========================
// CREATE
// ===========================
export async function createProject(data: Partial<Project>): Promise<number> {
  const clean = (val: any) => (typeof val === 'string' && val.trim() === '') ? null : val;

  const payload = {
    NomeProjeto: data.name || "(Sem nome)",
    ID_Cliente: Number(data.clientId),
    StatusProjeto: data.status || "Em andamento",
    ativo: true,
    budget: clean(data.budget),
    description: clean(data.description),
    estimatedDelivery: clean(data.estimatedDelivery),
    startDate: clean(data.startDate),
    valor_total_rs: clean(data.valor_total_rs),
    partner_id: data.partnerId ? Number(data.partnerId) : null,
    manager_client: clean(data.managerClient),
    responsible_nic_labs_id: data.responsibleNicLabsId ? Number(data.responsibleNicLabsId) : null,
    start_date_real: clean(data.startDateReal),
    end_date_real: clean(data.endDateReal),
    risks: clean(data.risks),
    success_factor: clean(data.successFactor),
    critical_date: clean(data.criticalDate),
    doc_link: clean(data.docLink),
    gaps_issues: clean((data as any).gaps_issues || (data as any).gapsIssues),
    important_considerations: clean((data as any).important_considerations || (data as any).importantConsiderations),
    weekly_status_report: clean((data as any).weekly_status_report || (data as any).weeklyStatusReport),
    complexidade: data.complexidade || 'Média',
    horas_vendidas: clean(data.horas_vendidas),
    torre: clean(data.torre),
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
  const clean = (val: any) => (typeof val === 'string' && val.trim() === '') ? null : val;
  const payload: Record<string, any> = {};

  if (data.name !== undefined) payload.NomeProjeto = data.name;
  if (data.clientId !== undefined) payload.ID_Cliente = Number(data.clientId);
  if (data.status !== undefined) payload.StatusProjeto = data.status;
  if (data.budget !== undefined) payload.budget = clean(data.budget);
  if (data.description !== undefined) payload.description = clean(data.description);
  if (data.estimatedDelivery !== undefined) payload.estimatedDelivery = clean(data.estimatedDelivery);
  if (data.startDate !== undefined) payload.startDate = clean(data.startDate);
  if (data.valor_total_rs !== undefined) payload.valor_total_rs = clean(data.valor_total_rs);
  if (data.partnerId !== undefined) payload.partner_id = data.partnerId ? Number(data.partnerId) : null;
  if (data.managerClient !== undefined) payload.manager_client = clean(data.managerClient);
  if (data.responsibleNicLabsId !== undefined) payload.responsible_nic_labs_id = data.responsibleNicLabsId ? Number(data.responsibleNicLabsId) : null;
  if (data.startDateReal !== undefined) payload.start_date_real = clean(data.startDateReal);
  if (data.endDateReal !== undefined) payload.end_date_real = clean(data.endDateReal);
  if (data.risks !== undefined) payload.risks = clean(data.risks);
  if (data.successFactor !== undefined) payload.success_factor = clean(data.successFactor);
  if (data.criticalDate !== undefined) payload.critical_date = clean(data.criticalDate);
  if (data.docLink !== undefined) payload.doc_link = clean(data.docLink);

  // Status report mapping
  const gaps = (data as any).gaps_issues !== undefined ? (data as any).gaps_issues : (data as any).gapsIssues;
  if (gaps !== undefined) payload.gaps_issues = clean(gaps);

  const considerations = (data as any).important_considerations !== undefined ? (data as any).important_considerations : (data as any).importantConsiderations;
  if (considerations !== undefined) payload.important_considerations = clean(considerations);

  const report = (data as any).weekly_status_report !== undefined ? (data as any).weekly_status_report : (data as any).weeklyStatusReport;
  if (report !== undefined) payload.weekly_status_report = clean(report);

  if (data.complexidade !== undefined) payload.complexidade = data.complexidade;
  if (data.horas_vendidas !== undefined) payload.horas_vendidas = clean(data.horas_vendidas);
  if (data.torre !== undefined) payload.torre = clean(data.torre);

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
// ===========================
// DELETE (Soft Delete - marca como inativo)
// ===========================
// ===========================
// DELETE
// ===========================
import { apiRequest } from './apiClient';

export async function deleteProject(projectId: string, force: boolean = false): Promise<void> {
  const query = force ? '?force=true' : '';
  await apiRequest(`/admin/projects/${projectId}${query}`, {
    method: 'DELETE'
  });
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
