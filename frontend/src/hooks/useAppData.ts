// hooks/useAppData.ts
// Hook principal para carregar dados do Supabase

import { useEffect, useState } from "react";
import {
  Client,
  Project,
  Task,
  TimesheetEntry,
  User,
  Status,
  Priority,
  Impact,
} from "@/types";

import {
  fetchClients,
  fetchProjects,
  fetchTasks,
  fetchUsers,
  fetchTimesheets,
  fetchTaskCollaborators,
  DbTaskRow,
} from "@/services/api";
import { useAuth } from '@/contexts/AuthContext';

// =====================================================
// INTERFACE DO HOOK
// =====================================================

interface AppData {
  users: User[];
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  timesheetEntries: TimesheetEntry[];
  projectMembers: { projectId: string; userId: string }[];
  loading: boolean;
  error: string | null;
}

// Mock vazio para timesheets (implementar depois se necessário)
const MOCK_TIMESHEETS: TimesheetEntry[] = [];

// =====================================================
// FUNÇÕES DE NORMALIZAÇÃO
// =====================================================

/**
 * Normaliza o status da tarefa do português para o padrão do front-end
 */
function normalizeStatus(raw: string | null): Status {
  if (!raw) return "Todo";

  const s = raw.toLowerCase().trim();

  // Concluído / Done
  if (s.includes("conclu") || s.includes("done") || s.includes("finaliz")) {
    return "Done";
  }

  // Em andamento / In Progress
  if (s.includes("andamento") || s.includes("progresso") || s.includes("progress") || s.includes("execu")) {
    return "In Progress";
  }

  // Revisão / Review
  if (s.includes("revis") || s.includes("review") || s.includes("valida")) {
    return "Review";
  }

  // Padrão: A fazer / Todo
  return "Todo";
}

/**
 * Normaliza a prioridade
 */
function normalizePriority(raw: string | null): Priority | undefined {
  if (!raw) return undefined;

  const s = raw.toLowerCase().trim();

  if (s.includes("crítica") || s.includes("critica") || s.includes("critical") || s.includes("urgente")) {
    return "Critical";
  }
  if (s.includes("alta") || s.includes("high")) return "High";
  if (s.includes("média") || s.includes("media") || s.includes("medium")) return "Medium";
  if (s.includes("baixa") || s.includes("low")) return "Low";

  return undefined;
}

/**
 * Normaliza o impacto
 */
function normalizeImpact(raw: string | null): Impact | undefined {
  if (!raw) return undefined;

  const s = raw.toLowerCase().trim();

  if (s.includes("alto") || s.includes("high")) return "High";
  if (s.includes("médio") || s.includes("medio") || s.includes("medium")) return "Medium";
  if (s.includes("baixo") || s.includes("low")) return "Low";

  return undefined;
}

