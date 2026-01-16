// src/services/reportApi.ts
import { supabase } from '@/services/supabaseClient';

const API_BASE =
    (import.meta as any).env?.VITE_API_URL?.toString()?.trim() || 'https://argilliferous-ingenuous-janiyah.ngrok-free.dev/api';

type PreviewFilters = {
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
    clientIds?: number[];
    projectIds?: number[];
    collaboratorIds?: number[];
    taskIds?: (number | string)[];
    statuses?: string[];
    includeCost?: boolean;
    includeHours?: boolean;
    includeStatus?: boolean;
};

export type ReportRow = {
    id_cliente: number;
    cliente: string;

    id_projeto: number;
    projeto: string;

    id_colaborador: number;
    colaborador: string;
    data_registro: string;
    tarefa: string | null;
    status_tarefa: string | null;
    horas: number;

    valor_projeto: number | null;      // R$
    horas_projeto_total: number;        // horas totais do projeto no período (pra rateio)
    valor_hora_projeto: number | null;  // R$/h (já calculado pelo backend)
    valor_rateado: number | null;       // R$ (horas * valor_hora_projeto)
};

export type ProjectTotal = {
    id_projeto: number;
    projeto: string;
    cliente: string;
    id_cliente: number;
    horas_projeto_total: number;
    valor_projeto: number | null;
    valor_hora_projeto: number | null;
    valor_rateado_total: number | null;
};

export type ReportPreviewResponse = {
    generatedAt: string;
    rows: ReportRow[];
    projectTotals: ProjectTotal[];
    totals: {
        horas_total: number;
        valor_total_rateado: number | null;
    };
};

async function getAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await getAccessToken();

    // Headers base
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        console.warn(`[apiFetch] No token for ${path}`);
    }

    // Merge custom headers
    if (init?.headers) {
        const customHeaders = init.headers as Record<string, string>;
        Object.assign(headers, customHeaders);
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[apiFetch] Error ${res.status}: ${text}`);
        throw new Error(`API ${res.status}: ${text || res.statusText}`);
    }

    return res.json() as Promise<T>;
}

export async function fetchClients(): Promise<Array<{ id: number; name: string }>> {
    return apiFetch('/admin/clients');
}

export async function fetchProjects(clientIds?: number[]): Promise<Array<{ id: number; name: string; clientId: number; clientName: string }>> {
    const qs = clientIds?.length ? `?clientIds=${clientIds.join(',')}` : '';
    return apiFetch(`/admin/projects${qs}`);
}

export async function fetchCollaborators(): Promise<Array<{ id: number; name: string; email: string; role: string }>> {
    return apiFetch('/admin/collaborators');
}

export async function fetchTasks(projectIds?: number[]): Promise<Array<{ id: string; name: string; projectId: number }>> {
    const qs = projectIds?.length ? `?projectIds=${projectIds.join(',')}` : '';
    return apiFetch(`/admin/tasks${qs}`);
}

export async function fetchReportPreview(filters: PreviewFilters): Promise<ReportPreviewResponse> {
    const params = new URLSearchParams();

    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.clientIds?.length) params.set('clientIds', filters.clientIds.join(','));
    if (filters.projectIds?.length) params.set('projectIds', filters.projectIds.join(','));
    if (filters.collaboratorIds?.length) params.set('collaboratorIds', filters.collaboratorIds.join(','));
    if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));

    return apiFetch(`/admin/report/preview?${params.toString()}`);
}

export async function upsertProjectCost(id_projeto: number, budget: number | null): Promise<void> {
    await apiFetch('/admin/report/project-budgets', {
        method: 'PUT',
        body: JSON.stringify({ budgets: [{ id_projeto, budget }] }),
    });
}

export async function exportReportExcel(filters: PreviewFilters): Promise<Blob> {
    const token = await getAccessToken();
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.clientIds?.length) params.set('clientIds', filters.clientIds.join(','));
    if (filters.projectIds?.length) params.set('projectIds', filters.projectIds.join(','));
    if (filters.collaboratorIds?.length) params.set('collaboratorIds', filters.collaboratorIds.join(','));
    if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));

    if (filters.includeCost) params.set('includeCost', 'true');
    if (filters.includeHours) params.set('includeHours', 'true');
    if (filters.includeStatus) params.set('includeStatus', 'true');

    if (!token) {
        console.error(`[exportReportExcel] No access token found. User might need to re-login.`);
    }

    const res = await fetch(`${API_BASE}/admin/report/excel?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Export ${res.status}: ${text || res.statusText}`);
    }

    return res.blob();
}

export async function exportReportPowerBI(filters: PreviewFilters): Promise<Blob> {
    const token = await getAccessToken();
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.clientIds?.length) params.set('clientIds', filters.clientIds.join(','));
    if (filters.projectIds?.length) params.set('projectIds', filters.projectIds.join(','));
    if (filters.collaboratorIds?.length) params.set('collaboratorIds', filters.collaboratorIds.join(','));
    if (filters.statuses?.length) params.set('statuses', filters.statuses.join(','));

    if (!token) {
        console.error(`[exportReportPowerBI] No access token found. User might need to re-login.`);
    }

    const res = await fetch(`${API_BASE}/admin/report/powerbi?${params.toString()}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        }
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`PowerBI ${res.status}: ${text || res.statusText}`);
    }

    return res.blob();
}
