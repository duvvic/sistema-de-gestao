// utils/normalizers.ts
import { Task, Status, Priority, Impact, TimesheetEntry, Client, Project, User, Role } from "@/types";

export function normalizeStatus(raw: string | null): Status {
    if (!raw) return "Todo";
    const s = raw.toLowerCase().trim();
    if (s.includes("pré-projeto") || s.includes("projeto") || s.includes("não iniciado")) return "Todo";
    if (s.includes("conclu") || s.includes("done") || s.includes("finaliz")) return "Done";
    if (s.includes("analise") || s.includes("análise") || s.includes("revis") || s.includes("review") || s.includes("valida") || s.includes("pendente")) return "Review";
    if (s.includes("teste") || s.includes("testing")) return "Testing";
    if (s.includes("andamento") || s.includes("progresso") || s.includes("progress") || s.includes("execu") || s.includes("iniciado") || s.includes("trabalhando")) return "In Progress";
    return "Todo";
}

export function getStatusDisplayName(status: Status): string {
    switch (status) {
        case 'Todo': return 'PRÉ-PROJETO';
        case 'In Progress': return 'ANDAMENTO';
        case 'Testing': return 'TESTE';
        case 'Review': return 'ANÁLISE';
        case 'Done': return 'CONCLUÍDO';
        default: return status;
    }
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

/**
 * Formata uma data YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY
 */
export function formatDateBR(dateStr: string | null | undefined): string {
    if (!dateStr) return "---";
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
        estimatedHours: row.estimated_hours ? Number(row.estimated_hours) : undefined,
        is_impediment: !!row.is_impediment,
        task_weight: row.task_weight ? Number(row.task_weight) : undefined,
        daysOverdue: calculateDaysOverdue(row.entrega_estimada, row.entrega_real, status),
        deleted_at: row.deleted_at || undefined
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
        deleted_at: r.deleted_at || undefined
    };
}

export function mapDbProjectToProject(row: any): Project {
    return {
        id: String(row.ID_Projeto),
        name: row.NomeProjeto || "Sem nome",
        clientId: String(row.ID_Cliente),
        partnerId: row.partner_id ? String(row.partner_id) : undefined,
        status: row.StatusProjeto || undefined,
        active: row.ativo ?? true,
        budget: row.budget ? Number(row.budget) : undefined,
        description: row.description || undefined,
        estimatedDelivery: row.estimatedDelivery || undefined,
        startDate: row.startDate || undefined,
        valor_total_rs: row.valor_total_rs ? Number(row.valor_total_rs) : undefined,
        managerClient: row.manager_client || undefined,
        responsibleNicLabsId: row.responsible_nic_labs_id ? String(row.responsible_nic_labs_id) : undefined,
        startDateReal: row.start_date_real || undefined,
        endDateReal: row.end_date_real || undefined,
        risks: row.risks || undefined,
        successFactor: row.success_factor || undefined,
        criticalDate: row.critical_date || undefined,
        docLink: row.doc_link || undefined,
        gapsIssues: row.gaps_issues || undefined,
        importantConsiderations: row.important_considerations || undefined,
        weeklyStatusReport: row.weekly_status_report || undefined,
        complexidade: row.complexidade || undefined,
        horas_vendidas: row.horas_vendidas ? Number(row.horas_vendidas) : undefined,
        project_type: row.project_type || 'continuous',
        valor_diario: row.valor_diario ? Number(row.valor_diario) : undefined,
    };
}

export function mapDbUserToUser(row: any): User {
    const normalizeUserRole = (roleValue: string | null): Role => {
        if (!roleValue) return "developer";
        const p = roleValue.toLowerCase().trim();
        if (p === 'system_admin' || p === 'system admin') return 'system_admin';
        if (p === 'diretoria') return 'diretoria';
        if (p === 'pmo') return 'pmo';
        if (p === 'gestor') return 'gestor';
        if (p === 'tech lead' || p === 'tech_lead') return 'tech_lead';
        if (p === 'financeiro') return 'financeiro';
        if (p === 'administrador' || p === 'admin') return 'admin';
        return 'developer';
    };

    return {
        id: String(row.ID_Colaborador),
        name: row.NomeColaborador || "Sem nome",
        email: String(row.email || "").trim().toLowerCase(),
        avatarUrl: row.avatar_url || undefined,
        cargo: row.Cargo || undefined,
        role: normalizeUserRole(row.role),
        active: row.ativo !== false,
        torre: row.torre || row.tower || undefined,
        nivel: row.nivel || undefined,
        hourlyCost: row.custo_hora ? Number(row.custo_hora) : undefined,
        dailyAvailableHours: row.horas_disponiveis_dia ? Number(row.horas_disponiveis_dia) : undefined,
        monthlyAvailableHours: row.horas_disponiveis_mes ? Number(row.horas_disponiveis_mes) : undefined,
    };
}

export function mapDbAbsenceToAbsence(row: any): any {
    return {
        id: String(row.id),
        userId: String(row.colaborador_id),
        type: row.tipo || row.type,
        startDate: row.data_inicio,
        endDate: row.data_fim,
        status: row.status,
        observations: row.observacoes || undefined,
        period: row.periodo || undefined,
        endTime: row.hora_fim || undefined,
        createdAt: row.created_at
    };
}

export function formatDecimalToTime(decimalHours: number | null | undefined): string {
    if (decimalHours == null || isNaN(decimalHours) || decimalHours === 0) return "0:00";

    const isNegative = decimalHours < 0;
    const absHours = Math.abs(decimalHours);

    let hours = Math.floor(absHours);
    let minutes = Math.round((absHours - hours) * 60);

    if (minutes === 60) {
        hours += 1;
        minutes = 0;
    }

    const timeStr = `${hours}:${minutes.toString().padStart(2, '0')}`;
    return isNegative ? `-${timeStr}` : timeStr;
}
