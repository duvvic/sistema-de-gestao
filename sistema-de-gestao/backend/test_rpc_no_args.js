import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.rpc("relatorio_horas_custos", {});
  console.log("No args:", error);
}
check();