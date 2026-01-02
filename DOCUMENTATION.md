# Documentação Técnica - Sistema de Gestão (V2)

Este documento fornece as instruções necessárias para configurar o banco de dados PostgreSQL, entender a arquitetura do sistema e realizar manutenções.

---

## 1. Configuração do PostgreSQL

### Schema das Tabelas
Execute os comandos SQL abaixo no seu banco de dados PostgreSQL para criar a estrutura necessária:

```sql
-- 1. Tabela de Colaboradores
CREATE TABLE dim_colaboradores (
    "ID_Colaborador" SERIAL PRIMARY KEY,
    "NomeColaborador" TEXT NOT NULL,
    "E-mail" TEXT UNIQUE NOT NULL,
    "Cargo" TEXT,
    "avatar_url" TEXT,
    "papel" TEXT DEFAULT 'Padrão', -- 'Administrador' ou 'Padrão'
    "ativo" BOOLEAN DEFAULT TRUE
);

-- 2. Tabela de Clientes
CREATE TABLE dim_clientes (
    "ID_Cliente" SERIAL PRIMARY KEY,
    "NomeCliente" TEXT NOT NULL,
    "NewLogo" TEXT,
    "ativo" BOOLEAN DEFAULT TRUE,
    "Criado" DATE,
    "Contrato" DATE
);

-- 3. Tabela de Projetos
CREATE TABLE dim_projetos (
    "ID_Projeto" SERIAL PRIMARY KEY,
    "NomeProjeto" TEXT NOT NULL,
    "ID_Cliente" INTEGER REFERENCES dim_clientes("ID_Cliente"),
    "StatusProjeto" TEXT,
    "ativo" BOOLEAN DEFAULT TRUE,
    "budget" DECIMAL(10,2),
    "description" TEXT,
    "estimatedDelivery" DATE,
    "manager" TEXT,
    "startDate" DATE
);

-- 4. Tabela de Tarefas
CREATE TABLE fato_tarefas (
    "id_tarefa_novo" SERIAL PRIMARY KEY,
    "Afazer" TEXT NOT NULL,
    "ID_Projeto" INTEGER REFERENCES dim_projetos("ID_Projeto"),
    "ID_Cliente" INTEGER REFERENCES dim_clientes("ID_Cliente"),
    "ID_Colaborador" INTEGER REFERENCES dim_colaboradores("ID_Colaborador"),
    "StatusTarefa" TEXT,
    "entrega_estimada" DATE,
    "entrega_real" DATE,
    "inicio_previsto" DATE,
    "inicio_real" DATE,
    "Porcentagem" INTEGER DEFAULT 0,
    "Prioridade" TEXT,
    "Impacto" TEXT,
    "Riscos" TEXT,
    "Observações" TEXT,
    "attachment" TEXT,
    "description" TEXT
);

-- 5. Tabela de Horas Trabalhadas (Timesheet)
CREATE TABLE horas_trabalhadas (
    "ID_Horas_Trabalhadas" SERIAL PRIMARY KEY,
    "ID_Colaborador" INTEGER REFERENCES dim_colaboradores("ID_Colaborador"),
    "ID_Cliente" INTEGER REFERENCES dim_clientes("ID_Cliente"),
    "ID_Projeto" INTEGER REFERENCES dim_projetos("ID_Projeto"),
    "id_tarefa_novo" INTEGER REFERENCES fato_tarefas("id_tarefa_novo"),
    "Data" DATE NOT NULL,
    "Hora_Inicio" TIME,
    "Hora_Fim" TIME,
    "Horas_Trabalhadas" DECIMAL(5,2),
    "Descricao" TEXT,
    "Almoco_Deduzido" BOOLEAN DEFAULT FALSE
);
```

---

## 2. Mapa de Manutenção (Arquitetura)

O sistema segue o padrão **Controller -> Service -> Repository**.

