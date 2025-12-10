// Copie e cole este código no console do navegador (F12 → Console)
// para testar a conexão manualmente

(async () => {
  console.log("🧪 TESTE DE CONEXÃO SUPABASE\n");

  // Importar o cliente Supabase
  const { supabase } = await import('./services/supabaseClient.js');

  // Teste 1: Conexão básica
  console.log("1️⃣ Teste: Conectar ao Supabase");
  try {
    const { count, error } = await supabase
      .from("dim_clientes")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("❌ ERRO:", error.message);
      console.error("   Código:", error.code);
    } else {
      console.log(`✅ Conexão OK! (${count} registros em dim_clientes)`);
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 2: Buscar um cliente
  console.log("\n2️⃣ Teste: Buscar clientes");
  try {
    const { data, error } = await supabase
      .from("dim_clientes")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ ERRO:", error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Dados encontrados:");
      console.table(data);
    } else {
      console.warn("⚠️ Nenhum registro encontrado");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }

  // Teste 3: Buscar colaboradores
  console.log("\n3️⃣ Teste: Buscar colaboradores");
  try {
    const { data, error } = await supabase
      .from("dim_colaboradores")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ ERRO:", error.message);
    } else if (data && data.length > 0) {
      console.log("✅ Dados encontrados:");
      console.table(data);
    } else {
      console.warn("⚠️ Nenhum registro encontrado");
    }
  } catch (e) {
    console.error("❌ EXCEÇÃO:", e);
  }
})();
