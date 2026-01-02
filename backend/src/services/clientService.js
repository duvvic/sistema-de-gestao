const clientRepository = require('../repositories/clientRepository');

const getAllClients = async () => {
    return await clientRepository.findAll();
};

const createClient = async (data) => {
    const now = new Date();
    const toDateStr = (d) => d.toISOString().slice(0, 10);

    let contratoDateStr = null;
    // Logic for contract calculation if passed
    if (data.contractChoice === 'sim' && data.contractMonths && data.contractMonths > 0) {
        const d = new Date(now);
        d.setMonth(d.getMonth() + Number(data.contractMonths));
        contratoDateStr = toDateStr(d);
    }

    const payload = {
        NomeCliente: data.name || "(Sem nome)",
        NewLogo: data.logoUrl || "https://via.placeholder.com/150?text=Logo",
        ativo: true,
        Criado: toDateStr(now),
        Contrato: contratoDateStr
    };

    return await clientRepository.create(payload);
};

const updateClient = async (id, data) => {
    const payload = {};
    if (data.name !== undefined) payload.NomeCliente = data.name;
    if (data.logoUrl !== undefined) payload.NewLogo = data.logoUrl;
    if (data.active !== undefined) payload.ativo = data.active;
    // Agnostic to other fields if we want to support them later

    return await clientRepository.update(id, payload);
};

const deleteClient = async (id, hard = false) => {
    if (hard) {
        return await clientRepository.hardDelete(id);
    }
    return await clientRepository.softDelete(id);
};

module.exports = {
    getAllClients,
    createClient,
    updateClient,
    deleteClient
};
