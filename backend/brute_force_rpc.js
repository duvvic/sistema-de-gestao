import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function test(params) {
  console.log("Testing with params:", params);
  const { data, error } = await supabaseAdmin.rpc("relatorio_horas_custos", params);
  if (error) console.log("Error:", error.message, error.details);
  else console.log("Success! Rows:", data.length);
}

async function run() {
  await test({ p_data_ini: "2026-01-01", p_data_fim: "2026-01-31" });
  await test({ startDate: "2026-01-01", endDate: "2026-01-31" });
  await test({ data_ini: "2026-01-01", data_fim: "2026-01-31" });
  await test({ p_ini: "2026-01-01", p_fim: "2026-01-31" });
}
run();