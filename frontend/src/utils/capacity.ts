import { User, Task, Project, ProjectMember, Holiday, TimesheetEntry } from '@/types';

/**
 * Retorna o número de dias úteis (Segunda a Sexta) em um determinado mês, descontando feriados.
 */
export const getWorkingDaysInMonth = (monthStr: string, holidays: Holiday[] = []): number => {
    const [year, month] = monthStr.split('-').map(Number);
    const date = new Date(year, month - 1, 1, 12, 0, 0);
    let workingDays = 0;

    const currentMonth = date.getMonth();

    while (date.getMonth() === currentMonth) {
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const isHoliday = holidays.some(h => {
                const hStart = h.date;
                const hEnd = h.endDate || h.date;
                return dateStr >= hStart && dateStr <= hEnd;
            });

            if (!isHoliday) {
                workingDays++;
            }
        }
        date.setDate(date.getDate() + 1);
    }

    return workingDays;
};

/**
 * Retorna o número de dias úteis entre duas datas (inclusive), descontando feriados.
 */
export const getWorkingDaysInRange = (startDate: string, endDate: string, holidays: Holiday[] = []): number => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    if (start > end) return 0;

    let workingDays = 0;
    let current = new Date(start);

    while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const isHoliday = holidays.some(h => {
                const hStart = h.date;
                const hEnd = h.endDate || h.date;
                return dateStr >= hStart && dateStr <= hEnd;
            });

            if (!isHoliday) {
                workingDays++;
            }
        }
        current.setDate(current.getDate() + 1);
    }

    return workingDays;
};

/**
 * Adiciona dias úteis a uma data.
 */
export const addBusinessDays = (startDate: string, daysToAdd: number, holidays: Holiday[] = []): string => {
    if (daysToAdd <= 0) return startDate;
    let current = new Date(startDate + 'T12:00:00');
    let added = 0;
    while (added < daysToAdd) {
        current.setDate(current.getDate() + 1);
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            const dateStr = current.toISOString().split('T')[0];
            const isHoliday = holidays.some(h => {
                const hStart = h.date;
                const hEnd = h.endDate || h.date;
                return dateStr >= hStart && dateStr <= hEnd;
            });
            if (!isHoliday) added++;
        }
    }
    return current.toISOString().split('T')[0];
};

/**
 * Interface para Alocação Diária
 */
export interface DayAllocation {
    date: string;
    plannedHours: number;
    continuousHours: number;
    bufferHours: number;
    totalOccupancy: number;
    isWorkingDay: boolean;
    capacity: number;
}

/**
 * Calcula o compromisso diário do colaborador com projetos contínuos.
 * Regra: Capacidade diária (ex: 8h) dividida pelo número de membros no projeto.
 */
export const getUserContinuousCommitment = (
    userId: string,
    allProjects: Project[],
    projectMembers: ProjectMember[],
    userDailyCap: number = 8,
    dateStr?: string
): number => {
    const userContinuousMemberships = projectMembers.filter(pm => {
        if (String(pm.id_colaborador) !== String(userId)) return false;
        const project = allProjects.find(p => String(p.id) === String(pm.id_projeto));

        // Verifica se o projeto está ativo na data especificada (se fornecida)
        const isActiveOnDate = !dateStr || (
            (!project?.startDate || dateStr >= project.startDate) &&
            (!project?.estimatedDelivery || dateStr <= project.estimatedDelivery)
        );

        return project?.project_type === 'continuous' && project.active !== false && isActiveOnDate;
    });

    if (userContinuousMemberships.length === 0) return 0;

    let totalCommitment = 0;
    userContinuousMemberships.forEach(pm => {
        // Regra Oficial: Alocação direta nas horas do projeto (via percentual de alocação) se definido (> 0).
        // Caso contrário, fallback para consumo proporcional ao número de membros vinculados (Regra 8h/N).
        const allocation = Number(pm.allocation_percentage);

        if (allocation > 0) {
            totalCommitment += (allocation / 100) * userDailyCap;
        } else {
            const membersInThisProject = projectMembers.filter(m => String(m.id_projeto) === String(pm.id_projeto)).length;
            totalCommitment += membersInThisProject > 0 ? (userDailyCap / membersInThisProject) : 0;
        }
    });

    return totalCommitment;
};

