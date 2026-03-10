import { dbInsert, dbFindAll } from '../database/index.js';

export const auditRepository = {
    async insertLog(logData) {
        // Enforce inserting the log. It doesn't need to return inserted object since it's fire-and-forget.
        try {
            await dbInsert('audit_logs', logData, { select: false });
        } catch (error) {
            console.error('Audit DB error:', error);
            throw error;
        }
    },

    async findAll(filters = {}) {
        const query = {
            order: { column: 'created_at', ascending: false },
            filters: {},
            gte: {},
            lte: {}
        };

        if (filters.user_id) query.filters.user_id = filters.user_id;
        if (filters.action) query.filters.action = filters.action;
        if (filters.entity) query.filters.entity_type = filters.entity;
        if (filters.client_id) query.filters.client_id = filters.client_id;
        if (filters.project_id) query.filters.project_id = filters.project_id;
        if (filters.date_from) query.gte.created_at = `${filters.date_from}T00:00:00.000Z`;
        if (filters.date_to) query.lte.created_at = `${filters.date_to}T23:59:59.999Z`;

        if (filters.limit) {
            query.limit = Number(filters.limit);
        } else {
            query.limit = 500; // default cap
        }

        return await dbFindAll('v_audit_logs', query);
    }
};