/**
 * Formata data para string YYYY-MM-DD
 * Se a data for nula, retorna uma data padrão (7 dias no futuro)
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) {
    // Data padrão: 7 dias no futuro
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate.toISOString().split("T")[0];
  }

  // Se já está no formato correto, retorna
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Tenta parsear e formatar
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  } catch {
    // Ignora erro de parse
  }

  // Fallback
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 7);
  return defaultDate.toISOString().split("T")[0];
}

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useAppData(): AppData {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(MOCK_TIMESHEETS);
  const [projectMembers, setProjectMembers] = useState<{ projectId: string, userId: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isLoading: authLoading } = useAuth();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Verificar se está autenticado no Supabase
        const { supabase } = await import('@/services/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();

        if (!session && !currentUser) {
          console.log('[useAppData] Sem sessão ativa no Supabase, aguardando login...');
          setLoading(false);
          return;
        }

        console.log('[useAppData] Carregando dados do banco...');

        const [usersData, clientsData, projectsData, tasksData, tasksCollaboratorsData, membersRes] = await Promise.all([
          fetchUsers(),
          fetchClients(),
          fetchProjects(),
          fetchTasks(),
          fetchTaskCollaborators(),
          supabase.from('project_members').select('id_projeto, id_colaborador')
        ]);

        if (!isMounted) return;

        // =====================================================
        // MAPEAMENTO DE TAREFAS - CRÍTICO!
        // O front-end usa task.developer como STRING (nome)
        // Precisamos fazer o JOIN com dim_colaboradores
        // =====================================================

        const tasksMapped: Task[] = tasksData.map((row: DbTaskRow) => {
          // Busca o nome do desenvolvedor pelo ID
          let developerName: string | undefined = undefined;

          if (row.ID_Colaborador) {
            const developer = usersData.find(
              (u) => u.id === String(row.ID_Colaborador)
            );
            developerName = developer?.name;
          }

          const mappedTask = {
            id: String(row.id_tarefa_novo),
            title: (row.Afazer && row.Afazer !== 'null') ? row.Afazer : "(Sem título)",
            projectId: String(row.ID_Projeto),
            clientId: String(row.ID_Cliente),

            // IMPORTANTE: developer é o NOME (string)
            developer: developerName,

            // developerId é o ID para JOIN com User
            developerId: row.ID_Colaborador ? String(row.ID_Colaborador) : undefined,

            // IDs dos colaboradores vinculados
            collaboratorIds: (tasksCollaboratorsData || [])
              .filter(tc => tc.taskId === String(row.id_tarefa_novo))
              .map(tc => tc.userId),

            status: normalizeStatus(row.StatusTarefa),

            // Datas
            estimatedDelivery: formatDate(row.entrega_estimada),
            actualDelivery: row.entrega_real || undefined,
            scheduledStart: row.inicio_previsto || undefined,
            actualStart: row.inicio_real || undefined,

            // Progresso (0-100)
            progress: Math.min(100, Math.max(0, Number(row.Porcentagem) || 0)),

            // Prioridade e Impacto
            priority: normalizePriority(row.Prioridade),
            impact: normalizeImpact(row.Impacto),

            // Campos de texto
            risks: row.Riscos || undefined,
            notes: row["Observações"] || undefined, // Mapped to notes
            attachment: row.attachment || undefined,
            description: row.description || undefined,
            daysOverdue: (() => {
              if (!row.entrega_estimada) return 0;

              const deadline = new Date(row.entrega_estimada);
              deadline.setHours(0, 0, 0, 0);

              const now = new Date();
              now.setHours(0, 0, 0, 0);

              const status = normalizeStatus(row.StatusTarefa);

              if (status === 'Done') {
                if (row.entrega_real) {
                  const delivery = new Date(row.entrega_real);
                  delivery.setHours(0, 0, 0, 0);
                  return Math.ceil((delivery.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                }
                return 0; // Se concluído sem data real, assume no prazo
              }

              // Se não concluído, atraso é (Hoje - Prazo)
              // Se hoje > prazo, numero positivo (atrasado)
              // Se hoje < prazo, numero negativo (adiantado)
              return Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
            })(),
          };

          return mappedTask;
        });

        // Buscar apontamentos (se houver)
        const rawTimesheets = await fetchTimesheets();

        // Faz um mapeamento dos campos da tabela horas_trabalhadas para o formato do front
        const timesheetMapped: TimesheetEntry[] = (rawTimesheets || []).map((r: any) => ({
          id: String(r.ID_Horas_Trabalhadas || crypto.randomUUID()),
          userId: String(r.ID_Colaborador || ''),
          userName: r.dim_colaboradores?.NomeColaborador || r.userName || '',
          clientId: String(r.ID_Cliente || ''),
          projectId: String(r.ID_Projeto || ''),
          taskId: String(r.id_tarefa_novo || ''),
          date: r.Data || (new Date()).toISOString().split('T')[0],
          startTime: r.Hora_Inicio || '09:00',
          endTime: r.Hora_Fim || '18:00',
          totalHours: Number(r.Horas_Trabalhadas || 0),
          lunchDeduction: !!r.Almoco_Deduzido,
          description: r.Descricao || undefined,
        }));

        // Atualiza os states (retorna todos, filtragem no componente)
        setUsers(usersData);
        setClients(clientsData);
        setProjects(projectsData);
        setTasks(tasksMapped);
        setTimesheetEntries(timesheetMapped);

        if (membersRes.data) {
          setProjectMembers(membersRes.data.map((row: any) => ({
            projectId: String(row.id_projeto),
            userId: String(row.id_colaborador)
          })));
        }

      } catch (err) {
        console.error('[useAppData] Erro:', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Falha ao carregar dados do banco.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      loadData();
    }

    // Cleanup
    return () => {
      isMounted = false;
    };
  }, [authLoading, currentUser?.id]);

  return {
    users,
    clients,
    projects,
    tasks,
    timesheetEntries,
    projectMembers,
    loading,
    error,
  };
}