/**
 * LÓGICA DE ALOCAÇÃO DIÁRIA (SIMULAÇÃO) - REFORMULADA
 * Prioridade: Planejado (O que sobra após compromisso contínuo) | Contínuo (Compromisso base ou 100% se sem planejado)
 */
export const simulateUserDailyAllocation = (
    userId: string,
    startDate: string,
    endDate: string,
    allProjects: Project[],
    allTasks: Task[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    userDailyCap: number = 8
): DayAllocation[] => {
    const allocations: DayAllocation[] = [];
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    const todayStr = new Date().toISOString().split('T')[0];
    const capacityDia = userDailyCap;

    let current = new Date(start);
    while (current <= end) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidays.some(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));
        const isWorkingDay = !isWeekend && !isHoliday;

        let plannedHours = 0;
        let continuousHours = 0;
        let bufferHours = 0;

        if (isWorkingDay) {
            // 1. Verificar tarefas planejadas ativas no dia
            const userTasks = allTasks.filter(t =>
                (String(t.developerId) === String(userId) || t.collaboratorIds?.some(id => String(id) === String(userId))) &&
                t.status !== 'Done' &&
                (t.status as string) !== 'Cancelled' &&
                (t.status as string) !== 'Cancelada' &&
                !t.deleted_at
            );

            const activePlannedTasks = userTasks.filter(t => {
                const project = allProjects.find(p => String(p.id) === String(t.projectId));
                if (!project || project.project_type !== 'planned') return false;

                const tStart = t.scheduledStart || t.actualStart || project.startDate || '';
                const tEnd = t.estimatedDelivery || '';
                return dateStr >= tStart && (tEnd === '' || dateStr <= tEnd);
            });

            // 2. Verificar o compromisso contínuo dinâmico no dia (Passando a data para filtrar vigência)
            const continuousCommitment = getUserContinuousCommitment(String(userId), allProjects, projectMembers, capacityDia, dateStr);
            const availableForPlanned = Math.max(0, capacityDia - continuousCommitment);

            if (activePlannedTasks.length > 0) {
                // Tem tarefa planejada: Consome o que sobra do compromisso contínuo (Prioriza o planejado no que sobrar)
                plannedHours = availableForPlanned;
                continuousHours = continuousCommitment;
            } else {
                // Sem tarefas planejadas: Aloca apenas o compromisso contínuo real e libera o resto como disponível (Buffer)
                continuousHours = continuousCommitment;
                bufferHours = Math.max(0, capacityDia - continuousHours);
            }
        }

        allocations.push({
            date: dateStr,
            plannedHours: Number(plannedHours.toFixed(2)),
            continuousHours: Number(continuousHours.toFixed(2)),
            bufferHours: Number(bufferHours.toFixed(2)),
            totalOccupancy: Number((plannedHours + continuousHours).toFixed(2)),
            isWorkingDay,
            capacity: capacityDia
        });

        current.setDate(current.getDate() + 1);
    }

    return allocations;
};

/**
 * CÁLCULO DE DATA FINAL DA TAREFA PLANEJADA (PREVISÃO MATEMÁTICA)
 * REGRA: Se entrar em um projeto planejado, assume-se que ele pode dedicar ATÉ 100% para finalizar.
 * Mas respeitando a nova regra de prioridade de 50% para prazos regulares.
 * O usuário pediu: "se entrar em um projeto planejado, ele terá 100% ocupado, qual a data que ele vai finalizar essa tarefa?"
 */
