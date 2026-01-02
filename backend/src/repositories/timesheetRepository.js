const db = require('../config/database');

const findAll = async (filters = {}) => {
    let query = `SELECT ht.*, dc."NomeColaborador" 
               FROM horas_trabalhadas ht 
               LEFT JOIN dim_colaboradores dc ON ht."ID_Colaborador" = dc."ID_Colaborador"`;
    const conditions = [];
    const values = [];

    if (filters.userId) {
        values.push(filters.userId);
        conditions.push(`ht."ID_Colaborador" = $${values.length}`);
    }
    if (filters.fromDate) {
        values.push(filters.fromDate);
        conditions.push(`ht."Data" >= $${values.length}`);
    }
    if (filters.toDate) {
        values.push(filters.toDate);
        conditions.push(`ht."Data" <= $${values.length}`);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ht."Data" DESC';

    const result = await db.query(query, values);
    return result.rows;
};

const findById = async (id) => {
    const result = await db.query(
        `SELECT ht.*, dc."NomeColaborador" 
     FROM horas_trabalhadas ht 
     LEFT JOIN dim_colaboradores dc ON ht."ID_Colaborador" = dc."ID_Colaborador"
     WHERE ht."ID_Horas_Trabalhadas" = $1`,
        [id]
    );
    return result.rows[0];
};

const create = async (timesheetData) => {
    const columns = Object.keys(timesheetData).map(k => `"${k}"`).join(', ');
    const placeholders = Object.keys(timesheetData).map((_, i) => `$${i + 1}`).join(', ');
    const values = Object.values(timesheetData);

    const result = await db.query(
        `INSERT INTO horas_trabalhadas (${columns}) VALUES (${placeholders}) RETURNING *`,
        values
    );
    return result.rows[0];
};

const update = async (id, timesheetData) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(timesheetData)) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE horas_trabalhadas SET ${fields.join(', ')} WHERE "ID_Horas_Trabalhadas" = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

const remove = async (id) => {
    await db.query('DELETE FROM horas_trabalhadas WHERE "ID_Horas_Trabalhadas" = $1', [id]);
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    remove
};
