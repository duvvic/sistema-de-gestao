import { User, Task, Project } from '@/types';

/**
 * Retorna o número de dias úteis (Segunda a Sexta) em um determinado mês.
 */
export const getWorkingDaysInMonth = (monthStr: string): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    let workingDays = 0;

    while (date.getMonth() === month - 1) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
        date.setDate(date.getDate() + 1);
    }

    return workingDays;
};

/**
 * Retorna o número de dias úteis entre duas datas (inclusive).
 */
export const getWorkingDaysInRange = (startDate: string, endDate: string): number => {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    let workingDays = 0;
    let current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};

/**
 * Calcula as horas alocadas para um usuário em um determinado mês/ano
 * com base nas horas estimadas das tarefas.
 */
export const getMonthlyAllocatedHours = (
    userId: string,
    monthStr: string, // Formato "YYYY-MM"
    tasks: Task[]
): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Último dia do mês

    let totalAllocated = 0;

    const userTasks = tasks.filter(t =>
        (t.developerId === userId || (t.collaboratorIds && t.collaboratorIds.includes(userId))) &&
        t.status !== 'Done' // Apenas tarefas não concluídas consomem capacidade futura
    );

    userTasks.forEach(task => {
        if (!task.estimatedHours) return;

        const taskStart = task.scheduledStart ? new Date(task.scheduledStart) : (task.actualStart ? new Date(task.actualStart) : new Date());
        const taskEnd = task.estimatedDelivery ? new Date(task.estimatedDelivery) : taskStart;

        // Se a tarefa não tem intervalo definido ou o fim é antes do início, assume um dia
        const startTime = taskStart.getTime();
        const endTime = Math.max(startTime, taskEnd.getTime());

        // Total de dias da tarefa (mínimo 1)
        const totalTaskDays = Math.max(1, Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24)) + 1);

        // Dias da tarefa que caem dentro do mês alvo
        const overlapStart = Math.max(startTime, monthStart.getTime());
        const overlapEnd = Math.min(endTime, monthEnd.getTime());

        if (overlapStart <= overlapEnd) {
            const overlapDays = Math.max(1, Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1);

            // Proporção de horas da tarefa para este mês
            const userCount = 1 + (task.collaboratorIds?.length || 0);
            const individualTaskHours = task.estimatedHours / userCount;
            const hoursInMonth = (overlapDays / totalTaskDays) * individualTaskHours;

            totalAllocated += hoursInMonth;
        }
    });

    return Math.round(totalAllocated);
};

/**
 * Calcula a capacidade mensal e disponibilidade.
 * A capacidade é calculada multiplicando as horas metas diárias pelos dias úteis do mês.
 */
/**
 * Verifica se um intervalo de datas intersecta com o mês especificado.
 */
const isIntersectingMonth = (start: Date, end: Date | null, monthStart: Date, monthEnd: Date): boolean => {
    const s = start.getTime();
    const e = end ? end.getTime() : Number.MAX_SAFE_INTEGER;
    const ms = monthStart.getTime();
    const me = monthEnd.getTime();

    return s <= me && e >= ms;
}

/**
 * Calcula a capacidade mensal e disponibilidade baseada nas regras de negócio (Nov 2024).
 * 
 *
 * Regra 1: Projeto Ativo no Mês (Data Inicio <= Ultimo Dia Mês AND Data Fim >= Primeiro Dia Mês)
 * Regra 2: Alocação Válida (Data Inicio <= Ultimo Dia Mês AND Data Fim >= Primeiro Dia Mês)
 * Regra 3: Horas Alocadas = Soma das horas mensais dos projetos (Horas Vendidas / Duração * % Alocação)
 */
import { ProjectMember } from '@/types';