export const calculateTaskPredictedEndDate = (
    task: Task,
    allProjects: Project[],
    allTasks: Task[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = [],
    userDailyCap: number = 8
): { ideal: string; realistic: string; isSaturated?: boolean } => {
    const userId = task.developerId;
    const fallback = { ideal: task.estimatedDelivery || '', realistic: task.estimatedDelivery || '' };
    if (!userId) return fallback;

    const project = allProjects.find(p => String(p.id) === String(task.projectId));
    if (!project || project.project_type !== 'planned') return fallback;

    const isIgnored = task.status === 'Done' || (task.status as string) === 'Cancelled' || (task.status as string) === 'Cancelada' || task.deleted_at;
    const reported = timesheetEntries
        .filter(e => String(e.taskId) === String(task.id) && String(e.userId) === String(userId))
        .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);

    const effortRestante = isIgnored ? 0 : Math.max(0, (Number(task.estimatedHours) || 0) - reported);
    if (effortRestante <= 0) {
        const date = task.actualDelivery || task.estimatedDelivery || '';
        return { ideal: date, realistic: date };
    }

    const startCalc = new Date().toISOString().split('T')[0];

    // MODO IDEAL: 100% da capacidade
    const diasIdeal = Math.ceil(effortRestante / userDailyCap);
    const idealDate = addBusinessDays(startCalc, diasIdeal, holidays);

    // MODO REALISTA: Dinâmico (Capacidade Total - Compromisso Contínuo)
    const commitment = getUserContinuousCommitment(String(userId), allProjects, projectMembers, userDailyCap);

    // Detector de Saturação (Sobrecarga estrutural)
    const isSaturated = commitment >= userDailyCap;

    // O fallback de 0.1h é APENAS técnico para evitar divisão por zero ou negativa,
    // mas o sinal de saturação deve ser disparado para a gestão.
    const capRealista = Math.max(0.1, userDailyCap - commitment);

    const diasRealista = Math.ceil(effortRestante / capRealista);
    const realisticDate = addBusinessDays(startCalc, diasRealista, holidays);

    return { ideal: idealDate, realistic: realisticDate, isSaturated };
};

/**
 * MAPA DE OCUPAÇÃO MENSAL
 */
