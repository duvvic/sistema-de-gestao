// backend/src/repositories/developerRepository.js
const db = require('../config/db');

/**
 * Busca clientes vinculados a um colaborador específico
 * Baseado no exemplo SQL fornecido
 */
async function getClientsByDeveloper(developerId) {
    const query = `
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
  `;

    const result = await db.query(query, [developerId]);
    return result.rows;
}

/**
 * Busca projetos de um cliente específico para um colaborador
 */
async function getClientProjectsByDeveloper(clientId, developerId) {
    const query = `
    SELECT 
      pro."ID_Projeto" as id,
      pro."NomeProjeto" as name,
      pro."ID_Cliente" as "clientId",
      pro."StatusProjeto" as status,
      pro.description,
      pro.budget,
      pro."estimatedDelivery",
      pro.manager,
      pro."startDate",
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
    GROUP BY pro."ID_Projeto", pro."NomeProjeto", pro."ID_Cliente", 
             pro."StatusProjeto", pro.description, pro.budget,
             pro."estimatedDelivery", pro.manager, pro."startDate"
    ORDER BY pro."NomeProjeto"
  `;

    const result = await db.query(query, [clientId, developerId]);
    return result.rows;
}

/**
 * Busca tarefas de um projeto específico para um colaborador
 */
async function getProjectTasksByDeveloper(projectId, developerId) {
    const query = `
    SELECT 
      t.id_tarefa_novo as id,
      t."Afazer" as title,
      t."ID_Projeto" as "projectId",
      t."ID_Cliente" as "clientId",
      t."ID_Colaborador" as "developerId",
      t."StatusTarefa" as status,
      t."Porcentagem" as progress,
      t."Prioridade" as priority,
      t."Impacto" as impact,
      t."Riscos" as risks,
      t."Observações" as notes,
      t.description,
      t.attachment,
      t.entrega_estimada as "estimatedDelivery",
      t.entrega_real as "actualDelivery",
      t.inicio_previsto as "scheduledStart",
      t.inicio_real as "actualStart",
      col."NomeColaborador" as developer
    FROM fato_tarefas as t
    LEFT JOIN dim_colaboradores as col
      ON t."ID_Colaborador" = col."ID_Colaborador"
    WHERE t."ID_Projeto" = $1
      AND t."ID_Colaborador" = $2
    ORDER BY 
      CASE t."StatusTarefa"
        WHEN 'A Fazer' THEN 1
        WHEN 'Em Andamento' THEN 2
        WHEN 'Revisão' THEN 3
        WHEN 'Concluído' THEN 4
        ELSE 5
      END,
      t.id_tarefa_novo DESC
  `;

    const result = await db.query(query, [projectId, developerId]);
    return result.rows;
}

/**
 * Busca estatísticas gerais do colaborador
 */
async function getDeveloperStats(developerId) {
    const query = `
    SELECT 
      COUNT(DISTINCT pm.id_projeto) as "totalProjects",
      COUNT(DISTINCT t.id_tarefa_novo) as "totalTasks",
      COUNT(DISTINCT t.id_tarefa_novo) FILTER (WHERE t."StatusTarefa" = 'Concluído') as "completedTasks",
      COUNT(DISTINCT t.id_tarefa_novo) FILTER (WHERE t."StatusTarefa" = 'Em Andamento') as "inProgressTasks",
      COUNT(DISTINCT cli."ID_Cliente") as "totalClients"
    FROM project_members as pm
    LEFT JOIN fato_tarefas as t
      ON pm.id_projeto = t."ID_Projeto" AND t."ID_Colaborador" = $1
    LEFT JOIN dim_projetos as pro
      ON pm.id_projeto = pro."ID_Projeto"
    LEFT JOIN dim_clientes as cli
      ON pro."ID_Cliente" = cli."ID_Cliente"
    WHERE pm.id_colaborador = $1
  `;

    const result = await db.query(query, [developerId]);
    return result.rows[0] || {
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        totalClients: 0
    };
}

module.exports = {
    getClientsByDeveloper,
    getClientProjectsByDeveloper,
    getProjectTasksByDeveloper,
    getDeveloperStats
};
