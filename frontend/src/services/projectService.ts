// services/projectService.ts
// Agora consumindo o Backend via API
import { createProject as apiCreateProject, updateProject as apiUpdateProject, deleteProject as apiDeleteProject } from './api';
import { Project } from '@/types';

export async function createProject(data: Partial<Project>): Promise<string> {
  const result = await apiCreateProject(data);
  return String(result.ID_Projeto);
}

export async function updateProject(projectId: string, data: Partial<Project>): Promise<void> {
  await apiUpdateProject(projectId, data);
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiDeleteProject(projectId);
}

export async function hardDeleteProject(projectId: string): Promise<void> {
  await apiDeleteProject(projectId);
}