export const getUserMonthlyAvailability = (
    user: User,
    monthStr: string, // "YYYY-MM"
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    tasks: Task[],
    holidays: Holiday[] = []
): {
    capacity: number;
    plannedHours: number;
    continuousHours: number;
    totalOccupancy: number;
    occupancyRate: number;
    balance: number;
    status: 'Sobrecarregado' | 'Alto' | 'Disponível';
    allocated: number;
    available: number;
    breakdown: {
        planned: { id: string; name: string; hours: number }[];
        continuous: { id: string; name: string; hours: number }[];
    };
} => {
    const [year, month] = monthStr.split('-').map(Number);
    const startDate = `${monthStr}-01`;
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    const dailyGoal = user.dailyAvailableHours || 8;
    const workingDays = getWorkingDaysInMonth(monthStr, holidays);
    const capacity = dailyGoal * workingDays;

    // 1. Calcular detalhamento de projetos contínuos
    const continuousProjectsBreakdown: { id: string; name: string; hours: number }[] = [];
    const userContinuousMemberships = projectMembers.filter(pm => {
        if (String(pm.id_colaborador) !== String(user.id)) return false;
        const p = projects.find(proj => String(proj.id) === String(pm.id_projeto));
        return p?.project_type === 'continuous' && p.active !== false;
    });

    userContinuousMemberships.forEach(pm => {
        const p = projects.find(proj => String(proj.id) === String(pm.id_projeto));
        if (!p) return;

        // Horas totais no mês para este projeto contínuo
        let projectHours = 0;
        const allocation = Number(pm.allocation_percentage);
        const dailyCommitment = allocation > 0
            ? (allocation / 100) * dailyGoal
            : (projectMembers.filter(m => String(m.id_projeto) === String(p.id)).length > 0
                ? (dailyGoal / projectMembers.filter(m => String(m.id_projeto) === String(p.id)).length)
                : 0);

        // Itera dias úteis para somar
        const d = new Date(year, month - 1, 1, 12);
        while (d.getMonth() === month - 1) {
            const dateStr = d.toISOString().split('T')[0];
            const isW = d.getDay() !== 0 && d.getDay() !== 6 && !holidays.some(h => dateStr >= h.date && dateStr <= (h.endDate || h.date));
            if (isW) {
                const isActiveOnDate = (!p.startDate || dateStr >= p.startDate) && (!p.estimatedDelivery || dateStr <= p.estimatedDelivery);
                if (isActiveOnDate) projectHours += dailyCommitment;
            }
            d.setDate(d.getDate() + 1);
        }

        if (projectHours > 0) {
            continuousProjectsBreakdown.push({ id: p.id, name: p.name, hours: Number(projectHours.toFixed(2)) });
        }
    });

    // 2. Calcular detalhamento de projetos planejados
    const plannedProjectsBreakdown: { id: string; name: string; hours: number }[] = [];
    const dailyAllocations = simulateUserDailyAllocation(user.id, startDate, endDate, projects, tasks, projectMembers, timesheetEntries, holidays, dailyGoal);

    const plannedHoursTotal = dailyAllocations.reduce((sum, d) => sum + d.plannedHours, 0);
    const continuousHoursTotal = dailyAllocations.reduce((sum, d) => sum + d.continuousHours, 0);

    // Identifica quais projetos planejados tiveram tarefas ativas no mês
    const activePlannedProjectIds = new Set<string>();
    tasks.forEach(t => {
        const isOwner = String(t.developerId) === String(user.id) || t.collaboratorIds?.some(id => String(id) === String(user.id));
        if (!isOwner || t.status === 'Done' || !!t.deleted_at) return;

        const p = projects.find(proj => proj.id === t.projectId);
        if (p?.project_type !== 'planned') return;

        // Verifica se a tarefa transita pelo mês
        const tStart = t.scheduledStart || t.actualStart || p.startDate || '';
        const tEnd = t.estimatedDelivery || '';
        const overlap = (!tEnd || tEnd >= startDate) && (!tStart || tStart <= endDate);

        if (overlap) activePlannedProjectIds.add(t.projectId);
    });

    // Distribui as horas planejadas totais entre os projetos ativos (proporcionalmente ou simplificado)
    // Aqui usaremos uma distribuição simplificada: divide o total de horas planejadas do mês pelos projetos ativos
    if (activePlannedProjectIds.size > 0 && plannedHoursTotal > 0) {
        const hoursPerProject = plannedHoursTotal / activePlannedProjectIds.size;
        activePlannedProjectIds.forEach(pid => {
            const p = projects.find(proj => proj.id === pid);
            if (p) plannedProjectsBreakdown.push({ id: p.id, name: p.name, hours: Number(hoursPerProject.toFixed(2)) });
        });
    }

    const totalOccupancy = plannedHoursTotal + continuousHoursTotal;
    const occupancyRateVal = capacity > 0 ? (totalOccupancy / capacity) : 0;
    const balance = capacity - totalOccupancy;

    let status: 'Sobrecarregado' | 'Alto' | 'Disponível' = 'Disponível';
    if (occupancyRateVal > 1) status = 'Sobrecarregado';
    else if (occupancyRateVal >= 0.85) status = 'Alto';

    return {
        capacity: Number(capacity.toFixed(2)) || 0,
        plannedHours: Number(plannedHoursTotal.toFixed(2)) || 0,
        continuousHours: Number(continuousHoursTotal.toFixed(2)) || 0,
        totalOccupancy: Number(totalOccupancy.toFixed(2)) || 0,
        occupancyRate: Number((occupancyRateVal * 100).toFixed(2)) || 0,
        balance: Number(balance.toFixed(2)) || 0,
        status,
        allocated: Number(totalOccupancy.toFixed(2)) || 0,
        available: Number(balance.toFixed(2)) || 0,
        breakdown: {
            planned: plannedProjectsBreakdown,
            continuous: continuousProjectsBreakdown
        }
    };
};

/**
 * Helpers legados
 */
