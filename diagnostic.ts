// diagnóstico.ts
// Script para testar conexão ao Supabase e verificar dados

import { supabase } from "./services/supabaseClient";

async function diagnostic() {
  console.log("🔍 INICIANDO DIAGNÓSTICO...\n");

  // Teste 1: Conexão básica
  console.log("1️⃣ Testando conexão básica...");
  try {
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("count", { count: "exact", head: true });
    
    if (error) {
      console.error("❌ ERRO na conexão:", error.message);
      console.error("   Código:", error.code);
    } else {
      console.log("✅ Conexão OK!");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 2: Listar colunas da tabela dim_clientes
  console.log("\n2️⃣ Verificando estrutura da tabela dim_clientes...");
  try {
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("❌ ERRO:", error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Colunas encontradas:");
      console.log("  ", Object.keys(data[0]).join(", "));
      console.log("\n📋 Exemplo de registro:");
      console.log("  ", JSON.stringify(data[0], null, 2));
    } else {
      console.warn("⚠️ Nenhum registro encontrado em dim_clientes");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 3: Listar colunas da tabela dim_colaboradores
  console.log("\n3️⃣ Verificando estrutura da tabela dim_colaboradores...");
  try {
    const { data, error } = await supabase
      .from("dim_colaboradores")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("❌ ERRO:", error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Colunas encontradas:");
      console.log("  ", Object.keys(data[0]).join(", "));
    } else {
      console.warn("⚠️ Nenhum registro encontrado em dim_colaboradores");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 4: Listar colunas da tabela dim_projetos
  console.log("\n4️⃣ Verificando estrutura da tabela dim_projetos...");
  try {
    const { data, error } = await supabase
      .from("dim_projetos")
      .select("*")
      .limit(1);
    
    if (error) {
      console.error("❌ ERRO:", error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Colunas encontradas:");
      console.log("  ", Object.keys(data[0]).join(", "));
    } else {
      console.warn("⚠️ Nenhum registro encontrado em dim_projetos");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 5: Listar colunas da tabela fato_tarefas
  console.log("\n5️⃣ Verificando estrutura da tabela fato_tarefas ou fato_tarefas_view...");
  try {
    const { data, error } = await supabase
      .from("fato_tarefas_view")
      .select("*")
      .limit(1);
    
    if (error) {
      if (error.code === "42P01") {
        console.log("⚠️ View fato_tarefas_view não encontrada, tentando tabela fato_tarefas...");
        const { data: data2, error: error2 } = await supabase
          .from("fato_tarefas")
          .select("*")
          .limit(1);
        
        if (error2) {
          console.error("❌ ERRO:", error2.message);
        } else if (data2 && data2.length > 0) {
          console.log("✅ Colunas encontradas em fato_tarefas:");
          console.log("  ", Object.keys(data2[0]).join(", "));
        } else {
          console.warn("⚠️ Nenhum registro encontrado em fato_tarefas");
        }
      } else {
        console.error("❌ ERRO:", error.message);
      }
    } else if (data && data.length > 0) {
      console.log("✅ Colunas encontradas em fato_tarefas_view:");
      console.log("  ", Object.keys(data[0]).join(", "));
    } else {
      console.warn("⚠️ Nenhum registro encontrado em fato_tarefas_view");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  console.log("\n✅ DIAGNÓSTICO CONCLUÍDO!");
}

// Executar diagnóstico
diagnostic();
