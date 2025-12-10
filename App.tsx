// App.tsx
// Aplicação principal com integração Supabase

import React, { useState, useEffect } from 'react';
import KanbanBoard from './components/KanbanBoard';
import TaskDetail from './components/TaskDetail';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ProjectForm from './components/ProjectForm';
import ClientForm from './components/ClientForm';
import UserTasks from './components/UserTasks';
import DeveloperProjects from './components/DeveloperProjects';
import TeamList from './components/TeamList';
import TeamMemberDetail from './components/TeamMemberDetail';
import TimesheetCalendar from './components/TimesheetCalendar';
import TimesheetForm from './components/TimesheetForm';
import TimesheetAdminDashboard from './components/TimesheetAdminDashboard';
import TimesheetAdminDetail from './components/TimesheetAdminDetail';
import { Task, Project, Client, View, User, TimesheetEntry } from './types';
import { LayoutDashboard, Users, CheckSquare, LogOut, Briefcase, Clock } from 'lucide-react';
import { useAppData } from './hooks/useAppData';

// Services para CRUD no Supabase
import { createClient as createClientDb, deleteClient as deleteClientDb } from './services/clientService';
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
function App() {
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

  // State de Timesheet
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState<string | undefined>(undefined);
  const [timesheetEntryToEdit, setTimesheetEntryToEdit] = useState<TimesheetEntry | null>(null);
  const [timesheetAdminClient, setTimesheetAdminClient] = useState<string | null>(null);

  // =====================================================
  // SINCRONIZAÇÃO COM SUPABASE
  // =====================================================
  useEffect(() => {
    if (!dataLoading) {
      console.log("📥 Sincronizando dados do Supabase para o state local...");
      
      setClients(loadedClients);
      setProjects(loadedProjects);
      setTasks(loadedTasks);
      setTimesheetEntries(loadedTimesheets);
      
      // Só atualiza users se o banco retornou dados
      if (loadedUsers.length > 0) {
        setUsers(loadedUsers);
      }
      
      console.log("✅ Sincronização concluída:", {
        clients: loadedClients.length,
        projects: loadedProjects.length,
        tasks: loadedTasks.length,
        users: loadedUsers.length || FALLBACK_USERS.length,
      });
    }
  }, [dataLoading, loadedClients, loadedProjects, loadedTasks, loadedUsers, loadedTimesheets]);

  // =====================================================
  // HANDLERS - LOGIN/LOGOUT
  // =====================================================
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentView(user.role === 'admin' ? 'admin' : 'developer-projects');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setSelectedClientId(null);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
    setSelectedUserId(null);
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
    setCurrentView('timesheet-form');
  };

  const handleTimesheetEntryClick = (entry: TimesheetEntry) => {
    setTimesheetEntryToEdit(entry);
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

    setTimesheetEntryToEdit(initial);
    setCurrentView('timesheet-form');
  };

  const handleSaveTimesheet = (entry: TimesheetEntry) => {
    setTimesheetEntries(prev => {
      const exists = prev.some(e => e.id === entry.id);
      return exists
        ? prev.map(e => (e.id === entry.id ? entry : e))
        : [...prev, entry];
    });

    if (currentUser?.role === 'admin') {
      setCurrentView(timesheetAdminClient ? 'timesheet-admin-detail' : 'timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleDeleteTimesheet = (entryId: string) => {
    setTimesheetEntries(prev => prev.filter(e => e.id !== entryId));
    if (currentUser?.role === 'admin') {
      setCurrentView(timesheetAdminClient ? 'timesheet-admin-detail' : 'timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleAdminTimesheetClientClick = (clientId: string) => {
    setTimesheetAdminClient(clientId);
    setCurrentView('timesheet-admin-detail');
  };

  // =====================================================
  // HANDLERS - CLIENTES
  // =====================================================
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('kanban');
  };

  const handleNewClient = () => {
    setCurrentView('client-create');
  };

  const handleSaveClient = async (newClient: Client) => {
    try {
      // Salva no Supabase e obtém o ID real
      const newId = await createClientDb(newClient);
      
      // Atualiza o state local com o ID do banco
      const clientWithRealId = { ...newClient, id: String(newId) };
      setClients(prev => [...prev, clientWithRealId]);
      
      console.log("✅ Cliente salvo com sucesso:", clientWithRealId);
      setCurrentView('admin');
    } catch (error) {
      console.error("❌ Erro ao salvar cliente:", error);
      alert("Erro ao salvar cliente. Verifique o console.");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      // Deleta no Supabase (soft delete)
      await deleteClientDb(clientId);
      
      // Remove do state local
      setClients(prev => prev.filter(c => c.id !== clientId));
      
      console.log("✅ Cliente deletado com sucesso");
    } catch (error) {
      console.error("❌ Erro ao deletar cliente:", error);
      alert("Erro ao deletar cliente. Verifique o console.");
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
      // Deleta no Supabase
      const { deleteTask } = await import('./services/taskService');
      await deleteTask(taskId);
      
      // Remove do state local
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (selectedTaskId === taskId) setSelectedTaskId(null);
      
      console.log("✅ Tarefa deletada com sucesso");
    } catch (error) {
      console.error("❌ Erro ao deletar tarefa:", error);
      alert("Erro ao deletar tarefa. Verifique o console.");
    }
  };

  const handleSaveTask = async (updatedTask: Task) => {
    try {
      const exists = tasks.some(t => t.id === updatedTask.id);
      
      if (exists) {
        // UPDATE no Supabase
        const { updateTask } = await import('./services/taskService');
        await updateTask(updatedTask.id, updatedTask);
        setTasks(prev => prev.map(t => (t.id === updatedTask.id ? updatedTask : t)));
      } else {
        // CREATE no Supabase
        const { createTask } = await import('./services/taskService');
        const newId = await createTask(updatedTask);
        const taskWithRealId = { ...updatedTask, id: String(newId) };
        setTasks(prev => [...prev, taskWithRealId]);
      }

      console.log("✅ Tarefa salva com sucesso");
      
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
      console.error("❌ Erro ao salvar tarefa:", error);
      alert("Erro ao salvar tarefa. Verifique o console.");
    }
  };

  // =====================================================
  // HANDLERS - PROJETOS
  // =====================================================
  const handleNewProject = () => {
    setCurrentView('project-create');
  };

  const handleSaveProject = async (newProject: Project) => {
    try {
      // Salva no Supabase e obtém o ID real
      const { createProject } = await import('./services/projectService');
      const newId = await createProject(newProject);
      
      // Atualiza o state local com o ID do banco
      const projectWithRealId = { ...newProject, id: String(newId) };
      setProjects(prev => [...prev, projectWithRealId]);
      
      console.log("✅ Projeto salvo com sucesso:", projectWithRealId);
      
      // Navigate back depending on the current user role: developers return to their projects view
      if (currentUser?.role === 'developer') {
        setCurrentView('developer-projects');
      } else {
        setCurrentView('kanban');
      }
      if (!selectedClientId) setSelectedClientId(newProject.clientId);
    } catch (error) {
      console.error("❌ Erro ao salvar projeto:", error);
      alert("Erro ao salvar projeto. Verifique o console.");
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

  const handleDeleteUser = (userId: string) => {
    // Por segurança, não deletamos usuários do banco por enquanto
    // Apenas remove da visualização local
    setUsers(prev => prev.filter(u => u.id !== userId));
    console.warn("⚠️ Usuário removido apenas localmente (não do banco)");
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
      console.warn("Erro ao carregar dados:", dataError);
    }

    return <Login onLogin={handleLogin} users={users} />;
  }

  // =====================================================
  // RENDERIZAÇÃO PRINCIPAL
  // =====================================================
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col py-6">
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
                active={currentView === 'admin'}
                onClick={() => setCurrentView('admin')}
              />
              <SidebarItem
                icon={<LayoutDashboard size={20} />}
                label="Projetos"
                active={currentView === 'kanban'}
                onClick={() => setCurrentView('kanban')}
              />
              <SidebarItem
                icon={<Users size={20} />}
                label="Equipe"
                active={currentView === 'team-list' || currentView === 'team-member-detail'}
                onClick={() => setCurrentView('team-list')}
              />
            </>
          )}

          {/* Developer Menu */}
          {currentUser.role === 'developer' && (
            <>
              <SidebarItem
                icon={<LayoutDashboard size={20} />}
                label="Meus Projetos"
                active={currentView === 'developer-projects'}
                onClick={() => {
                  setSelectedProjectId(null);
                  setCurrentView('developer-projects');
                }}
              />
              <SidebarItem
                icon={<CheckSquare size={20} />}
                label="Todas as Tarefas"
                active={currentView === 'user-tasks' && !selectedProjectId}
                onClick={() => {
                  setSelectedProjectId(null);
                  setCurrentView('user-tasks');
                }}
              />
            </>
          )}

          {/* Timesheet - Ambos os papéis */}
          <SidebarItem
            icon={<Clock size={20} />}
            label="Apontamento de Horas"
            active={currentView.includes('timesheet')}
            onClick={handleTimesheetNav}
          />
        </nav>

        {/* User Info + Logout */}
        <div className="mt-auto px-3 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#4c1d95] text-white flex items-center justify-center font-bold text-xs">
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden lg:block overflow-hidden">
              <p className="text-sm font-bold truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
            </div>
          </div>

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
            <AdminDashboard
              clients={clients}
              projects={projects}
              onSelectClient={handleClientSelect}
              onAddClient={handleNewClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {currentView === 'client-create' && (
            <ClientForm
              onSave={handleSaveClient}
              onBack={() => setCurrentView('admin')}
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
                  setCurrentView('kanban');
                }
              }}
              preSelectedClientId={selectedClientId || undefined}
            />
          )}

          {currentView === 'team-list' && (
            <TeamList
              users={users}
              tasks={tasks}
              onUserClick={handleTeamMemberSelect}
              onDeleteUser={handleDeleteUser}
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

          {/* === DEVELOPER VIEWS === */}
          {currentView === 'developer-projects' && (
            <DeveloperProjects
              user={currentUser}
              projects={projects}
              clients={clients}
              tasks={tasks}
              onProjectClick={handleDeveloperProjectClick}
              onNewProject={() => setCurrentView('project-create')}
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
              onBack={selectedProjectId ? () => setCurrentView('developer-projects') : undefined}
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
                else setCurrentView('kanban');
              }}
              preSelectedClientId={selectedProjectId ? getClientForProject(selectedProjectId) : (selectedClientId || undefined)}
              user={currentUser}
            />
          )}

          {/* === TIMESHEET VIEWS === */}
          {currentView === 'timesheet-calendar' && (
            <TimesheetCalendar
              entries={timesheetEntries.filter(e => e.userId === currentUser.id)}
              tasks={tasks.map(t => ({ id: t.id, title: t.title }))}
              onDateClick={handleTimesheetDateClick}
              onEntryClick={handleTimesheetEntryClick}
            />
          )}

          {currentView === 'timesheet-form' && (
            <TimesheetForm
              initialEntry={timesheetEntryToEdit}
              clients={clients}
              projects={projects}
              tasks={tasks}
              user={currentUser}
              preSelectedDate={selectedTimesheetDate}
              onSave={handleSaveTimesheet}
              onDelete={handleDeleteTimesheet}
              onBack={handleTimesheetNav}
            />
          )}

          {currentView === 'timesheet-admin-dashboard' && (
            <TimesheetAdminDashboard
              entries={timesheetEntries}
              clients={clients}
              projects={projects}
              onClientClick={handleAdminTimesheetClientClick}
            />
          )}

          {currentView === 'timesheet-admin-detail' && timesheetAdminClient && (
            <TimesheetAdminDetail
              client={clients.find(c => c.id === timesheetAdminClient)!}
              projects={projects}
              entries={timesheetEntries}
              users={users}
              onBack={() => setCurrentView('timesheet-admin-dashboard')}
              onEditEntry={handleTimesheetEntryClick}
            />
          )}

        </div>
      </main>
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
      w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
      ${active ? 'bg-[#4c1d95] text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 hover:text-[#4c1d95]'}
      ${className || ''}
    `}
  >
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-[#4c1d95]'} transition-colors`}>
      {icon}
    </span>
    <span className="hidden lg:block font-medium text-sm">{label}</span>
  </button>
);

export default App;