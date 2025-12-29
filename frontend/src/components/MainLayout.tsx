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
import { AnimatePresence, motion } from 'framer-motion';
import logoImg from '@/assets/logo.png';

const MainLayout: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Listamos as rotas "raiz" do menu para forçar a animação de baixo p/ cima
    const MAIN_PATHS = [
        '/admin/clients',
        '/tasks',
        '/admin/team',
        '/timesheet',
        '/developer/projects',
        '/developer/tasks',
        '/profile'
    ];

    // Ref para guardar o path anterior e calcular direção instantaneamente
    const prevPathRef = React.useRef(location.pathname);
    const [direction, setDirection] = useState<'root' | 'forward' | 'back'>('root');

    // UseLayoutEffect roda antes da pintura browser, evitando "flash"
    React.useLayoutEffect(() => {
        const prevPath = prevPathRef.current;
        const currentPath = location.pathname;

        if (prevPath === currentPath) return;

        // Normaliza paths removendo barras finais para comparação segura
        const prev = prevPath.endsWith('/') && prevPath !== '/' ? prevPath.slice(0, -1) : prevPath;
        const curr = currentPath.endsWith('/') && currentPath !== '/' ? currentPath.slice(0, -1) : currentPath;

        const isPrevMain = MAIN_PATHS.some(p => prev === p);
        const isCurrentMain = MAIN_PATHS.some(p => curr === p);

        let newDir: 'root' | 'forward' | 'back' = 'root';

        // 1. Navegação entre menus principais -> Animação Vertical (Root)
        if (isPrevMain && isCurrentMain) {
            newDir = 'root';
        }
        // 2. Entrando em detalhe (URL nova contém a antiga) -> Ex: /projects -> /projects/123
        else if (curr.startsWith(prev + '/')) {
            newDir = 'forward';
        }
        // 3. Voltando (URL antiga continha a nova) -> Ex: /projects/123 -> /projects
        else if (prev.startsWith(curr + '/')) {
            newDir = 'back';
        }
        // 4. Fallback por profundidade (para casos onde a URL muda totalmente mas a hierarquia lógica existe)
        else {
            const prevDepth = prev.split('/').filter(Boolean).length;
            const currentDepth = curr.split('/').filter(Boolean).length;

            if (currentDepth > prevDepth) newDir = 'forward';
            else if (currentDepth < prevDepth) newDir = 'back';
            else newDir = 'root';
        }

        setDirection(newDir);
        prevPathRef.current = currentPath;
    }, [location.pathname]);

    // Variantes de animação refinadas
    const variants = {
        initial: (dir: string) => {
            if (dir === 'forward') return { x: '100%', opacity: 1, position: 'absolute', width: '100%', height: '100%' };
            if (dir === 'back') return { x: '-20%', opacity: 0.5, position: 'absolute', width: '100%', height: '100%' };
            return { y: 100, opacity: 0, position: 'absolute', width: '100%', height: '100%' };
        },
        animate: {
            x: 0,
            y: 0,
            opacity: 1,
            position: 'absolute',
            width: '100%',
            height: '100%',
            transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } // Spring mais lento e suave
        },
        exit: (dir: string) => {
            if (dir === 'forward') return { x: '-20%', opacity: 0.5, position: 'absolute', width: '100%', height: '100%' };
            if (dir === 'back') return { x: '100%', opacity: 1, zIndex: 50, position: 'absolute', width: '100%', height: '100%' };
            return { opacity: 0, scale: 0.95, position: 'absolute', width: '100%', height: '100%' };
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    // ... (rest of menu definitions)

    const adminMenuItems = [
        { path: '/admin/clients', icon: Users, label: 'Clientes' },
        { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
        { path: '/admin/team', icon: Users, label: 'Funcionários' },
        { path: '/timesheet', icon: Clock, label: 'Folha de Ponto' },
    ];

    const developerMenuItems = [
        { path: '/developer/projects', icon: Briefcase, label: 'Projetos' },
        { path: '/developer/tasks', icon: CheckSquare, label: 'Minhas Tarefas' },
        { path: '/timesheet', icon: Clock, label: 'Folha de Ponto' },
    ];

    const menuItems = currentUser?.role === 'admin' ? adminMenuItems : developerMenuItems;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } bg-gradient-to-b from-[#4c1d95] to-[#5b21b6] text-white transition-all duration-300 flex flex-col z-20 shadow-xl relative`}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-purple-600">
                    {sidebarOpen ? (
                        <>
                            <div className="flex items-center gap-3">
                                <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
                                <h1 className="text-xl font-bold">NIC-LABS</h1>
                            </div>
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

                {/* User Info Melhorado e Clicável */}
                <button
                    className={`p-6 border-b border-purple-600 w-full bg-gradient-to-r from-[#4c1d95]/80 to-[#5b21b6]/60 hover:from-[#6d28d9]/90 hover:to-[#7c3aed]/70 transition-all flex items-center gap-3 group focus:outline-none`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/profile')}
                    title="Ver/editar perfil"
                >
                    {currentUser?.avatarUrl ? (
                        <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-700 flex items-center justify-center text-xl font-bold border-2 border-white shadow-md group-hover:scale-105 transition-transform">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    {sidebarOpen && (
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold truncate text-white group-hover:underline">{currentUser?.name}</p>
                            <p className="text-xs text-purple-200 truncate capitalize">{currentUser?.cargo || 'Colaborador'}</p>
                        </div>
                    )}
                </button>

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
                                {sidebarOpen && <span className="font-medium" translate="no">{item.label}</span>}
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

            {/* Main Content - iOS Navigation Wrapper */}
            <div className="flex-1 overflow-hidden relative bg-slate-50 perspective-1000">
                <AnimatePresence custom={direction} mode="popLayout">
                    <motion.div
                        key={location.pathname}
                        custom={direction}
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="h-full w-full overflow-auto absolute top-0 left-0 bg-slate-50 shadow-2xl"
                    // Adiciona sombra quando está "flutuando" na animação
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MainLayout;
