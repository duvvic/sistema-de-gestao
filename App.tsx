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
import { supabase } from './services/supabaseClient';

// --- MOCK DATA ---
const MOCK_CLIENTS: Client[] = [
  { id: 'c1', name: 'NIC Labs', logoUrl: 'https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png' },
  { id: 'c2', name: 'TechCorp Global', logoUrl: 'https://picsum.photos/200/200?random=1' },
  { id: 'c3', name: 'Inova Brasil', logoUrl: 'https://picsum.photos/200/200?random=2' },
  { id: 'c4', name: 'StartUp One', logoUrl: 'https://picsum.photos/200/200?random=3' },
];

const MOCK_PROJECTS: Project[] = [
  { id: 'p1', name: 'Plataforma SaaS', clientId: 'c1', manager: 'Roberto A.' },
  { id: 'p2', name: 'App Mobile Delivery', clientId: 'c2', manager: 'Ana B.' },
  { id: 'p3', name: 'Website Institucional', clientId: 'c3' },
];

const getDate = (daysOffset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Setup Inicial do Repositório',
    projectId: 'p1',
    clientId: 'c1',
    status: 'Done',
    estimatedDelivery: getDate(-10),
    progress: 100,
    description: 'Configuração do Git, ESLint e Prettier.',
    developer: 'João S.',
    priority: 'High'
  },
  {
    id: 't2',
    title: 'Wireframes da Home',
    projectId: 'p3',
    clientId: 'c3',
    status: 'Done',
    estimatedDelivery: getDate(-5),
    progress: 100,
    developer: 'Maria F.',
    notes: 'Aprovado pelo cliente'
  },
  {
    id: 't3',
    title: 'Desenvolvimento Tela de Login',
    projectId: 'p1',
    clientId: 'c1',
    status: 'Review',
    estimatedDelivery: getDate(2),
    progress: 90,
    description: 'Implementar autenticação JWT e layout responsivo.',
    developer: 'João S.',
    priority: 'Medium'
  },
  {
    id: 't4',
    title: 'API de Produtos',
    projectId: 'p2',
    clientId: 'c2',
    status: 'In Progress',
    estimatedDelivery: getDate(5),
    progress: 45,
    description: 'CRUD completo de produtos para o app delivery.',
    developer: 'Carlos M.'
  },
  {
    id: 't5',
    title: 'Integração API Stripe',
    projectId: 'p2',
    clientId: 'c2',
    status: 'In Progress',
    estimatedDelivery: getDate(-3),
    progress: 30,
    description: 'Conexão com gateway de pagamento.',
    developer: 'Maria F.',
    priority: 'Critical',
    risks: 'Documentação da API mudou recentemente.',
    notes: 'Bloqueado por credenciais pendentes'
  },
  {
    id: 't6',
    title: 'Refatoração de Legado',
    projectId: 'p1',
    clientId: 'c1',
    status: 'Todo',
    estimatedDelivery: getDate(-7),
    progress: 0,
    description: 'Melhorar performance do módulo de relatórios.',
    developer: 'João S.',
    priority: 'Medium'
  },
  {
    id: 't7',
    title: 'Testes E2E (Cypress)',
    projectId: 'p1',
    clientId: 'c1',
    status: 'Todo',
    estimatedDelivery: getDate(10),
    progress: 0,
    developer: 'Carlos M.'
  },
  {
    id: 't8',
    title: 'Dashboard Administrativo',
    projectId: 'p2',
    clientId: 'c2',
    status: 'Todo',
    estimatedDelivery: getDate(15),
    progress: 0,
    developer: 'Maria F.',
    impact: 'High'
  },
];

const MOCK_TIMESHEETS: TimesheetEntry[] = [
  {
    id: 'ts1',
    userId: 'u2',
    userName: 'João S.',
    clientId: 'c1',
    projectId: 'p1',
    taskId: 't3',
    date: getDate(0),
    startTime: '09:00',
    endTime: '12:00',
    totalHours: 3.0,
    description: 'Frontend Login Screen'
  },
  {
    id: 'ts2',
    userId: 'u2',
    userName: 'João S.',
    clientId: 'c1',
    projectId: 'p1',
    taskId: 't3',
    date: getDate(0),
    startTime: '13:00',
    endTime: '17:00',
    totalHours: 4.0,
    description: 'Auth Logic Integration'
  },
  {
    id: 'ts3',
    userId: 'u3',
    userName: 'Maria F.',
    clientId: 'c2',
    projectId: 'p2',
    taskId: 't5',
    date: getDate(-1),
    startTime: '10:00',
    endTime: '15:00',
    totalHours: 5.0,
    description: 'Debugging Stripe Webhooks'
  }
];