export const calculateProjectWeightedProgress = (projectId: string, tasks: Task[]): number => {
    const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId));
    if (projectTasks.length === 0) return 0;

    let totalWeight = 0;
    let totalWeightedProgress = 0;

    projectTasks.forEach(t => {
        const weight = Number(t.estimatedHours) || 0;
        const progress = Number(t.progress) || (t.status === 'Done' ? 100 : 0);
        totalWeight += weight;
        totalWeightedProgress += weight * progress;
    });

    if (totalWeight === 0) {
        const sumProgress = projectTasks.reduce((sum, t) => sum + (Number(t.progress) || (t.status === 'Done' ? 100 : 0)), 0);
        return sumProgress / projectTasks.length;
    }

    return totalWeightedProgress / totalWeight;
};

export const calculateProjectTaskWeights = (projectId: string, tasks: Task[]): Task[] => {
    const projectTasks = tasks.filter(t => String(t.projectId) === String(projectId));
    const totalForecast = projectTasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
    return tasks.map(t => {
        if (String(t.projectId) === String(projectId)) {
            const peso = totalForecast > 0 ? (Number(t.estimatedHours) || 0) / totalForecast : 0;
            return { ...t, task_weight: peso };
        }
        return t;
    });
};

/**
 * Calcula a data estimada de "Backlog Free"
 * Nova regra: Assume que o colaborador dedica 100% ao planejado para definir a data de entrega final.
 */
export const calculateIndividualReleaseDate = (
    user: User,
    allProjects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    allTasks: Task[],
    holidays: Holiday[] = []
): { ideal: string; realistic: string; isSaturated?: boolean } | null => {
    const userPlannedTasks = allTasks.filter(t => {
        const isOwner = String(t.developerId) === String(user.id);
        const isCollaborator = t.collaboratorIds?.some(id => String(id) === String(user.id));
        if (!isOwner && !isCollaborator) return false;

        const project = allProjects.find(p => String(p.id) === String(t.projectId));
        const isIgnored = t.status === 'Done' || (t.status as string) === 'Cancelled' || (t.status as string) === 'Cancelada' || t.deleted_at;

        return project?.active !== false && project?.project_type !== 'continuous' && !isIgnored;
    });

    if (userPlannedTasks.length === 0) return null;

    let totalEffortRemaining = 0;
    userPlannedTasks.forEach(task => {
        const reported = timesheetEntries
            .filter(e => String(e.taskId) === String(task.id) && String(e.userId) === String(user.id))
            .reduce((sum, e) => sum + (Number(e.totalHours) || 0), 0);
        totalEffortRemaining += Math.max(0, (Number(task.estimatedHours) || 0) - reported);
    });

    if (totalEffortRemaining <= 0) return null;

    const dailyCap = user.dailyAvailableHours || 8;
    const today = new Date().toISOString().split('T')[0];

    // IDEAL (100%)
    const diasIdeal = Math.ceil(totalEffortRemaining / dailyCap);
    const ideal = addBusinessDays(today, diasIdeal, holidays);

    // REALISTA (Dinâmico)
    const commitment = getUserContinuousCommitment(String(user.id), allProjects, projectMembers, dailyCap);
    const isSaturated = commitment >= dailyCap;

    // Fallback apenas técnico para evitar divisão por zero, sinalizando saturação na UI
    const capRealista = Math.max(0.1, dailyCap - commitment);

    const diasRealista = Math.ceil(totalEffortRemaining / capRealista);
    const realistic = addBusinessDays(today, diasRealista, holidays);

    return { ideal, realistic, isSaturated };
};

/**
 * TENDÊNCIA DE SATURAÇÃO (PRÓXIMOS 90 DIAS)
 * Analisa a evolução da taxa de saturação e carga.
 */
