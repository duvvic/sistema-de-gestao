// types.ts

export type Status = 'Todo' | 'In Progress' | 'Review' | 'Done';
export type Role = 'admin' | 'developer' | 'gestor' | string;
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type Impact = 'Low' | 'Medium' | 'High';

// ======================
// 👤 Usuários / Colaboradores
// ======================
export interface User {
  id: string;               // ID_Colaborador
  name: string;             // NomeColaborador
  email: string;            // E-mail
  role: Role;               // papel (admin, developer, gestor, etc.)
  avatarUrl?: string | null; // avatar_url (opcional)
}

// ======================
// 🏢 Clientes
// ======================
export interface Client {
  id: string;
  name: string;
  logoUrl: string;
}

// ======================
// 📁 Projetos
// ======================
export interface Project {
  id: string;
  name: string;
  clientId: string;
  description?: string;
  startDate?: string;
  estimatedDelivery?: string;
  budget?: number;
  manager?: string;
}

// ======================
// ✅ Tarefas
// ======================
export interface Task {
  id: string;
  title: string;
  projectId: string;
  clientId: string;
  status: Status;
  estimatedDelivery: string; // ISO Date string
  progress: number;          // 0-100
  description?: string;
  attachment?: string;       // Base64 image
  developer?: string;        // Nome do desenvolvedor
  notes?: string;

  // Campos de gestão
  scheduledStart?: string;
  actualStart?: string;
  actualDelivery?: string;
  priority?: Priority;
  impact?: Impact;
  risks?: string;
}

// ======================
// ⏱️ Apontamento de Horas
// ======================
export interface TimesheetEntry {
  id: string;
  userId: string;
  userName: string; // Denormalized for easier display
  clientId: string;
  projectId: string;
  taskId: string;
  date: string;     // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  totalHours: number; // Decimal
  description?: string;
}

// ======================
// 🔄 Views da aplicação
// ======================
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
