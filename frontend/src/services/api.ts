// services/api.ts
// Funções de comunicação com o Supabase

import { supabase } from "./supabaseClient";
import { User, Client, Project } from "@/types";

// =====================================================
// INTERFACES DO BANCO DE DADOS (Raw Data)
// =====================================================

// dim_colaboradores
export interface DbUserRow {
  ID_Colaborador: number;
  NomeColaborador: string;
  Cargo: string | null;
  "email": string;
  avatar_url: string | null;
  papel: string | null;
  ativo?: boolean | null;
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
}

// dim_projetos
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
  valor_total_rs: number | null;
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
}

// =====================================================
// FETCH FUNCTIONS
// =====================================================

/**
 * Busca todos os colaboradores/usuários
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    console.log("[API] Buscando...");
    const { data, error } = await supabase
      .from("dim_colaboradores")
      .select("ID_Colaborador, NomeColaborador, Cargo, email, avatar_url, papel, ativo");

    if (error) {
      console.error("[API] Erro Supabase:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("[API] Tabela vazia ou sem permissão.");
      return [];
    }

    const mapped: User[] = data.map((row: any) => ({
      id: String(row.ID_Colaborador),
      name: row.NomeColaborador || "Sem nome",
      email: String(row.email || "").trim().toLowerCase(),
      avatarUrl: row.avatar_url || undefined,
      cargo: row.Cargo || row.cargo || undefined,
      // 'Administrador' -> admin, 'Padrão' ou qualquer outro -> developer
      role: row.papel === 'Administrador' ? 'admin' : 'developer',
      active: row.ativo !== false,
    }));

    console.log("[API] Usuarios mapeados:", mapped.length);
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
      .select("ID_Cliente, NomeCliente, NewLogo, ativo, Criado, Contrato, Desativado, Pais, contato_principal");

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
      .select("ID_Projeto, NomeProjeto, ID_Cliente, StatusProjeto, ativo, budget, description, estimatedDelivery, manager, startDate, valor_total_rs");

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

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
      valor_total_rs: row.valor_total_rs || undefined,
    }));
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
      .select('id_tarefa_novo, ID_Tarefa, ID_Cliente, ID_Projeto, Afazer, ID_Colaborador, StatusTarefa, entrega_estimada, entrega_real, inicio_previsto, inicio_real, Porcentagem, Prioridade, Impacto, Riscos, "Observações", attachment, description, em_testes, link_ef, dias_atraso')
      .order('id_tarefa_novo', { ascending: false })
      .limit(500);

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
function normalizeRole(papel: string | null): "admin" | "developer" | "gestor" {
  if (!papel) return "developer";

  const p = papel.toLowerCase().trim();

  if (p === "admin" || p === "administrador") return "admin";
  if (p === "gestor" || p === "gerente" || p === "manager") return "gestor";

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
        dim_colaboradores!inner(NomeColaborador)
      `)
      .order('Data', { ascending: false })
      .limit(1000);

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


