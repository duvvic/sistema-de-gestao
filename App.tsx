// App.tsx
// Aplicação principal com integração Supabase

import React, { useState, useEffect } from 'react';
import KanbanBoard from './components/KanbanBoard';
import KanbanProjects from './components/KanbanProjects';
import TaskDetail from './components/TaskDetail';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ProjectForm from './components/ProjectForm';
import ClientForm from './components/ClientForm';
import ProjectsView from './components/ProjectsView';
import AllProjectsView from './components/AllProjectsView';
import ClientDetailsView from './components/ClientDetailsView';
import ProjectDetailView from './components/ProjectDetailView';
import UserTasks from './components/UserTasks';
import DeveloperProjects from './components/DeveloperProjects';
import TeamList from './components/TeamList';
import TeamMemberDetail from './components/TeamMemberDetail';
import TimesheetCalendar from './components/TimesheetCalendar';
import TimesheetForm from './components/TimesheetForm';
import TimesheetAdminDashboard from './components/TimesheetAdminDashboard';
import TimesheetAdminDetail from './components/TimesheetAdminDetail';
import UserForm from './components/UserForm';
import UserProfile from './components/UserProfile';
import ResetPassword from './components/ResetPassword';
import ConfirmationModal from './components/ConfirmationModal';
import { Task, Project, Client, View, User, TimesheetEntry } from './types';
import { LayoutDashboard, Users, CheckSquare, LogOut, Briefcase, Clock } from 'lucide-react';
import { useAppData } from './hooks/useAppData';
import { supabase } from './services/supabaseClient';
import { deactivateUser } from './services/api';

// Services para CRUD no Supabase
import { createClient as createClientDb, deleteClient as deleteClientDb } from './services/clientService';
import { deleteProject as deleteProjectDb } from './services/projectService';
// projectService and taskService are imported dynamically where needed to avoid
// static resolution issues during the Vite/Rollup build.

// =====================================================
// FALLBACK DATA (caso o banco esteja vazio)
// =====================================================
const FALLBACK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@nic.com', role: 'admin' },
  { id: 'u2', name: 'João S.', email: 'joao@nic.com', role: 'developer' },
];

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

// Error Boundary simples para capturar erros em componentes filhos
// Tipos simplificados para evitar conflitos com o compilador
type ErrorBoundaryProps = { name?: string; children: React.ReactNode };
type ErrorBoundaryState = { hasError: boolean; error?: any };
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {

  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-bold text-red-700">Ocorreu um erro ao renderizar {this.props.name || 'a seção'}.</p>
            <p className="text-sm text-red-600">Verifique o console para detalhes. Você pode tentar voltar para o painel.</p>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}
