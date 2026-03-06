import React, { useState, useContext } from 'react';
import { ThemeContext } from '@/App';
import HelpButton from './HelpButton';
import { Outlet, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/types';
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
    Book,
    GraduationCap,
    StickyNote,
    Zap,
    Activity,
    RefreshCw,
    Palmtree,
    ShieldAlert
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import logoImg from '@/assets/logo.png';


const MainLayout: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { themeMode, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();
    const navType = useNavigationType(); // Detecta PUSH, POP, REPLACE
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleSidebarEnter = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setIsHovered(true), 40);
    };

    const handleSidebarLeave = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => setIsHovered(false), 120);
    };

    const sidebarOpen = isHovered;


    // Definição dos menus (movido para cima para ser usado na lógica de animação do menu)
    const adminMenuItems = [
        { path: '/admin/monitoring', icon: Activity, label: 'Monitoramento' },
        { path: '/admin/clients', icon: Briefcase, label: 'Gestão' },
        { path: '/tasks', icon: CheckSquare, label: 'Tarefas' },
        { path: '/admin/team', icon: Users, label: 'Colaboradores' },
        { path: '/admin/rh', icon: Palmtree, label: 'Gestão RH' },
        { path: '/admin/reports', icon: LayoutDashboard, label: 'Relatórios' },
        { path: '/admin/sync', icon: RefreshCw, label: 'Sincronização' },

        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
    ];

    const developerMenuItems = [
        { path: '/developer/projects', icon: Briefcase, label: 'Projetos' },
        { path: '/developer/tasks', icon: CheckSquare, label: 'Minhas Tarefas' },
        { path: '/timesheet', icon: Clock, label: 'Timesheet' },
        { path: '/developer/learning', icon: GraduationCap, label: 'Estudo' },
        { path: '/notes', icon: StickyNote, label: 'Notas' },
        { path: '/docs', icon: Book, label: 'Documentação' },
    ];

    const adminRoles: Role[] = ['admin', 'system_admin', 'gestor', 'diretoria', 'pmo', 'financeiro', 'financial', 'tech_lead', 'executive', 'ceo', 'rh'];

    const menuItems = adminRoles.includes(currentUser?.role as Role)
        ? adminMenuItems
        : developerMenuItems;

    // Listamos as rotas "raiz" do menu para forçar a animação
    const MAIN_PATHS = React.useMemo(() => menuItems.map(m => m.path).concat(['/profile']), [menuItems]);

    // (Sidebar é controlado por hover — nenhum efeito adicional necessário)


    // Ref para guardar o path anterior e calcular direção instantaneamente
    const prevPathRef = React.useRef(location.pathname);
    const [direction, setDirection] = useState<'root' | 'forward' | 'back' | 'menu-down' | 'menu-up'>('root');

    // Sincronizar direção imediatamente ao detectar mudança de path
    if (prevPathRef.current !== location.pathname) {
        const prev = prevPathRef.current.endsWith('/') && prevPathRef.current !== '/' ? prevPathRef.current.slice(0, -1) : prevPathRef.current;
        const curr = location.pathname.endsWith('/') && location.pathname !== '/' ? location.pathname.slice(0, -1) : location.pathname;

        const isPrevMain = MAIN_PATHS.some(p => prev === p);
        const isCurrentMain = MAIN_PATHS.some(p => curr === p);

        let newDir: 'root' | 'forward' | 'back' | 'menu-down' | 'menu-up' = 'root';

        if (curr.startsWith(prev + '/')) {
            newDir = 'forward';
        } else if (prev.startsWith(curr + '/')) {
            newDir = 'back';
        } else if (isPrevMain && isCurrentMain) {
            const prevIndex = menuItems.findIndex(m => m.path === prev);
            const currIndex = menuItems.findIndex(m => m.path === curr);
            if (prevIndex !== -1 && currIndex !== -1) {
                newDir = currIndex > prevIndex ? 'menu-down' : 'menu-up';
            } else {
                newDir = 'root';
            }
        } else if (navType === 'POP') {
            newDir = 'back';
        } else {
            newDir = 'root';
        }

        if (direction !== newDir) setDirection(newDir);
        prevPathRef.current = location.pathname;
    }

    // Variantes de animação premium estilo iOS Stacking (Impilhamento)
    const variants = {
        initial: (dir: string) => {
            if (dir === 'forward') return {
                x: '100%',
                opacity: 1,
                scale: 1,
                zIndex: 50,
                boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', // Sombra no lado esquerdo do que está entrando
            };
            if (dir === 'back') return {
                x: '-10%', // Efeito de profundidade sutil
                opacity: 0.9,
                scale: 0.98,
                zIndex: 0,
            };

            if (dir === 'menu-down') return { y: '5%', opacity: 0, scale: 0.98 };
            if (dir === 'menu-up') return { y: '-5%', opacity: 0, scale: 0.98 };

            return { opacity: 0, scale: 0.99 };
        },
        animate: {
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            zIndex: 10,
            transition: {
                duration: 0.4,
                ease: [0.32, 0.72, 0, 1] as [number, number, number, number]
            }
        },
        exit: (dir: string) => {
            if (dir === 'forward') return {
                x: '-10%',
                opacity: 0.8,
                scale: 0.98,
                zIndex: 0,
                pointerEvents: 'none' as const,
                transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] }
            };
            if (dir === 'back') return {
                x: '100%',
                opacity: 1,
                scale: 1,
                zIndex: 50,
                boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
                pointerEvents: 'none' as const,
                transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] }
            };

            if (dir === 'menu-down') return { y: '-5%', opacity: 0, scale: 0.98, pointerEvents: 'none' as const, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } };
            if (dir === 'menu-up') return { y: '5%', opacity: 0, scale: 0.98, pointerEvents: 'none' as const, transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] } };

            return { opacity: 0, scale: 0.99, pointerEvents: 'none' as const, transition: { duration: 0.3 } };
        }
    };

    const handleLogout = async () => {

        try {
            await logout();

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
            {/* Sidebar container — mantém largura fixa no layout, sidebar real faz overlay */}
            <div
                className="relative flex-shrink-0 h-full"
                style={{ width: '4.5rem' }}
                onMouseEnter={handleSidebarEnter}
                onMouseLeave={handleSidebarLeave}
            >
                {/* Sidebar real — absolute, desliza por cima do conteúdo ao direita */}
                <div
                    className="absolute top-0 left-0 h-full flex flex-col shadow-2xl border-r border-white/5 overflow-hidden"
                    style={{
                        width: sidebarOpen ? '16rem' : '4.5rem',
                        transition: 'width 180ms cubic-bezier(0.4, 0, 0.2, 1)',
                        background: 'linear-gradient(180deg, var(--sidebar-bg), var(--sidebar-bg-2))',
                        zIndex: 30,
                    }}
                >
                    <div
                        className="flex items-center border-b border-white/10 overflow-hidden flex-shrink-0"
                        style={{ padding: sidebarOpen ? '1.25rem' : '1rem', gap: sidebarOpen ? '0.75rem' : 0, justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
                    >
                        <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain flex-shrink-0" />
                        <h1
                            className="text-lg font-bold text-white whitespace-nowrap"
                            style={{
                                opacity: sidebarOpen ? 1 : 0,
                                width: sidebarOpen ? 'auto' : 0,
                                overflow: 'hidden',
                                transition: 'opacity 150ms ease, width 180ms cubic-bezier(0.4,0,0.2,1)',
                            }}
                        >
                            NIC-LABS
                        </h1>
                    </div>

                    {/* User Info */}
                    <button
                        className="border-b border-white/10 w-full bg-white/5 hover:bg-white/10 transition-all flex items-center gap-3 group focus:outline-none relative flex-shrink-0 overflow-hidden"
                        style={{ padding: sidebarOpen ? '1.5rem' : '1rem', justifyContent: sidebarOpen ? 'flex-start' : 'center', cursor: 'pointer' }}
                        onClick={() => navigate('/profile')}
                        title="Ver/editar perfil"
                    >
                        {isActive('/profile') && (
                            <div className="absolute left-0 top-0 w-1 h-full bg-white" />
                        )}
                        {currentUser?.avatarUrl ? (
                            <img
                                src={currentUser.avatarUrl}
                                alt={currentUser.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-md group-hover:scale-105 transition-transform flex-shrink-0"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border-2 border-white/50 shadow-md group-hover:scale-105 transition-transform text-white flex-shrink-0">
                                {currentUser?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <div
                            className="flex-1 min-w-0 text-left overflow-hidden"
                            style={{
                                opacity: sidebarOpen ? 1 : 0,
                                maxWidth: sidebarOpen ? '10rem' : 0,
                                transition: 'opacity 150ms ease, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                            }}
                        >
                            <p className="font-semibold truncate text-white group-hover:underline text-sm">{currentUser?.name}</p>
                            <p className="text-xs text-white/70 truncate capitalize">{currentUser?.cargo || 'Colaborador'}</p>
                        </div>
                    </button>

                    {/* Menu Items */}
                    <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);

                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative overflow-hidden"
                                    style={{
                                        backgroundColor: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                        color: active ? 'white' : 'rgba(255, 255, 255, 0.75)',
                                        justifyContent: sidebarOpen ? 'flex-start' : 'center',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!active) {
                                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.color = 'white';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!active) {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                                        }
                                    }}
                                    title={!sidebarOpen ? item.label : undefined}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span
                                        className="font-medium whitespace-nowrap"
                                        translate="no"
                                        style={{
                                            opacity: sidebarOpen ? 1 : 0,
                                            maxWidth: sidebarOpen ? '12rem' : 0,
                                            overflow: 'hidden',
                                            transition: 'opacity 150ms ease, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                                        }}
                                    >
                                        {item.label}
                                    </span>
                                    {active && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                                    )}
                                </button>
                            );
                        })}

                        <div className="my-3 h-px bg-white/10 mx-2" />

                        <button
                            onClick={toggleTheme}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/75 hover:bg-white/8 hover:text-white transition-colors overflow-hidden"
                            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
                            title={!sidebarOpen ? (themeMode === 'light' ? 'Modo Escuro' : 'Modo Claro') : undefined}
                        >
                            {themeMode === 'light' ? (
                                <Moon className="w-5 h-5 flex-shrink-0" />
                            ) : (
                                <Sun className="w-5 h-5 flex-shrink-0" />
                            )}
                            <span
                                className="font-medium whitespace-nowrap"
                                style={{
                                    opacity: sidebarOpen ? 1 : 0,
                                    maxWidth: sidebarOpen ? '12rem' : 0,
                                    overflow: 'hidden',
                                    transition: 'opacity 150ms ease, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                                }}
                            >
                                {themeMode === 'light' ? 'Escuro' : 'Claro'}
                            </span>
                        </button>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/75 hover:bg-red-500/70 hover:text-white transition-colors overflow-hidden"
                            style={{ justifyContent: sidebarOpen ? 'flex-start' : 'center' }}
                            title={!sidebarOpen ? 'Sair' : undefined}
                        >
                            <LogOut className="w-5 h-5 flex-shrink-0" />
                            <span
                                className="font-medium whitespace-nowrap"
                                style={{
                                    opacity: sidebarOpen ? 1 : 0,
                                    maxWidth: sidebarOpen ? '12rem' : 0,
                                    overflow: 'hidden',
                                    transition: 'opacity 150ms ease, max-width 180ms cubic-bezier(0.4,0,0.2,1)',
                                }}
                            >
                                Sair
                            </span>
                        </button>
                    </nav>

                </div>
            </div>

            {/* Main Content - iOS Navigation Wrapper */}
            <div className="flex-1 overflow-hidden relative" style={{ background: 'var(--bg)' }}>
                <div className="h-full w-full relative overflow-hidden"
                    style={{ backgroundColor: 'var(--bg)' }}>
                    <AnimatePresence custom={direction}>
                        <motion.div
                            key={location.pathname}
                            custom={direction}
                            variants={variants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            className="h-full w-full overflow-auto absolute inset-0 custom-scrollbar"
                            style={{ backgroundColor: 'var(--bg)' }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Contextual Help System - Oculto na aba executiva para maximizar espaço */}
            {new URLSearchParams(location.search).get('tab') !== 'executivo' && <HelpButton />}
        </div>
    );
};

export default MainLayout;
