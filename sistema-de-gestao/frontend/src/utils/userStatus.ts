import { User, Task, Project, Client } from '@/types';

export interface UserStatus {
    label: string;
    color: string;
}

export const isTaskDelayed = (task: any): boolean => {
    return (task.daysOverdue ?? 0) > 0;
};

export const getUserStatus = (
    user: User,
    tasks: Task[],
    projects: Project[],
    clients: Client[]
): UserStatus => {
    const userAllTasks = tasks.filter(t => t.developerId === user.id || (t.collaboratorIds && t.collaboratorIds.includes(user.id)));
    const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');

    const hasDelayed = userActiveTasks.some(t => isTaskDelayed(t) && t.status !== 'Review');
    const hasInProgress = userActiveTasks.some(t => t.status === 'In Progress');
    const hasStudy = userActiveTasks.some(t => {
        const p = projects.find(proj => proj.id === t.projectId);
        const c = clients.find(cl => cl.id === p?.clientId);
        const isStudyProject = p?.name?.toLowerCase().includes('treinamento') || p?.name?.toLowerCase().includes('capacitação');
        const isNicLabs = c?.name?.toLowerCase().includes('nic-labs');
        return isStudyProject && isNicLabs;
    });

    const activeRoles = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'ceo', 'tech_lead', 'developer'];
    const isSystemCollaborator = (user.torre && user.torre !== 'N/A') || activeRoles.includes(user.role?.toLowerCase() || '');

    if (user.active === false) return { label: 'Desligado', color: '#ef4444' };
    if (user.torre === 'N/A') return { label: 'Fora do Fluxo', color: '#64748b' };
    if (!isSystemCollaborator) return { label: 'N/A', color: '#94a3b8' };
    if (hasDelayed) return { label: 'Atrasado', color: '#ef4444' };
    if (hasInProgress) return { label: 'Ocupado', color: '#f59e0b' };
    if (hasStudy) return { label: 'Estudando', color: '#3b82f6' };
    return { label: 'Livre', color: '#10b981' };
};
