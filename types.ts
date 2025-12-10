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
}

export interface Client {
  id: string;
  name: string;
  logoUrl: string;
  active?: boolean;
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
}

export interface Task {
  id: string;
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
  | 'team-list'
  | 'team-member-detail'
  | 'timesheet-calendar'
  | 'timesheet-form'
  | 'timesheet-admin-dashboard'
  | 'timesheet-admin-detail';