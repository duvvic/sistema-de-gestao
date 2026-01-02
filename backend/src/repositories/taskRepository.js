const db = require('../config/database');

const findAll = async (filters = {}) => {
    let query = 'SELECT * FROM fato_tarefas';
    const conditions = [];
    const values = [];

    if (filters.projectId) {
        values.push(filters.projectId);
        conditions.push(`"ID_Projeto" = $${values.length}`);
    }
    if (filters.clientId) {
        values.push(filters.clientId);
        conditions.push(`"ID_Cliente" = $${values.length}`);
    }
    if (filters.userId) {
        values.push(filters.userId);
        conditions.push(`"ID_Colaborador" = $${values.length}`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY "id_tarefa_novo" DESC';

    const result = await db.query(query, values);
    return result.rows;
};

const findById = async (id) => {
    const result = await db.query('SELECT * FROM fato_tarefas WHERE "id_tarefa_novo" = $1', [id]);
    return result.rows[0];
};

const create = async (taskData) => {
    const columns = Object.keys(taskData).map(k => `"${k}"`).join(', ');
    const placeholders = Object.keys(taskData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(taskData);

    const result = await db.query(
        `INSERT INTO fato_tarefas (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    );
    return result.rows[0];
};

const update = async (id, taskData) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(taskData)) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE fato_tarefas SET ${fields.join(', ')} WHERE "id_tarefa_novo" = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

const remove = async (id) => {
    await db.query('DELETE FROM fato_tarefas WHERE "id_tarefa_novo" = $1', [id]);
};

// Helper to get collaborator ID by name
const getCollaboratorIdByName = async (name) => {
    if (!name) return null;
    const result = await db.query(
        'SELECT "ID_Colaborador" FROM dim_colaboradores WHERE "NomeColaborador" = $1',
        [name]
    );
    return result.rows[0]?.ID_Colaborador || null;
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove,
    getCollaboratorIdByName
};
