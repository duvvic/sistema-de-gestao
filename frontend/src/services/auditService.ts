import { apiRequest } from './apiClient';

export interface AuditLog {
    id: number;
    user_id: string | null;
    user_name: string;
    collaborator_id?: number | string;
    avatar_url?: string;
    action: string;
    entity: string;
    entity_name: string;
    entity_id: string;
    old_data: any;
    new_data: any;
    ip_address: string | null;
    created_at: string;
    client_id?: string;
    client_name?: string;
    client_logo?: string;
    project_id?: string;
    project_name?: string;
    task_name?: string;
}

export interface AuditLogFilters {
    user_id?: string;
    action?: string;
    entity?: string;
    date_from?: string;
    date_to?: string;
    client_id?: string;
    project_id?: string;
    limit?: number;
}

export const auditService = {
    async fetchAuditLogs(filters?: AuditLogFilters): Promise<AuditLog[]> {
        const queryParams = new URLSearchParams();
        if (filters?.user_id) queryParams.append('user_id', filters.user_id);
        if (filters?.action) queryParams.append('action', filters.action);
        if (filters?.entity) queryParams.append('entity', filters.entity);
        if (filters?.date_from) queryParams.append('date_from', filters.date_from);
        if (filters?.date_to) queryParams.append('date_to', filters.date_to);
        if (filters?.client_id) queryParams.append('client_id', filters.client_id);
        if (filters?.project_id) queryParams.append('project_id', filters.project_id);
        if (filters?.limit) queryParams.append('limit', String(filters.limit));

        return await apiRequest(`/audit-logs?${queryParams.toString()}`);
    }
};
