import { Project, Task } from '@/types';

export const enrichProjectsWithTaskDates = (projects: Project[], tasks: Task[]): Project[] => {
    return projects.map(p => {
        const projectTasks = tasks.filter(t => String(t.projectId) === String(p.id));
        if (projectTasks.length === 0) return p;

        const startDates = projectTasks
            .map(t => t.actualStart || t.scheduledStart)
            .filter(Boolean) as string[];

        if (startDates.length === 0) return p;

        const earliestTaskDate = startDates.reduce((min, curr) => curr < min ? curr : min);

        // Se não tem data de início OU se a primeira tarefa começou antes da data de início prevista
        if (!p.startDate || p.startDate.trim() === "" || earliestTaskDate < p.startDate) {
            return { ...p, startDate: earliestTaskDate };
        }

        return p;
    });
};
