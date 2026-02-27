// contexts/DataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppData } from '@/hooks/useAppData';
import { Task, Project, Client, User, TimesheetEntry, Absence, ProjectMember, Holiday } from '@/types';
import { supabase } from '@/services/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { mapDbTaskToTask, mapDbTimesheetToEntry, mapDbProjectToProject, mapDbUserToUser, mapDbAbsenceToAbsence } from '@/utils/normalizers';

interface DataContextType {
    clients: Client[];
    projects: Project[];
    tasks: Task[];
    users: User[];
    timesheetEntries: TimesheetEntry[];
    projectMembers: ProjectMember[];
    absences: Absence[];
    holidays: Holiday[];
    loading: boolean;
    error: string | null;

    // Actions (para updates otimistas se necessário)
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
    setUsers: React.Dispatch<React.SetStateAction<User[]>>;
    setTimesheetEntries: React.Dispatch<React.SetStateAction<TimesheetEntry[]>>;
    setProjectMembers: React.Dispatch<React.SetStateAction<ProjectMember[]>>;
    setAbsences: React.Dispatch<React.SetStateAction<Absence[]>>;
    setHolidays: React.Dispatch<React.SetStateAction<Holiday[]>>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, isLoading: authLoading } = useAuth();

    // Hook que faz o fetch centralizado
    const {
        users: loadedUsers,
        clients: loadedClients,
        projects: loadedProjects,
        tasks: loadedTasks,
        timesheetEntries: loadedTimesheets,
        projectMembers: loadedProjectMembers,
        absences: loadedAbsences,
        holidays: loadedHolidays,
        loading: dataLoading,
        error: dataError
    } = useAppData();

    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
    const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
    const [absences, setAbsences] = useState<Absence[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);

    // Ref para evitar ciclos de re-subscrição e garantir acesso a dados frescos nos callbacks
    const usersRef = React.useRef<User[]>([]);
    useEffect(() => { usersRef.current = users; }, [users]);

    // Sincronizar dados globais quando o carregamento termina
    useEffect(() => {
        if (dataLoading) return;

        setClients(loadedClients);
        setProjects(loadedProjects);
        setTasks(loadedTasks);
        setTimesheetEntries(loadedTimesheets);
        setProjectMembers(loadedProjectMembers || []);
        setUsers(loadedUsers);
        setAbsences(loadedAbsences || []);
        setHolidays(loadedHolidays || []);
    }, [dataLoading, loadedClients, loadedProjects, loadedTasks, loadedUsers, loadedTimesheets, loadedProjectMembers, loadedAbsences, loadedHolidays]);

    // === REALTIME SUBSCRIPTIONS ===
    useEffect(() => {
        const channel = supabase
            .channel('app_realtime_changes')
            // 1. Clientes
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_clientes' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newItem: Client = { id: String(payload.new.ID_Cliente), name: payload.new.NomeCliente, logoUrl: payload.new.NewLogo, active: payload.new.ativo };
                    setClients(prev => [...prev, newItem]);
                } else if (payload.eventType === 'UPDATE') {
                    setClients(prev => prev.map(c => c.id === String(payload.new.ID_Cliente)
                        ? { ...c, name: payload.new.NomeCliente, logoUrl: payload.new.NewLogo, active: payload.new.ativo } : c));
                } else if (payload.eventType === 'DELETE') {
                    setClients(prev => prev.filter(c => c.id !== String(payload.old.ID_Cliente)));
                }
            })
            // 2. Projetos
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_projetos' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const project = mapDbProjectToProject(payload.new);
                    setProjects(prev => {
                        const exists = prev.find(p => p.id === project.id);
                        if (exists) return prev.map(p => p.id === project.id ? project : p);
                        return [...prev, project];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setProjects(prev => prev.filter(p => p.id !== String(payload.old.ID_Projeto)));
                }
            })
            // 3. Tarefas (Com Normalização)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'fato_tarefas' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const userMap = new Map((usersRef.current || []).map(u => [u.id, u]));
                    const task = mapDbTaskToTask(payload.new, userMap);
                    setTasks(prev => {
                        const exists = prev.find(t => t.id === task.id);
                        if (exists) return prev.map(t => t.id === task.id ? { ...t, ...task, collaboratorIds: t.collaboratorIds } : t);
                        return [task, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.filter(t => t.id !== String(payload.old.id_tarefa_novo)));
                }
            })
            // 3.1 Vínculos de Colaboradores (tarefa_colaboradores)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefa_colaboradores' }, (payload) => {
                const taskId = String((payload.new as any)?.id_tarefa || (payload.old as any)?.id_tarefa);
                const userId = String((payload.new as any)?.id_colaborador || (payload.old as any)?.id_colaborador);

                if (payload.eventType === 'INSERT') {
                    setTasks(prev => prev.map(t => t.id === taskId
                        ? { ...t, collaboratorIds: [...(t.collaboratorIds || []).filter(id => id !== userId), userId] }
                        : t
                    ));
                } else if (payload.eventType === 'DELETE') {
                    setTasks(prev => prev.map(t => t.id === taskId
                        ? { ...t, collaboratorIds: (t.collaboratorIds || []).filter(id => id !== userId) }
                        : t
                    ));
                }
            })
            // 4. Colaboradores
            .on('postgres_changes', { event: '*', schema: 'public', table: 'dim_colaboradores' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const user = mapDbUserToUser(payload.new);
                    setUsers(prev => {
                        const exists = prev.find(u => u.id === user.id);
                        if (exists) return prev.map(u => u.id === user.id ? user : u);
                        return [...prev, user];
                    });
                }
            })
            // 5. Timesheet
            .on('postgres_changes', { event: '*', schema: 'public', table: 'horas_trabalhadas' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const entry = mapDbTimesheetToEntry(payload.new);
                    setTimesheetEntries(prev => {
                        const exists = prev.find(e => e.id === entry.id);
                        if (exists) return prev.map(e => e.id === entry.id ? entry : e);
                        return [entry, ...prev];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setTimesheetEntries(prev => prev.filter(e => e.id !== String(payload.old.ID_Horas_Trabalhadas)));
                }
            })
            // 6. Membros
            .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newMember: ProjectMember = {
                        id_pc: payload.new.id_pc,
                        id_projeto: payload.new.id_projeto,
                        id_colaborador: payload.new.id_colaborador,
                        allocation_percentage: payload.new.allocation_percentage,
                        start_date: payload.new.start_date,
                        end_date: payload.new.end_date,
                    };
                    setProjectMembers(prev => [...prev, newMember]);
                } else if (payload.eventType === 'DELETE') {
                    setProjectMembers(prev => prev.filter(pm => !(pm.id_projeto === payload.old.id_projeto && pm.id_colaborador === payload.old.id_colaborador)));
                }
            })
            // 7. Ausências
            .on('postgres_changes', { event: '*', schema: 'public', table: 'colaborador_ausencias' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const absence = mapDbAbsenceToAbsence(payload.new);
                    setAbsences(prev => {
                        const exists = prev.find(a => a.id === absence.id);
                        if (exists) return prev.map(a => a.id === absence.id ? absence : a);
                        return [...prev, absence];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setAbsences(prev => prev.filter(a => a.id !== String(payload.old.id)));
                }
            })
            // 8. Feriados
            .on('postgres_changes', { event: '*', schema: 'public', table: 'feriados' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    const h = payload.new;
                    const holiday: Holiday = {
                        id: String(h.id),
                        name: h.nome,
                        date: h.data,
                        type: h.tipo,
                        observations: h.observacoes
                    };
                    setHolidays(prev => {
                        const exists = prev.find(item => item.id === holiday.id);
                        if (exists) return prev.map(item => item.id === holiday.id ? holiday : item);
                        return [...prev, holiday];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setHolidays(prev => prev.filter(h => h.id !== String(payload.old.id)));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const value = React.useMemo(() => ({
        clients,
        projects: projects.filter(p => p.active !== false),
        tasks: tasks.filter(t => !t.deleted_at),
        users,
        timesheetEntries: timesheetEntries.filter(e => !(e as any).deleted_at),
        projectMembers,
        absences,
        holidays,
        loading: dataLoading && (clients.length === 0),
        error: dataError,
        setClients,
        setProjects,
        setTasks,
        setUsers,
        setTimesheetEntries,
        setProjectMembers,
        setAbsences,
        setHolidays
    }), [clients, projects, tasks, users, timesheetEntries, projectMembers, absences, holidays, dataLoading, dataError]);

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within DataProvider');
    return context;
};
