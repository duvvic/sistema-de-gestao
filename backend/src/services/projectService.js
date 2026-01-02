const projectRepository = require('../repositories/projectRepository');

const getAllProjects = async () => {
    return await projectRepository.findAll();
};

const getProjectsByClient = async (clientId) => {
    return await projectRepository.findByClientId(clientId);
};

const createProject = async (data) => {
    const payload = {
        NomeProjeto: data.name || "(Sem nome)",
        ID_Cliente: Number(data.clientId),
        StatusProjeto: data.status || "Em andamento",
        ativo: true,
        budget: data.budget || null,
        description: data.description || null,
        estimatedDelivery: data.estimatedDelivery || null,
        manager: data.manager || null,
        startDate: data.startDate || null,
    };

    return await projectRepository.create(payload);
};

const updateProject = async (id, data) => {
    const payload = {};
    if (data.name !== undefined) payload.NomeProjeto = data.name;
    if (data.clientId !== undefined) payload.ID_Cliente = Number(data.clientId);
    if (data.status !== undefined) payload.StatusProjeto = data.status;
    if (data.budget !== undefined) payload.budget = data.budget;
    if (data.description !== undefined) payload.description = data.description;
    if (data.estimatedDelivery !== undefined) payload.estimatedDelivery = data.estimatedDelivery;
    if (data.manager !== undefined) payload.manager = data.manager;
    if (data.startDate !== undefined) payload.startDate = data.startDate;

    return await projectRepository.update(id, payload);
};

const deleteProject = async (id, hard = false) => {
    if (hard) {
        return await projectRepository.hardDelete(id);
    }
    return await projectRepository.softDelete(id);
};

module.exports = {
    getAllProjects,
    getProjectsByClient,
    createProject,
    updateProject,
    deleteProject
};
