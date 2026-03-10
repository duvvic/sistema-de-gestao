import { auditRepository } from './auditRepository.js';

export const auditService = {
    async logAction({ userId, action, entity, entityId, oldData = null, newData = null, ip = null, userName = null, entityName = null, clientId = null, projectId = null }) {
        try {
            const logData = {
                user_id: userId ? String(userId) : null,
                user_name: userName, // Snapshot do nome no momento da ação
                action,
                entity_type: entity,
                entity_id: String(entityId),
                entity_name: entityName,
                before_data: oldData,
                after_data: newData,
                ip_address: ip,
                client_id: clientId ? String(clientId) : null,
                project_id: projectId ? String(projectId) : null
            };

            await auditRepository.insertLog(logData);
        } catch (error) {
            console.error('[AuditService] Falha ao registrar log de auditoria:', error.message);
        }
    }
};
