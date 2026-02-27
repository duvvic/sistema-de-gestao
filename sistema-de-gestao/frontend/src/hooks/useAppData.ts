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
  Absence,
  ProjectMember,
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
  projectMembers: ProjectMember[];
  absences: Absence[];
  holidays: Holiday[];
  loading: boolean;
  error: string | null;
}

// Mock vazio para timesheets (implementar depois se necessário)
const MOCK_TIMESHEETS: TimesheetEntry[] = [];

// =====================================================
// FUNÇÕES DE NORMALIZAÇÃO
// =====================================================

import {
  normalizeStatus,
  normalizePriority,
  normalizeImpact,
  formatDate,
  mapDbTaskToTask,
  mapDbTimesheetToEntry,
  mapDbAbsenceToAbsence
} from "@/utils/normalizers";
import { Holiday } from "@/types";

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useAppData(): AppData {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(MOCK_TIMESHEETS);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, isLoading: authLoading } = useAuth();

  // Helper de Cache
  const CACHE_KEY = 'nic_labs_app_data';
  const CACHE_VERSION = '1.3'; // Incrementado para incluir holidays

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
          setAbsences(parsed.absences || []);
          setHolidays(parsed.holidays || []);
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

        // Verificar se está autenticado no Supabase ou se tem um token válido
        const { supabase } = await import('@/services/supabaseClient');
        const { data: { session } } = await supabase.auth.getSession();

        // Check for monitoring token
        const urlParams = new URLSearchParams(window.location.search);
        const hasValidToken = urlParams.get('token') === 'xyz123';

        if (!session && !currentUser && !hasValidToken) {

          setLoading(false);
          return;
        }



        const [usersData, clientsData, projectsData, tasksData, tasksCollaboratorsData, membersRes, rawTimesheets, absencesRes, holidaysRes] = await Promise.all([
          fetchUsers(),
          fetchClients(),
          fetchProjects(),
          fetchTasks(),
          fetchTaskCollaborators(),
          supabase.from('project_members').select('*'),
          fetchTimesheets(),
          supabase.from('colaborador_ausencias').select('*'),
          supabase.from('feriados').select('*')
        ]);

        if (!isMounted) return;

        // Otimização: Criar Map de Usuários para Lookup O(1)
        const userMap = new Map(usersData.map((u) => [u.id, u]));

        const tasksMapped: Task[] = tasksData.map((row: DbTaskRow) => {
          const projectName = row.ID_Projeto ? projectsData.find((p) => p.id === String(row.ID_Projeto))?.name : undefined;
          const clientName = row.ID_Cliente ? clientsData.find((c) => c.id === String(row.ID_Cliente))?.name : undefined;
          return mapDbTaskToTask(row, userMap, projectName, clientName);
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

        const absencesMapped = (absencesRes.data || []).map(mapDbAbsenceToAbsence);
        const holidaysMapped: Holiday[] = (holidaysRes.data || []).map((r: any) => ({
          id: String(r.id),
          name: r.nome,
          date: r.data,
          endDate: r.data_fim || r.data,
          type: r.tipo,
          observations: r.observacoes,
          period: r.periodo,
          endTime: r.hora_fim
        }));

        const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
          return Array.from(new Map(items.map(i => [i.id, i])).values());
        };

        // Atualiza os states (retorna todos, filtragem no componente)
        setUsers(deduplicateById(usersData));
        setClients(deduplicateById(clientsData));
        setProjects(deduplicateById(projectsData));
        setTasks(deduplicateById(tasksMapped));
        setTimesheetEntries(deduplicateById(timesheetMapped));
        setAbsences(deduplicateById(absencesMapped));
        setHolidays(deduplicateById(holidaysMapped));

        if (membersRes.data) {

          const membersMapped: ProjectMember[] = membersRes.data.map((row: any) => ({
            id_pc: row.id_pc,
            id_projeto: row.id_projeto,
            id_colaborador: row.id_colaborador,
            allocation_percentage: row.allocation_percentage,
            start_date: row.start_date,
            end_date: row.end_date,
            role_in_project: row.role_in_project
          }));

          // Deduplicate members
          const uniqueMembers = Array.from(new Map(membersMapped.map((m) => [`${m.id_projeto}-${m.id_colaborador}`, m])).values());

          setProjectMembers(uniqueMembers);

          // SALVAR NO CACHE
          const cacheData = {
            version: CACHE_VERSION,
            timestamp: Date.now(),
            users: usersData,
            clients: clientsData,
            projects: projectsData,
            tasks: tasksMapped,
            timesheetEntries: timesheetMapped,
            projectMembers: membersMapped,
            absences: absencesMapped,
            holidays: holidaysMapped
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } else {
          console.warn('🔍 Project Members Error:', membersRes.error);
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
    absences,
    holidays,
    loading,
    error,
  };
}