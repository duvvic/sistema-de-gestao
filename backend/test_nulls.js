import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function run() {
  const { error } = await supabaseAdmin.rpc("relatorio_horas_custos", { p_data_ini: null, p_data_fim: null });
  console.log("Error with NULLs:", error.message);
}
run();