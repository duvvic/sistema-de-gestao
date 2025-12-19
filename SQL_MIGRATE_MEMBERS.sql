-- CORREÇÃO: A tabela de tarefas correta é 'fato_tarefas' e não 'dim_tarefas'.

INSERT INTO project_members (id_projeto, id_colaborador)
SELECT DISTINCT "ID_Projeto", "ID_Colaborador"
FROM fato_tarefas
WHERE "ID_Colaborador" IS NOT NULL 
  AND "ID_Projeto" IS NOT NULL
ON CONFLICT (id_projeto, id_colaborador) DO NOTHING;

-- Verifique se os dados foram inseridos
SELECT * FROM project_members;
