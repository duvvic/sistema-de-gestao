// services/api.ts
// Funções de comunicação com o Supabase

import { supabase } from "./supabaseClient";
import { User, Client, Project, Role } from "@/types";
import { mapDbProjectToProject, mapDbUserToUser } from "@/utils/normalizers";

// =====================================================
// INTERFACES DO BANCO DE DADOS (Raw Data)
// =====================================================

// dim_colaboradores
export interface DbUserRow {
  ID_Colaborador: number;
  NomeColaborador: string;
  Cargo: string | null;
  email: string;
  avatar_url: string | null;
  role: string | null;
  ativo?: boolean | null;
  torre?: string | null;
  nivel?: string | null;
  custo_hora?: number | null;
  horas_disponiveis_dia?: number | null;
  horas_disponiveis_mes?: number | null;
}

// dim_clientes
export interface DbClientRow {
  ID_Cliente: number;
  NomeCliente: string;
  NewLogo: string | null;
  ativo: boolean | null;
  Criado?: string | null;
  Contrato?: string | null;
  Desativado?: string | null;
  pais?: string | null;
  contato_principal?: string | null;
  tipo_cliente?: 'parceiro' | 'cliente_final' | null;
  partner_id?: number | null;
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
  startDate: string | null;
  valor_total_rs: number | null;
  partner_id: number | null;
  manager_client: string | null;
  responsible_nic_labs_id: number | null;
  start_date_real: string | null;
  end_date_real: string | null;
  risks: string | null;
  success_factor: string | null;
  critical_date: string | null;
  doc_link: string | null;
}

// fato_tarefas (ou fato_tarefas_view)
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
  "Observações": string | null;
  attachment: string | null;
  description: string | null;
  inicio_previsto: string | null;
  inicio_real: string | null;
  entrega_estimada: string | null;
  entrega_real: string | null;
  em_testes?: boolean | null;
  link_ef?: string | null;
  dias_atraso?: number | null;
  is_impediment?: boolean | null;
  deleted_at?: string | null;
}

// =====================================================
// FETCH FUNCTIONS
// =====================================================

/**
 * Busca todos os colaboradores/usuários
 */
export async function fetchUsers(): Promise<User[]> {
  try {

    const { data, error } = await supabase
      .from("dim_colaboradores")
      .select("ID_Colaborador, NomeColaborador, Cargo, email, avatar_url, role, ativo, torre, nivel, custo_hora, horas_disponiveis_dia, horas_disponiveis_mes");

    if (error) {
      console.error("[API] Erro Supabase:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("[API] Tabela vazia ou sem permissão.");
      return [];
    }

    const mapped: User[] = data.map((row: any) => mapDbUserToUser(row));


    return mapped;
  } catch (err) {
    console.error("[API] Falha no fetchUsers:", err);
    throw err;
  }
}

// Soft delete de colaborador (marca ativo = false) e confirma linha afetada
export async function deactivateUser(userId: string): Promise<boolean> {
  const numericId = Number(userId);
  if (Number.isNaN(numericId)) {
    throw new Error(`ID de colaborador inválido: ${userId}`);
  }

  const { data, error } = await supabase
    .from("dim_colaboradores")
    .update({ ativo: false })
    .eq("ID_Colaborador", numericId)
    .select("ID_Colaborador, NomeColaborador, ativo");

  if (error) {
    throw error;
  }

  const updated = !!(data && data.length > 0);
  if (!updated) {
    throw new Error("Nenhum registro atualizado. Verifique permissões RLS ou se o ID existe.");
  }

  return true;
}

/**
 * Busca todos os clientes
 */
export async function fetchClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("ID_Cliente, NomeCliente, NewLogo, ativo, Criado, Contrato, Desativado, Pais, contato_principal, tipo_cliente, partner_id");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: DbClientRow): Client => {
      const clientBase: any = {
        id: String(row.ID_Cliente),
        name: row.NomeCliente || "Sem nome",
        logoUrl: row.NewLogo || "https://placehold.co/150?text=Logo",
        active: row.ativo ?? true,
        pais: row.pais ?? null,
        contato_principal: row.contato_principal ?? null,
        tipo_cliente: (row.tipo_cliente as any) || 'cliente_final',
        partner_id: row.partner_id ? String(row.partner_id) : undefined,
      };
      clientBase.Criado = row.Criado ?? null;
      clientBase.Contrato = row.Contrato ?? null;
      clientBase.Desativado = row.Desativado ?? null;
      return clientBase as Client;
    });
  } catch (err) {
    throw err;
  }
}

/**
 * Busca todos os projetos
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    const { data, error } = await supabase
      .from("dim_projetos")
      .select("*");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row: any): Project => mapDbProjectToProject(row));
  } catch (err) {
    throw err;
  }
}

/**
 * Busca todas as tarefas (raw data)
 */
export async function fetchTasks(): Promise<DbTaskRow[]> {
  try {
    const { data, error } = await supabase
      .from("fato_tarefas")
      .select('id_tarefa_novo, ID_Tarefa, ID_Cliente, ID_Projeto, Afazer, ID_Colaborador, StatusTarefa, entrega_estimada, entrega_real, inicio_previsto, inicio_real, Porcentagem, Prioridade, Impacto, Riscos, "Observações", attachment, description, em_testes, link_ef, dias_atraso, is_impediment, deleted_at, estimated_hours')
      .is('deleted_at', null)
      .order('id_tarefa_novo', { ascending: false })
      .limit(10000);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data as DbTaskRow[];
  } catch (err) {
    throw err;
  }
}


// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Normaliza o papel/role do usuário
 */
function normalizeRole(papel: string | null): Role {
  if (!papel) return "developer";

  const p = papel.toLowerCase().trim();

  if (p === "admin" || p === "administrador") return "admin";
  if (p === "gestor" || p === "gerente" || p === "manager") return "gestor";
  if (p === "diretoria" || p === "diretor") return "diretoria";
  if (p === "pmo") return "pmo";
  if (p === "financeiro") return "financeiro";
  if (p === "tech_lead" || p === "techlead") return "tech_lead";
  if (p === "consultor") return "consultor";

  return "developer";
}

/**
 * Tenta buscar os apontamentos/horários no banco.
 */
export async function fetchTimesheets(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('horas_trabalhadas')
      .select(`
        ID_Horas_Trabalhadas,
        ID_Colaborador,
        ID_Cliente,
        ID_Projeto,
        ID_Tarefa,
        id_tarefa_novo,
        Data,
        Horas_Trabalhadas,
        Hora_Inicio,
        Hora_Fim,
        Almoco_Deduzido,
        Descricao,
        deleted_at,
        dim_colaboradores!inner(NomeColaborador)
      `)
      .is('deleted_at', null)
      .order('Data', { ascending: false })
      .limit(10000);

    if (error) {
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}

/**
 * Busca todos os vínculos de colaboradores extras em tarefas
 */
export async function fetchTaskCollaborators(): Promise<{ taskId: string, userId: string }[]> {
  try {
    const { data, error } = await supabase
      .from('tarefa_colaboradores')
      .select('id_tarefa, id_colaborador');

    if (error) throw error;

    return (data || []).map(row => ({
      taskId: String(row.id_tarefa),
      userId: String(row.id_colaborador)
    }));
  } catch (err) {
    console.error("[API] fetchTaskCollaborators error:", err);
    return [];
  }
}


