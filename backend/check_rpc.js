import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.from("pg_proc").select("prosrc").eq("proname", "relatorio_horas_custos").maybeSingle();
  // Wait, I need to specify the schema if it's not public
  console.log("Error:", error);
  console.log("Data:", data);
}
// Actually, let's just try to call it with different param formats
check();