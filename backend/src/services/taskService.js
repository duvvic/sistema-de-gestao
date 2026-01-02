const taskRepository = require('../repositories/taskRepository');

// Helper: Map status from frontend to database
const mapStatusToDb = (status) => {
    switch (status) {
        case 'Done': return 'Concluído';
        case 'In Progress': return 'Em Andamento';
        case 'Review': return 'Revisão';
        case 'Todo':
        default: return 'A Fazer';
    }
};

// Helper: Map priority from frontend to database
const mapPriorityToDb = (priority) => {
    if (!priority) return null;
    switch (priority) {
        case 'Critical': return 'Crítica';
        case 'High': return 'Alta';
        case 'Medium': return 'Média';
        case 'Low': return 'Baixa';
        default: return null;
    }
};

// Helper: Map impact from frontend to database
const mapImpactToDb = (impact) => {
    if (!impact) return null;
    switch (impact) {
        case 'High': return 'Alto';
        case 'Medium': return 'Médio';
        case 'Low': return 'Baixo';
        default: return null;
    }
};

const getAllTasks = async (filters) => {
    return await taskRepository.findAll(filters);
};

const getTaskById = async (id) => {
    return await taskRepository.findById(id);
};

const createTask = async (data) => {
    // Get collaborator ID if developer name is provided
    let collaboratorId = null;
    if (data.developer) {
        collaboratorId = await taskRepository.getCollaboratorIdByName(data.developer);
    } else if (data.developerId) {
        collaboratorId = data.developerId;
    }

    const payload = {
        Afazer: data.title || "(Sem título)",
        ID_Projeto: Number(data.projectId),
        ID_Cliente: Number(data.clientId),
        ID_Colaborador: collaboratorId,
        StatusTarefa: mapStatusToDb(data.status),
        entrega_estimada: data.estimatedDelivery || null,
        entrega_real: data.actualDelivery || null,
        inicio_previsto: data.scheduledStart || null,
        inicio_real: data.actualStart || null,
        Porcentagem: data.progress ?? 0,
        Prioridade: mapPriorityToDb(data.priority),
        Impacto: mapImpactToDb(data.impact),
        Riscos: data.risks || null,
        "Observações": data.notes || null,
        attachment: data.attachment || null,
        description: data.description || null,
    };

    return await taskRepository.create(payload);
};

const updateTask = async (id, data) => {
    const payload = {};

    if (data.title !== undefined) payload.Afazer = data.title;
    if (data.status !== undefined) payload.StatusTarefa = mapStatusToDb(data.status);
    if (data.estimatedDelivery !== undefined) payload.entrega_estimada = data.estimatedDelivery;
    if (data.actualDelivery !== undefined) payload.entrega_real = data.actualDelivery;
    if (data.scheduledStart !== undefined) payload.inicio_previsto = data.scheduledStart;
    if (data.actualStart !== undefined) payload.inicio_real = data.actualStart;
    if (data.progress !== undefined) payload.Porcentagem = data.progress;
    if (data.priority !== undefined) payload.Prioridade = mapPriorityToDb(data.priority);
    if (data.impact !== undefined) payload.Impacto = mapImpactToDb(data.impact);
    if (data.risks !== undefined) payload.Riscos = data.risks;
    if (data.notes !== undefined) payload["Observações"] = data.notes;
    if (data.attachment !== undefined) payload.attachment = data.attachment;
    if (data.description !== undefined) payload.description = data.description;

    // Handle developer update
    if (data.developer !== undefined) {
        payload.ID_Colaborador = await taskRepository.getCollaboratorIdByName(data.developer);
    } else if (data.developerId !== undefined) {
        payload.ID_Colaborador = data.developerId;
    }

    return await taskRepository.update(id, payload);
};

const deleteTask = async (id) => {
    return await taskRepository.remove(id);
};

module.exports = {
    getAllTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask
};
