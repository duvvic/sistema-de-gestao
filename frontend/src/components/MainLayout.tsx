import React, { useState, useContext } from 'react';
import { ThemeContext } from '@/App';
import HelpButton from './HelpButton';
import { Outlet, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    LayoutDashboard,
    Users,
    CheckSquare,
    LogOut,
    Briefcase,
    Clock,
    Menu,
    X,
    Moon,
    Sun,
    GraduationCap,
    StickyNote,
    Zap
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import logoImg from '@/assets/logo.png';


const MainLayout: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { themeMode, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();
    const navType = useNavigationType(); // Detecta PUSH, POP, REPLACE
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Definição dos menus (movido para cima para ser usado na lógica de animação do menu)
    const adminMenuItems = [
        { path: '/admin/clients', icon: Briefcase, label: 'Portfólio' },
        { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
        { path: '/admin/team', icon: Users, label: 'Colaboradores' },
        { path: '/admin/reports', icon: LayoutDashboard, label: 'Relatórios' },

        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
        { path: '/notes', icon: StickyNote, label: 'Notas' },
    ];

    const developerMenuItems = [
        { path: '/developer/projects', icon: Briefcase, label: 'Projetos' },
        { path: '/developer/tasks', icon: CheckSquare, label: 'Minhas Tarefas' },
        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
        { path: '/developer/learning', icon: GraduationCap, label: 'Estudo' },
        { path: '/notes', icon: StickyNote, label: 'Notas' },
    ];

    const menuItems = currentUser?.role === 'admin' ? adminMenuItems : developerMenuItems;

    // Listamos as rotas "raiz" do menu para forçar a animação
    const MAIN_PATHS = menuItems.map(m => m.path).concat(['/profile']);

    // Ref para guardar o path anterior e calcular direção instantaneamente
    const prevPathRef = React.useRef(location.pathname);
    const [direction, setDirection] = useState<'root' | 'forward' | 'back' | 'menu-down' | 'menu-up'>('root');

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

        let newDir: 'root' | 'forward' | 'back' | 'menu-down' | 'menu-up' = 'root';

        // Prioridade 1: Navegação Hierárquica Explícita (Detalhes)
        if (curr.startsWith(prev + '/')) {
            newDir = 'forward';
        } else if (prev.startsWith(curr + '/')) {
            newDir = 'back';
        }
        // Prioridade 2: Navegação entre Menus Principais
        else if (isPrevMain && isCurrentMain) {
            const prevIndex = menuItems.findIndex(m => m.path === prev);
            const currIndex = menuItems.findIndex(m => m.path === curr);

            if (prevIndex !== -1 && currIndex !== -1) {
                if (currIndex > prevIndex) newDir = 'menu-down'; // Clicou em item abaixo -> Vem de cima
                else newDir = 'menu-up';   // Clicou em item acima -> Vem de baixo
            } else {
                newDir = 'root'; // Caso de fallback (ex: profile)
            }
        }
        // Prioridade 3: Fallback usando NavigationType (POP geralmente é voltar)
        else if (navType === 'POP') {
            newDir = 'back';
        }
        // Fallback final
        else {
            newDir = 'root';
        }

        setDirection(newDir);
        prevPathRef.current = currentPath;
    }, [location.pathname, menuItems, navType]);

    // Variantes de animação refinadas
    const variants = {
        initial: (dir: string) => {
            // Forward: Entra pela direita, z-index alto
            if (dir === 'forward') return { x: '100%', opacity: 1, position: 'absolute', width: '100%', height: '100%', zIndex: 50 };
            // Back: Entra pela esquerda (fundo), z-index baixo
            if (dir === 'back') return { x: '-20%', opacity: 0.8, position: 'absolute', width: '100%', height: '100%', zIndex: 0 };

            if (dir === 'menu-down') return { y: '-15%', opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10 };
            if (dir === 'menu-up') return { y: '15%', opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10 };

            return { opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10 };
        },
        animate: {
            x: 0,
            y: 0,
            opacity: 1,
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 10, // Base level
            transition: { duration: 0.48, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } // 5% mais lento (0.45 -> 0.48)
        },
        exit: (dir: string) => {
            // Forward: Sai pela esquerda (fundo), z-index baixo
            if (dir === 'forward') return { x: '-20%', opacity: 0.8, position: 'absolute', width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' };
            // Back: Sai pela direita (frente), z-index alto
            if (dir === 'back') return { x: '100%', opacity: 1, position: 'absolute', width: '100%', height: '100%', zIndex: 50, pointerEvents: 'none' };

            if (dir === 'menu-down') return { y: '15%', opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' };
            if (dir === 'menu-up') return { y: '-15%', opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' };

            return { opacity: 0, position: 'absolute', width: '100%', height: '100%', zIndex: 10, pointerEvents: 'none' };
        }
    };

    const handleLogout = async () => {
        console.log('[MainLayout] Iniciando logout...');
        try {
            await logout();
            console.log('[MainLayout] Logout concluído, redirecionando...');
            navigate('/login', { replace: true });
        } catch (error) {
            console.error('[MainLayout] Erro crítico no logout:', error);
            navigate('/login', { replace: true });
        }
    };

    const isActive = (path: string) => {
        return location.pathname.startsWith(path);
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? 'w-64' : 'w-20'
                    } transition-all duration-300 flex flex-col z-20 shadow-xl relative`}
                style={{ background: 'linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-2))' }}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between border-b border-white/10">
                    {sidebarOpen ? (
                        <>
                            <div className="flex items-center gap-3">
                                <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
                                <h1 className="text-xl font-bold text-white">NIC-LABS</h1>
                            </div>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors mx-auto text-white"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* User Info Melhorado e Clicável */}
                <button
                    className={`p-6 border-b border-white/10 w-full bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3 group focus:outline-none`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/profile')}
                    title="Ver/editar perfil"
                >
                    {currentUser?.avatarUrl ? (
                        <img
                            src={currentUser.avatarUrl}
                            alt={currentUser.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white/50 shadow-md group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-2 border-white/50 shadow-md group-hover:scale-105 transition-transform text-white">
                            {currentUser?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    {sidebarOpen && (
                        <div className="flex-1 min-w-0 text-left">
                            <p className="font-semibold truncate text-white group-hover:underline">{currentUser?.name}</p>
                            <p className="text-xs text-white/70 truncate capitalize">{currentUser?.cargo || 'Colaborador'}</p>
                        </div>
                    )}
                </button>

                {/* Menu Items */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);

                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${!sidebarOpen && 'justify-center'}`}
                                style={{
                                    backgroundColor: active ? 'var(--surface)' : 'transparent',
                                    color: active ? 'var(--primary)' : 'rgba(255, 255, 255, 0.8)',
                                }}
                                onMouseEnter={(e) => {
                                    if (!active) {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.color = 'white';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!active) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                        e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                                    }
                                }}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {sidebarOpen && <span className="font-medium" translate="no">{item.label}</span>}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Actions */}
                <div className="p-4 border-t border-white/10 space-y-1">
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        {themeMode === 'light' ? (
                            <Moon className="w-5 h-5 flex-shrink-0" />
                        ) : (
                            <Sun className="w-5 h-5 flex-shrink-0" />
                        )}
                        {sidebarOpen && <span className="font-medium">{themeMode === 'light' ? 'Escuro' : 'Claro'}</span>}
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:bg-red-500/80 hover:text-white transition-colors ${!sidebarOpen && 'justify-center'}`}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {sidebarOpen && <span className="font-medium">Sair</span>}
                    </button>
                </div>
            </div>

            {/* Main Content - iOS Navigation Wrapper */}
            <div className="flex-1 overflow-hidden relative perspective-1000" style={{ backgroundColor: 'var(--bg)' }}>
                <AnimatePresence custom={direction} mode="popLayout">
                    <motion.div
                        key={location.pathname}
                        custom={direction}
                        variants={variants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="h-full w-full overflow-auto absolute top-0 left-0 shadow-2xl"
                        style={{ backgroundColor: 'var(--bg)' }}
                    // Adiciona sombra quando está "flutuando" na animação
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Contextual Help System */}
            <HelpButton />
        </div>
    );
};

export default MainLayout;
