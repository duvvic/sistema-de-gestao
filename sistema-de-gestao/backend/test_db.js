import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.from("dim_projetos").select("ID_Projeto").limit(1);
  if (error) console.error("Database access error:", error);
  else console.log("Database access OK");
  
  // Try to use a known function to check if RPCs are working
  const { data: d2, error: e2 } = await supabaseAdmin.rpc("get_service_status");
  console.log("Health check RPC:", d2, e2);
}
check();