// controllers/useDataController.ts
// Controller hook para gerenciar dados da aplicação (Clients, Projects, Tasks, etc)

import { useState, useEffect } from 'react';
import { useAppData } from '../hooks/useAppData';
import { Task, Project, Client, User, TimesheetEntry } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export const useDataController = () => {
    // Verificar se o usuário está autenticado
    const { currentUser, isLoading: authLoading } = useAuth();

    // Hook do Supabase para dados em tempo real (só carrega se autenticado)
    const {
        users: loadedUsers,
        clients: loadedClients,
        projects: loadedProjects,
        tasks: loadedTasks,
        timesheetEntries: loadedTimesheets,
        loading: dataLoading,
        error: dataError,
    } = useAppData();

    // State local
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);
    const [projectMembers, setProjectMembers] = useState<{ projectId: string, userId: string }[]>([]);

    // Sincronizar com dados do Supabase
    useEffect(() => {
        if (!currentUser || authLoading || dataLoading) {
            return;
        }

        setClients(loadedClients);
        setProjects(loadedProjects);
        setTasks(loadedTasks);
        setTimesheetEntries(loadedTimesheets);

        if (loadedUsers.length > 0) {
            setUsers(loadedUsers);
        }

        // Carregar Membros do Projeto (Tabela Nova)
        const loadProjectMembers = async () => {
            const { data, error } = await supabase
                .from('project_members')
                .select('id_projeto, id_colaborador');

            if (!error && data) {
                setProjectMembers(data.map((row: any) => ({
                    projectId: String(row.id_projeto),
                    userId: String(row.id_colaborador)
                })));
            }
        };
        loadProjectMembers();

    }, [currentUser, authLoading, dataLoading, loadedClients, loadedProjects, loadedTasks, loadedUsers, loadedTimesheets]);

    // === CLIENT CONTROLLERS ===

    const getClientById = (id: string): Client | undefined => {
        return clients.find(c => c.id === id);
    };

    const getActiveClients = (): Client[] => {
        return clients.filter(c => c.active !== false);
    };

    const createClient = async (clientData: Partial<Client>): Promise<string> => {
        const { createClient: createClientDb } = await import('../services/clientService');
        const newId = await createClientDb(clientData as Client);

        // Buscar o registro completo
        const { data: row } = await supabase
            .from('dim_clientes')
            .select('*')
            .eq('ID_Cliente', newId)
            .single();

        if (row) {
            const newClient: any = {
                id: String(row.ID_Cliente),
                name: row.NomeCliente,
                logoUrl: row.NewLogo,
                active: row.ativo ?? true,
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
                NewLogo: updates.logoUrl
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
            c.id === clientId ? { ...(c as any), active: false, Desativado: reason } : c
        ));
    };

    // === PROJECT CONTROLLERS ===

    const getProjectById = (id: string): Project | undefined => {
        return projects.find(p => p.id === id);
    };

    const getProjectsByClient = (clientId: string): Project[] => {
        return projects.filter(p => p.clientId === clientId && p.active !== false);
    };

    const createProject = async (projectData: Partial<Project>): Promise<string> => {
        const { createProject: createProjectDb } = await import('../services/projectService');
        const newId = await createProjectDb(projectData);

        const newProject = { ...projectData, id: String(newId) } as Project;
        setProjects(prev => [...prev, newProject]);

        return String(newId);
    };

    const updateProject = async (projectId: string, updates: Partial<Project>): Promise<void> => {
        const { updateProject: updateProjectDb } = await import('../services/projectService');
        await updateProjectDb(projectId, updates);

        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
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
        const taskModule = await import('../services/taskService');
        const createTaskFn = (taskModule as any).createTask ??
            (taskModule as any).default?.createTask ??
            (taskModule as any).default;

        const newId = await createTaskFn(taskData);
        const newTask = { ...taskData, id: String(newId) } as Task;
        setTasks(prev => [...prev, newTask]);

        return String(newId);
    };

    const updateTask = async (taskId: string, updates: Partial<Task>): Promise<void> => {
        const taskModule = await import('../services/taskService');
        const updateTaskFn = (taskModule as any).updateTask ??
            (taskModule as any).default?.updateTask ??
            (taskModule as any).default;

        await updateTaskFn(taskId, updates);
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    };

    const deleteTask = async (taskId: string): Promise<void> => {
        const taskModule = await import('../services/taskService');
        const deleteTaskFn = (taskModule as any).deleteTask ??
            (taskModule as any).default?.deleteTask ??
            (taskModule as any).default;

        await deleteTaskFn(taskId);
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    // === TIMESHEET CONTROLLERS ===

    const getTimesheetsByUser = (userId: string): TimesheetEntry[] => {
        return timesheetEntries.filter(e => e.userId === userId);
    };

    const getTimesheetsByClient = (clientId: string): TimesheetEntry[] => {
        return timesheetEntries.filter(e => e.clientId === clientId);
    };

    const createTimesheet = async (entry: TimesheetEntry): Promise<void> => {
        const { data, error } = await supabase
            .from('horas_trabalhadas')
            .insert({
                ID_Colaborador: Number(entry.userId),
                ID_Cliente: Number(entry.clientId),
                ID_Projeto: Number(entry.projectId),
                id_tarefa_novo: Number(entry.taskId),
                Data: entry.date,
                Horas_Trabalhadas: entry.totalHours
            })
            .select('ID_Horas_Trabalhadas')
            .single();

        if (error) throw error;

        if (data) {
            entry.id = String(data.ID_Horas_Trabalhadas);
        }

        setTimesheetEntries(prev => [...prev, entry]);
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
                Horas_Trabalhadas: entry.totalHours
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
                Nome_Colaborador: userData.name,
                Email: userData.email,
                Cargo: userData.cargo,
                Nivel_Acesso: userData.role,
                Ativo: userData.active
            }])
            .select('ID_Colaborador')
            .single();

        if (error) throw error;
        return String(data.ID_Colaborador);
    };

    const updateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
        const { error } = await supabase
            .from('dim_colaboradores')
            .update({
                Nome_Colaborador: updates.name,
                Email: updates.email,
                Cargo: updates.cargo,
                Nivel_Acesso: updates.role,
                Ativo: updates.active,
                Avatar_URL: updates.avatarUrl
            })
            .eq('ID_Colaborador', Number(userId));

        if (error) throw error;
    };

    const deleteUser = async (userId: string): Promise<void> => {
        const { error } = await supabase
            .from('dim_colaboradores')
            .update({ Ativo: false })
            .eq('ID_Colaborador', Number(userId));

        if (error) throw error;
    };

    // === PROJECT MEMBERS CONTROLLERS ===

    const getProjectMembers = (projectId: string): string[] => {
        return projectMembers
            .filter(pm => pm.projectId === projectId)
            .map(pm => pm.userId);
    };

    const addProjectMember = async (projectId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .insert({
                id_projeto: Number(projectId),
                id_colaborador: Number(userId)
            });

        if (error) throw error;

        setProjectMembers(prev => [...prev, { projectId, userId }]);
    };

    const removeProjectMember = async (projectId: string, userId: string): Promise<void> => {
        const { error } = await supabase
            .from('project_members')
            .delete()
            .match({
                id_projeto: Number(projectId),
                id_colaborador: Number(userId)
            });

        if (error) throw error;

        setProjectMembers(prev => prev.filter(pm => !(pm.projectId === projectId && pm.userId === userId)));
    };


    return {
        // State
        clients,
        projects,
        tasks,
        users,
        timesheetEntries,
        projectMembers,
        loading: dataLoading,
        error: dataError,

        // Client methods
        getClientById,
        getActiveClients,
        createClient,
        updateClient,
        deactivateClient,

        // Project methods
        getProjectById,
        getProjectsByClient,
        createProject,
        updateProject,

        // Task methods
        getTaskById,
        getTasksByProject,
        getTasksByUser,
        createTask,
        updateTask,
        deleteTask,

        // Timesheet methods
        getTimesheetsByUser,
        getTimesheetsByClient,
        createTimesheet,
        updateTimesheet,
        deleteTimesheet,

        // User methods
        getUserById,
        getActiveUsers,
        createUser,
        updateUser,
        deleteUser,

        // Member methods
        getProjectMembers,
        addProjectMember,
        removeProjectMember
    };
};