| Camada | Localização | Função | O que mexer? |
| :--- | :--- | :--- | :--- |
| **Controller** | `backend/src/controllers/` | Lida com requisições HTTP e respostas. | Mude aqui para alterar o formato de resposta ou status codes. |
| **Service** | `backend/src/services/` | Contém as regras de negócio (cálculos, mapeamentos). | Mude aqui para alterar a lógica de como os dados são processados. |
| **Repository** | `backend/src/repositories/` | Executa SQL bruto no banco de dados. | Mude aqui se alterar o nome de colunas ou tabelas no PostgreSQL. |
| **Routes** | `backend/src/routes/` | Define os endpoints (URL). | Adicione novas URLs de API aqui. |
| **Frontend API** | `frontend/src/services/api.ts` | Central de chamadas Axios. | Mude aqui para alterar como o front chama o back. |

---

## 3. Segurança e Melhorias Próximas

### Segurança
1.  **Validação de Input**: Atualmente, o backend confia no `req.body`. Recomendado adicionar o pacote `joi` ou `zod` nos Controllers para validar dados antes de processar.
2.  **JWT Secret**: Garanta que o token do Supabase está sendo validado corretamente no `authMiddleware.js`.
3.  **CORS**: No `app.js`, configure o CORS para permitir apenas o domínio oficial do seu frontend quando for para produção.

### Bugs e Performance
1.  **Conexões do Pool**: O `pg.Pool` é eficiente, mas certifique-se de não deixar queries abertas.
2.  **Soft Delete**: Implementamos soft delete (campo `ativo: false`) para Clientes e Projetos. Certifique-se de que os filtros nos Repositories sempre chequem essa coluna se necessário.
3.  **Error Handling**: Criar um middleware global de erros no backend para evitar que o servidor caia em caso de erro não tratado.

---

## 4. Guia de Configuração (Variáveis de Ambiente)

O sistema utiliza dois conjuntos de variáveis de ambiente. Siga as instruções abaixo para preenchê-los corretamente.

### 4.1. Backend (`backend/.env`)
Crie o arquivo `backend/.env` e preencha:

```env
PORT=3000
# URL de conexão do PostgreSQL (Exemplo: Supabase ou Local)
# Formato: postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_URL=postgresql://postgres:suasenha@db.seuhost.com:5432/postgres

# Credenciais do Supabase (Necessário para validar o Login)
SUPABASE_URL=https://seuid.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
```

### 4.2. Frontend (`frontend/.env.local`)
Crie o arquivo `frontend/.env.local` e preencha:

```env
# URL do Backend (API)
VITE_API_URL=http://localhost:3000/api

# Credenciais do Supabase (Para o formulário de Login)
VITE_SUPABASE_URL=https://seuid.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

---

## 5. Guia de Inicialização Rápida

### Passo 1: Banco de Dados
Crie seu banco de dados PostgreSQL e execute **todo o conteúdo SQL da Seção 1** desta documentação. Isso criará as 5 tabelas necessárias.

### Passo 2: Instalação
Abra um terminal na pasta raiz do projeto (`sistema-de-gest-o/`) e execute:
```bash
npm run install-all
```
*Este comando instalará as dependências da raiz, do backend e do frontend automaticamente.*

### Passo 3: Rodar o Sistema
Ainda na pasta raiz, execute:
```bash
npm run dev
```

---

## 6. Pontos de Atenção e Manutenção

1.  **Sincronização**: O sistema agora é independente. Se você deletar um usuário no Supabase Auth, ele ainda existirá na tabela `dim_colaboradores` do PostgreSQL até que você o desative manualmente.
2.  **CORS**: O backend está configurado para aceitar requisições de qualquer origem por padrão. Para produção, altere o `app.js` para restringir ao domínio do frontend.
3.  **Mapeamento de Tipos**: Se adicionar uma nova coluna no banco, lembre-se de atualizar o `types.ts` no frontend e o mapeamento no `api.ts`.
