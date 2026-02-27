import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  console.log("Testing relatorio_horas_custos RPC...");

  const params = {
    p_data_ini: "2026-01-01",
    p_data_fim: "2026-01-31",
    p_clientes: null,
    p_projetos: null,
    p_colaboradores: null,
    p_status: ["Trabalhando", "Tarefa em andamento"]
  };

  const { data, error } = await supabaseAdmin.rpc("relatorio_horas_custos", params);

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Success! Found", data?.length, "rows.");
    if (data && data.length > 0) {
      const row = data[0];
      console.log("Sample Data (First Row):");
      console.log(`- Projeto: ${row.projeto} (${row.id_projeto})`);
      console.log(`- Status P.: ${row.status_p}`);
      console.log(`- Início P.: ${row.data_inicio_p}`);
      console.log(`- Fim P.: ${row.data_fim_p}`);
      console.log(`- Complexidade: ${row.complexidade_p}`);
    }
  }
}

check();