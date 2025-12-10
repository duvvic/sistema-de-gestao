# Diagnóstico e Solução: Dados Não Carregam do Banco

## 🔍 Problema Identificado

O aplicativo está conectado ao Supabase, mas não consegue trazer dados das tabelas. As razões mais comuns são:

1. **Row Level Security (RLS) está ativada e muito restritiva**
2. **Nomes de colunas incorretos** 
3. **Tabelas não existem**
4. **Permissões insuficientes**

## ✅ Como Resolver

### Passo 1: Verificar RLS no Supabase

1. Acesse seu projeto em https://app.supabase.com
2. Vá para **Authentication > Policies**
3. Procure pelas tabelas:
   - `dim_clientes`
   - `dim_colaboradores`
   - `dim_projetos`
   - `fato_tarefas`

Se as políticas estão muito restritivas (ex: exigem autenticação para SELECT), desabilite-as.

### Passo 2: Desabilitar RLS (Solução Rápida)

1. No Supabase, vá para **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo do arquivo `SUPABASE_RLS_FIX.sql` 
4. Clique em **Run**

Isso desabilitará Row Level Security em todas as tabelas, permitindo acesso público.

### Passo 3: Verificar Nomes de Colunas

Se o RLS já estava desabilitado, o problema pode ser nomes de colunas incorretos.

Execute esta query no SQL Editor do Supabase:

```sql
-- Verificar colunas de cada tabela
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'dim_clientes' 
ORDER BY column_name;

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'dim_colaboradores' 
ORDER BY column_name;

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'dim_projetos' 
ORDER BY column_name;

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'fato_tarefas' 
ORDER BY column_name;
```

Se os nomes forem diferentes dos esperados (ex: `Nome` em vez de `NomeCliente`), você precisará:
- Atualizar a query no arquivo `services/api.ts`, OU
- Renomear as colunas no banco

### Passo 4: Verificar Dados no Banco

No SQL Editor do Supabase, execute:

```sql
SELECT COUNT(*) as total FROM dim_clientes;
SELECT COUNT(*) as total FROM dim_colaboradores;
SELECT COUNT(*) as total FROM dim_projetos;
SELECT COUNT(*) as total FROM fato_tarefas;
```

Se todos retornarem 0, o banco está vazio e é por isso que não aparecem dados.

## 🔧 Logs de Debug

O código foi atualizado com logs melhores. Abra o console do navegador (F12) e veja:

- `🔄 Iniciando carregamento do Supabase...` - começa a carregar
- `📥 Buscando clientes...` - tenta buscar clientes
- `✅ X clientes encontrados` - sucesso
- `❌ Erro ao buscar clientes: ...` - erro detalhado

Se vir mensagens de erro, copie-as e compartilhe.

## 📝 Verificação Rápida

Após aplicar as correções, acesse http://localhost:3001 e:

1. Abra DevTools (F12)
2. Vá para a aba **Console**
3. Procure por mensagens que começam com `📥` ou `✅`
4. Se vir `✅`, os dados foram carregados!

## 🆘 Se Ainda Não Funcionar

Compartilhe:
1. As mensagens de erro do console (F12 → Console)
2. A saída da query de contagem do banco
3. Os nomes reais das colunas da sua tabela