// fallback caso Supabase não responda
const FALLBACK_USERS: User[] = [
  { id: 'u1', name: 'Admin User', email: 'admin@nic.com', role: 'admin' },
  { id: 'u2', name: 'João S.', email: 'joao@nic.com', role: 'developer' },
];

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('login');

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>(MOCK_TIMESHEETS);
  const [selectedTimesheetDate, setSelectedTimesheetDate] = useState<string | undefined>(undefined);
  const [timesheetEntryToEdit, setTimesheetEntryToEdit] = useState<TimesheetEntry | null>(null);
  const [timesheetAdminClient, setTimesheetAdminClient] = useState<string | null>(null);

  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  // -------- Carregar usuários do Supabase --------
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(null);

        const { data, error } = await supabase
          .from('dim_colaboradores')
          .select('ID_Colaborador, NomeColaborador, "E-mail", avatar_url, papel');

        console.log('RAW Supabase data (dim_colaboradores):', data);

        if (error) {
          console.error('Erro ao carregar usuários do Supabase:', error);
          setUsers(FALLBACK_USERS);
          setUsersError('Erro ao carregar usuários do banco, usando usuários de teste.');
          return;
        }

        if (!data || data.length === 0) {
          console.warn('Nenhum usuário retornado do Supabase. Usando fallback.');
          setUsers(FALLBACK_USERS);
          return;
        }

        const mappedUsers: User[] = data.map((row: any) => ({
          id: String(row.ID_Colaborador),
          name: row.NomeColaborador,
          email: row['E-mail'],
          avatarUrl: row.avatar_url ?? undefined,
          role: row.papel === 'admin' ? 'admin' : 'developer',
        }));

        console.log('Mapped users -> state:', mappedUsers);
        setUsers(mappedUsers);
      } catch (e) {
        console.error('Erro inesperado ao carregar usuários:', e);
        setUsers(FALLBACK_USERS);
        setUsersError('Erro inesperado ao carregar usuários, usando usuários de teste.');
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, []);

  // -------- Handlers gerais --------
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('developer-projects');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('login');
    setSelectedClientId(null);
    setSelectedProjectId(null);
    setSelectedTaskId(null);
  };

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

  const handleSaveTimesheet = (entry: TimesheetEntry) => {
    const exists = timesheetEntries.find(e => e.id === entry.id);
    if (exists) {
      setTimesheetEntries(timesheetEntries.map(e => e.id === entry.id ? entry : e));
    } else {
      setTimesheetEntries([...timesheetEntries, entry]);
    }

    if (currentUser?.role === 'admin') {
      if (timesheetAdminClient) setCurrentView('timesheet-admin-detail');
      else setCurrentView('timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleDeleteTimesheet = (entryId: string) => {
    setTimesheetEntries(timesheetEntries.filter(e => e.id !== entryId));
    if (currentUser?.role === 'admin') {
      if (timesheetAdminClient) setCurrentView('timesheet-admin-detail');
      else setCurrentView('timesheet-admin-dashboard');
    } else {
      setCurrentView('timesheet-calendar');
    }
  };

  const handleAdminTimesheetClientClick = (clientId: string) => {
    setTimesheetAdminClient(clientId);
    setCurrentView('timesheet-admin-detail');
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    setCurrentView('kanban');
  };

  const handleNewClient = () => {
    setCurrentView('client-create');
  };

  const handleSaveClient = (newClient: Client) => {
    setClients([...clients, newClient]);
    setCurrentView('admin');
  };

  const handleDeleteClient = (clientId: string) => {
    setClients(clients.filter(c => c.id !== clientId));
  };

  const handleTeamMemberSelect = (userId: string) => {
    setSelectedUserId(userId);
    setCurrentView('team-member-detail');
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(u => u.id !== userId));
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCurrentView('task-detail');
  };

  const handleNewTask = () => {
    setSelectedTaskId(null);
    setCurrentView('task-create');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }
  };

  const handleDeveloperProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('user-tasks');
  };

  const handleSaveTask = (updatedTask: Task) => {
    if (selectedTaskId) {
      setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
    } else {
      setTasks([...tasks, updatedTask]);
    }

    if (currentUser?.role !== 'admin' && currentView === 'task-create') {
      setCurrentView('user-tasks');
    } else if (selectedUserId) {
      setCurrentView('team-member-detail');
    } else {
      setCurrentView('kanban');
    }

    setSelectedTaskId(null);
  };

  const handleNewProject = () => {
    setCurrentView('project-create');
  };

  const handleSaveProject = (newProject: Project) => {
    setProjects([...projects, newProject]);
    setCurrentView('kanban');
    if (!selectedClientId) {
      setSelectedClientId(newProject.clientId);
    }
  };

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : undefined;
  const selectedTeamMember = selectedUserId ? users.find(u => u.id === selectedUserId) : undefined;
  const getClientForProject = (pid: string) => projects.find(p => p.id === pid)?.clientId;

  // -------- Tela de login / loading --------
  if (!currentUser) {
    if (usersLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <p className="text-slate-500">Carregando usuários...</p>
        </div>
      );
    }

    return <Login onLogin={handleLogin} users={users} />;
  }

  // -------- App logado --------
  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-white border-r border-slate-200 flex flex-col items-center lg:items-stretch py-6 transition-all duration-300 z-20">
        <div className="mb-10 px-6 flex justify-center lg:justify-start">
          <img
            src="https://nic-labs.com/wp-content/uploads/2024/04/Logo-com-fundo-branco-1.png"
            alt="NIC Labs"
            className="h-20 w-auto object-contain"
          />
        </div>

        <nav className="flex-1 space-y-2 px-3">
          {currentUser.role === 'admin' && (
            <SidebarItem
              icon={<Briefcase size={20} />}
              label="Clientes"
              active={currentView === 'admin' || currentView === 'client-create'}
              onClick={() => {
                setSelectedClientId(null);
                setCurrentView('admin');
              }}
            />
          )}

          {currentUser.role === 'admin' && (
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="Projetos"
              active={currentView === 'kanban' || currentView === 'project-create'}
              onClick={() => setCurrentView('kanban')}
            />
          )}

          {currentUser.role === 'developer' && (
            <SidebarItem
              icon={<LayoutDashboard size={20} />}
              label="Projetos"
              active={currentView === 'developer-projects'}
              onClick={() => {
                setSelectedProjectId(null);
                setCurrentView('developer-projects');
              }}
            />
          )}

          {currentUser.role === 'developer' && (
            <SidebarItem
              icon={<CheckSquare size={20} />}
              label="Todas as Tarefas"
              active={currentView === 'user-tasks' && !selectedProjectId}
              onClick={() => {
                setSelectedProjectId(null);
                setCurrentView('user-tasks');
              }}
            />
          )}

          <SidebarItem
            icon={<Clock size={20} />}
            label="Apontamento de Horas"
            active={
              currentView === 'timesheet-calendar' ||
              currentView === 'timesheet-form' ||
              currentView === 'timesheet-admin-dashboard' ||
              currentView === 'timesheet-admin-detail'
            }
            onClick={handleTimesheetNav}
          />

          {currentUser.role === 'admin' && (
            <SidebarItem
              icon={<Users size={20} />}
              label="Equipe"
              active={currentView === 'team-list' || currentView === 'team-member-detail'}
              onClick={() => setCurrentView('team-list')}
            />
          )}
        </nav>

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

          <div className="h-px bg-slate-100 my-4 mx-3" />

          <SidebarItem
            icon={<LogOut size={20} />}
            label="Sair"
            className="text-red-500 hover:bg-red-50 group-hover:text-red-600"
            onClick={handleLogout}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative bg-slate-50">
        <div className="absolute inset-0 p-6 lg:p-10 overflow-hidden flex flex-col">
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
              onBackToAdmin={
                currentUser.role === 'admin'
                  ? () => {
                      setSelectedClientId(null);
                      setCurrentView('admin');
                    }
                  : undefined
              }
              onDeleteTask={handleDeleteTask}
              user={currentUser}
            />
          )}

          {currentView === 'project-create' && (
            <ProjectForm
              clients={clients}
              onSave={handleSaveProject}
              onBack={() => setCurrentView('kanban')}
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

          {currentView === 'developer-projects' && (
            <DeveloperProjects
              user={currentUser}
              projects={projects}
              clients={clients}
              tasks={tasks}
              onProjectClick={handleDeveloperProjectClick}
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
            />
          )}

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
              preSelectedClientId={
                selectedProjectId
                  ? getClientForProject(selectedProjectId)
                  : selectedClientId || undefined
              }
              user={currentUser}
            />
          )}

          {currentView === 'timesheet-calendar' && (
            <TimesheetCalendar
              entries={timesheetEntries.filter(e => e.userId === currentUser.id)}
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
      ${className ?? ''}
    `}
  >
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-[#4c1d95]'} transition-colors`}>
      {icon}
    </span>
    <span className="hidden lg:block font-medium text-sm">{label}</span>
  </button>
);

export default App;
