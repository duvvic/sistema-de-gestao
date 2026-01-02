const userRepository = require('../repositories/userRepository');

const getAllUsers = async () => {
    return await userRepository.findAll();
};

const getUserById = async (id) => {
    return await userRepository.findById(id);
};

const getUserByEmail = async (email) => {
    return await userRepository.findByEmail(email);
};

const createUser = async (data) => {
    const payload = {
        NomeColaborador: data.name || "(Sem nome)",
        "E-mail": data.email,
        Cargo: data.cargo || null,
        avatar_url: data.avatarUrl || null,
        papel: data.role === 'admin' ? 'Administrador' : 'Padrão',
        ativo: true
    };

    return await userRepository.create(payload);
};

const updateUser = async (id, data) => {
    const payload = {};

    if (data.name !== undefined) payload.NomeColaborador = data.name;
    if (data.email !== undefined) payload["E-mail"] = data.email;
    if (data.cargo !== undefined) payload.Cargo = data.cargo;
    if (data.avatarUrl !== undefined) payload.avatar_url = data.avatarUrl;
    if (data.role !== undefined) payload.papel = data.role === 'admin' ? 'Administrador' : 'Padrão';
    if (data.active !== undefined) payload.ativo = data.active;

    return await userRepository.update(id, payload);
};

const deactivateUser = async (id) => {
    return await userRepository.deactivate(id);
};

module.exports = {
    getAllUsers,
    getUserById,
    getUserByEmail,
    createUser,
    updateUser,
    deactivateUser
};
