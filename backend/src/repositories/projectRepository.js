const db = require('../config/database');

const findAll = async () => {
    const result = await db.query('SELECT * FROM dim_projetos ORDER BY "ID_Projeto" DESC');
    return result.rows;
};

const findById = async (id) => {
    const result = await db.query('SELECT * FROM dim_projetos WHERE "ID_Projeto" = $1', [id]);
    return result.rows[0];
};

const findByClientId = async (clientId) => {
    const result = await db.query('SELECT * FROM dim_projetos WHERE "ID_Cliente" = $1 ORDER BY "ID_Projeto" DESC', [clientId]);
    return result.rows;
};

const create = async (projectData) => {
    const { NomeProjeto, ID_Cliente, StatusProjeto, ativo, budget, description, estimatedDelivery, manager, startDate } = projectData;
    const result = await db.query(
        `INSERT INTO dim_projetos ("NomeProjeto", "ID_Cliente", "StatusProjeto", "ativo", "budget", "description", "estimatedDelivery", "manager", "startDate")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
        [NomeProjeto, ID_Cliente, StatusProjeto, ativo, budget, description, estimatedDelivery, manager, startDate]
    );
    return result.rows[0];
};

const update = async (id, projectData) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(projectData)) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE dim_projetos SET ${fields.join(', ')} WHERE "ID_Projeto" = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

const softDelete = async (id) => {
    const result = await db.query(
        'UPDATE dim_projetos SET "ativo" = $1 WHERE "ID_Projeto" = $2 RETURNING *',
        [false, id]
    );
    return result.rows[0];
};

const hardDelete = async (id) => {
    await db.query('DELETE FROM dim_projetos WHERE "ID_Projeto" = $1', [id]);
};

module.exports = {
    findAll,
    findById,
    findByClientId,
    create,
    update,
    softDelete,
    hardDelete
};
