// utils/normalizers.ts
import { Task, Status, Priority, Impact, TimesheetEntry, Client, Project, User } from "@/types";

export function normalizeStatus(raw: string | null): Status {
    if (!raw) return "Todo";
    const s = raw.toLowerCase().trim();
    if (s.includes("conclu") || s.includes("done") || s.includes("finaliz")) return "Done";
    if (s.includes("trabalhando") || s.includes("andamento") || s.includes("progresso") || s.includes("progress") || s.includes("execu")) return "In Progress";
    if (s.includes("teste") || s.includes("revis") || s.includes("review") || s.includes("valida")) return "Review";
    return "Todo";
}

export function normalizePriority(raw: string | null): Priority | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().trim();
    if (s.includes("critica") || s.includes("critical") || s.includes("urgente")) return "Critical";
    if (s.includes("alta") || s.includes("high")) return "High";
    if (s.includes("media") || s.includes("medium")) return "Medium";
    if (s.includes("baixa") || s.includes("low")) return "Low";
    return undefined;
}

export function normalizeImpact(raw: string | null): Impact | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().trim();
    if (s.includes("alto") || s.includes("high")) return "High";
    if (s.includes("medio") || s.includes("medium")) return "Medium";
    if (s.includes("baixo") || s.includes("low")) return "Low";
    return undefined;
}

export function getRoleDisplayName(role: string): string {
    const r = role.toLowerCase().trim();
    switch (r) {
        case 'admin': return 'Administrador';
        case 'gestor': return 'Gestor / Gerente';
        case 'diretoria': return 'Diretoria';
        case 'pmo': return 'PMO';
        case 'financeiro': return 'Financeiro';
        case 'tech_lead': return 'Tech Lead';
        case 'consultor': return 'Consultor';
        case 'developer': return 'Desenvolvedor';
        default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
}

export function formatDate(dateStr: string | null): string {
    if (!dateStr) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        return defaultDate.toISOString().split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (dateStr.includes('T')) return dateStr.split('T')[0];
    try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const userTimezoneOffset = date.getTimezoneOffset() * 60000;
            const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
            return adjustedDate.toISOString().split("T")[0];
        }
    } catch { }
    return new Date().toISOString().split("T")[0];
}

export function mapDbTaskToTask(row: any, userMap?: Map<string, any>, projectName?: string, clientName?: string): Task {
    let developerName = undefined;
    if (row.ID_Colaborador && userMap) {
        const dev = userMap.get(String(row.ID_Colaborador));
        developerName = dev?.name;
    }

    const status = normalizeStatus(row.StatusTarefa);

    return {
        id: String(row.id_tarefa_novo),
        externalId: row.ID_Tarefa || undefined,
        title: (row.Afazer && row.Afazer !== 'null') ? row.Afazer : "(Sem título)",
        projectId: String(row.ID_Projeto),
        projectName: projectName,
        clientId: String(row.ID_Cliente),
        clientName: clientName,
        developer: developerName,
        developerId: row.ID_Colaborador ? String(row.ID_Colaborador) : undefined,
        collaboratorIds: [],
        status: status,
        estimatedDelivery: formatDate(row.entrega_estimada),
        actualDelivery: row.entrega_real || undefined,
        scheduledStart: row.inicio_previsto || undefined,
        actualStart: row.inicio_real || undefined,
        progress: Math.min(100, Math.max(0, Number(row.Porcentagem) || 0)),
        priority: normalizePriority(row.Prioridade),
        impact: normalizeImpact(row.Impacto),
        risks: row.Riscos || undefined,
        notes: row["Observações"] || row.notes || undefined,
        description: row.description || undefined,
        em_testes: !!row.em_testes,
        link_ef: row.link_ef || undefined,
        id_tarefa_novo: row.id_tarefa_novo,
        daysOverdue: calculateDaysOverdue(row.entrega_estimada, row.entrega_real, status)
    };
}

function calculateDaysOverdue(estimated: string | null, actual: string | null, status: Status): number {
    if (!estimated) return 0;

    // Status 'Done' não conta como 'em atraso' — desconsiderar completamente
    if (status === 'Done') return 0;

    const parseLocalDate = (dateStr: string) => {
        const parts = dateStr.split('T')[0].split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    };

    const deadline = parseLocalDate(estimated);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Só é considerado atraso se o dia de hoje FOR MAIOR que o dia da entrega
    // Se hoje for 23 e a entrega for 23, diff será 0.
    const diff = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

export function mapDbTimesheetToEntry(r: any, taskExternalMap?: Map<string, string>): TimesheetEntry {
    let taskId = String(r.id_tarefa_novo || '');
    if (taskExternalMap && (!taskId || taskId === 'null' || taskId === '0')) {
        const extId = String(r.ID_Tarefa || '').toLowerCase();
        if (extId && taskExternalMap.has(extId)) {
            taskId = taskExternalMap.get(extId)!;
        } else {
            taskId = String(r.ID_Tarefa || '');
        }
    }

    return {
        id: String(r.ID_Horas_Trabalhadas || r.id || ''),
        userId: String(r.ID_Colaborador || ''),
        userName: r.dim_colaboradores?.NomeColaborador || r.userName || '',
        clientId: String(r.ID_Cliente || ''),
        projectId: String(r.ID_Projeto || ''),
        taskId: taskId,
        date: r.Data ? (r.Data.includes('T') ? r.Data.split('T')[0] : r.Data) : formatDate(null),
        startTime: r.Hora_Inicio || '',
        endTime: r.Hora_Fim || '',
        totalHours: Number(r.Horas_Trabalhadas || 0),
        lunchDeduction: !!r.Almoco_Deduzido,
        description: r.Descricao || undefined,
    };
}
