// routes/AppRoutes.tsx - VERSÃO COMPLETA ADMIN
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Componentes adaptados
import Login from '../components/Login';
import AdminDashboard from '../components/AdminDashboard';
import ClientDetailsView from '../components/ClientDetailsView';
import ClientForm from '../components/ClientForm';
import AllProjectsView from '../components/AllProjectsView';
import ProjectDetailView from '../components/ProjectDetailView';
import ProjectForm from '../components/ProjectForm';
import DeveloperProjects from '../components/DeveloperProjects';
import KanbanBoard from '../components/KanbanBoard';
import TaskDetail from '../components/TaskDetail';
import MainLayout from '../components/MainLayout';

// Componentes de Equipe
import TeamList from '../components/TeamList';
import TeamMemberDetail from '../components/TeamMemberDetail';
import UserForm from '../components/UserForm';
import UserProfile from '../components/UserProfile';

// Componentes de Timesheet
import TimesheetAdminDashboard from '../components/TimesheetAdminDashboard';
import TimesheetCalendar from '../components/TimesheetCalendar';
import TimesheetForm from '../components/TimesheetForm';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: 'admin' | 'developer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { currentUser, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === 'admin' && currentUser.role !== 'admin') {
        return <Navigate to="/developer/projects" replace />;
    }

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Rota Pública Check */}
            <Route path="/login" element={<Login />} />

            {/* Rota Raiz - Redireciona baseado no role */}
            <Route path="/" element={
                <ProtectedRoute>
                    <Navigate to="/dashboard" replace />
                    {/* A lógica de redirect real poderia ser mais complexa, mas vamos manter simples por enquanto. 
                        O Dashboard do admin é /admin/dashboard? Não, vamos definir a rota /dashboard para redirecionar.
                    */}
                </ProtectedRoute>
            } />

            {/* Redirecionamento inteligente */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <RoleBasedRedirect />
                </ProtectedRoute>
            } />

            {/* === ROTAS ADMIN === */}
            <Route path="/admin" element={<Navigate to="/admin/clients" replace />} />

            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <MainLayout />
                    </ProtectedRoute>
                }
            >
                {/* Dashboard Admin (Clientes) */}
                <Route
                    path="admin/clients"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Cliente */}
                <Route
                    path="admin/clients/:clientId"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ClientDetailsView />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Cliente */}
                <Route
                    path="admin/clients/new"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ClientForm />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Cliente */}
                <Route
                    path="admin/clients/:clientId/edit"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ClientForm />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Projeto (a partir do cliente) */}
                <Route
                    path="admin/clients/:clientId/projects/new"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* --- PROJETOS (ADMIN) --- */}

                {/* Todos os Projetos */}
                <Route
                    path="admin/projects"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <AllProjectsView />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Projeto */}
                <Route
                    path="admin/projects/:projectId"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ProjectDetailView />
                        </ProtectedRoute>
                    }
                />

                {/* Novo Projeto (Geral) */}
                <Route
                    path="admin/projects/new"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Projeto */}
                <Route
                    path="admin/projects/:projectId/edit"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <ProjectForm />
                        </ProtectedRoute>
                    }
                />

                {/* === ROTAS DE EQUIPE === */}

                {/* Lista de Colaboradores */}
                <Route
                    path="admin/team"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <TeamList />
                        </ProtectedRoute>
                    }
                />

                {/* Criar Colaborador */}
                <Route
                    path="admin/team/new"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <UserForm />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes do Colaborador */}
                <Route
                    path="admin/team/:userId"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <TeamMemberDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Editar Colaborador */}
                <Route
                    path="admin/team/:userId/edit"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <UserForm />
                        </ProtectedRoute>
                    }
                />

                {/* Perfil do Usuário (Acessível a todos) */}
                <Route
                    path="profile"
                    element={
                        <ProtectedRoute>
                            <UserProfile />
                        </ProtectedRoute>
                    }
                />

                {/* === TIMESHEET (ADMIN) === */}
                <Route
                    path="admin/timesheet"
                    element={
                        <ProtectedRoute requiredRole="admin">
                            <TimesheetAdminDashboard />
                        </ProtectedRoute>
                    }
                />

                {/* === ROTAS DEVELOPER E COMPARTILHADAS === */}

                {/* Projetos do Developer */}
                <Route
                    path="developer/projects"
                    element={
                        <ProtectedRoute>
                            <DeveloperProjects />
                        </ProtectedRoute>
                    }
                />

                {/* Kanban Board (Tarefas) */}
                <Route
                    path="tasks"
                    element={
                        <ProtectedRoute>
                            <KanbanBoard />
                        </ProtectedRoute>
                    }
                />

                {/* Nova Tarefa */}
                <Route
                    path="tasks/new"
                    element={
                        <ProtectedRoute>
                            <TaskDetail />
                        </ProtectedRoute>
                    }
                />

                {/* Detalhes da Tarefa */}
                <Route
                    path="tasks/:taskId"
                    element={
                        <ProtectedRoute>
                            <TaskDetail />
                        </ProtectedRoute>
                    }
                />

                {/* === TIMESHEET (Todos) === */}
                <Route
                    path="timesheet"
                    element={
                        <ProtectedRoute>
                            <TimesheetCalendar />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="timesheet/new"
                    element={
                        <ProtectedRoute>
                            <TimesheetForm />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="timesheet/:entryId"
                    element={
                        <ProtectedRoute>
                            <TimesheetForm />
                        </ProtectedRoute>
                    }
                />

                {/* === OUTRAS ROTAS (TODO) === */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

            </Route>
        </Routes>
    );
};

// Pequeno componente auxiliar para redirecionar baseado no role
const RoleBasedRedirect = () => {
    const { currentUser } = useAuth();
    if (currentUser?.role === 'admin') {
        return <Navigate to="/admin/clients" replace />;
    }
    return <Navigate to="/developer/projects" replace />;
}

export default AppRoutes;