export const getUserMonthlyAvailability = (
    user: User,
    monthStr: string,
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: any[] = [],
    tasks: Task[] = []
): { capacity: number; allocated: number; available: number } => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const workingDays = getWorkingDaysInMonth(monthStr);

    // 1. Capacidade Mensal (Horas Meta do Mês)
    const dailyGoal = user.dailyAvailableHours || 8;
    const capacity = dailyGoal * workingDays;

    // 2. Horas Alocadas (Combinando Tarefas e Projetos Contínuos)
    let allocated = getMonthlyAllocatedHours(user.id, monthStr, tasks);

    // Soma alocação de Projetos Contínuos
    const userProjectMemberships = projectMembers.filter(pm => String(pm.id_colaborador) === String(user.id));

    userProjectMemberships.forEach(pm => {
        const project = projects.find(p => String(p.id) === String(pm.id_projeto));
        if (project && project.project_type === 'continuous' && project.active !== false) {
            const pStart = project.startDate ? new Date(project.startDate + 'T00:00:00') : null;
            const pEnd = project.estimatedDelivery ? new Date(project.estimatedDelivery + 'T23:59:59') : null;

            // Se o projeto está ativo neste mês
            if (pStart && pStart <= monthEnd && (!pEnd || pEnd >= monthStart)) {
                // Calcula dias úteis de interseção
                let current = new Date(Math.max(monthStart.getTime(), pStart.getTime()));
                const end = new Date(Math.min(monthEnd.getTime(), pEnd ? pEnd.getTime() : monthEnd.getTime()));

                let continuousWorkingDays = 0;
                while (current <= end) {
                    const dayOfWeek = current.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        continuousWorkingDays++;
                    }
                    current.setDate(current.getDate() + 1);
                }

                const dailyAllocation = (Number(pm.allocation_percentage || 100) / 100) * 8;
                allocated += (continuousWorkingDays * dailyAllocation);
            }
        }
    });

    // 3. Cálculo de Disponibilidade Real (Folga)
    let currentAvailability = 0;
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T12:00:00');

    if (monthEnd >= today) {
        let remainingWorkingDays = 0;
        if (today < monthStart) {
            remainingWorkingDays = workingDays;
        } else if (today >= monthStart && today <= monthEnd) {
            remainingWorkingDays = getWorkingDaysInRange(todayStr, monthStr + '-' + new Date(year, month, 0).getDate());
        }

        const totalRemainingCapacity = remainingWorkingDays * dailyGoal;
        // A disponibilidade é o que sobra da capacidade de hoje em diante, descontando o planejado proporcional
        const monthlyLoad = capacity > 0 ? (allocated / capacity) : 0;
        currentAvailability = Math.max(0, totalRemainingCapacity * (1 - monthlyLoad));
    }

    return {
        capacity: Math.round(capacity),
        allocated: Math.round(allocated),
        available: Math.round(currentAvailability)
    };
};

/**
 * Calcula a data de entrega estimada baseada nas horas vendidas e na capacidade da equipe.
 */
export const calculateProjectDeadline = (
    startDateStr: string,
    soldHours: number,
    team: User[]
): string => {
    if (!startDateStr || soldHours <= 0 || team.length === 0) return '';

    const start = new Date(startDateStr);
    const totalDailyCapacity = team.reduce((sum, u) => sum + (u.dailyAvailableHours || 8), 0);

    if (totalDailyCapacity <= 0) return '';

    const workingDaysNeeded = Math.ceil(soldHours / totalDailyCapacity);

    let currentDate = new Date(start);
    let daysAdded = 0;

    // Adiciona apenas dias úteis
    while (daysAdded < workingDaysNeeded) {
        currentDate.setDate(currentDate.getDate() + 1);
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }
    }

    return currentDate.toISOString().split('T')[0];
};

/**
 * Calcula a data de disponibilidade individual de um colaborador considerando um projeto específico.
 * Regra: (Horas Totais do Projeto / N. Colaboradores) / 8h por dia (dias úteis).
 * Se o resultado for no passado mas o projeto estiver ativo, retorna a data de hoje ou a estimativa de entrega.
 */
export const calculateIndividualReleaseDate = (
    user: User,
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: any[],
    tasks: Task[] = []
): string => {
    // 1. Filtrar tarefas ativas (não concluídas) do usuário
    const activeTasks = tasks.filter(t =>
        (t.developerId === user.id || (t.collaboratorIds && t.collaboratorIds.includes(user.id))) &&
        t.status !== 'Done' &&
        t.estimatedDelivery
    );

    // 2. Considerar Projetos Contínuos
    const continuousProjects = projectMembers
        .filter(pm => String(pm.id_colaborador) === String(user.id))
        .map(pm => projects.find(p => String(p.id) === String(pm.id_projeto)))
        .filter(p => p && p.project_type === 'continuous' && p.active !== false && p.estimatedDelivery);

    if (activeTasks.length === 0 && continuousProjects.length === 0) return 'Livre';

    // 3. Encontrar a data mais tardia
    const taskDates = activeTasks.map(t => new Date(t.estimatedDelivery + 'T12:00:00').getTime());
    const projectDates = continuousProjects.map(p => new Date(p!.estimatedDelivery! + 'T12:00:00').getTime());

    const allDates = [...taskDates, ...projectDates];
    const latestTimestamp = Math.max(...allDates);
    const latestDate = new Date(latestTimestamp);

    return latestDate.toLocaleDateString('pt-BR');
};


