import { auditRepository } from '../audit/auditRepository.js';
import { sendSuccess, sendError } from '../utils/responseHelper.js';

export const auditController = {
    async getLogs(req, res) {
        try {
            const { user_id, action, entity, date_from, date_to, limit, client_id, project_id } = req.query;

            const filters = {};
            if (user_id) filters.user_id = user_id;
            if (action) filters.action = action;
            if (entity) filters.entity = entity;
            if (client_id) filters.client_id = client_id;
            if (project_id) filters.project_id = project_id;
            if (date_from) filters.date_from = date_from;
            if (date_to) filters.date_to = date_to;
            if (limit) filters.limit = limit;

            const logs = await auditRepository.findAll(filters);
            return sendSuccess(res, logs);
        } catch (error) {
            console.error('[AuditController] Error fetching logs:', error);
            return sendError(res, 'Erro ao buscar logs de auditoria', 500);
        }
    }
};
