const db = require('../config/database');

const findAll = async () => {
    const result = await db.query('SELECT * FROM dim_clientes ORDER BY "ID_Cliente" DESC');
    return result.rows;
};

const findById = async (id) => {
    const result = await db.query('SELECT * FROM dim_clientes WHERE "ID_Cliente" = $1', [id]);
    return result.rows[0];
};

const create = async (clientData) => {
    const { NomeCliente, NewLogo, ativo, Criado, Contrato } = clientData;
    const result = await db.query(
        `INSERT INTO dim_clientes ("NomeCliente", "NewLogo", "ativo", "Criado", "Contrato")
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [NomeCliente, NewLogo, ativo, Criado, Contrato]
    );
    return result.rows[0];
};

const update = async (id, clientData) => {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(clientData)) {
        fields.push(`"${key}" = $${idx}`);
        values.push(value);
        idx++;
    }

    if (fields.length === 0) return null;

    values.push(id);
    const result = await db.query(
        `UPDATE dim_clientes SET ${fields.join(', ')} WHERE "ID_Cliente" = $${idx} RETURNING *`,
        values
    );
    return result.rows[0];
};

const softDelete = async (id) => {
    const result = await db.query(
        'UPDATE dim_clientes SET "ativo" = $1 WHERE "ID_Cliente" = $2 RETURNING *',
        [false, id]
    );
    return result.rows[0];
};

const hardDelete = async (id) => {
    await db.query('DELETE FROM dim_clientes WHERE "ID_Cliente" = $1', [id]);
};

module.exports = {
    findAll,
    findById,
    create,
    update,
    softDelete,
    hardDelete
};
