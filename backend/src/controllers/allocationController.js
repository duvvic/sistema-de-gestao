// controllers/allocationController.js
import { dbFindAll, dbInsert, dbDelete } from '../database/index.js';
import { sendSuccess, handleRouteError } from '../utils/responseHelper.js';

export const allocationController = {
    async list(req, res) {
        try {
            const { taskId } = req.query;
            const query = { filters: {} };
            if (taskId) query.filters.task_id = taskId;

            const data = await dbFindAll('task_member_allocations', query);
            return sendSuccess(res, data);
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.list');
        }
    },

    async upsert(req, res) {
        try {
            const { task_id, user_id, reserved_hours } = req.body;

            // Delete first to simulate clean upsert if needed or just use database logic
            await dbDelete('task_member_allocations', { task_id, user_id });

            if (reserved_hours > 0) {
                const result = await dbInsert('task_member_allocations', {
                    task_id,
                    user_id,
                    reserved_hours
                });
                return sendSuccess(res, result);
            }

            return sendSuccess(res, { message: 'Allocation removed' });
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.upsert');
        }
    },

    async deleteByTask(req, res) {
        try {
            const { taskId } = req.params;
            await dbDelete('task_member_allocations', { task_id: taskId });
            return sendSuccess(res, { message: 'Allocations deleted' });
        } catch (e) {
            return handleRouteError(res, e, 'AllocationController.deleteByTask');
        }
    }
};
