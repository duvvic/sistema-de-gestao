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

    // 1. Capacidade Mensal (Horas Meta)
    const dailyGoal = user.dailyAvailableHours || 8;
    const capacity = dailyGoal * workingDays;

    // 2. Horas Alocadas (Via Projetos e Membros)
    let allocated = 0;

    // Filtrar projetos que o usuário é membro
    const userAllocations = projectMembers.filter(pm => String(pm.id_colaborador) === user.id);

    userAllocations.forEach(allocation => {
        const project = projects.find(p => String(p.id) === String(allocation.id_projeto));
        if (!project) return;

        // Datas de alocação
        const allocStart = allocation.start_date ? new Date(allocation.start_date) : (project.startDate ? new Date(project.startDate) : new Date(0));
        const allocEnd = allocation.end_date ? new Date(allocation.end_date) : null;

        // Datas do projeto (Meta)
        const projStart = project.startDate ? new Date(project.startDate) : null;
        const projEnd = project.estimatedDelivery ? new Date(project.estimatedDelivery) : null;

        // Verificações de Interseção com o Mês
        // Se o projeto não tem data, mas está ativo, consideramos que ele "existe" no tempo.
        let isProjectActive = false;
        if (projStart && projEnd) {
            // Regra estrita se tiver datas
            isProjectActive = isIntersectingMonth(projStart, projEnd, monthStart, monthEnd);
        } else if (project.active !== false) {
            // Fallback: Projeto Ativo sem datas definidas (Contínuo)
            isProjectActive = true;
        }

        const isAllocationActive = isIntersectingMonth(allocStart, allocEnd, monthStart, monthEnd);

        if (isProjectActive && isAllocationActive) {
            let addedHours = 0;

            // Opção A: Calcular Carga do Projeto no Mês (Budget / Duração)
            // Lógica melhorada para contar meses corretamente (inclusive)
            if (projStart && projEnd && projEnd > projStart) {
                // Ex: Jan 26 a Fev 26. Diff 1 mês. Mas abrange 2 meses civis se começar no inicio e terminar no fim.
                // Abordagem simples e conservadora: Diff em meses + 1 (se dias parciais) or just max(1, diff)
                const monthDiff = (projEnd.getFullYear() - projStart.getFullYear()) * 12 + (projEnd.getMonth() - projStart.getMonth());
                // Se a duração for menor que um mês, é 1.
                const totalMonths = Math.max(1, monthDiff + (projEnd.getDate() < projStart.getDate() ? 0 : 1));

                const soldHours = project.horas_vendidas || 0;

                if (soldHours > 0) {
                    const projectMonthlyBurn = soldHours / totalMonths;
                    const userShare = (Number(allocation.allocation_percentage) || 100) / 100;
                    addedHours = (projectMonthlyBurn * userShare);
                }
            }

            // Opção B: Fallback - Alocação baseada na Capacidade do Usuário
            // Executado SOMENTE se não houver dados de budget, mas o usuário estiver explicitamente alocado.
            // Para evitar explosão de horas (ex: 900% de ocupação), aplicamos um fator de correção.
            // O usuário relatou "zero a mais", indicando que 100% no banco deve representar 10% de carga real nestes casos (Projetos Contínuos/Maintenance).
            if (addedHours === 0) {
                const userSharePercent = Number(allocation.allocation_percentage);

                if (!isNaN(userSharePercent) && userSharePercent > 0) {
                    // Ajuste: Dividir por 1000 em vez de 100.
                    // Ex: 100 (DB) -> 0.1 (10% da Capacidade)
                    addedHours = (capacity * (userSharePercent / 1000));
                }
            }

            allocated += addedHours;
        }
    });

    // 3. Horas Trabalhadas Realizadas (Timesheet)
    const workedHours = timesheetEntries.filter(t => {
        if (!t.date) return false;
        const d = new Date(t.date);
        return d.getFullYear() === year && (d.getMonth() + 1) === month;
    })
        .reduce((sum, t) => sum + (Number(t.hours || t.totalHours) || 0), 0);

    return {
        capacity: Math.round(capacity),
        allocated: Math.round(allocated),
        available: Math.round(Math.max(0, capacity - allocated)) // Disponível é sempre em relação ao Planejado. 
        // Se quiser Realizado vs Planejado, seria capacity - workedHours. 
        // O prompt pede: Horas Disponíveis = Horas Meta do Mês − Horas Alocadas (Planejadas)
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