export const calculateTeamSaturationTrend = (
    users: User[],
    allProjects: Project[],
    projectMembers: ProjectMember[],
    allTasks: Task[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = []
): { month: string; saturationRate: number; avgLoad: number }[] => {
    const trends: { month: string; saturationRate: number; avgLoad: number }[] = [];
    const today = new Date();

    for (let i = 0; i < 4; i++) {
        const futureDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
        const monthStr = futureDate.toISOString().slice(0, 7);

        const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');
        if (operationalUsers.length === 0) continue;

        let saturatedCount = 0;
        let totalLoad = 0;

        operationalUsers.forEach(u => {
            const availability = getUserMonthlyAvailability(u, monthStr, allProjects, projectMembers, timesheetEntries, allTasks, holidays);
            totalLoad += availability.occupancyRate;

            // Um colaborador é considerado saturado na tendência se o compromisso contínuo dele
            // naquela data futura ainda ocupar 100% da sua carga
            const dateInMonth = `${monthStr}-15`; // Ponto médio do mês para amostragem
            const commitment = getUserContinuousCommitment(String(u.id), allProjects, projectMembers, u.dailyAvailableHours || 8, dateInMonth);
            if (commitment >= (u.dailyAvailableHours || 8)) {
                saturatedCount++;
            }
        });

        trends.push({
            month: monthStr,
            saturationRate: (saturatedCount / operationalUsers.length) * 100,
            avgLoad: totalLoad / operationalUsers.length
        });
    }

    return trends;
};

/**
 * ÍNDICE DE ELASTICIDADE DA EQUIPE
 * Quanto % da capacidade total ainda pode absorver novos projetos (buffer real).
 */
export const calculateTeamElasticity = (
    users: User[],
    monthStr: string,
    projects: Project[],
    projectMembers: ProjectMember[],
    timesheetEntries: TimesheetEntry[],
    tasks: Task[],
    holidays: Holiday[] = []
): number => {
    const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');
    if (operationalUsers.length === 0) return 0;

    let totalCapacity = 0;
    let totalAvailable = 0;

    operationalUsers.forEach(u => {
        const data = getUserMonthlyAvailability(u, monthStr, projects, projectMembers, timesheetEntries, tasks, holidays);
        totalCapacity += data.capacity;
        totalAvailable += Math.max(0, data.available); // Apenas saldo positivo conta como elasticidade
    });

    return totalCapacity > 0 ? (totalAvailable / totalCapacity) * 100 : 0;
};

/**
 * SIMULAÇÃO DE IMPACTO DE NOVO PROJETO
 * "Se eu vender um projeto de X horas, como fica a equipe?"
 */
export const simulateNewProjectImpact = (
    hours: number,
    users: User[],
    allProjects: Project[],
    projectMembers: ProjectMember[],
    allTasks: Task[],
    timesheetEntries: TimesheetEntry[],
    holidays: Holiday[] = []
): { userId: string; name: string; releaseDateBefore: string; releaseDateAfter: string; isNewSaturated: boolean }[] => {
    const impact: any[] = [];
    const operationalUsers = users.filter(u => u.active !== false && (u.torre || '').toUpperCase() !== 'N/A');

    operationalUsers.forEach(u => {
        const current = calculateIndividualReleaseDate(u, allProjects, projectMembers, timesheetEntries, allTasks, holidays);
        if (!current) return;

        // Simula o acréscimo de horas distribuído no backlog do usuário
        // Criamos uma tarefa "fantasma" para simular o efeito
        const ghostTask: Task = {
            id: 'ghost',
            projectId: 'ghost_proj',
            developerId: u.id,
            status: 'Todo',
            estimatedHours: hours,
            title: 'Simulação'
        } as any;

        const simulatedTasks = [...allTasks, ghostTask];
        const after = calculateIndividualReleaseDate(u, allProjects, projectMembers, timesheetEntries, simulatedTasks, holidays);

        impact.push({
            userId: u.id,
            name: u.name,
            releaseDateBefore: current.realistic,
            releaseDateAfter: after?.realistic || current.realistic,
            isNewSaturated: after?.isSaturated || false
        });
    });

    return impact.sort((a, b) => {
        // Ordena por maior impacto (maior deslocamento de data)
        return new Date(b.releaseDateAfter).getTime() - new Date(a.releaseDateAfter).getTime();
    });
};
