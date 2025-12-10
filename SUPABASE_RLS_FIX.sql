-- SQL para habilitar acesso público às tabelas no Supabase
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)

-- 1. Desabilitar RLS em dim_clientes
ALTER TABLE dim_clientes DISABLE ROW LEVEL SECURITY;

-- 2. Desabilitar RLS em dim_colaboradores  
ALTER TABLE dim_colaboradores DISABLE ROW LEVEL SECURITY;

-- 3. Desabilitar RLS em dim_projetos
ALTER TABLE dim_projetos DISABLE ROW LEVEL SECURITY;

-- 4. Desabilitar RLS em fato_tarefas
ALTER TABLE fato_tarefas DISABLE ROW LEVEL SECURITY;

-- Se houver view fato_tarefas_view, não precisa de RLS
-- Basta que as tabelas base permitam acesso

-- Opcional: Se preferir manter RLS, crie políticas públicas:
-- ALTER TABLE dim_clientes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Acesso público" ON dim_clientes FOR SELECT USING (true);
-- CREATE POLICY "Acesso público" ON dim_colaboradores FOR SELECT USING (true);
-- CREATE POLICY "Acesso público" ON dim_projetos FOR SELECT USING (true);
-- CREATE POLICY "Acesso público" ON fato_tarefas FOR SELECT USING (true);
