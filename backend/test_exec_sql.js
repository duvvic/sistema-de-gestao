import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "./src/config/supabaseAdmin.js";

async function check() {
  const { data, error } = await supabaseAdmin.rpc("exec_sql", { sql: "SELECT 1" });
  console.log("exec_sql:", data, error);
}
check();