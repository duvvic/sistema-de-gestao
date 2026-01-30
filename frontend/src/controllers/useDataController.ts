import { useData } from '@/contexts/DataContext';
import { Task, Project, Client, User, TimesheetEntry, Absence } from '@/types';
import { supabase } from '@/services/supabaseClient';
import * as clientService from '@/services/clientService';
import * as projectService from '@/services/projectService';
import * as taskService from '@/services/taskService';
import { useAuth } from '@/contexts/AuthContext';


export const useDataController = () => {
    const {
        clients, setClients,
        projects, setProjects,
        tasks, setTasks,
        users, setUsers,
        timesheetEntries, setTimesheetEntries,
        projectMembers, setProjectMembers,
        absences, setAbsences,
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
        const newProject = { ...projectData, id: String(newId) } as Project;
        setProjects(prev => [...prev, newProject]);
        return String(newId);
    };

    const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
        await projectService.updateProject(projectId, updates);
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
    };

    const deleteProject = async (projectId: string): Promise<void> => {
        await projectService.deleteProject(projectId);
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

    const deleteTask = async (taskId: string): Promise<void> => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        await taskService.deleteTask(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
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
                ativo: userData.active ?? true
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
        return projectMembers.filter(pm => pm.projectId === projectId).map(pm => pm.userId);
    };

    const addProjectMember = async (projectId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .upsert({ id_projeto: Number(projectId), id_colaborador: Number(userId) }, { onConflict: 'id_projeto, id_colaborador' });
        if (error) throw error;
        setProjectMembers(prev => {
            if (prev.some(pm => pm.projectId === projectId && pm.userId === userId)) return prev;
            return [...prev, { projectId, userId }];
        });
    };

    const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .match({ id_projeto: Number(projectId), id_colaborador: Number(userId) });
        if (error) throw error;
        setProjectMembers(prev => prev.filter(pm => !(pm.projectId === projectId && pm.userId === userId)));
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
                observacoes: data.observations
            })
            .select('id')
            .single();

        if (error) throw error;
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
                observacoes: updates.observations
            })
            .eq('id', Number(id));

        if (error) throw error;
    };

    const deleteAbsence = async (id: string): Promise<void> => {
        const { error } = await supabase
            .from('colaborador_ausencias')
            .delete()
            .eq('id', Number(id));

        if (error) throw error;
    };

    return {
        clients, projects, tasks, users, timesheetEntries, projectMembers, absences, loading, error,
        getClientById, getActiveClients, createClient, updateClient, deactivateClient, deleteClient,
        getProjectById, getProjectsByClient, createProject, updateProject, deleteProject,
        getTaskById, getTasksByProject, getTasksByUser, createTask, updateTask, deleteTask,
        getTimesheetsByUser, createTimesheet, updateTimesheet, deleteTimesheet,
        getUserById, getActiveUsers, createUser, updateUser, deleteUser,
        getProjectMembers, addProjectMember, removeProjectMember,
        createAbsence, updateAbsence, deleteAbsence
    };
};
