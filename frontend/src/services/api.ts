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
  "E-mail": string;
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
  DiasAtraso: string | null;
  "Observações": string | null;
  attachment: string | null;
  description: string | null;
  inicio_previsto: string | null;
  inicio_real: string | null;
  entrega_estimada: string | null;
  entrega_real: string | null;
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
    const { data, error } = await supabase.from("dim_colaboradores").select("*");

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
      email: String(row["E-mail"] || row["email"] || "").trim().toLowerCase(),
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
      .select("ID_Cliente, NomeCliente, NewLogo, ativo, Criado, Contrato, Desativado");

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
        logoUrl: row.NewLogo || "https://via.placeholder.com/150?text=Logo",
        active: row.ativo ?? true,
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
      .select("ID_Projeto, NomeProjeto, ID_Cliente, StatusProjeto, ativo, budget, description, estimatedDelivery, manager, startDate");

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
      .select("*");

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
        id_tarefa_novo,
        Data,
        Horas_Trabalhadas,
        Hora_Inicio,
        Hora_Fim,
        Almoco_Deduzido,
        Descricao,
        dim_colaboradores!inner(NomeColaborador)
      `);

    if (error) {
      return [];
    }

    return data || [];
  } catch (err) {
    return [];
  }
}
