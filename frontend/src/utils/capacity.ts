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
    timesheetEntries: any[] = []
): { capacity: number; allocated: number; available: number } => {
    const [year, month] = monthStr.split('-').map(Number);
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const workingDays = getWorkingDaysInMonth(monthStr);

    // 1. Capacidade Mensal (Horas Meta do Mês)
    const dailyGoal = user.dailyAvailableHours || 8;
    const capacity = dailyGoal * workingDays;

    // 2. Horas Alocadas (Logica de Demanda com Saldo Transporado)
    let allocated = 0;

    // Filtrar projetos que o usuário é membro
    const userAllocations = projectMembers.filter(pm => String(pm.id_colaborador) === user.id);

    userAllocations.forEach(allocation => {
        const project = projects.find(p => String(p.id) === String(allocation.id_projeto));
        if (!project || project.active === false) return;

        // Regra de Alocação por Demanda:
        // A carga horária é baseada no que resta do projeto dividido pelos participantes.
        const soldHours = project.horas_vendidas || 0;
        const teamSize = projectMembers.filter(pm => String(pm.id_projeto) === String(project.id)).length || 1;
        const userShare = (Number(allocation.allocation_percentage) || 100) / 100;

        let remainingDemand = 0;

        if (soldHours > 0) {
            // Total de horas que este usuário deve entregar no projeto inteiro
            const totalUserTarget = (soldHours / teamSize) * userShare;

            // Calcular o que já foi realizado pelo usuário NESTE projeto ANTES deste mês
            const performedBeforeThisMonth = timesheetEntries.filter(t => {
                if (String(t.userId) !== String(user.id)) return false;
                if (String(t.projectId) !== String(project.id)) return false;
                if (!t.date) return false;
                const d = new Date(t.date + 'T12:00:00');
                return d < monthStart;
            }).reduce((sum, t) => sum + (Number(t.totalHours || t.hours) || 0), 0);

            remainingDemand = Math.max(0, totalUserTarget - performedBeforeThisMonth);
        } else {
            // Fallback para Manutenção/Suporte (soldHours <= 0) - Alocação fixa baseada na % do banco
            // Mas limitada ao que cabe no mês restrito pela %
            remainingDemand = workingDays * dailyGoal * (userShare / 10); // Div /10 pois o user usa 100 para 10% em manut
        }

        if (remainingDemand > 0) {
            const todayStr = new Date().toISOString().split('T')[0];
            const today = new Date(todayStr + 'T12:00:00');
            const startDate = project.startDate ? new Date(project.startDate + 'T00:00:00') : new Date(0);

            if (monthEnd >= startDate && monthEnd >= today) {
                // --- AJUSTE CRUCIAL: Consumo Planejado ---
                // Se estamos olhando para um mês no futuro (ex: Setembro), 
                // precisamos descontar o que o colaborador VAI trabalhar entre HOJE e o início de Setembro.
                if (monthStart > today) {
                    const daysUntilMonthStart = getWorkingDaysInRange(todayStr, monthStart.toISOString().split('T')[0]);
                    // Descontamos a capacidade que será consumida nesse intervalo (respeitando a carga do projeto)
                    const plannedConsumption = (daysUntilMonthStart - 1) * dailyGoal * userShare;
                    remainingDemand = Math.max(0, remainingDemand - plannedConsumption);
                }

                // Dias úteis RESTANTES no mês ou totais
                let effectivWorkingDays = workingDays;
                if (today > monthStart && today < monthEnd) {
                    effectivWorkingDays = getWorkingDaysInRange(todayStr, monthStr + '-' + new Date(year, month, 0).getDate());
                }

                const monthPotential = effectivWorkingDays * dailyGoal * userShare;
                const spaceLeft = Math.max(0, capacity - allocated);

                // Alocação deste mês
                const monthAllocation = Math.min(remainingDemand, monthPotential, spaceLeft);
                allocated += monthAllocation;
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
    timesheetEntries: any[]
): string => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr + 'T12:00:00');
    const dailyGoal = user.dailyAvailableHours || 8;

    // Filtrar alocações ativas
    const userAllocations = projectMembers.filter(pm => String(pm.id_colaborador) === user.id);
    let totalRemainingDemand = 0;
    let maxAllocationShare = 0;

    userAllocations.forEach(allocation => {
        const project = projects.find(p => String(p.id) === String(allocation.id_projeto));
        if (!project || project.active === false) return;

        const soldHours = project.horas_vendidas || 0;
        if (soldHours <= 0) return; // Maintenance doesn't have a fixed "release" end

        const teamSize = projectMembers.filter(pm => String(pm.id_projeto) === String(project.id)).length || 1;
        const userShare = (Number(allocation.allocation_percentage) || 100) / 100;
        maxAllocationShare = Math.max(maxAllocationShare, userShare);

        const totalUserTarget = (soldHours / teamSize) * userShare;
        const performedSoFar = timesheetEntries.filter(t =>
            String(t.userId) === String(user.id) && String(t.projectId) === String(project.id)
        ).reduce((sum, t) => sum + (Number(t.totalHours || t.hours) || 0), 0);

        totalRemainingDemand += Math.max(0, totalUserTarget - performedSoFar);
    });

    if (totalRemainingDemand <= 0) return '';

    // Quantos dias úteis ele precisa de HOJE para liquidar esse BACKLOG
    // Consideramos a capacidade dedicada dele (baseada na maior alocação ou simplesmente no dailyGoal)
    const effectiveDailyCapacity = dailyGoal * (maxAllocationShare || 1);
    const workingDaysNeeded = Math.ceil(totalRemainingDemand / (effectiveDailyCapacity || 1));

    let currentDate = new Date(today);
    let daysAdded = 0;

    while (daysAdded < workingDaysNeeded) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }
        if (daysAdded < workingDaysNeeded) {
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    return currentDate.toLocaleDateString('pt-BR');
};