function App() {
  
  // Verifica se está na rota de reset de senha
  const [isResetPassword, setIsResetPassword] = useState(false);
  
  useEffect(() => {
    // Escuta mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      // Se recebeu evento PASSWORD_RECOVERY, mostra tela de reset
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Hook do Supabase
  const {
    users: loadedUsers,
    clients: loadedClients,
    projects: loadedProjects,
    tasks: loadedTasks,
    timesheetEntries: loadedTimesheets,
    loading: dataLoading,
    error: dataError,
  } = useAppData();

  // State de autenticação
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login');

  // State de dados (local, sincronizado com Supabase)
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>(FALLBACK_USERS);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);

  // State de seleção
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // State de Timesheet
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState<string | undefined>(undefined);
  const [timesheetEntryToEdit, setTimesheetEntryToEdit] = useState<TimesheetEntry | null>(null);
  const [timesheetAdminClient, setTimesheetAdminClient] = useState<string | null>(null);
  const [timesheetAdminUser, setTimesheetAdminUser] = useState<string | null>(null);
  const [timesheetAdminReturnToStatus, setTimesheetAdminReturnToStatus] = useState(false);
  const [previousView, setPreviousView] = useState<View | null>(null);

  // Modal de conclusão de tarefa
  const [taskCompletionModalOpen, setTaskCompletionModalOpen] = useState(false);
  const [pendingTaskToSave, setPendingTaskToSave] = useState<Task | null>(null);

  // =====================================================
  // SINCRONIZAÇÃO COM SUPABASE
  // =====================================================
  useEffect(() => {
    if (!dataLoading) {
      
      setClients(loadedClients);
      setProjects(loadedProjects);
      setTasks(loadedTasks);
      setTimesheetEntries(loadedTimesheets);
      
      // Só atualiza users se o banco retornou dados
      if (loadedUsers.length > 0) {
        setUsers(loadedUsers);
      }
    }
  }, [dataLoading, loadedClients, loadedProjects, loadedTasks, loadedUsers, loadedTimesheets]);

  // Reassocia o usuário atual aos dados mais recentes pelo e-mail
  useEffect(() => {
    if (!currentUser) return;
    const normalizedEmail = (currentUser.email || '').trim().toLowerCase();
    const matched = users.find(u => (u.email || '').trim().toLowerCase() === normalizedEmail);
    if (matched && matched.id !== currentUser.id) {
      setCurrentUser(matched);
      // Limpa selectedUserId se não for admin ou se mudou o usuário
      if (currentUser.role !== 'admin') {
        setSelectedUserId(null);
      }
    }
  }, [users, currentUser]);

  // =====================================================
  // HANDLERS - LOGIN/LOGOUT
  // =====================================================
  const handleLogin = (user: User) => {
    const normalizedEmail = (user.email || '').trim().toLowerCase();
    const matchedUser = loadedUsers.find(
      u => (u.email || '').trim().toLowerCase() === normalizedEmail
    );
    const resolvedUser = matchedUser || user;

    setCurrentUser(resolvedUser);
    // Só seta selectedUserId se for admin
    setSelectedUserId(null);
    setCurrentView(resolvedUser.role === 'admin' ? 'admin' : 'developer-projects');
    setActiveMenu(resolvedUser.role === 'admin' ? 'clients' : 'dev-projects');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setSelectedClientId(null);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setSelectedUserId(null);
    setActiveMenu(null);
    setSelectedTeamMember(null);
    setTimesheetEntryToEdit(null);
    setSelectedTimesheetDate(undefined);
    setTimesheetAdminClient(null);
    setPreviousView(null);
  };

  // =====================================================
  // HANDLERS - TIMESHEET
  // =====================================================
  const handleTimesheetNav = () => {
    if (currentUser?.role === 'admin') {
      setCurrentView('timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleTimesheetDateClick = (date: string) => {
    setSelectedTimesheetDate(date);
    setTimesheetEntryToEdit(null);
    if (currentView !== 'timesheet-form') {
      setPreviousView(currentView);
    }
    setCurrentView('timesheet-form');
  };

  const handleTimesheetEntryClick = (entry: TimesheetEntry) => {
    setTimesheetEntryToEdit(entry);
    if (currentView !== 'timesheet-form') {
      setPreviousView(currentView);
    }
    setCurrentView('timesheet-form');
  };

  const handleCreateTimesheetForTask = (task: Task) => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const initial: TimesheetEntry = {
      id: crypto.randomUUID(),
      userId: currentUser.id,
      userName: currentUser.name,
      clientId: task.clientId || '',
      projectId: task.projectId || '',
      taskId: task.id,
      date: today,
      startTime: '09:00',
      endTime: '18:00',
      totalHours: 9,
      description: `Apontamento rápido: ${task.title}`,
    };

    setPreviousView(currentView);
    setTimesheetEntryToEdit(initial);
    setCurrentView('timesheet-form');
  };

  const handleSaveTimesheet = async (entry: TimesheetEntry) => {
    try {
      
      const exists = timesheetEntries.some(e => e.id === entry.id);
      
      if (exists) {
        // Update
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
      } else {
        // Insert
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
        
        // Atualiza o ID com o retornado do banco
        if (data) {
          entry.id = String(data.ID_Horas_Trabalhadas);
        }
      }

      // Atualiza estado local
      setTimesheetEntries(prev => {
        const existsInState = prev.some(e => e.id === entry.id);
        const newState = existsInState
          ? prev.map(e => (e.id === entry.id ? entry : e))
          : [...prev, entry];
        return newState;
      });

    } catch (error) {

      alert('Erro ao salvar apontamento. Tente novamente.');
      return;
    }

    // Restaura view anterior ou padrão
    if (previousView && previousView !== 'timesheet-form') {
      setCurrentView(previousView);
      setPreviousView(null);
    } else if (currentUser?.role === 'admin') {
      setCurrentView(timesheetAdminClient ? 'timesheet-admin-detail' : 'timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleDeleteTimesheet = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('horas_trabalhadas')
        .delete()
        .eq('ID_Horas_Trabalhadas', entryId);

      if (error) throw error;

      setTimesheetEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (error) {

      alert('Erro ao excluir apontamento. Tente novamente.');
      return;
    }

    if (currentUser?.role === 'admin') {
      setCurrentView(timesheetAdminClient ? 'timesheet-admin-detail' : 'timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleAdminTimesheetClientClick = (clientId: string) => {
    setTimesheetAdminClient(clientId);
    setCurrentView('timesheet-admin-detail');
    setActiveMenu('timesheet');
  };

  // =====================================================
  // HANDLERS - CLIENTES
  // =====================================================
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('kanban');
  };

  const handleClientSelectProjects = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('client-details');
  };

  const handleClientSelectDetails = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('client-details');
  };

  const handleNewClient = () => {
    setCurrentView('client-create');
  };

  const handleSaveClient = async (newClient: Client) => {
    try {
      // Salva no Supabase e obtém o ID real
      const newId = await createClientDb(newClient);
      // Busca o registro completo para incluir Criado e Contrato
      const { data: row, error: fetchErr } = await supabase
        .from('dim_clientes')
        .select('ID_Cliente, NomeCliente, NewLogo, ativo, Criado, Contrato')
        .eq('ID_Cliente', newId)
        .single();

      if (fetchErr) {
        const fallback = { ...newClient, id: String(newId) } as any;
        setClients(prev => [...prev, fallback]);
      } else {
        const mapped: any = {
          id: String(row.ID_Cliente),
          name: row.NomeCliente || newClient.name,
          logoUrl: row.NewLogo || newClient.logoUrl,
          active: row.ativo ?? true,
          Criado: row.Criado ?? null,
          Contrato: row.Contrato ?? null,
        };
        setClients(prev => [...prev, mapped]);
      }
      
      setCurrentView('admin');
    } catch (error) {

      alert("Erro ao salvar cliente. Tente novamente.");
    }
  };

  const handleEditClient = async (editedClient: Client) => {
    try {
      // Atualiza no Supabase (presumindo que haja uma função updateClient)
      const { error } = await supabase
        .from('dim_clientes')
        .update({ 
          NomeCliente: editedClient.name,
          NewLogo: editedClient.logoUrl 
        })
        .eq('ID_Cliente', Number(editedClient.id));

      if (error) {

        alert('Erro ao atualizar cliente.');
        return;
      }

      // Atualiza no state local
      setClients(prev => prev.map(c => c.id === editedClient.id ? editedClient : c));
      alert('Cliente atualizado com sucesso!');
    } catch (error) {

      alert('Erro ao atualizar cliente.');
    }
  };

  const handleDeactivateClient = async (clientId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('dim_clientes')
        .update({ 
          ativo: false,
          Desativado: reason 
        })
        .eq('ID_Cliente', Number(clientId));

      if (error) {

        alert('Erro ao desativar cliente.');
        return;
      }

      setClients(prev => prev.map(c => c.id === clientId ? { ...(c as any), active: false, Desativado: reason } : c));
      alert('Cliente desativado com sucesso!');
      setCurrentView('admin');
    } catch (error) {

      alert('Erro ao desativar cliente.');
    }
  };

  // =====================================================
  // HANDLERS - PROJETOS
  // =====================================================
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProjectDb(projectId);
      setProjects(prev => prev.map(p => (p.id === projectId ? { ...p, active: false, status: 'Concluído' } : p)));
    } catch (error) {

      alert('Erro ao desativar projeto. Tente novamente.');
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      // Deleta no Supabase (soft delete)
      await deleteClientDb(clientId);
      
      // Remove do state local
      setClients(prev => prev.filter(c => c.id !== clientId));
      
    } catch (error) {

      alert("Erro ao deletar cliente. Tente novamente.");
    }
  };

  // =====================================================
  // HANDLERS - TAREFAS
  // =====================================================
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView('task-detail');
  };

  const handleNewTask = () => {
    setSelectedTaskId(null);
    setCurrentView('task-create');
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      // Deleta no Supabase via módulo, com fallback direto
      try {
        const taskModule = await import('./services/taskService');
        let deleteTask: any = (taskModule as any).deleteTask ?? (taskModule as any).default?.deleteTask ?? (taskModule as any).default;
        if (deleteTask && typeof deleteTask.deleteTask === 'function') deleteTask = deleteTask.deleteTask;
        if (typeof deleteTask === 'function') {
          await deleteTask(taskId);
        } else {
          throw new Error('deleteTask não encontrado');
        }
      } catch (modErr) {
        await supabase.from('fato_tarefas').delete().eq('id_tarefa_novo', Number(taskId));
      }
      
      // Remove do state local
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      
    } catch (error) {

      alert("Erro ao deletar tarefa. Tente novamente.");
    }
  };

  const handleSaveTask = async (updatedTask: Task) => {
    try {
      // Resolve o ID do colaborador a partir do nome enviado pelo formulário
      const assignedUser = updatedTask.developerId
        ? users.find(u => u.id === updatedTask.developerId)
        : users.find(u => u.name?.trim().toLowerCase() === (updatedTask.developer || '').trim().toLowerCase());

      const developerId = assignedUser?.id || updatedTask.developerId;
      const developerName = updatedTask.developer || assignedUser?.name;

      const taskToPersist: Task = {
        ...updatedTask,
        developerId,
        developer: developerName,
      };

      // Verifica se a tarefa vai ser concluída (progresso 100% ou status Done)
      const existingTask = tasks.find(t => t.id === taskToPersist.id);
      const wasNotDone = existingTask && existingTask.status !== 'Done' && !existingTask.actualDelivery;
      const willBeDone = taskToPersist.progress === 100 || taskToPersist.status === 'Done';
      
      // Se vai concluir, ajusta dados e mostra modal
      if (wasNotDone && willBeDone) {
        if (taskToPersist.progress === 100) {
          taskToPersist.status = 'Done';
          taskToPersist.actualDelivery = new Date().toISOString().split('T')[0];
        } else if (taskToPersist.status === 'Done' && taskToPersist.progress !== 100) {
          taskToPersist.progress = 100;
          if (!taskToPersist.actualDelivery) {
            taskToPersist.actualDelivery = new Date().toISOString().split('T')[0];
          }
        }
        
        setPendingTaskToSave(taskToPersist);
        setTaskCompletionModalOpen(true);
        return;
      }

      const exists = tasks.some(t => t.id === taskToPersist.id);
      
      if (exists) {
        // UPDATE no Supabase com resolução robusta + fallback
        try {
          const taskModule = await import('./services/taskService');
          let updateTask: any = (taskModule as any).updateTask ?? (taskModule as any).default?.updateTask ?? (taskModule as any).default;
          if (updateTask && typeof updateTask.updateTask === 'function') updateTask = updateTask.updateTask;
          if (typeof updateTask !== 'function') throw new Error('updateTask não encontrado');
          await updateTask(taskToPersist.id, taskToPersist);
        } catch (modErr) {
          // Map mínimo para payload
          const mapStatusToDb = (s?: string) => s === 'Done' ? 'Concluído' : s === 'In Progress' ? 'Em Andamento' : s === 'Review' ? 'Revisão' : 'A Fazer';
          const mapPriorityToDb = (p?: string) => p === 'Critical' ? 'Crítica' : p === 'High' ? 'Alta' : p === 'Medium' ? 'Média' : p === 'Low' ? 'Baixa' : null;
          const mapImpactToDb = (i?: string) => i === 'High' ? 'Alto' : i === 'Medium' ? 'Médio' : i === 'Low' ? 'Baixo' : null;
          const payload: any = {
            Afazer: taskToPersist.title,
            StatusTarefa: mapStatusToDb(taskToPersist.status),
            entrega_estimada: taskToPersist.estimatedDelivery || null,
            entrega_real: taskToPersist.actualDelivery || null,
            inicio_previsto: taskToPersist.scheduledStart || null,
            inicio_real: taskToPersist.actualStart || null,
            Porcentagem: taskToPersist.progress ?? 0,
            Prioridade: mapPriorityToDb(taskToPersist.priority),
            Impacto: mapImpactToDb(taskToPersist.impact),
            Riscos: taskToPersist.risks || null,
            "Observações": taskToPersist.notes || null,
            ID_Colaborador: taskToPersist.developerId ? Number(taskToPersist.developerId) : null,
          };
          await supabase.from('fato_tarefas').update(payload).eq('id_tarefa_novo', Number(taskToPersist.id));
        }
        setTasks(prev => prev.map(t => (t.id === taskToPersist.id ? taskToPersist : t)));
      } else {
        // CREATE no Supabase com resolução robusta + fallback
        let newId: any;
        try {
          const taskModule = await import('./services/taskService');
          let createTask: any = (taskModule as any).createTask ?? (taskModule as any).default?.createTask ?? (taskModule as any).default;
          if (createTask && typeof createTask.createTask === 'function') createTask = createTask.createTask;
          if (typeof createTask !== 'function') throw new Error('createTask não encontrado');
          newId = await createTask(taskToPersist);
        } catch (modErr) {

          const mapStatusToDb = (s?: string) => s === 'Done' ? 'Concluído' : s === 'In Progress' ? 'Em Andamento' : s === 'Review' ? 'Revisão' : 'A Fazer';
          const mapPriorityToDb = (p?: string) => p === 'Critical' ? 'Crítica' : p === 'High' ? 'Alta' : p === 'Medium' ? 'Média' : p === 'Low' ? 'Baixa' : null;
          const mapImpactToDb = (i?: string) => i === 'High' ? 'Alto' : i === 'Medium' ? 'Médio' : i === 'Low' ? 'Baixo' : null;
          const payload: any = {
            Afazer: taskToPersist.title || '(Sem título)',
            ID_Projeto: Number(taskToPersist.projectId),
            ID_Cliente: Number(taskToPersist.clientId),
            StatusTarefa: mapStatusToDb(taskToPersist.status),
            entrega_estimada: taskToPersist.estimatedDelivery || null,
            entrega_real: taskToPersist.actualDelivery || null,
            inicio_previsto: taskToPersist.scheduledStart || null,
            inicio_real: taskToPersist.actualStart || null,
            Porcentagem: taskToPersist.progress ?? 0,
            Prioridade: mapPriorityToDb(taskToPersist.priority),
            Impacto: mapImpactToDb(taskToPersist.impact),
            Riscos: taskToPersist.risks || null,
            "Observações": taskToPersist.notes || null,
            ID_Colaborador: taskToPersist.developerId ? Number(taskToPersist.developerId) : null,
          };
          const { data: inserted, error } = await supabase
            .from('fato_tarefas')
            .insert(payload)
            .select('id_tarefa_novo')
            .single();
          if (error) throw error;
          newId = inserted.id_tarefa_novo;
        }
        const taskWithRealId = { ...taskToPersist, id: String(newId) };
        setTasks(prev => [...prev, taskWithRealId]);
      }

      // Navegação após salvar
      if (selectedUserId) {
        setCurrentView('team-member-detail');
      } else if (currentUser?.role !== 'admin') {
        setCurrentView('user-tasks');
      } else {
        setCurrentView('kanban');
      }
      
      setSelectedTaskId(null);
    } catch (error) {

      alert("Erro ao salvar tarefa. Tente novamente.");
    }
  };

  const handleConfirmTaskCompletion = async () => {
    if (!pendingTaskToSave) return;
    
    // Executa o salvamento da tarefa com os dados ajustados
    try {
      const taskToPersist = pendingTaskToSave;
      const exists = tasks.some(t => t.id === taskToPersist.id);
      
      if (exists) {
        // UPDATE no Supabase
        try {
          const taskModule = await import('./services/taskService');
          let updateTask: any = (taskModule as any).updateTask ?? (taskModule as any).default?.updateTask ?? (taskModule as any).default;
          if (updateTask && typeof updateTask.updateTask === 'function') updateTask = updateTask.updateTask;
          if (typeof updateTask !== 'function') throw new Error('updateTask não encontrado');
          await updateTask(taskToPersist.id, taskToPersist);
        } catch (modErr) {

          const mapStatusToDb = (s?: string) => s === 'Done' ? 'Concluído' : s === 'In Progress' ? 'Em Andamento' : s === 'Review' ? 'Revisão' : 'A Fazer';
          const mapPriorityToDb = (p?: string) => p === 'Critical' ? 'Crítica' : p === 'High' ? 'Alta' : p === 'Medium' ? 'Média' : p === 'Low' ? 'Baixa' : null;
          const mapImpactToDb = (i?: string) => i === 'High' ? 'Alto' : i === 'Medium' ? 'Médio' : i === 'Low' ? 'Baixo' : null;
          const payload: any = {
            Afazer: taskToPersist.title || '(Sem título)',
            ID_Projeto: Number(taskToPersist.projectId),
            ID_Cliente: Number(taskToPersist.clientId),
            StatusTarefa: mapStatusToDb(taskToPersist.status),
            entrega_estimada: taskToPersist.estimatedDelivery || null,
            entrega_real: taskToPersist.actualDelivery || null,
            inicio_previsto: taskToPersist.scheduledStart || null,
            inicio_real: taskToPersist.actualStart || null,
            Porcentagem: taskToPersist.progress ?? 0,
            Prioridade: mapPriorityToDb(taskToPersist.priority),
            Impacto: mapImpactToDb(taskToPersist.impact),
            Riscos: taskToPersist.risks || null,
            "Observações": taskToPersist.notes || null,
            ID_Colaborador: taskToPersist.developerId ? Number(taskToPersist.developerId) : null,
          };
          await supabase.from('fato_tarefas').update(payload).eq('id_tarefa_novo', Number(taskToPersist.id));
        }
        setTasks(prev => prev.map(t => (t.id === taskToPersist.id ? taskToPersist : t)));
      }

      // Navegação após salvar
      if (selectedUserId) {
        setCurrentView('team-member-detail');
      } else if (currentUser?.role !== 'admin') {
        setCurrentView('user-tasks');
      } else {
        setCurrentView('kanban');
      }
      
      setSelectedTaskId(null);
      setTaskCompletionModalOpen(false);
      setPendingTaskToSave(null);
    } catch (error) {

      alert("Erro ao salvar tarefa. Tente novamente.");
    }
  };

  // =====================================================
  // HANDLERS - PROJETOS
  // =====================================================
  const handleNewProject = () => {
    setSelectedClientId(null); // Limpa cliente selecionado para permitir escolha livre
    setCurrentView('project-create');
  };

  const handleSaveProject = async (newProject: Project) => {
    try {
      // Verificar se já existe projeto com o mesmo nome para o mesmo cliente
      const { data: existingProjects, error: checkError } = await supabase
        .from('dim_projetos')
        .select('NomeProjeto')
        .eq('ID_Cliente', Number(newProject.clientId))
        .eq('NomeProjeto', newProject.name)
        .eq('ativo', true);

      if (checkError) {

        throw checkError;
      }

      if (existingProjects && existingProjects.length > 0) {
        alert(`⚠️ Já existe um projeto com o nome "${newProject.name}" para este cliente!`);
        return;
      }

      // Salva no Supabase e obtém o ID real
      let newId: number | string | undefined;
      try {
        const projectModule = await import('./services/projectService');

        let createProject: any = (projectModule as any).createProject ?? (projectModule as any).default?.createProject ?? (projectModule as any).default;
        if (createProject && typeof createProject.createProject === 'function') {
          createProject = createProject.createProject;
        }
        if (typeof createProject !== 'function') {
          throw new Error('createProject não encontrado no módulo');
        }
        newId = await createProject(newProject);
      } catch (modErr) {

        const payload = {
          NomeProjeto: newProject.name || '(Sem nome)',
          ID_Cliente: Number(newProject.clientId),
          StatusProjeto: newProject.status || 'Em andamento',
          ativo: true,
        };
        const { data: inserted, error } = await supabase
          .from('dim_projetos')
          .insert(payload)
          .select('ID_Projeto')
          .single();
        if (error) throw error;
        newId = inserted.ID_Projeto;
      }

      
      // Atualiza o state local com o ID do banco
      const projectWithRealId = { ...newProject, id: String(newId) };
      setProjects(prev => [...prev, projectWithRealId]);

      // Navigate back depending on the current user role: developers return to their projects view
      if (currentUser?.role === 'developer') {
        setCurrentView('developer-projects');
      } else {
        setCurrentView('kanban');
      }
      if (!selectedClientId) setSelectedClientId(newProject.clientId);
    } catch (error) {

      alert("Erro ao salvar projeto. Tente novamente.");
    }
  };

  const handleDeveloperProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('user-tasks');
  };

  // =====================================================
  // HANDLERS - EQUIPE
  // =====================================================
  const handleTeamMemberSelect = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView('team-member-detail');
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const ok = await deactivateUser(userId);
      if (!ok) throw new Error("Nenhum registro atualizado");
      // Marca como inativo localmente e esconde da lista
      setUsers(prev => prev
        .map(u => u.id === userId ? { ...u, active: false } : u)
        .filter(u => u.active !== false));
    } catch (error) {

      alert("Erro ao desativar colaborador. Verifique permissões RLS e tente novamente.");
      throw error; // propaga para não fechar modal se falhar
    }
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    try {
      if (userData.id) {
        // Editar usuário existente
        const { error } = await supabase
          .from('dim_colaboradores')
          .update({
            NomeColaborador: userData.name,
            "E-mail": userData.email,
            Cargo: userData.cargo || null,
            papel: userData.role || 'developer',
            ativo: userData.active
          })
          .eq('ID_Colaborador', Number(userData.id));

        if (error) throw error;

        // Atualiza estado local
        setUsers(prev => prev.map(u => 
          u.id === userData.id 
            ? { ...u, name: userData.name!, email: userData.email!, cargo: userData.cargo, role: userData.role || 'developer', active: userData.active! }
            : u
        ));

      } else {
        // Insere novo usuário no Supabase
        const { data, error } = await supabase
          .from('dim_colaboradores')
          .insert({
            NomeColaborador: userData.name,
            "E-mail": userData.email,
            Cargo: userData.cargo || null,
            papel: userData.role || 'developer',
            ativo: true
          })
          .select('ID_Colaborador')
          .single();

        if (error) throw error;

        // Adiciona ao estado local
        const newUser: User = {
          id: String(data.ID_Colaborador),
          name: userData.name!,
          email: userData.email!,
          cargo: userData.cargo,
          role: userData.role || 'developer',
          active: true
        };

        setUsers(prev => [...prev, newUser]);

      }
      
      setUserToEdit(null);
      setCurrentView('team-list');
    } catch (error) {

      alert('Erro ao salvar usuário. Tente novamente.');
    }
  };

  const handleSaveUserAvatar = async (userId: string, avatarUrl: string | null) => {
    try {
      const { error } = await supabase
        .from('dim_colaboradores')
        .update({
          avatar_url: avatarUrl
        })
        .eq('ID_Colaborador', Number(userId));

      if (error) throw error;

      // Atualiza estado local
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, avatarUrl: avatarUrl || undefined } : u
      ));

      // Atualiza currentUser se for o próprio usuário
      if (currentUser && currentUser.id === userId) {
        setCurrentUser({ ...currentUser, avatarUrl: avatarUrl || undefined });
      }

      alert('Foto de perfil atualizada com sucesso!');
    } catch (error) {

      alert('Erro ao atualizar foto de perfil. Tente novamente.');
    }
  };

  // =====================================================
  // HELPERS
  // =====================================================
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : undefined;
  const selectedTeamMember = selectedUserId ? users.find(u => u.id === selectedUserId) : undefined;
  const getClientForProject = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.clientId;
  };

  // =====================================================
  // TELA DE RESET DE SENHA (DEVE VIR PRIMEIRO!)
  // =====================================================
  if (isResetPassword) {

    return (
      <ResetPassword 
        onComplete={async () => {

          // Garante logout completo
          await supabase.auth.signOut();
          setIsResetPassword(false);
          setCurrentUser(null);
          window.location.hash = '';
          setCurrentView('login');
          // Força reload da página para garantir estado limpo
          window.location.reload();
        }}
      />
    );
  }

  // =====================================================
  // TELA DE LOGIN / LOADING
  // =====================================================
  if (!currentUser) {
    if (dataLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#4c1d95] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-500 font-medium">Carregando dados...</p>
          </div>
        </div>
      );
    }

    if (dataError) {

    }

    return <Login onLogin={handleLogin} users={users} />;
  }

  // =====================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =====================================================

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-80 bg-white border-r border-slate-200 flex flex-col py-6 overflow-visible">
        {/* Logo */}
        <div className="flex justify-center lg:justify-start px-6 mb-10">
          <img
            src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png"
            alt="NIC Labs"
            className="h-16 lg:h-20 object-contain"
          />
        </div>

        {/* Menu */}
        <nav className="flex-1 space-y-2 px-3">
          {/* Admin Menu */}
          {currentUser.role === 'admin' && (
            <>
              <SidebarItem
                icon={<Briefcase size={20} />}
                label="Clientes"
                active={activeMenu === 'clients'}
                onClick={() => {
                  setSelectedClientId(null);
                  setCurrentView('admin');
                  setActiveMenu('clients');
                }}
              />
              <SidebarItem
                icon={<LayoutDashboard size={20} />}
                label="Tarefas"
                active={activeMenu === 'tasks'}
                onClick={() => {
                  setSelectedClientId(null);
                  setCurrentView('kanban');
                  setActiveMenu('tasks');
                }}
              />
              <SidebarItem
                icon={<Users size={20} />}
                label="Equipe"
                active={activeMenu === 'team'}
                onClick={() => {
                  setSelectedClientId(null);
                  setCurrentView('team-list');
                  setActiveMenu('team');
                }}
              />
            </>
          )}

          {/* Developer Menu */}
          {currentUser.role === 'developer' && (
            <>
              <SidebarItem
                icon={<LayoutDashboard size={20} />}
                label="Projetos"
                active={activeMenu === 'dev-projects'}
                onClick={() => {
                  setSelectedProjectId(null);
                  setCurrentView('developer-projects');
                  setActiveMenu('dev-projects');
                }}
              />
              <SidebarItem
                icon={<CheckSquare size={20} />}
                label="Minhas Tarefas"
                active={activeMenu === 'dev-tasks'}
                onClick={() => {
                  setSelectedProjectId(null);
                  setCurrentView('user-tasks');
                  setActiveMenu('dev-tasks');
                }}
              />
            </>
          )}

          {/* Timesheet - Ambos os papéis */}
          <SidebarItem
            icon={<Clock size={20} />}
            label="Apontamento de Horas"
            active={activeMenu === 'timesheet'}
            onClick={() => {
              setActiveMenu('timesheet');
              handleTimesheetNav();
            }}
          />
        </nav>

        {/* User Info + Logout */}
        <div className="mt-auto px-3 space-y-2">
          <button
            onClick={() => setCurrentView('user-profile')}
            className="w-full flex items-center gap-3 px-3 py-2 mb-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#4c1d95] text-white flex items-center justify-center font-bold text-xs overflow-hidden">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.substring(0, 2).toUpperCase()
              )}
            </div>
            <div className="hidden lg:block overflow-hidden text-left">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
            </div>
          </button>

          <div className="h-px bg-slate-100 my-4 mx-3"></div>
          
          <SidebarItem
            icon={<LogOut size={20} />}
            label="Sair"
            className="text-red-500 hover:bg-red-50"
            onClick={handleLogout}
          />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-hidden relative bg-slate-50">
        <div className="absolute inset-0 p-6 lg:p-10 overflow-hidden flex flex-col">

          {/* === ADMIN VIEWS === */}
          {currentView === 'admin' && (
            <ErrorBoundary name="AdminDashboard">
              <AdminDashboard
                clients={clients}
                projects={projects}
                tasks={tasks}
                onSelectClient={handleClientSelectDetails}
                onSelectClientProjects={handleClientSelectProjects}
                onAddClient={handleNewClient}
                onDeleteClient={handleDeleteClient}
              />
            </ErrorBoundary>
          )}

          {currentView === 'client-create' && (
            <ClientForm
              onSave={handleSaveClient}
              onBack={() => setCurrentView('admin')}
            />
          )}

          {currentView === 'client-details' && selectedClientId && (
            <ClientDetailsView
              client={clients.find(c => c.id === selectedClientId)!}
              projects={projects}
              tasks={tasks}
              onBack={() => {
                setSelectedClientId(null);
                setCurrentView('admin');
              }}
              onEdit={handleEditClient}
              onDeactivate={handleDeactivateClient}
              onClientClick={(clientId) => {
                setCurrentView('client-details');
              }}
              onUserClick={handleTeamMemberSelect}
              onTaskClick={(taskId) => {
                setSelectedTaskId(taskId);
                setCurrentView('task-detail');
              }}
              onProjectClick={(projectId) => {
                setSelectedProjectId(projectId);
                setCurrentView('project-detail');
              }}
              onNewProject={handleNewProject}
              onNewTask={handleNewTask}
            />
          )}

          {currentView === 'kanban' && (
            <KanbanBoard
              tasks={tasks}
              clients={clients}
              projects={projects}
              onTaskClick={handleTaskClick}
              onNewTask={handleNewTask}
              onNewProject={handleNewProject}
              filteredClientId={selectedClientId}
              onBackToAdmin={currentUser.role === 'admin' ? () => {
                setSelectedClientId(null);
                setCurrentView('admin');
              } : undefined}
              onDeleteTask={handleDeleteTask}
              user={currentUser}
            />
          )}

          {currentView === 'project-create' && (
            <ProjectForm
              clients={clients}
              onSave={handleSaveProject}
              onBack={() => {
                // If a developer opened the project form, return to the developer view.
                if (currentUser?.role === 'developer') {
                  setCurrentView('developer-projects');
                } else {
                  // Admin flow: voltar para detalhes do cliente (menu Clientes), não para Tarefas
                  setCurrentView('client-details');
                }
              }}
              preSelectedClientId={selectedClientId || undefined}
            />
          )}

          {currentView === 'project-detail' && selectedProjectId && (
            <ProjectDetailView
              project={projects.find(p => p.id === selectedProjectId)!}
              tasks={tasks}
              clients={clients}
              onBack={() => {
                setSelectedProjectId(null);
                setCurrentView('client-details');
              }}
              onTaskClick={(taskId) => {
                setSelectedTaskId(taskId);
                setCurrentView('kanban');
                setTimeout(() => {
                  setCurrentView('task-detail');
                }, 100);
              }}
            />
          )}

          
          {currentView === 'team-list' && (
            <TeamList
              users={users}
              tasks={tasks}
              timesheetEntries={timesheetEntries}
              onUserClick={handleTeamMemberSelect}
              onDeleteUser={handleDeleteUser}
              onAddUser={() => {
                setUserToEdit(null);
                setCurrentView('user-form');
              }}
              onEditUser={(userId) => {
                const user = users.find(u => u.id === userId);
                if (user) {
                  setUserToEdit(user);
                  setCurrentView('user-form');
                }
              }}
            />
          )}

          {currentView === 'team-member-detail' && selectedTeamMember && (
            <TeamMemberDetail
              user={selectedTeamMember}
              tasks={tasks}
              projects={projects}
              onBack={() => setCurrentView('team-list')}
              onTaskClick={handleTaskClick}
            />
          )}

          {currentView === 'user-form' && (
            <UserForm
              initialUser={userToEdit || undefined}
              users={users}
              onSave={handleSaveUser}
              onBack={() => {
                setUserToEdit(null);
                setCurrentView('team-list');
              }}
            />
          )}

          {currentView === 'user-profile' && currentUser && (
            <UserProfile
              user={currentUser}
              onBack={() => {
                // Volta para a view apropriada
                if (currentUser.role === 'admin') {
                  setCurrentView('admin');
                } else {
                  setCurrentView('developer-projects');
                }
              }}
              onSave={handleSaveUserAvatar}
            />
          )}

          {/* === DEVELOPER VIEWS === */}
          {currentView === 'developer-projects' && (
            <DeveloperProjects
              user={currentUser}
              projects={projects}
              clients={clients}
              tasks={tasks}
              onProjectClick={handleDeveloperProjectClick}
              onNewProject={() => setCurrentView('project-create')}
              onClientSelect={(clientId) => setSelectedClientId(clientId)}
            />
          )}

          {currentView === 'user-tasks' && (
            <UserTasks
              user={currentUser}
              tasks={tasks}
              projects={projects}
              clients={clients}
              onTaskClick={handleTaskClick}
              filterProjectId={selectedProjectId}
              onBack={() => {
                if (selectedProjectId) {
                  setSelectedProjectId(null);
                  setCurrentView('developer-projects');
                } else {
                  // Se não veio de um projeto, volta para minhas tarefas (mesma view, sem filtro)
                  setCurrentView('user-tasks');
                }
              }}
              onNewTask={handleNewTask}
              onCreateTimesheetForTask={handleCreateTimesheetForTask}
              timesheetEntries={timesheetEntries}
            />
          )}

          {/* === SHARED TASK VIEWS === */}
          {(currentView === 'task-detail' || currentView === 'task-create') && (
            <TaskDetail
              task={selectedTask}
              clients={clients}
              projects={projects}
              users={users}
              onSave={handleSaveTask}
              onBack={() => {
                if (selectedUserId) setCurrentView('team-member-detail');
                else if (currentUser.role !== 'admin') setCurrentView('user-tasks');
                else if (selectedClientId) setCurrentView('client-details');
                else setCurrentView('kanban');
              }}
              preSelectedClientId={selectedProjectId ? getClientForProject(selectedProjectId) : (selectedClientId || undefined)}
              user={currentUser}
            />
          )}

          {/* === TIMESHEET VIEWS === */}
          {currentView === 'timesheet-calendar' && (
            <>
              {timesheetAdminUser && (
                <div className="px-8 py-4 bg-gradient-to-r from-[#4c1d95] to-purple-600 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Apontamentos de {users.find(u => u.id === timesheetAdminUser)?.name}
                    </h2>
                    <p className="text-purple-200 text-sm">Visualização do administrador</p>
                  </div>
                  <button
                    onClick={() => {
                      setTimesheetAdminUser(null);
                      setTimesheetAdminReturnToStatus(true);
                      setCurrentView('timesheet-admin-dashboard');
                      setPreviousView(null);
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold transition-all"
                  >
                    ← Voltar ao Status
                  </button>
                </div>
              )}
              <TimesheetCalendar
                entries={timesheetEntries.filter(e => 
                  timesheetAdminUser ? e.userId === timesheetAdminUser : e.userId === currentUser.id
                )}
                tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
                onDateClick={handleTimesheetDateClick}
                onEntryClick={handleTimesheetEntryClick}
                onDeleteEntry={handleDeleteTimesheet}
              />
            </>
          )}

          {currentView === 'timesheet-form' && (
            <TimesheetForm
              initialEntry={timesheetEntryToEdit}
              clients={clients}
              projects={projects}
              tasks={tasks}
              user={timesheetAdminUser ? users.find(u => u.id === timesheetAdminUser)! : currentUser}
              preSelectedDate={selectedTimesheetDate}
              onSave={handleSaveTimesheet}
              onDelete={handleDeleteTimesheet}
              onBack={() => {
                // Restaura view anterior ou padrão
                if (previousView && previousView !== 'timesheet-form') {
                  setCurrentView(previousView);
                  setPreviousView(null);
                } else {
                  handleTimesheetNav();
                }
              }}
              onUpdateTaskProgress={async (taskId, progress) => {
                try {

                  const updateData: any = { Porcentagem: progress };
                  
                  // Se progresso = 100%, marca como concluída
                  if (progress === 100) {
                    updateData.StatusTarefa = 'Concluído';
                    updateData.entrega_real = new Date().toISOString().split('T')[0];

                  }

                  // Atualiza no Supabase
                  const { error } = await supabase
                    .from('fato_tarefas')
                    .update(updateData)
                    .eq('id_tarefa_novo', Number(taskId));

                  if (error) {

                    throw error;
                  }

                  // Atualiza estado local
                  setTasks(prev => prev.map(t => 
                    t.id === taskId 
                      ? { 
                          ...t, 
                          progress,
                          status: progress === 100 ? 'Done' : t.status,
                          actualDelivery: progress === 100 ? new Date().toISOString().split('T')[0] : t.actualDelivery
                        } 
                      : t
                  ));

                } catch (error) {

                }
              }}
            />
          )}

          {currentView === 'timesheet-admin-dashboard' && (
            <TimesheetAdminDashboard
              entries={timesheetEntries}
              clients={clients}
              projects={projects}
              tasks={tasks}
              users={users}
              initialTab={timesheetAdminReturnToStatus ? 'status' : 'projects'}
              onClientClick={handleAdminTimesheetClientClick}
              onUserTimesheetClick={(userId) => {
                setTimesheetAdminUser(userId);
                setTimesheetAdminReturnToStatus(false);
                setPreviousView('timesheet-admin-dashboard');
                setCurrentView('timesheet-calendar');
              }}
            />
          )}

          {currentView === 'timesheet-admin-detail' && timesheetAdminClient && (
            <TimesheetAdminDetail
              client={clients.find(c => c.id === timesheetAdminClient)!}
              projects={projects}
              entries={timesheetEntries}
              users={users}
              tasks={tasks}
              onBack={() => setCurrentView('timesheet-admin-dashboard')}
              onEditEntry={handleTimesheetEntryClick}
            />
          )}

        </div>
      </main>

      {/* Modal de Conclusão de Tarefa */}
      {taskCompletionModalOpen && (
        <ConfirmationModal
          isOpen={true}
          title="🎉 Parabéns! Tarefa Concluída"
          message={`A tarefa "${pendingTaskToSave?.title || ''}" atingiu 100% de progresso e será marcada como Concluída. Após salvar, a tarefa será armazenada e não poderá ser mais editada. Deseja continuar?`}
          onConfirm={handleConfirmTaskCompletion}
          onCancel={() => {
            setTaskCompletionModalOpen(false);
            setPendingTaskToSave(null);
          }}
        />
      )}
    </div>
  );
}

// =====================================================
// COMPONENTE SIDEBAR ITEM
// =====================================================
const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  className?: string;
  onClick?: () => void;
}> = ({ icon, label, active, className, onClick }) => (
  <button
    onClick={onClick}
    className={`
      w-full relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
      ${active ? 'bg-[#4c1d95] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-[#4c1d95]'}
      ${className || ''}
    `}
  >
    {active && (
      <span className="absolute left-1 lg:left-2 w-1.5 h-6 rounded-full bg-white/80" aria-hidden />
    )}
    <span className={`flex-shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-[#4c1d95]'} transition-colors`}>
      {icon}
    </span>
    <span className="hidden lg:block font-medium text-sm flex-1 text-left">{label}</span>
  </button>
);

export default App;