import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { Task, Project, User, Client } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Activity,
    Timer,
    Users,
    Zap,
    Cpu,
    Wifi,
    CheckCircle2,
    LayoutGrid,
    Clock,
    Database,
    Cloud,
    Shield,
    Box
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

// --- Sub-componentes Estilizados ---

const Badge = ({ children, status }: { children: React.ReactNode, status: string }) => {
    const colors: any = {
        'trabalhando': 'bg-purple-50 text-purple-600 border-purple-100',
        'teste': 'bg-blue-50 text-blue-600 border-blue-100',
        'nao iniciado': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'atraso': 'bg-red-50 text-red-600 border-red-100',
        // Fallbacks keys if needed
        'execucao': 'bg-purple-50 text-purple-600 border-purple-100',
        'revisao': 'bg-blue-50 text-blue-600 border-blue-100',
        'planejamento': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
    const key = status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const colorClass = colors[key] || 'bg-slate-50 text-slate-600 border-slate-100';

    return (
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${colorClass}`}>
            {children}
        </span>
    );
};

const SectionHeader = ({ label, icon: Icon, colorClass }: { label: string, icon: any, colorClass: string }) => (
    <div className="flex items-center gap-3 mb-4">
        <div className={`w-1.5 h-6 rounded-full ${colorClass}`} />
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</h2>
        <div className="h-[1px] flex-1 bg-slate-100 ml-4" />
    </div>
);

// --- Componente Principal ---

const AdminMonitoringView: React.FC = () => {
    const { tasks: allTasks, projects: allProjects, users: allUsers, clients: allClients, loading } = useDataController();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [taskPage, setTaskPage] = useState(0);

    const tasksInProgressRaw = useMemo(() =>
        allTasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'in progress' || status === 'review';
        }),
        [allTasks]);

    // Sort logic or just raw array
    const tasksInProgress = tasksInProgressRaw;

    useEffect(() => {
        const totalPages = Math.ceil(tasksInProgress.length / 6);
        if (totalPages <= 1) return;

        const interval = setInterval(() => {
            setTaskPage((prev) => (prev + 1) % totalPages);
        }, 10000); // 10 seconds per page

        return () => clearInterval(interval);
    }, [tasksInProgress.length]);



    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);
    const clientMap = useMemo(() => new Map(allClients.map(c => [c.id, c])), [allClients]);

    const isTaskDelayed = (task: Task) => {
        if (task.status === 'Done' || task.status === 'Review') return false;
        if (!task.estimatedDelivery) return false;
        const deadline = new Date(task.estimatedDelivery);
        deadline.setHours(23, 59, 59, 999);
        return deadline < new Date();
    };

    // tasksInProgress already defined above

    const activeProjects = useMemo(() => {
        return allProjects.filter(p => {
            const projTasks = allTasks.filter(t => t.projectId === p.id);
            const hasIncomplete = projTasks.some(t => t.status !== 'Done');
            return projTasks.length > 0 && hasIncomplete;
        });
    }, [allProjects, allTasks]);

    const teamStatus = useMemo(() => {
        const members = allUsers.filter(u => u.active !== false).map(user => {
            const userTasks = allTasks.filter(t => t.developerId === user.id);
            const activeTasks = userTasks.filter(t => t.status === 'In Progress' || t.status === 'Review');
            const delayedTasks = userTasks.filter(t => isTaskDelayed(t));
            const hasStudy = userTasks.some(t => t.title.toLowerCase().includes('estudo'));

            let status: 'LIVRE' | 'ESTUDANDO' | 'OCUPADO' | 'ATRASADO' = 'LIVRE';
            if (delayedTasks.length > 0) status = 'ATRASADO';
            else if (user.cargo?.toLowerCase().includes('estudo') || hasStudy) status = 'ESTUDANDO';
            else if (activeTasks.length > 0) status = 'OCUPADO';

            return { ...user, boardStatus: status };
        });

        // REGRAS DE NEGÓCIO: Mostrar somente atraso, estudando e livres
        return members.filter(m => m.boardStatus !== 'OCUPADO');
    }, [allUsers, allTasks]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inicializando Sistemas...</span>
            </div>
        </div>
    );

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-purple-100">

            {/* --- HEADER --- */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-5">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center border border-purple-100 shadow-sm">
                        <LayoutGrid className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight flex items-center gap-2 uppercase">
                            Painel Operacional <span className="text-purple-600 italic">Nic Labs</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-0.5">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sistema</span>
                            </div>
                            <span className="text-slate-300">|</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Monitor</span>
                            <span className="text-slate-300">|</span>
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Ativo</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-6 bg-slate-50 border border-slate-100 rounded-xl px-6 py-2 shadow-inner">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center">Hora UTC</span>
                            <span className="text-xl font-black text-slate-800 tabular-nums tracking-wider leading-none">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-200" />
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-center">Data</span>
                            <span className="text-xl font-black text-slate-800 tabular-nums tracking-wider leading-none">
                                {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">

                {/* Section 1: OPERAÇÕES EM EXECUÇÃO */}
                {/* Section 1: OPERAÇÕES EM EXECUÇÃO (Snake Carousel) */}
                <section className="shrink-0 flex flex-col">
                    <SectionHeader label="Operações em Execução" icon={Activity} colorClass="bg-purple-600" />

                    <div className="relative min-h-[380px]"> {/* Altura fixa para evitar pulos de layout */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={taskPage}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                            >
                                {tasksInProgress.slice(taskPage * 6, (taskPage + 1) * 6).map((task) => {
                                    const client = clientMap.get(task.clientId || '');
                                    const dev = userMap.get(task.developerId || '');
                                    const delayed = isTaskDelayed(task);
                                    const isReview = task.status === 'Review';
                                    const statusLabel = task.status === 'In Progress' ? 'Trabalhando' :
                                        task.status === 'Review' ? 'Teste' :
                                            (task.status as any) === 'Todo' ? 'Não Iniciado' : 'Concluído';

                                    const shadowClass = delayed
                                        ? 'shadow-[0_0_20px_rgba(239,68,68,0.15)] border-red-100'
                                        : isReview
                                            ? 'shadow-[0_0_20px_rgba(88,28,135,0.2)] border-purple-200'
                                            : 'shadow-sm';

                                    return (
                                        <div key={task.id} className={`bg-white border rounded-[1.5rem] p-5 relative flex flex-col justify-between group h-[180px] hover:border-purple-200 transition-all ${shadowClass}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge status={delayed ? 'atraso' : statusLabel.toLowerCase()}>{statusLabel}</Badge>
                                                {/* Logo do Cliente no Topo Direito */}
                                                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center overflow-hidden shadow-sm group-hover:bg-white transition-all duration-300 shrink-0">
                                                    <img
                                                        src={client?.logoUrl || 'https://placehold.co/100x100?text=Logo'}
                                                        className="w-full h-full object-contain grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight line-clamp-2 mb-1">{task.title}</h3>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate block">Cliente: {client?.name || 'Interno'}</span>
                                            </div>

                                            <div className="flex items-end justify-between mt-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-slate-50 shadow-sm shrink-0">
                                                        <img src={dev?.avatarUrl || `https://ui-avatars.com/api/?name=${task.developer}&background=f8fafc&color=475569`} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[7px] font-black uppercase text-slate-400">Responsável</span>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px]">{task.developer}</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <span className={`text-2xl font-black tabular-nums leading-none ${delayed ? 'text-red-500' : 'text-purple-600'}`}>{task.progress}%</span>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination Indicators */}
                    {Math.ceil(tasksInProgress.length / 6) > 1 && (
                        <div className="flex justify-center gap-2 mt-2">
                            {Array.from({ length: Math.ceil(tasksInProgress.length / 6) }).map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setTaskPage(idx)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${taskPage === idx ? 'w-6 bg-purple-600' : 'w-1.5 bg-slate-200 hover:bg-purple-300'}`}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Row 2: Projects and Team */}
                <div className="flex flex-col gap-8 min-h-0 flex-1">

                    {/* ECOSSISTEMA DE PROJETOS ATIVOS */}
                    {activeProjects.length > 0 && (
                        <section className="flex flex-col min-h-0 overflow-hidden">
                            <SectionHeader label="Ecossistema de Projetos Ativos" icon={Timer} colorClass="bg-blue-600" />
                            <div className="relative w-full overflow-hidden pb-3">
                                <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
                                    {[...activeProjects, ...activeProjects, ...activeProjects].map((proj, idx) => { // Triplicated for infinite loop
                                        const Icons = [Cloud, Database, Zap, Shield, Box, Activity, Cpu, Wifi];
                                        const ProjIcon = Icons[idx % Icons.length];
                                        const Status = idx % 2 === 0 ? 'Estável' : 'Saudável';
                                        const client = clientMap.get(proj.clientId || '');

                                        return (
                                            <div key={`${proj.id}-${idx}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-sm min-w-[280px] group hover:border-blue-200 transition-all">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-100 group-hover:border-blue-200 transition-all overflow-hidden p-1.5 shadow-sm">
                                                        {client?.logoUrl ? (
                                                            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <ProjIcon className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{client?.name || 'Tecnologia'}</span>
                                                        <span className="text-[14px] font-black text-slate-800 uppercase truncate max-w-[140px] tracking-tight">{proj.name}</span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-4 border-l border-slate-50 ml-2">
                                                    <div className={`w-2 h-2 rounded-full mb-1 ${Status === 'Estável' ? 'bg-emerald-500' : 'bg-blue-500'} shadow-sm`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${Status === 'Estável' ? 'text-emerald-600' : 'text-blue-600'}`}>{Status}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* TIME & DISPONIBILIDADE */}
                    <section className="flex flex-col min-h-0 overflow-hidden">
                        <SectionHeader label="Time & Disponibilidade" icon={Users} colorClass="bg-emerald-600" />
                        <div className="relative w-full overflow-hidden pb-2">
                            <div className="flex gap-4 w-max animate-marquee-reverse hover:[animation-play-state:paused]">
                                {[...teamStatus, ...teamStatus, ...teamStatus].map((member, idx) => { // Triplicated for infinite loop
                                    const colors: any = {
                                        'LIVRE': 'text-emerald-500 border-emerald-500 bg-emerald-50',
                                        'OCUPADO': 'text-purple-500 border-purple-500 bg-purple-50',
                                        'ESTUDANDO': 'text-blue-500 border-blue-500 bg-blue-50',
                                        'ATRASADO': 'text-red-500 border-red-500 bg-red-50'
                                    };
                                    const dotColors: any = {
                                        'LIVRE': 'bg-emerald-500',
                                        'OCUPADO': 'bg-purple-500',
                                        'ESTUDANDO': 'bg-blue-500',
                                        'ATRASADO': 'bg-red-500'
                                    };

                                    return (
                                        <div key={`${member.id}-${idx}`} className="min-w-[200px] bg-white border border-slate-200 rounded-xl p-3 flex flex-col shadow-sm group hover:border-emerald-200 transition-all relative overflow-hidden">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-full p-0.5 border-2 border-slate-100 shadow-sm shrink-0">
                                                    <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.name}&background=f8fafc&color=475569`} className="w-full h-full rounded-full object-cover" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tighter truncate leading-tight">{member.name}</h4>
                                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate">{member.cargo || 'Especialista'}</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-50 pt-2 mt-auto flex items-center justify-between">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border ${colors[member.boardStatus]}`}>
                                                    {member.boardStatus}
                                                </span>
                                                <div className={`w-1.5 h-1.5 rounded-full ${dotColors[member.boardStatus]} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                </div>

                <style>{`
                    @keyframes marquee {
                        0% { transform: translateX(0); }
                        100% { transform: translateX(-50%); } 
                    }
                    @keyframes marquee-reverse {
                        0% { transform: translateX(-50%); }
                        100% { transform: translateX(0); } 
                    }
                    .animate-marquee {
                        animation: marquee 200s linear infinite; /* Super slow speed */
                    }
                    .animate-marquee-reverse {
                        animation: marquee-reverse 200s linear infinite; /* Super slow speed */
                    }
                `}</style>

            </main>
        </div>
    );
};

export default AdminMonitoringView;
