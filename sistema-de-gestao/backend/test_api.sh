set -e
EMAIL="victor.picoli@nic-labs.com.br"
PASSWORD="picoli1234"
SUPA_URL="https://awbfibpmylkfkfqarclk.supabase.co"
SUPA_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YmZpYnBteWxrZmtmcWFyY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzAwNDAsImV4cCI6MjA3OTg0NjA0MH0.jXBE-HnVJNAg2pPjlPu8THjnNfVnJADdlNEOvlyiUFU"
START="2026-01-01"
END="2026-01-31"

echo "==> 1) Pegando access_token via Supabase Auth..."
TOKEN=$(curl -sS "$SUPA_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | \
  python3 -c "import sys,json; print(json.load(sys.stdin).get(\"access_token\",\"\"))")

if [ -z "$TOKEN" ]; then
  echo "ERRO: Não consegui obter access_token. Confira EMAIL/PASSWORD e se o usuário existe no Supabase Auth."
  exit 1
fi

echo "OK: token obtido (primeiros 20 chars): ${TOKEN:0:20}..."

echo ""
echo "==> 2) Testando /preview"
curl -i -sS \
  -H "Authorization: Bearer $TOKEN" \
  "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/preview?startDate=$START&endDate=$END" | head -n 40

echo ""
echo "==> 3) Testando /excel (baixando relatorio.xlsx)"
curl -L -sS \
  -H "Authorization: Bearer $TOKEN" \
  "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/excel?startDate=$START&endDate=$END" \
  -o relatorio.xlsx
ls -lh relatorio.xlsx || true

echo ""
echo "==> 4) Testando /powerbi (JSON flat)"
curl -sS \
  -H "Authorization: Bearer $TOKEN" \
  "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/powerbi?startDate=$START&endDate=$END" | head -n 40

echo ""
echo "==> 5) Salvando budget dos projetos (PUT /project-budgets)"
curl -i -sS -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"budgets\":[{\"id_projeto\":6,\"budget\":45000},{\"id_projeto\":7,\"budget\":12500}]}" \
  "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/project-budgets" | head -n 60

echo ""
echo "==> 6) Re-testando /preview (pra conferir budget/valor_hora/valor_rateado)"
curl -i -sS \
  -H "Authorization: Bearer $TOKEN" \
  "https://argilliferous-ingenuous-janiyah.ngrok-free.dev//api/admin/report/preview?startDate=$START&endDate=$END" | head -n 60

echo ""
echo "FIM. Se der 401: token inválido. Se der 403: usuário não é admin/ativo ou não mapeou no dim_colaboradores."