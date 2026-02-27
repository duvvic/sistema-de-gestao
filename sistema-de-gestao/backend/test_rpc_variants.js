import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function test(name, params) {
  const { data, error } = await supabaseAdmin.rpc("relatorio_horas_custos", params);
  if (error) {
    console.log(`[${name}] Error: ${error.code} - ${error.message}`);
  } else {
    console.log(`[${name}] SUCCESS!`);
  }
}

async function run() {
  await test("P-PREFIX", { p_data_ini: "2026-01-01", p_data_fim: "2026-01-31", p_clientes: null, p_projetos: null, p_colaboradores: null });
  await test("NO-PREFIX", { data_ini: "2026-01-01", data_fim: "2026-01-31" });
  await test("CAMEL-CASE", { startDate: "2026-01-01", endDate: "2026-01-31" });
}
run();