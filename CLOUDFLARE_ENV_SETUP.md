# Configuração de Variáveis de Ambiente - Cloudflare Pages

## Problema Atual
O frontend em produção está usando uma URL antiga do banco de dados (`4598d65.trycloudflare.com`) que já expirou.

## Solução

### 1. Acessar o Painel da Cloudflare Pages
1. Acesse: https://dash.cloudflare.com/
2. Vá em **Workers & Pages**
3. Selecione o projeto: **sistema-de-gestao-b58**

### 2. Configurar Variáveis de Ambiente
1. Clique em **Settings** (Configurações)
2. Vá em **Environment variables** (Variáveis de ambiente)
3. Clique em **Add variable** (Adicionar variável)

### 3. Adicionar VITE_API_URL

**Para Produção:**
- **Variable name:** `VITE_API_URL`
- **Value:** A URL do seu backend em produção
  - Se você usa ngrok/cloudflare tunnel: `https://SEU_TUNNEL_ATUAL.trycloudflare.com/api`
  - Se você tem um servidor fixo: `https://api.seudominio.com/api`
  - **IMPORTANTE:** A URL deve terminar com `/api`

**Para Preview (opcional):**
- Você pode configurar a mesma variável para o ambiente de Preview se necessário

### 4. Fazer Redeploy
Após adicionar a variável:
1. Vá em **Deployments**
2. Clique nos 3 pontos do último deployment
3. Selecione **Retry deployment** ou **Redeploy**

### 5. Verificar
Após o redeploy:
1. Abra o console do navegador (F12)
2. Procure por logs `[API] Usando URL...`
3. Verifique se está usando a URL correta

---

## Alternativa Temporária (Atualizar URL no Banco)

Se você quiser usar o sistema de URL dinâmica do banco:

```bash
# No backend, execute:
node backend/announce.js https://SEU_TUNNEL_ATUAL.trycloudflare.com
```

**Mas isso NÃO é recomendado** porque:
- Túneis expiram frequentemente
- Você teria que atualizar toda vez que o túnel mudar
- A variável de ambiente é mais confiável

---

## Recomendação Final

**Para Produção Estável:**
Configure um backend permanente (não use túneis temporários) e defina `VITE_API_URL` na Cloudflare Pages.

**Para Desenvolvimento:**
Use o sistema atual que busca do banco de dados.
