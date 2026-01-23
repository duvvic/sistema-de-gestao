-- Sincronizar sequências das tabelas principais
-- Isso resolve erros de 409 (Conflict) no insert quando IDs manuais causam dessincronia no contador automático.

SELECT setval('public."dim_projetos_ID_Projeto_seq"', (SELECT MAX("ID_Projeto") FROM public.dim_projetos));
SELECT setval('public."dim_clientes_ID_Cliente_seq"', (SELECT MAX("ID_Cliente") FROM public.dim_clientes));
SELECT setval('public."dim_colaboradores_ID_Colaborador_seq"', (SELECT MAX("ID_Colaborador") FROM public.dim_colaboradores));
SELECT setval('public.fato_tarefas_id_tarefa_novo_seq', (SELECT MAX(id_tarefa_novo) FROM public.fato_tarefas));
