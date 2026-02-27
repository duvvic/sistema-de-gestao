import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.from("pg_proc").select("proname, proargnames, proargtypes").eq("proname", "relatorio_horas_custos");
  console.log("RPC Info:", data, error);
}
check();