const timesheetRepository = require('../repositories/timesheetRepository');

const getAllTimesheets = async (filters) => {
    return await timesheetRepository.findAll(filters);
};

const getTimesheetById = async (id) => {
    return await timesheetRepository.findById(id);
};

const createTimesheet = async (data) => {
    const payload = {
        ID_Colaborador: Number(data.userId || data.ID_Colaborador),
        ID_Cliente: Number(data.clientId || data.ID_Cliente),
        ID_Projeto: Number(data.projectId || data.ID_Projeto),
        id_tarefa_novo: data.taskId ? Number(data.taskId) : (data.id_tarefa_novo ? Number(data.id_tarefa_novo) : null),
        Data: data.date || data.Data,
        Horas_Trabalhadas: data.totalHours || data.Horas_Trabalhadas || 0,
        Hora_Inicio: data.startTime || data.Hora_Inicio,
        Hora_Fim: data.endTime || data.Hora_Fim,
        Almoco_Deduzido: data.lunchDeduction !== undefined ? data.lunchDeduction : (data.Almoco_Deduzido || false),
        Descricao: data.description || data.Descricao || null
    };

    return await timesheetRepository.create(payload);
};

const updateTimesheet = async (id, data) => {
    const payload = {};

    if (data.userId !== undefined || data.ID_Colaborador !== undefined) {
        payload.ID_Colaborador = Number(data.userId || data.ID_Colaborador);
    }
    if (data.clientId !== undefined || data.ID_Cliente !== undefined) {
        payload.ID_Cliente = Number(data.clientId || data.ID_Cliente);
    }
    if (data.projectId !== undefined || data.ID_Projeto !== undefined) {
        payload.ID_Projeto = Number(data.projectId || data.ID_Projeto);
    }
    if (data.taskId !== undefined || data.id_tarefa_novo !== undefined) {
        payload.id_tarefa_novo = Number(data.taskId || data.id_tarefa_novo);
    }
    if (data.date !== undefined || data.Data !== undefined) {
        payload.Data = data.date || data.Data;
    }
    if (data.totalHours !== undefined || data.Horas_Trabalhadas !== undefined) {
        payload.Horas_Trabalhadas = data.totalHours || data.Horas_Trabalhadas;
    }
    if (data.startTime !== undefined || data.Hora_Inicio !== undefined) {
        payload.Hora_Inicio = data.startTime || data.Hora_Inicio;
    }
    if (data.endTime !== undefined || data.Hora_Fim !== undefined) {
        payload.Hora_Fim = data.endTime || data.Hora_Fim;
    }
    if (data.lunchDeduction !== undefined || data.Almoco_Deduzido !== undefined) {
        payload.Almoco_Deduzido = data.lunchDeduction !== undefined ? data.lunchDeduction : data.Almoco_Deduzido;
    }
    if (data.description !== undefined || data.Descricao !== undefined) {
        payload.Descricao = data.description || data.Descricao;
    }

    return await timesheetRepository.update(id, payload);
};

const deleteTimesheet = async (id) => {
    return await timesheetRepository.remove(id);
};

module.exports = {
    getAllTimesheets,
    getTimesheetById,
    createTimesheet,
    updateTimesheet,
    deleteTimesheet
};
