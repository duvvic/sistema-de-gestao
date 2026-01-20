// types.ts
// Interface ORIGINAL do front-end - NÃO ALTERAR

export type Status = 'Todo' | 'In Progress' | 'Review' | 'Done';

export type Role = 'admin' | 'developer' | 'gestor';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Impact = 'Low' | 'Medium' | 'High';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  cargo?: string; // Campo adicional do banco
  active?: boolean;
}

export interface Client {
  id: string;
  name: string;
  logoUrl: string;
  active?: boolean;
  Criado?: string;
  Contrato?: string;
  pais?: string;
  contato_principal?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  startDate?: string;
  estimatedDelivery?: string;
  budget?: number;
  manager?: string;
  status?: string;
  active?: boolean;
  valor_total_rs?: number;
}

export interface Task {
  id: string;
  externalId?: string;
  title: string;
  projectId: string;
  clientId: string;
  status: Status;
  estimatedDelivery: string;
  progress: number;
  description?: string;
  attachment?: string;
  developer?: string; // NOME do desenvolvedor (string)
  developerId?: string; // ID do desenvolvedor para JOIN com User
  notes?: string;
  scheduledStart?: string;
  actualStart?: string;
  actualDelivery?: string;
  priority?: Priority;
  impact?: Impact;
  risks?: string;
  daysOverdue?: number;
  em_testes?: boolean;
  link_ef?: string;
  id_tarefa_novo?: number;
  collaboratorIds?: string[]; // IDs dos colaboradores vinculados
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string;
  clientId: string;
  projectId: string;
  taskId: string;
  date: string;
  startTime: string;
  endTime: string;
  totalHours: number;
  description?: string;
  lunchDeduction?: boolean;
}

export type View =
  | 'login'
  | 'admin'
  | 'kanban'
  | 'task-detail'
  | 'task-create'
  | 'project-create'
  | 'user-tasks'
  | 'developer-projects'
  | 'client-create'
  | 'client-details'
  | 'project-detail'
  | 'team-list'
  | 'team-member-detail'
  | 'user-form'
  | 'user-profile'
  | 'timesheet-calendar'
  | 'timesheet-form'
  | 'timesheet-admin-dashboard'
  | 'timesheet-admin-detail';
