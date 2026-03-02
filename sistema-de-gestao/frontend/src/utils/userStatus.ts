import { User, Task, Project, Client, Absence } from '@/types';

export interface UserStatus {
    label: string;
    color: string;
}

export const isWildcardTask = (task: Task, projects: Project[], clients: Client[]): boolean => {
    const p = projects.find(proj => proj.id === task.projectId);
    if (!p) return false;
    const c = clients.find(cl => cl.id === p.clientId);
    if (!c) return false;

    const projName = (p.name || '').toLowerCase();
    const clientName = (c.name || '').toLowerCase();

    const isStudyProject = projName.includes('treinamento') ||
        projName.includes('capacitação') ||
        projName.includes('capacitacao') ||
        projName.includes('capacidação');

    const isNicLabs = clientName.includes('nic-labs');

    return isStudyProject && isNicLabs;
};

export const isTaskDelayed = (task: any, projects: Project[] = [], clients: Client[] = []): boolean => {
    // Se for tarefa "curinga" (treinamento nic-labs), nunca conta como atrasada para o status
    if (projects.length > 0 && clients.length > 0 && isWildcardTask(task, projects, clients)) {
        return false;
    }
    return (task.daysOverdue ?? 0) > 0;
};

export const getUserStatus = (
    user: User,
    tasks: Task[],
    projects: Project[],
    clients: Client[],
    absences: Absence[] = []
): UserStatus => {
    const now = new Date();

    // 1. PRIORIDADE MÁXIMA: Check de Ausência Aprovada Hoje
    const activeAbsence = absences.find(abs => {
        if (String(abs.userId) !== String(user.id)) return false;
        const status = (abs.status || '').toLowerCase();
        // Inclui aprovada por gestão, RH ou já processada (finalizada_dp)
        const isApproved = ['aprovada_gestao', 'aprovada_rh', 'finalizada_dp'].includes(status);
        if (!isApproved) return false;

        const start = new Date(abs.startDate + 'T00:00:00');
        const end = new Date(abs.endDate + 'T23:59:59');
        return now >= start && now <= end;
    });

    if (activeAbsence) {
        const typeLabels: Record<string, string> = {
            'férias': 'FÉRIAS',
            'atestado': 'ATESTADO',
            'day-off': 'DAY-OFF',
            'feriado_local': 'FERIADO'
        };
        const label = typeLabels[activeAbsence.type.toLowerCase()] || 'AUSENTE';
        return {
            label,
            color: '#64748b' // Slate-500 (Geral para ausências)
        };
    }

    const todayStr = now.toISOString().split('T')[0];

    const userAllTasks = tasks.filter(t => t.developerId === user.id || (t.collaboratorIds && t.collaboratorIds.includes(user.id)));
    const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');

    // Só conta atraso se NÃO for tarefa curinga
    const hasDelayed = userActiveTasks.some(t => isTaskDelayed(t, projects, clients) && t.status !== 'Review');
    const hasInProgress = userActiveTasks.some(t => t.status === 'In Progress');
    const hasStudy = userActiveTasks.some(t => isWildcardTask(t, projects, clients));

    const activeRoles = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'ceo', 'tech_lead', 'developer'];
    const isSystemCollaborator = (user.torre && user.torre !== 'N/A') || activeRoles.includes(user.role?.toLowerCase() || '');

    if (user.active === false) return { label: 'Desligado', color: '#ef4444' };
    if (user.torre === 'TODAS') return { label: 'Administrador', color: '#8b5cf6' };
    if (user.torre === 'N/A') return { label: 'Fora do Fluxo', color: '#64748b' };
    if (!isSystemCollaborator) return { label: 'N/A', color: '#94a3b8' };
    if (hasDelayed) return { label: 'Atrasado', color: '#ef4444' };
    if (hasInProgress) return { label: 'Ocupado', color: '#f59e0b' };
    if (hasStudy) return { label: 'Estudando', color: '#3b82f6' };
    return { label: 'Livre', color: '#10b981' };
};
