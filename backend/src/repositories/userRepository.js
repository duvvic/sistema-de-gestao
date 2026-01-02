const db = require('../config/database');

const findAll = async () => {
    const result = await db.query('SELECT * FROM dim_colaboradores ORDER BY "ID_Colaborador" DESC');
    return result.rows;
};

const findById = async (id) => {
    const result = await db.query('SELECT * FROM dim_colaboradores WHERE "ID_Colaborador" = $1', [id]);
    return result.rows[0];
};

const findByEmail = async (email) => {
    const result = await db.query('SELECT * FROM dim_colaboradores WHERE "E-mail" = $1', [email]);
    return result.rows[0];
};

const create = async (userData) => {
    const columns = Object.keys(userData).map(k => `"${k}"`).join(', ');
    const placeholders = Object.keys(userData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(userData);

    const result = await db.query(
        `INSERT INTO dim_colaboradores (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    );
    return result.rows[0];
};

const update = async (id, userData) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(userData)) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE dim_colaboradores SET ${fields.join(', ')} WHERE "ID_Colaborador" = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

const deactivate = async (id) => {
    const result = await db.query(
        'UPDATE dim_colaboradores SET "ativo" = $1 WHERE "ID_Colaborador" = $2 RETURNING *',
        [false, id]
    );
    return result.rows[0];
};

module.exports = {
    findAll,
    findById,
    findByEmail,
    create,
    update,
    deactivate
};
