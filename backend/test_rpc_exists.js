import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.rpc("relatorio_teste_antigravity", { p: 1 });
  console.log("Error:", error);
}
check();