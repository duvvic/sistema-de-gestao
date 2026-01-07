# BACKEND API - Arquitetura de Dados para Colaboradores

## 📋 Visão Geral

Este documento descreve a arquitetura backend implementada seguindo o padrão **Repository-Service-Controller** para buscar dados de colaboradores usando **SQL com JOINs** conforme as regras de negócio.

## 🏗️ Estrutura Criada

```
backend/src/
├── config/
│   └── db.js                      # Pool de conexão PostgreSQL
├── repositories/
│   └── developerRepository.js     # Queries SQL com JOINs
├── services/
│   └── developerService.js        # Lógica de negócio e transformação
├── controllers/
│   └── developerController.js     # Handlers HTTP
└── routes/
    └── developerRoutes.js         # Definição de rotas
```

## 🔄 Fluxo de Dados

```
Frontend (DeveloperProjects.tsx)
    ↓ HTTP GET /api/developer/clients
Routes (developerRoutes.js)
    ↓ Chama controller
Controller (developerController.js)
    ↓ Valida auth, chama service
Service (developerService.js)
    ↓ Transforma dados, chama repository
Repository (developerRepository.js)
    ↓ Executa SQL com JOINs
PostgreSQL Database
```

## 📡 Endpoints Criados

### 1. GET `/api/developer/clients`
**Descrição:** Retorna clientes vinculados ao colaborador logado

**SQL Executado:**
```sql
SELECT 
  cli."ID_Cliente" as id,
  cli."NomeCliente" as name,
  cli."NewLogo" as "logoUrl",
  COUNT(DISTINCT pro."ID_Projeto") as "projectCount"
FROM dim_clientes as cli
INNER JOIN dim_projetos as pro
  ON cli."ID_Cliente" = pro."ID_Cliente"
INNER JOIN project_members as pm
  ON pro."ID_Projeto" = pm.id_projeto
WHERE pm.id_colaborador = $1
  AND cli.ativo = true
GROUP BY cli."ID_Cliente", cli."NomeCliente", cli."NewLogo"
ORDER BY cli."NomeCliente"
```

**Resposta:**
```json
[
  {
    "id": "1",
    "name": "Cliente A",
    "logoUrl": "https://...",
    "projectCount": 3
  }
]
```

---

### 2. GET `/api/developer/clients/:clientId/projects`
**Descrição:** Retorna projetos de um cliente para o colaborador

**SQL Executado:**
```sql
SELECT 
  pro."ID_Projeto" as id,
  pro."NomeProjeto" as name,
  COUNT(DISTINCT t.id_tarefa_novo) FILTER (WHERE t."ID_Colaborador" = $2) as "taskCount",
  COUNT(DISTINCT t.id_tarefa_novo) FILTER (WHERE t."ID_Colaborador" = $2 AND t."StatusTarefa" = 'Concluído') as "completedTasks"
FROM dim_projetos as pro
INNER JOIN project_members as pm
  ON pro."ID_Projeto" = pm.id_projeto
LEFT JOIN fato_tarefas as t
  ON pro."ID_Projeto" = t."ID_Projeto"
WHERE pro."ID_Cliente" = $1
  AND pm.id_colaborador = $2
  AND pro.ativo = true
GROUP BY pro."ID_Projeto", ...
```

**Resposta:**
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

### 3. GET `/api/developer/projects/:projectId/tasks`
**Descrição:** Retorna tarefas de um projeto para o colaborador

**SQL Executado:**
```sql
SELECT 
  t.id_tarefa_novo as id,
  t."Afazer" as title,
  t."StatusTarefa" as status,
  t."Porcentagem" as progress,
  col."NomeColaborador" as developer
FROM fato_tarefas as t
LEFT JOIN dim_colaboradores as col
  ON t."ID_Colaborador" = col."ID_Colaborador"
WHERE t."ID_Projeto" = $1
  AND t."ID_Colaborador" = $2
ORDER BY ...
```

**Resposta:**
```json
[
  {
    "id": "100",
    "title": "Implementar login",
    "status": "In Progress",
    "progress": 50,
    "developer": "João Silva"
  }
]
```

---

### 4. GET `/api/developer/stats`
**Descrição:** Retorna estatísticas gerais do colaborador

**Resposta:**
```json
{
  "totalProjects": 8,
  "totalTasks": 25,
  "completedTasks": 15,
  "inProgressTasks": 7,
  "totalClients": 4
}
```

## 🔧 Como Integrar no Server

### 1. Criar/Atualizar `server.js`

```javascript
// backend/src/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const developerRoutes = require('./routes/developerRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// TODO: Adicionar middleware de autenticação aqui
// app.use('/api', authMiddleware);

// Rotas
app.use('/api/developer', developerRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
```

### 2. Atualizar `.env`

```env
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
```

### 3. Instalar Dependências

```bash
cd backend
npm install express cors pg dotenv
```

### 4. Rodar o Backend

```bash
cd backend
node src/server.js
```

## 🎯 Como Usar no Frontend

### Antes (❌ Errado - Filtrando no Frontend)

```typescript
// DeveloperProjects.tsx
const myProjects = useMemo(() => {
  return projects.filter(p => 
    myProjectIdsFromTasks.has(p.id) || myMemberProjectIds.has(p.id)
  );
}, [projects, ...]);
```

### Depois (✅ Correto - Backend retorna filtrado)

```typescript
// frontend/src/services/developerService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function fetchMyClients() {
  const response = await axios.get(`${API_URL}/developer/clients`);
  return response.data;
}

export async function fetchMyClientProjects(clientId: string) {
  const response = await axios.get(`${API_URL}/developer/clients/${clientId}/projects`);
  return response.data;
}

export async function fetchMyProjectTasks(projectId: string) {
  const response = await axios.get(`${API_URL}/developer/projects/${projectId}/tasks`);
  return response.data;
}

// DeveloperProjects.tsx
const [clients, setClients] = useState([]);

useEffect(() => {
  async function loadClients() {
    const data = await fetchMyClients();
    setClients(data);
  }
  loadClients();
}, []);
```

## ✅ Benefícios

1. **Performance**: Queries otimizadas com JOINs no banco
2. **Segurança**: Dados filtrados no backend (colaborador só vê o que pode)
3. **Manutenibilidade**: Lógica de negócio centralizada
4. **Escalabilidade**: Frontend leve, backend faz o trabalho pesado

## 📝 Próximos Passos

1. [ ] Implementar middleware de autenticação
2. [ ] Criar endpoints similares para Admin
3. [ ] Adicionar paginação nas queries
4. [ ] Implementar cache (Redis)
5. [ ] Adicionar testes unitários

---

**Criado em:** 2026-01-07  
**Padrão:** Repository-Service-Controller  
**Banco:** PostgreSQL com JOINs otimizados
