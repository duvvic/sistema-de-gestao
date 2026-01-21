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

  // Trabalhando / Em Andamento / In Progress
  if (s.includes("trabalhando") || s.includes("andamento") || s.includes("progresso") || s.includes("progress") || s.includes("execu")) {
    return "In Progress";
  }

  // Teste / Revisão / Review
  if (s.includes("teste") || s.includes("revis") || s.includes("review") || s.includes("valida")) {
    return "Review";
  }

  // Padrão: Não Iniciado / A fazer / Todo
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

  // Se já está no formato YYYY-MM-DD, retorna direto (evita new Date() que aplica fuso)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Se for ISO com tempo (T), pega só a primeira parte
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }

  // Fallback: Tenta parsear mas compensando o fuso para UTC
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Ajusta para o dia correto em UTC, ignorando o horario local
      const userTimezoneOffset = date.getTimezoneOffset() * 60000;
      const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
      return adjustedDate.toISOString().split("T")[0];
    }
  } catch {
    // Ignora erro
  }

  return new Date().toISOString().split("T")[0];
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

  // Helper de Cache
  const CACHE_KEY = 'nic_labs_app_data';
  const CACHE_VERSION = '1.2'; // Incrementado para garantir carregamento de avatarUrl

  // Carregamento inicial do cache
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.version === CACHE_VERSION) {
          setUsers(parsed.users || []);
          setClients(parsed.clients || []);
          setProjects(parsed.projects || []);
          setTasks(parsed.tasks || []);
          setTimesheetEntries(parsed.timesheetEntries || []);
          setProjectMembers(parsed.projectMembers || []);
          // Se temos cache, já podemos sinalizar que não estamos mais "travados"
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn('[useAppData] Erro ao carregar cache:', e);
    }
  }, []);

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

        const [usersData, clientsData, projectsData, tasksData, tasksCollaboratorsData, membersRes, rawTimesheets] = await Promise.all([
          fetchUsers(),
          fetchClients(),
          fetchProjects(),
          fetchTasks(),
          fetchTaskCollaborators(),
          supabase.from('project_members').select('id_projeto, id_colaborador'),
          fetchTimesheets()
        ]);

        if (!isMounted) return;

        // Otimização: Criar Map de Usuários para Lookup O(1)
        const userMap = new Map(usersData.map((u) => [u.id, u]));

        // =====================================================
        // MAPEAMENTO DE TAREFAS - CRÍTICO!
        // =====================================================

        const tasksMapped: Task[] = tasksData.map((row: DbTaskRow) => {
          // Busca o nome do desenvolvedor pelo ID usando Map
          let developerName: string | undefined = undefined;

          if (row.ID_Colaborador) {
            const dev = userMap.get(String(row.ID_Colaborador));
            developerName = dev?.name;
          }

          const mappedTask = {
            id: String(row.id_tarefa_novo), // Usar o ID numérico como ID principal para consistência com o DB
            externalId: row.ID_Tarefa || undefined,
            title: (row.Afazer && row.Afazer !== 'null') ? row.Afazer : "(Sem título)",
            projectId: String(row.ID_Projeto),
            clientId: String(row.ID_Cliente),
            developer: developerName,
            developerId: row.ID_Colaborador ? String(row.ID_Colaborador) : undefined,
            // collaboratorIds será preenchido via Map abaixo
            collaboratorIds: [],
            status: normalizeStatus(row.StatusTarefa),
            estimatedDelivery: formatDate(row.entrega_estimada),
            actualDelivery: row.entrega_real || undefined,
            scheduledStart: row.inicio_previsto || undefined,
            actualStart: row.inicio_real || undefined,
            progress: Math.min(100, Math.max(0, Number(row.Porcentagem) || 0)),
            priority: normalizePriority(row.Prioridade),
            impact: normalizeImpact(row.Impacto),
            risks: row.Riscos || undefined,
            notes: row["Observações"] || undefined,
            em_testes: !!row.em_testes,
            link_ef: row.link_ef || undefined,
            id_tarefa_novo: row.id_tarefa_novo,
            daysOverdue: (() => {
              if (!row.entrega_estimada) return 0;
              const deadline = new Date(row.entrega_estimada);
              deadline.setHours(0, 0, 0, 0);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const status = normalizeStatus(row.StatusTarefa);

              // Nova Lógica: Se estiver em Revisão, o atraso é ignorado (retorna 0)
              if (status === 'Review') return 0;

              if (status === 'Done') {
                if (row.entrega_real) {
                  const delivery = new Date(row.entrega_real);
                  delivery.setHours(0, 0, 0, 0);
                  return Math.ceil((delivery.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
                }
                return 0;
              }
              return Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
            })(),
          };

          return mappedTask;
        });

        // Map collaborators lookup is still O(N*M) above? 
        // tasksCollaboratorsData is array. filter inside map is nested loop.
        // Optimization: Pre-group collaborators by task.
        const collaboratorsMap = new Map<string, string[]>();
        (tasksCollaboratorsData || []).forEach(tc => {
          if (!collaboratorsMap.has(tc.taskId)) collaboratorsMap.set(tc.taskId, []);
          collaboratorsMap.get(tc.taskId)?.push(tc.userId);
        });

        // Re-map tasks with optimized collaborators lookup
        tasksMapped.forEach(t => {
          t.collaboratorIds = collaboratorsMap.get(t.id) || [];
        });

        // Remover fetch sequencial de timesheets pois já está no Promise.all

        // Otimização: Criar Map de Tarefas para Lookup reverso de ID de Texto -> ID Numérico
        const taskExternalMap = new Map(tasksData.filter(t => t.ID_Tarefa).map(t => [String(t.ID_Tarefa).toLowerCase(), String(t.id_tarefa_novo)]));

        // Faz um mapeamento dos campos da tabela horas_trabalhadas para o formato do front
        const timesheetMapped: TimesheetEntry[] = (rawTimesheets || []).map((r: any) => {
          // Se não tiver o ID Numérico, tenta encontrar via ID de Texto da planilha
          let taskId = String(r.id_tarefa_novo || '');
          if (!taskId || taskId === 'null' || taskId === '0') {
            const extId = String(r.ID_Tarefa || '').toLowerCase();
            if (extId && taskExternalMap.has(extId)) {
              taskId = taskExternalMap.get(extId)!;
            } else {
              taskId = String(r.ID_Tarefa || ''); // Fallback para o ID original se não achar vínculo
            }
          }

          return {
            id: String(r.ID_Horas_Trabalhadas || crypto.randomUUID()),
            userId: String(r.ID_Colaborador || ''),
            userName: r.dim_colaboradores?.NomeColaborador || r.userName || '',
            clientId: String(r.ID_Cliente || ''),
            projectId: String(r.ID_Projeto || ''),
            taskId: taskId,
            date: r.Data ? (r.Data.includes('T') ? r.Data.split('T')[0] : r.Data) : formatDate(null),
            startTime: r.Hora_Inicio || '09:00',
            endTime: r.Hora_Fim || '18:00',
            totalHours: Number(r.Horas_Trabalhadas || 0),
            lunchDeduction: !!r.Almoco_Deduzido,
            description: r.Descricao || undefined,
          };
        });

        // Atualiza os states (retorna todos, filtragem no componente)
        setUsers(usersData);
        setClients(clientsData);
        setProjects(projectsData);
        setTasks(tasksMapped);
        setTimesheetEntries(timesheetMapped);

        if (membersRes.data) {
          const membersMapped = membersRes.data.map((row: any) => ({
            projectId: String(row.id_projeto),
            userId: String(row.id_colaborador)
          }));
          setProjectMembers(membersMapped);

          // SALVAR NO CACHE
          const cacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            users: usersData,
            clients: clientsData,
            projects: projectsData,
            tasks: tasksMapped,
            timesheetEntries: timesheetMapped,
            projectMembers: membersMapped
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
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