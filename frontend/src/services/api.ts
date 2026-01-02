// services/api.ts
import axios from 'axios';
import { supabase } from "./supabaseClient";
import { User, Client, Project } from "@/types";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Configuração do Axios
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token do Supabase em todas as requisições
apiClient.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// Helper genérico para chamadas API
async function apiRequest<T>(method: 'get' | 'post' | 'put' | 'delete', endpoint: string, data?: any): Promise<T> {
  try {
    const response = await apiClient[method](endpoint, data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.error || error.message || 'Request failed';
    console.error(`[API Error] ${method.toUpperCase()} ${endpoint}:`, message);
    throw new Error(message);
  }
}

// =====================================================
// INTERFACES DO BANCO DE DADOS (Raw Data)
// =====================================================

export interface DbUserRow {
  ID_Colaborador: number;
  NomeColaborador: string;
  Cargo: string | null;
  "E-mail": string;
  avatar_url: string | null;
  papel: string | null;
  ativo?: boolean | null;
}

export interface DbClientRow {
  ID_Cliente: number;
  NomeCliente: string;
  NewLogo: string | null;
  ativo: boolean | null;
  Criado?: string | null;
  Contrato?: string | null;
  Desativado?: string | null;
}

export interface DbProjectRow {
  ID_Projeto: number;
  NomeProjeto: string;
  ID_Cliente: number;
  StatusProjeto: string | null;
  ativo: boolean | null;
  budget: number | null;
  description: string | null;
  estimatedDelivery: string | null;
  manager: string | null;
  startDate: string | null;
}

export interface DbTaskRow {
  id_tarefa_novo: number;
  ID_Tarefa: string | null;
  ID_Cliente: number;
  ID_Projeto: number;
  Afazer: string | null;
  ID_Colaborador: number | null;
  Prioridade: string | null;
  Impacto: string | null;
  Riscos: string | null;
  Porcentagem: number | null;
  StatusTarefa: string | null;
  DiasAtraso: string | null;
  "Observações": string | null;
  attachment: string | null;
  description: string | null;
  inicio_previsto: string | null;
  inicio_real: string | null;
  entrega_estimada: string | null;
  entrega_real: string | null;
}

export interface DbTimesheetRow {
  ID_Horas_Trabalhadas?: number;
  ID_Colaborador?: number;
  ID_Cliente?: number;
  ID_Projeto?: number;
  id_tarefa_novo?: number;
  Data: string;
  Hora_Inicio: string;
  Hora_Fim: string;
  Horas_Trabalhadas: number;
  Descricao: string;
  Almoco_Deduzido: boolean;
  created_at?: string;
  dim_colaboradores?: { NomeColaborador: string };
  [key: string]: any;
}

// =====================================================
// API FUNCTIONS
// =====================================================

// USUÁRIOS
export async function fetchUsers(): Promise<User[]> {
  const data = await apiRequest<any[]>('get', '/users');
  return data.map((row: any) => ({
    id: String(row.ID_Colaborador),
    name: row.NomeColaborador || "Sem nome",
    email: String(row["E-mail"] || row["email"] || "").trim().toLowerCase(),
    avatarUrl: row.avatar_url || undefined,
    cargo: row.Cargo || row.cargo || undefined,
    role: row.papel === 'Administrador' ? 'admin' : 'developer',
    active: row.ativo !== false,
  }));
}

export async function deactivateUser(userId: string): Promise<void> {
  await apiRequest('delete', `/users/${userId}`);
}

export async function updateUser(userId: string, updates: Partial<User>): Promise<void> {
  await apiRequest('put', `/users/${userId}`, updates);
}

// CLIENTES
export async function fetchClients(): Promise<Client[]> {
  const data = await apiRequest<DbClientRow[]>('get', '/clients');
  return data.map((row: DbClientRow): Client => ({
    id: String(row.ID_Cliente),
    name: row.NomeCliente || "Sem nome",
    logoUrl: row.NewLogo || "https://via.placeholder.com/150?text=Logo",
    active: row.ativo ?? true,
    Criado: row.Criado ?? null,
    Contrato: row.Contrato ?? null,
  }));
}

export async function createClient(clientData: Partial<Client>): Promise<DbClientRow> {
  return await apiRequest('post', '/clients', clientData);
}

export async function updateClient(clientId: string, updates: Partial<Client>): Promise<DbClientRow> {
  return await apiRequest('put', `/clients/${clientId}`, updates);
}

export async function deleteClient(clientId: string): Promise<void> {
  await apiRequest('delete', `/clients/${clientId}`);
}

// PROJETOS
export async function fetchProjects(clientId?: string): Promise<Project[]> {
  const endpoint = clientId ? `/projects?clientId=${clientId}` : '/projects';
  const data = await apiRequest<DbProjectRow[]>('get', endpoint);
  return data.map((row: DbProjectRow): Project => ({
    id: String(row.ID_Projeto),
    name: row.NomeProjeto || "Sem nome",
    clientId: String(row.ID_Cliente),
    status: row.StatusProjeto || undefined,
    active: row.ativo ?? true,
    budget: row.budget || undefined,
    description: row.description || undefined,
    estimatedDelivery: row.estimatedDelivery || undefined,
    manager: row.manager || undefined,
    startDate: row.startDate || undefined,
  }));
}

export async function createProject(projectData: Partial<Project>): Promise<DbProjectRow> {
  return await apiRequest('post', '/projects', projectData);
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<DbProjectRow> {
  return await apiRequest('put', `/projects/${projectId}`, updates);
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiRequest('delete', `/projects/${projectId}`);
}

// TAREFAS
export async function fetchTasks(filters?: { projectId?: string; userId?: string; clientId?: string }): Promise<DbTaskRow[]> {
  const queryParams = new URLSearchParams();
  if (filters?.projectId) queryParams.append('projectId', filters.projectId);
  if (filters?.userId) queryParams.append('userId', filters.userId);
  if (filters?.clientId) queryParams.append('clientId', filters.clientId);

  return await apiRequest<DbTaskRow[]>('get', `/tasks?${queryParams.toString()}`);
}

export async function createTask(taskData: Partial<DbTaskRow>): Promise<DbTaskRow> {
  return await apiRequest('post', '/tasks', taskData);
}

export async function updateTask(taskId: string, updates: Partial<DbTaskRow>): Promise<DbTaskRow> {
  return await apiRequest('put', `/tasks/${taskId}`, updates);
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest('delete', `/tasks/${taskId}`);
}

// TIMESHEETS
export async function fetchTimesheets(filters?: { userId?: string, fromDate?: string, toDate?: string }): Promise<DbTimesheetRow[]> {
  const queryParams = new URLSearchParams();
  if (filters?.userId) queryParams.append('userId', filters.userId);
  if (filters?.fromDate) queryParams.append('fromDate', filters.fromDate);
  if (filters?.toDate) queryParams.append('toDate', filters.toDate);

  return await apiRequest<DbTimesheetRow[]>('get', `/timesheets?${queryParams.toString()}`);
}

export async function createTimesheet(data: Partial<DbTimesheetRow>): Promise<DbTimesheetRow> {
  return await apiRequest('post', '/timesheets', data);
}

export async function updateTimesheet(id: string, updates: Partial<DbTimesheetRow>): Promise<DbTimesheetRow> {
  return await apiRequest('put', `/timesheets/${id}`, updates);
}

export async function deleteTimesheet(id: string): Promise<void> {
  await apiRequest('delete', `/timesheets/${id}`);
}
