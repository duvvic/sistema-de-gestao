// types.ts
// Interface ORIGINAL do front-end - NÃO ALTERAR

export type Status = 'Todo' | 'In Progress' | 'Review' | 'Done';

export type Role = 'admin' | 'developer' | 'gestor' | 'diretoria' | 'pmo' | 'financeiro' | 'financial' | 'tech_lead' | 'consultor' | 'system_admin' | 'executive' | 'resource';

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
  tower?: string; // Torre de atuação
  hourlyCost?: number; // Custo hora
  nivel?: string; // Nível de experiência
  dailyAvailableHours?: number; // Horas liberadas dia
  monthlyAvailableHours?: number; // Horas liberadas mês
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
  cnpj?: string;
  telefone?: string;
  tipo_cliente?: 'parceiro' | 'cliente_final';
  partner_id?: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string; // Cliente Final
  partnerId?: string; // Parceiro Nic-Labs
  description?: string; // Escopo resumido
  managerClient?: string; // Gerente do projeto pelo cliente
  responsibleNicLabsId?: string; // Responsável Nic-Labs (ID do Colaborador)
  startDate?: string; // Data início prevista
  estimatedDelivery?: string; // Data fim prevista
  startDateReal?: string;
  endDateReal?: string;
  budget?: number;
  status?: string;
  active?: boolean;
  valor_total_rs?: number;
  risks?: string;
  successFactor?: string; // Fator de sucesso
  criticalDate?: string; // Data crítica
  docLink?: string;
  gapsIssues?: string;
  importantConsiderations?: string;
  weeklyStatusReport?: string;
}

export interface Task {
  id: string;
  externalId?: string;
  title: string;
  projectId: string;
  projectName?: string; // NOVO: Nome do projeto para facilitar exibição
  clientId: string;
  clientName?: string; // NOVO: Nome do cliente para facilitar exibição
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
  estimatedHours?: number; // Horas previstas para execução
  allocatedHours?: number; // Horas alocadas para o colaborador (mapa de capacidade)
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
