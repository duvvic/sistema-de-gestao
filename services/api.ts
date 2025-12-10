// services/api.ts
// Funções de comunicação com o Supabase

import { supabase } from "./supabaseClient";
import { User, Client, Project } from "../types";

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
}

// dim_clientes
export interface DbClientRow {
  ID_Cliente: number;
  NomeCliente: string;
  NewLogo: string | null;
  ativo: boolean | null;
}

// dim_projetos
export interface DbProjectRow {
  ID_Projeto: number;
  NomeProjeto: string;
  ID_Cliente: number;
  StatusProjeto: string | null;
  ativo: boolean | null;
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
  Observacoes: string | null; // Cuidado: pode ser "Observações" com cedilha
  LinkEF: string | null;
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
/**
 * Busca todos os colaboradores/usuários
 */
export async function fetchUsers(): Promise<User[]> {
  try {
    console.log("📥 Buscando usuários...");
    const { data, error } = await supabase
      .from("dim_colaboradores")
      .select("ID_Colaborador, NomeColaborador, Cargo, \"E-mail\", avatar_url, papel");

    if (error) {
      console.error("❌ Erro ao buscar usuários:", error.message);
      console.error("   Código de erro:", error.code);
      console.error("   Detalhes:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Nenhum usuário encontrado no banco");
      return [];
    }
    
    console.log(`✅ ${data.length} usuários encontrados`);
    
    return data.map((row: DbUserRow): User => ({
      id: String(row.ID_Colaborador),
      name: row.NomeColaborador || "Sem nome",
      email: row["E-mail"] || "",
      avatarUrl: row.avatar_url || undefined,
      cargo: row.Cargo || undefined,
      role: normalizeRole(row.papel),
    }));
  } catch (err) {
    console.error("❌ Exceção ao buscar usuários:", err);
    throw err;
  }
}

/**
 * Busca todos os clientes
 */
export async function fetchClients(): Promise<Client[]> {
  try {
    console.log("📥 Buscando clientes...");
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("ID_Cliente, NomeCliente, NewLogo, ativo");

    if (error) {
      console.error("❌ Erro ao buscar clientes:", error.message);
      console.error("   Código de erro:", error.code);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Nenhum cliente encontrado no banco");
      return [];
    }
    
    console.log(`✅ ${data.length} clientes encontrados`);

    return data.map((row: DbClientRow): Client => ({
      id: String(row.ID_Cliente),
      name: row.NomeCliente || "Sem nome",
      logoUrl: row.NewLogo || "https://via.placeholder.com/150?text=Logo",
      active: row.ativo ?? true,
    }));
  } catch (err) {
    console.error("❌ Exceção ao buscar clientes:", err);
    throw err;
  }
}

/**
 * Busca todos os projetos
 */
export async function fetchProjects(): Promise<Project[]> {
  try {
    console.log("📥 Buscando projetos...");
    const { data, error } = await supabase
      .from("dim_projetos")
      .select("ID_Projeto, NomeProjeto, ID_Cliente, StatusProjeto, ativo");

    if (error) {
      console.error("❌ Erro ao buscar projetos:", error.message);
      console.error("   Código de erro:", error.code);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Nenhum projeto encontrado no banco");
      return [];
    }
    
    console.log(`✅ ${data.length} projetos encontrados`);

    return data.map((row: DbProjectRow): Project => ({
      id: String(row.ID_Projeto),
      name: row.NomeProjeto || "Sem nome",
      clientId: String(row.ID_Cliente),
      status: row.StatusProjeto || undefined,
      active: row.ativo ?? true,
    }));
  } catch (err) {
    console.error("❌ Exceção ao buscar projetos:", err);
    throw err;
  }
}

/**
 * Busca todas as tarefas (raw data)
 * O mapeamento para Task será feito no useAppData
 */
export async function fetchTasks(): Promise<DbTaskRow[]> {
  try {
    console.log("📥 Buscando tarefas...");
    // Tenta primeiro a view, se não existir tenta a tabela direta
    let { data, error } = await supabase
      .from("fato_tarefas_view")
      .select("*");

    // Se a view não existir, tenta a tabela
    if (error && error.code === "42P01") {
      console.warn("⚠️ View fato_tarefas_view não encontrada, tentando tabela fato_tarefas");
      const result = await supabase.from("fato_tarefas").select("*");
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error("❌ Erro ao buscar tarefas:", error.message);
      console.error("   Código de erro:", error.code);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn("⚠️ Nenhuma tarefa encontrada no banco");
      return [];
    }
    
    console.log(`✅ ${data.length} tarefas encontradas`);
    return data as DbTaskRow[];
  } catch (err) {
    console.error("❌ Exceção ao buscar tarefas:", err);
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
 * Suporta múltiplos nomes de tabela para facilitar integração com diferentes schemas.
 */
export async function fetchTimesheets(): Promise<any[]> {
  const candidates = ['timesheet_entries', 'apontamentos', 'fato_apontamentos', 'timesheets'];
  for (const table of candidates) {
    try {
      console.log(`📥 Tentando buscar apontamentos na tabela '${table}'`);
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        // Se tabela não existir, continue para próxima
        console.warn(`⚠️ Erro ao buscar ${table}:`, error.message || error);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`ℹ️ Nenhum apontamento encontrado em ${table}`);
        return [];
      }

      console.log(`✅ ${data.length} apontamentos encontrados em ${table}`);
      return data;
    } catch (err) {
      console.error(`❌ Exceção lendo ${table}:`, err);
      continue;
    }
  }

  console.warn('⚠️ Nenhuma tabela de apontamentos encontrada');
  return [];
}