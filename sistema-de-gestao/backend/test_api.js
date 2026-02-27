import fs from "fs";

const EMAIL = "victor.picoli@nic-labs.com.br";
const PASSWORD = "picoli1234";
const SUPA_URL = "https://awbfibpmylkfkfqarclk.supabase.co";
const SUPA_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YmZpYnBteWxrZmtmcWFyY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzAwNDAsImV4cCI6MjA3OTg0NjA0MH0.jXBE-HnVJNAg2pPjlPu8THjnNfVnJADdlNEOvlyiUFU";
const START = "2026-01-01";
const END = "2026-01-31";

async function test() {
  console.log("==> 1) Pegando access_token via Supabase Auth...");
  const authRes = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "apikey": SUPA_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });

  const authData = await authRes.json();
  const token = authData.access_token;

  if (!token) {
    console.error("ERRO: Não consegui obter access_token.", authData);
    process.exit(1);
  }

  console.log("OK: token obtido (primeiros 20 chars):", token.substring(0, 20), "...");

  const headers = { "Authorization": `Bearer ${token}` };

  console.log("\n==> 2) Testando /preview");
  const prevRes = await fetch(`https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/preview?startDate=${START}&endDate=${END}`, { headers });
  console.log("Status:", prevRes.status);
  const prevData = await prevRes.json();
  console.log("Response (first 500 chars):", JSON.stringify(prevData).substring(0, 500));

  console.log("\n==> 3) Testando /excel (baixando relatorio.xlsx)");
  const excelRes = await fetch(`https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/excel?startDate=${START}&endDate=${END}`, { headers });
  if (excelRes.ok) {
    const buffer = await excelRes.arrayBuffer();
    fs.writeFileSync("relatorio.xlsx", Buffer.from(buffer));
    console.log("Arquivo relatorio.xlsx criado com sucesso.");
  } else {
    console.error("Erro ao baixar Excel:", excelRes.status);
  }

  console.log("\n==> 4) Testando /powerbi (JSON flat)");
  const pbiRes = await fetch(`https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/powerbi?startDate=${START}&endDate=${END}`, { headers });
  console.log("Status:", pbiRes.status);
  const pbiData = await pbiRes.json();
  console.log("Response (first 500 chars):", JSON.stringify(pbiData).substring(0, 500));

  console.log("\n==> 5) Salvando budget dos projetos (PUT /project-budgets)");
  const putRes = await fetch(`https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/project-budgets`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      budgets: [
        { id_projeto: 6, budget: 45000 },
        { id_projeto: 7, budget: 12500 }
      ]
    })
  });
  console.log("Status:", putRes.status);
  const putData = await putRes.json();
  console.log("Response:", putData);

  console.log("\n==> 6) Re-testando /preview");
  const prevRes2 = await fetch(`https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/preview?startDate=${START}&endDate=${END}`, { headers });
  const prevData2 = await prevRes2.json();
  console.log("Response (first 500 chars):", JSON.stringify(prevData2).substring(0, 500));

  console.log("\nFIM.");
}

test().catch(err => console.error("Erro no teste:", err));