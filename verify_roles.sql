-- Script de verificação: Mostra o papel atual de todos os usuários
-- Execute este script para verificar se os papéis foram atualizados corretamente

SELECT 
    "ID_Colaborador",
    "NomeColaborador",
    "E-mail",
    papel,
    "Cargo",
    ativo,
    CASE 
        WHEN papel = 'Administrador' THEN '✅ Admin (correto)'
        WHEN papel = 'Padrão' THEN '✅ Developer (correto)'
        WHEN papel IS NULL OR papel = '' OR papel = 'EMPTY' THEN '❌ VAZIO - PRECISA ATUALIZAR!'
        ELSE '⚠️ Valor inesperado: ' || papel
    END as status_papel
FROM dim_colaboradores
WHERE ativo = true OR ativo IS NULL
ORDER BY 
    CASE papel 
        WHEN 'Administrador' THEN 1 
        WHEN 'Padrão' THEN 2
        ELSE 3 
    END,
    "NomeColaborador";

-- Se algum usuário aparecer com status "❌ VAZIO" ou "⚠️ Valor inesperado",
-- execute o script fix_user_roles.sql para corrigir
