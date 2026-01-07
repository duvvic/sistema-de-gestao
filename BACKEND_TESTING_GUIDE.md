# 🎯 TESTE COMPLETO DO BACKEND - PASSO A PASSO

## ✅ CHECKLIST PRÉ-TESTE

- [ ] PostgreSQL rodando
- [ ] Credenciais configuradas no `backend/.env`
- [ ] Dependências instaladas (`npm install`)

---

## 🚀 PASSO 1: Rodar o Backend

```bash
cd backend
npm run dev
```

**Saída esperada:**
```
🚀 ================================================
   Backend API rodando na porta 3001
   ================================================

   📡 Endpoints disponíveis:
   GET  http://localhost:3001/health
   GET  http://localhost:3001/api/developer/clients
   ...
```

---

## 🧪 PASSO 2: Testar Health Check

**Terminal:**
```bash
curl http://localhost:3001/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T...",
  "uptime": 5.123
}
```

✅ Se funcionou: Backend está rodando!  
❌ Se deu erro: Verifique se a porta 3001 está livre

---

## 🔍 PASSO 3: Testar Endpoint de Clientes

### 3.1 Descobrir seu ID de Colaborador

**SQL no PostgreSQL:**
```sql
SELECT "ID_Colaborador", "NomeColaborador" 
FROM dim_colaboradores 
WHERE ativo = true
LIMIT 5;
```

Anote o `ID_Colaborador` (ex: 28)

### 3.2 Testar Endpoint

**Terminal (substitua 28 pelo seu ID):**
```bash
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/clients
```

**Resposta esperada:**
```json
[
  {
    "id": "1",
    "name": "Nome do Cliente",
    "logoUrl": "https://...",
    "projectCount": 3
  }
]
```

✅ **Sucesso:** Você verá a lista de clientes vinculados ao colaborador  
❌ **Array vazio `[]`:** Colaborador não tem projetos vinculados (normal se for novo)  
❌ **Erro 401:** Faltou o header `X-User-Id`  
❌ **Erro 500:** Problema no banco (veja logs do servidor)

---

## 📊 PASSO 4: Testar Endpoint de Projetos

**Pegar ID de um cliente da resposta anterior (ex: "1"):**

```bash
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/clients/1/projects
```

**Resposta esperada:**
```json
[
  {
    "id": "10",
    "name": "Projeto X",
    "clientId": "1",
    "taskCount": 5,
    "completedTasks": 2
  }
]
```

---

## 📝 PASSO 5: Testar Endpoint de Tarefas

**Pegar ID de um projeto da resposta anterior (ex: "10"):**

```bash
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/projects/10/tasks
```

**Resposta esperada:**
```json
[
  {
    "id": "100",
    "title": "Implementar login",
    "status": "In Progress",
    "progress": 50,
    "developer": "Seu Nome"
  }
]
```

---

## 📈 PASSO 6: Testar Endpoint de Estatísticas

```bash
curl -H "X-User-Id: 28" \
     http://localhost:3001/api/developer/stats
```

**Resposta esperada:**
```json
{
  "totalProjects": 8,
  "totalTasks": 25,
  "completedTasks": 15,
  "inProgressTasks": 7,
  "totalClients": 4
}
```

---

## 🎨 TESTE VISUAL (Postman/Insomnia)

### Configuração

1. **Criar nova requisição GET**
2. **URL:** `http://localhost:3001/api/developer/clients`
3. **Headers:**
   ```
   X-User-Id: 28
   X-User-Role: developer
   ```
4. **Send**

### Teste Rápido de Todos os Endpoints

| Método | URL | Headers | Descrição |
|--------|-----|---------|-----------|
| GET | `/health` | - | Health check |
| GET | `/api/developer/clients` | `X-User-Id: 28` | Clientes |
| GET | `/api/developer/clients/1/projects` | `X-User-Id: 28` | Projetos |
| GET | `/api/developer/projects/10/tasks` | `X-User-Id: 28` | Tarefas |
| GET | `/api/developer/stats` | `X-User-Id: 28` | Estatísticas |

---

## 🐛 TROUBLESHOOTING

### Erro: "Cannot find module 'express'"
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Connection refused" (PostgreSQL)
```bash
# Testar conexão direta
psql -U seu_usuario -d seu_banco -h localhost

# Se não conectar, verifique:
# 1. PostgreSQL está rodando?
# 2. Credenciais no .env estão corretas?
# 3. Firewall bloqueando porta 5432?
```

### Erro: "relation does not exist"
- Verifique se as tabelas existem no banco
- Rode as migrations/seeds se necessário

### Array vazio `[]` mas esperava dados
```sql
-- Verificar se colaborador tem projetos vinculados
SELECT * FROM project_members WHERE id_colaborador = 28;

-- Se vazio, adicionar manualmente:
INSERT INTO project_members (id_projeto, id_colaborador)
VALUES (1, 28);
```

---

## ✅ CHECKLIST FINAL

- [ ] Health check retorna `{"status": "ok"}`
- [ ] Endpoint de clientes retorna dados ou array vazio
- [ ] Endpoint de projetos funciona
- [ ] Endpoint de tarefas funciona
- [ ] Endpoint de stats retorna números
- [ ] Logs do servidor aparecem no terminal
- [ ] Nenhum erro 500 nos logs

---

## 🎯 PRÓXIMO PASSO

Depois de confirmar que o backend funciona, integre no frontend:

1. Criar `frontend/src/services/developerApi.ts`
2. Substituir filtros locais por chamadas HTTP
3. Adicionar loading states
4. Tratar erros

**Ver:** `BACKEND_API_DOCS.md` seção "Como Usar no Frontend"
