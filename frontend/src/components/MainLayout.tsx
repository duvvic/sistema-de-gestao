// components/MainLayout.tsx
// Layout principal com menu lateral e navegação

import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    CheckSquare,
    LogOut,
    Briefcase,
    Clock,
    Menu,
    X
} from 'lucide-react';

const MainLayout: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    // Menu items baseado no role
    const adminMenuItems = [
        { path: '/admin/clients', icon: Users, label: 'Clientes' },
        { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },

        { path: '/admin/team', icon: Users, label: 'Funcionários' }, // Atualizado para rota admin correta e label
        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
    ];

    const developerMenuItems = [
        { path: '/developer/projects', icon: Briefcase, label: 'Projetos' },
        { path: '/developer/tasks', icon: CheckSquare, label: 'Minhas Tarefas' },
        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
    ];

    const menuItems = currentUser?.role === 'admin' ? adminMenuItems : developerMenuItems;

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-gradient-to-b from-[#4c1d95] to-[#5b21b6] text-white transition-all duration-300 flex flex-col`}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-purple-600">
                    {sidebarOpen ? (
                        <>
                            <h1 className="text-xl font-bold">NIC Labs</h1>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-purple-700 rounded-lg transition-colors mx-auto"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* User Info */}
                <div className="p-6 border-b border-purple-600">
                    <div className="flex items-center gap-3">
                        {currentUser?.avatarUrl ? (
                            <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.name}
                                className="w-10 h-10 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-purple-700 flex items-center justify-center text-lg font-bold">
                                {currentUser?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{currentUser?.name}</p>
                                <p className="text-xs text-purple-200 truncate capitalize">{currentUser?.role}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                                    ? 'bg-white text-[#4c1d95] shadow-lg'
                                    : 'text-purple-100 hover:bg-purple-700'
                                    } ${!sidebarOpen && 'justify-center'}`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="font-medium">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-purple-600">
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-100 hover:bg-red-600 transition-colors ${!sidebarOpen && 'justify-center'
                            }`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">Sair</span>}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <Outlet />
            </div>
        </div>
    );
};

export default MainLayout;
