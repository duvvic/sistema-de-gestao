import { useData } from '@/contexts/DataContext';
import { Task, Project, Client, User, TimesheetEntry, Absence, Holiday } from '@/types';
import { supabase } from '@/services/supabaseClient';
import * as clientService from '@/services/clientService';
import * as projectService from '@/services/projectService';
import * as taskService from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';
import { enrichProjectsWithTaskDates } from '@/utils/projectUtils';



export const useDataController = () => {
    const {
        clients, setClients,
        projects, setProjects,
        tasks, setTasks,
        users, setUsers,
        timesheetEntries, setTimesheetEntries,
        projectMembers, setProjectMembers,
        taskMemberAllocations, setTaskMemberAllocations,
        absences, setAbsences,
        holidays, setHolidays,
        loading,
        error
    } = useData();

    const { currentUser } = useAuth();


    // === CLIENT CONTROLLERS ===

    // === CLIENT CONTROLLERS ===

    // Imports estáticos já devem estar no topo do arquivo. 
    // Vou remover a lógica de imports dinâmicos e usar as funções diretamente.
    // Como não posso editar o topo do arquivo neste bloco, assumirei que o usuário editará os imports depois ou farei um replace global.
    // ESPERA: A ferramenta replace_file_content permite substituir blocos. Vou substituir o CORPO do hook, mas preciso garantir os imports.
    // Melhor usar multi_replace ou reescrever o arquivo com cuidado. 

    // Vou usar multi_replace para garantir que os imports estejam lá.

    const getClientById = (id: string): Client | undefined => {
        return clients.find(c => c.id === id);
    };

    const getActiveClients = (): Client[] => {
        return clients.filter(c => c.active !== false);
    };

    const createClient = async (clientData: Partial<Client>): Promise<string> => {
        const newId = await clientService.createClient(clientData as Client);

        const { data: row } = await supabase
            .from('dim_clientes')
            .select('*')
            .eq('ID_Cliente', newId)
            .single();

        if (row) {
            const newClient: Client = {
                id: String(row.ID_Cliente),
                name: row.NomeCliente,
                logoUrl: row.NewLogo,
                active: row.ativo ?? true,
                cnpj: row.cnpj,
                telefone: row.telefone,
                tipo_cliente: row.tipo_cliente,
                partner_id: row.partner_id ? String(row.partner_id) : undefined
            };
            setClients(prev => [...prev, newClient]);
        }

        return String(newId);
    };

    const updateClient = async (clientId: string, updates: Partial<Client>): Promise<void> => {
        const { error } = await supabase
            .from('dim_clientes')
            .update({
                NomeCliente: updates.name,
                NewLogo: updates.logoUrl,
                tipo_cliente: updates.tipo_cliente,
                partner_id: updates.partner_id ? Number(updates.partner_id) : null
            })
            .eq('ID_Cliente', Number(clientId));

        if (error) throw error;
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...updates } : c));
    };

    const deactivateClient = async (clientId: string, reason: string): Promise<void> => {
        const { error } = await supabase
            .from('dim_clientes')
            .update({ ativo: false, Desativado: reason })
            .eq('ID_Cliente', Number(clientId));

        if (error) throw error;
        setClients(prev => prev.map(c =>
            c.id === clientId ? { ...c, active: false, Desativado: reason } as any : c
        ));
    };

    const deleteClient = async (clientId: string): Promise<void> => {
        await clientService.deleteClient(clientId);
        setClients(prev => prev.filter(c => c.id !== clientId));
    };

    // === PROJECT CONTROLLERS ===

    const getProjectById = (id: string): Project | undefined => {
        return projects.find(p => p.id === id);
    };

    const getProjectsByClient = (clientId: string): Project[] => {
        return projects.filter(p => p.clientId === clientId && p.active !== false);
    };

    const createProject = async (projectData: Partial<Project>): Promise<string> => {
        const newId = await projectService.createProject(projectData);
        const newProject = {
            project_type: 'continuous',
            ...projectData,
            id: String(newId)
        } as Project;
        setProjects(prev => enrichProjectsWithTaskDates([...prev, newProject], tasks));

        return String(newId);
    };

    const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
        await projectService.updateProject(projectId, updates);
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
    };

    const deleteProject = async (projectId: string, force: boolean = false): Promise<void> => {
        await projectService.deleteProject(projectId, force);
        setProjects(prev => prev.filter(p => p.id !== projectId));
    };

    // === TASK CONTROLLERS ===

    const getTaskById = (id: string): Task | undefined => {
        return tasks.find(t => t.id === id);
    };

    const getTasksByProject = (projectId: string): Task[] => {
        return tasks.filter(t => t.projectId === projectId);
    };

    const getTasksByUser = (userId: string): Task[] => {
        return tasks.filter(t => t.developerId === userId);
    };

    const createTask = async (taskData: Partial<Task>): Promise<string> => {
        const newId = await taskService.createTask(taskData);
        const newTask = { ...taskData, id: String(newId) } as Task;
        setTasks(prev => [newTask, ...prev]);

        // Auto-update project real start if task is created in progress
        if (taskData.status === 'In Progress' || taskData.status === 'Done') {
            const project = projects.find(p => p.id === taskData.projectId);
            if (project && !project.startDateReal) {
                const today = new Date().toISOString().split('T')[0];
                await updateProject(project.id, { startDateReal: today });
            }
        }

        return String(newId);
    };

    const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
        const oldTask = tasks.find(t => t.id === taskId);
        await taskService.updateTask(taskId, updates);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));

        // Auto-update project real start when first task starts
        if (updates.status === 'In Progress' && oldTask?.status !== 'In Progress') {
            const pId = updates.projectId || oldTask?.projectId;
            const project = projects.find(p => p.id === pId);

            if (project && !project.startDateReal) {
                // Check if any other task in this project is already started
                const otherStarted = tasks.some(t =>
                    t.projectId === pId &&
                    t.id !== taskId &&
                    (t.status === 'In Progress' || t.status === 'Done' || t.status === 'Review')
                );

                if (!otherStarted) {
                    const today = new Date().toISOString().split('T')[0];
                    await updateProject(project.id, { startDateReal: today });
                }
            }
        }
    };

    const deleteTask = async (taskId: string, force: boolean = false, deleteHours: boolean = false): Promise<void> => {
        await taskService.deleteTask(taskId, force, deleteHours);
        setTasks(prev => prev.filter(t => t.id !== taskId));
        if (deleteHours) {
            setTimesheetEntries(prev => prev.filter(e => e.taskId !== taskId));
        }
    };

    // === TIMESHEET CONTROLLERS ===

    const getTimesheetsByUser = (userId: string): TimesheetEntry[] => {
        return timesheetEntries.filter(e => e.userId === userId);
    };

    const createTimesheet = async (entry: TimesheetEntry): Promise<void> => {
        // Generate a unique ID for ID_Horas_Trabalhadas
        // Using timestamp + random to ensure uniqueness
        const uniqueId = Date.now() + Math.floor(Math.random() * 1000);

        const { data, error } = await supabase
            .from('horas_trabalhadas')
            .insert({
                ID_Horas_Trabalhadas: uniqueId,
                ID_Colaborador: Number(entry.userId),
                ID_Cliente: Number(entry.clientId),
                ID_Projeto: Number(entry.projectId),
                id_tarefa_novo: Number(entry.taskId),
                Data: entry.date,
                Horas_Trabalhadas: entry.totalHours,
                Hora_Inicio: entry.startTime,
                Hora_Fim: entry.endTime,
                Almoco_Deduzido: entry.lunchDeduction,
                Descricao: entry.description
            })
            .select('ID_Horas_Trabalhadas')
            .single();

        if (error) throw error;
        if (data) entry.id = String(data.ID_Horas_Trabalhadas);
        setTimesheetEntries(prev => [entry, ...prev]);
    };

    const updateTimesheet = async (entry: TimesheetEntry): Promise<void> => {
        const { error } = await supabase
            .from('horas_trabalhadas')
            .update({
                ID_Colaborador: Number(entry.userId),
                ID_Cliente: Number(entry.clientId),
                ID_Projeto: Number(entry.projectId),
                id_tarefa_novo: Number(entry.taskId),
                Data: entry.date,
                Horas_Trabalhadas: entry.totalHours,
                Hora_Inicio: entry.startTime,
                Hora_Fim: entry.endTime,
                Almoco_Deduzido: entry.lunchDeduction,
                Descricao: entry.description
            })
            .eq('ID_Horas_Trabalhadas', entry.id);

        if (error) throw error;
        setTimesheetEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
    };

    const deleteTimesheet = async (entryId: string): Promise<void> => {
        const { error } = await supabase
            .from('horas_trabalhadas')
            .delete()
            .eq('ID_Horas_Trabalhadas', entryId);
        if (error) throw error;
        setTimesheetEntries(prev => prev.filter(e => e.id !== entryId));
    };

    // === USER CONTROLLERS ===

    const getUserById = (id: string): User | undefined => {
        return users.find(u => u.id === id);
    };

    const getActiveUsers = (): User[] => {
        return users.filter(u => u.active !== false);
    };

    const createUser = async (userData: Partial<User>): Promise<string> => {
        const { data, error } = await supabase
            .from('dim_colaboradores')
            .insert([{
                NomeColaborador: userData.name,
                email: userData.email,
                Cargo: userData.cargo,
                nivel: userData.nivel,
                role: userData.role ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1) : 'Resource', // Default role
                ativo: userData.active ?? true,
                custo_hora: userData.hourlyCost,
                horas_disponiveis_dia: userData.dailyAvailableHours,
                horas_disponiveis_mes: userData.monthlyAvailableHours
            }])
            .select('ID_Colaborador')
            .single();
        if (error) throw error;
        return String(data.ID_Colaborador);
    };

    const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
        const payload: any = {};
        if (updates.name !== undefined) payload.NomeColaborador = updates.name;
        if (updates.email !== undefined) payload.email = updates.email;
        if (updates.cargo !== undefined) payload.Cargo = updates.cargo;
        if (updates.nivel !== undefined) payload.nivel = updates.nivel;
        if (updates.role !== undefined) payload.role = updates.role.charAt(0).toUpperCase() + updates.role.slice(1);
        if (updates.active !== undefined) payload.ativo = updates.active;
        if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
        if (updates.hourlyCost !== undefined) payload.custo_hora = updates.hourlyCost;
        if (updates.dailyAvailableHours !== undefined) payload.horas_disponiveis_dia = updates.dailyAvailableHours;
        if (updates.monthlyAvailableHours !== undefined) payload.horas_disponiveis_mes = updates.monthlyAvailableHours;

        const { error } = await supabase
            .from('dim_colaboradores')
            .update(payload)
            .eq('ID_Colaborador', Number(userId));
        if (error) throw error;
    };

    const deleteUser = async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('dim_colaboradores')
            .update({ ativo: false })
            .eq('ID_Colaborador', Number(userId));
        if (error) throw error;
    };

    // === MEMBER CONTROLLERS ===

    const getProjectMembers = (projectId: string): string[] => {
        return projectMembers.filter(pm => String(pm.id_projeto) === projectId).map(pm => String(pm.id_colaborador));
    };

    const addProjectMember = async (projectId: string, userId: string, allocationPercentage: number = 100): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .upsert({
                id_projeto: Number(projectId),
                id_colaborador: Number(userId),
                allocation_percentage: allocationPercentage
            }, { onConflict: 'id_projeto, id_colaborador' });

        if (error) throw error;

        setProjectMembers(prev => {
            const exists = prev.find(pm => String(pm.id_projeto) === projectId && String(pm.id_colaborador) === userId);
            if (exists) {
                return prev.map(pm =>
                    String(pm.id_projeto) === projectId && String(pm.id_colaborador) === userId
                        ? { ...pm, allocation_percentage: allocationPercentage }
                        : pm
                );
            }
            return [...prev, {
                id_pc: -1, // Temporary
                id_projeto: Number(projectId),
                id_colaborador: Number(userId),
                allocation_percentage: allocationPercentage
            }];
        });
    };

    const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .match({ id_projeto: Number(projectId), id_colaborador: Number(userId) });
        if (error) throw error;
        setProjectMembers(prev => prev.filter(pm => !(String(pm.id_projeto) === projectId && String(pm.id_colaborador) === userId)));

        // --- LÓGICA AUTOMÁTICA: Remover membro das tarefas onde ele NÃO é o responsável principal ---
        const relatedTasks = tasks.filter(t => t.projectId === projectId);
        for (const task of relatedTasks) {
            // Se ele for o responsável (developerId), MANTÉM ele na tarefa (e por consequência ele precisará ser removido manualmente se for o caso)
            if (String(task.developerId) === String(userId)) {
                console.log(`[DataController] Mantendo responsável na tarefa ${task.id}`);
                continue;
            }

            // Se for apenas colaborador, removemos ele da tabela de vínculos
            if (task.collaboratorIds?.includes(userId)) {
                console.log(`[DataController] Removendo colaborador ${userId} da tarefa ${task.id}`);
                const nextCollabs = task.collaboratorIds.filter(id => id !== userId);
                await updateTask(task.id, { collaboratorIds: nextCollabs });
            }
        }
    };

    // === ABSENCE CONTROLLERS ===

    const createAbsence = async (data: Partial<Absence>): Promise<string> => {
        const { data: row, error } = await supabase
            .from('colaborador_ausencias')
            .insert({
                colaborador_id: Number(data.userId),
                tipo: data.type,
                data_inicio: data.startDate,
                data_fim: data.endDate,
                status: data.status,
                observacoes: data.observations,
                periodo: data.period,
                hora_fim: data.endTime
            })
            .select('id')
            .single();

        if (error) throw error;

        const newAbsence: Absence = {
            id: String(row.id),
            userId: data.userId!,
            type: data.type as any,
            startDate: data.startDate!,
            endDate: data.endDate!,
            status: data.status as any,
            observations: data.observations,
            period: data.period as any,
            endTime: data.endTime
        };
        setAbsences(prev => [...prev, newAbsence]);

        return String(row.id);
    };

    const updateAbsence = async (id: string, updates: Partial<Absence>): Promise<void> => {
        const { error } = await supabase
            .from('colaborador_ausencias')
            .update({
                tipo: updates.type,
                data_inicio: updates.startDate,
                data_fim: updates.endDate,
                status: updates.status,
                observacoes: updates.observations,
                periodo: updates.period,
                hora_fim: updates.endTime
            })
            .eq('id', Number(id));

        if (error) throw error;
        setAbsences(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const deleteAbsence = async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('colaborador_ausencias')
            .delete()
            .eq('id', Number(id));

        if (error) throw error;
        setAbsences(prev => prev.filter(a => a.id !== id));
    };

    // === HOLIDAY CONTROLLERS ===

    const createHoliday = async (data: Partial<Holiday>): Promise<string> => {
        const { data: row, error } = await supabase
            .from('feriados')
            .insert({
                nome: data.name,
                data: data.date,
                data_fim: data.endDate || data.date,
                tipo: data.type,
                observacoes: data.observations,
                periodo: data.period,
                hora_fim: data.endTime
            })
            .select('id')
            .single();

        if (error) throw error;

        const newHoliday: Holiday = {
            id: String(row.id),
            name: data.name!,
            date: data.date!,
            endDate: data.endDate || data.date!,
            type: data.type as any,
            observations: data.observations,
            period: data.period as any,
            endTime: data.endTime
        };
        setHolidays(prev => [...prev, newHoliday]);

        return String(row.id);
    };

    const updateHoliday = async (id: string, updates: Partial<Holiday>): Promise<void> => {
        const { error } = await supabase
            .from('feriados')
            .update({
                nome: updates.name,
                data: updates.date,
                data_fim: updates.endDate || updates.date,
                tipo: updates.type,
                observacoes: updates.observations,
                periodo: updates.period,
                hora_fim: updates.endTime
            })
            .eq('id', Number(id));

        if (error) throw error;
        setHolidays(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    };

    const deleteHoliday = async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('feriados')
            .delete()
            .eq('id', Number(id));

        if (error) throw error;
        setHolidays(prev => prev.filter(h => h.id !== id));
    };

    return {
        clients, projects, tasks, users, timesheetEntries, projectMembers, absences, holidays, loading, error,
        getClientById, getActiveClients, createClient, updateClient, deactivateClient, deleteClient,
        getProjectById, getProjectsByClient, createProject, updateProject, deleteProject,
        getTaskById, getTasksByProject, getTasksByUser, createTask, updateTask, deleteTask,
        getTimesheetsByUser, createTimesheet, updateTimesheet, deleteTimesheet,
        getUserById, getActiveUsers, createUser, updateUser, deleteUser,
        getProjectMembers, addProjectMember, removeProjectMember,
        createAbsence, updateAbsence, deleteAbsence,
        createHoliday, updateHoliday, deleteHoliday,
        taskMemberAllocations, setTaskMemberAllocations
    };
}
