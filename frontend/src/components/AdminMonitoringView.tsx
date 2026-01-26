import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
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
    Box,
    Maximize
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

// --- Sub-componentes Estilizados ---

const Badge = ({ children, status, className = "" }: { children: React.ReactNode, status: string, className?: string }) => {
    const colors: any = {
        'trabalhando': 'bg-purple-50 text-purple-600 border-purple-100',
        'teste': 'bg-amber-50 text-amber-600 border-amber-100',
        'nao iniciado': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'atraso': 'bg-red-50 text-red-600 border-red-100',
        // Fallbacks keys if needed
        'execucao': 'bg-purple-50 text-purple-600 border-purple-100',
        'revisao': 'bg-amber-50 text-amber-600 border-amber-100',
        'planejamento': 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };
    const key = status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const colorClass = colors[key] || 'bg-slate-50 text-slate-600 border-slate-100';

    return (
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${colorClass} ${className}`}>
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
    const { tasks: allTasks, projects: allProjects, users: allUsers, clients: allClients, loading, timesheetEntries: allTimesheets } = useDataController();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [weather, setWeather] = useState<{
        temp: number;
        icon: string;
        condition: string;
    } | null>(null);

    // Notification System State
    const [notifications, setNotifications] = useState<Array<{ id: string; message: string | React.ReactNode; timestamp: number; priority: 'HIGH' | 'LOW'; duration?: number }>>([]);
    const [currentNotification, setCurrentNotification] = useState<{ message: string | React.ReactNode; id: string } | null>(null);
    const currentNotificationRef = useRef(currentNotification);
    const lastNotificationEndTime = useRef<number>(0);
    const rotationIndexRef = useRef<{ [key: string]: number }>({});
    const lastRotationTime = useRef<number>(0);

    // Data Refs for Stable Access in Intervals
    const clientsRef = useRef(allClients);
    const usersRef = useRef(allUsers);
    const tasksRef = useRef(allTasks);

    useEffect(() => {
        clientsRef.current = allClients;
        usersRef.current = allUsers;
        tasksRef.current = allTasks;
    }, [allClients, allUsers, allTasks]);

    // Sincronizar ref para acesso em intervalos
    useEffect(() => {
        currentNotificationRef.current = currentNotification;
    }, [currentNotification]);

    // Atualizar hora a cada segundo
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Buscar clima de Sabará-MG
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Latitude/Longitude de Sabará-MG: -19.8833, -43.8056
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=-19.8833&longitude=-43.8056&current=temperature_2m,weather_code&timezone=America/Sao_Paulo'
                );
                const data = await response.json();

                if (data.current) {
                    const code = data.current.weather_code;
                    let iconUrl = '';
                    let conditionText = 'Nublado';

                    // Mapeamento de condições expandido
                    const mappings: any = {
                        0: { text: 'Céu Limpo', hex: '2600' },
                        1: { text: 'Limpo', hex: '2600' },
                        2: { text: 'Parcialmente Nublado', hex: '1f324' },
                        3: { text: 'Nublado', hex: '2601' },
                        45: { text: 'Nevoeiro', hex: '1f32b' },
                        48: { text: 'Nevoeiro', hex: '1f32b' },
                        51: { text: 'Chuva Leve', hex: '1f327' },
                        61: { text: 'Chuva', hex: '1f327' },
                        63: { text: 'Chuva', hex: '1f327' },
                        80: { text: 'Pancadas', hex: '1f327' },
                        95: { text: 'Trovoada', hex: '26c8' },
                    };

                    const match = mappings[code] || { text: 'Nublado', hex: '2601' };
                    conditionText = match.text;
                    iconUrl = `https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/512/emoji_u${match.hex}.png`;

                    setWeather({
                        temp: Math.round(data.current.temperature_2m),
                        icon: iconUrl,
                        condition: conditionText
                    });
                }
            } catch (error) {
                console.error('Erro ao buscar clima:', error);
            }
        };
        fetchWeather();
        const interval = setInterval(fetchWeather, 600000); // Atualizar a cada 10 minutos
        return () => clearInterval(interval);
    }, []);

    const handleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((e) => {
                console.error(`Erro ao ativar tela cheia: ${e.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    // Adicionar notificação à fila
    const addNotification = (message: string | React.ReactNode, priority: 'HIGH' | 'LOW' = 'HIGH', duration: number = 5000) => {
        const id = `${Date.now()}-${Math.random()}`;
        setNotifications(prev => {
            const newNotif = { id, message, timestamp: Date.now(), priority, duration };
            if (priority === 'HIGH') {
                return [newNotif, ...prev];
            }
            return [...prev, newNotif];
        });
    };

    // --- ROTATION & SCHEDULER SYSTEM ---
    useEffect(() => {
        const PERIOD_MESSAGES = [
            { id: 'entrada_manha', range: [8, 0, 8, 30], messages: ["☀️ Bom dia, time!", "🚀 Sistemas iniciados e monitoramento ativo.", "📊 Painel de projetos atualizado.", "👀 Acompanhe suas atividades de hoje.", "⚙️ Ambientes operacionais.", "💡 Pequenos commits, grandes resultados."] },
            { id: 'manha_tarefas', range: [8, 30, 12, 0], messages: ["📋 Não esqueça de criar sua tarefa antes de iniciar.", "🧠 Organize suas prioridades do dia.", "👀 Sistema monitorando operações.", "🔄 Atualizações do sistema aparecem aqui.", "📈 Projetos em andamento.", "⚠️ Tarefa criada = rastreabilidade garantida."] },
            { id: 'almoco', range: [12, 0, 13, 0], messages: ["🍽️ Horário de almoço — bom descanso!", "☕ Pausa estratégica.", "😌 Recarregando energias.", "⏸️ Monitoramento segue ativo.", "📡 Sistemas estáveis.", "⏱️ Voltamos em breve."] },
            { id: 'tarde_foco', range: [13, 0, 16, 0], messages: ["⚡ Atividades retomadas.", "👀 Sistema monitorando projetos.", "🧩 Hora de transformar tarefas em entregas.", "📊 Acompanhe o progresso no dashboard.", "🔧 Ambientes estáveis.", "🚀 Foco na entrega."] },
            { id: 'apontamento_horas', range: [16, 0, 17, 30], messages: ["⏱️ Não esqueça de apontar suas horas.", "📌 Apontamento garante visibilidade.", "🕒 Último período para registrar horas.", "⚠️ Horas não apontadas impactam relatórios.", "📊 Confira se todas as tarefas estão registradas.", "✅ Feche o dia corretamente."] },
            { id: 'fora_horario_noite', range: [17, 30, 23, 59], messages: ["🌙 Sistema em monitoramento automático.", "🛡️ Ambientes protegidos.", "📡 Monitoramento 24/7 ativo.", "⏱️ Atualizações críticas aparecerão aqui.", "🔒 Operação segura.", "😴 Fora do horário comercial."] },
            { id: 'fora_horario_madruga', range: [0, 0, 7, 59], messages: ["🌙 Sistema em monitoramento automático.", "🛡️ Ambientes protegidos.", "📡 Monitoramento 24/7 ativo.", "⏱️ Atualizações críticas aparecerão aqui.", "🔒 Operação segura.", "😴 Fora do horário comercial."] }
        ];

        const runRotation = () => {
            const now = new Date();
            const hour = now.getHours();
            const min = now.getMinutes();
            const currentTimeInMinutes = hour * 60 + min;

            // 1. Injetar Tarefas para Entregar Hoje (Periodicamente)
            // A cada 45 segundos (aproximadamente, baseado na chamada de 2s * 22 ticks)
            const tick = Math.floor(Date.now() / 2000);
            if (tick % 25 === 0) {
                // Encontrar tarefas vencendo hoje
                const todayStr = now.toISOString().split('T')[0];
                const dueToday = tasksRef.current.filter(t => t.estimatedDelivery && t.estimatedDelivery.startsWith(todayStr) && t.status !== 'Done');

                if (dueToday.length > 0) {
                    const randomTask = dueToday[Math.floor(Math.random() * dueToday.length)];
                    const dev = usersRef.current.find(u => u.id === randomTask.developerId);

                    const msg = (
                        <div className="flex items-center gap-4">
                            <div className="flex -space-x-2">
                                <div className="w-10 h-10 rounded-full border-2 border-white shadow-sm overflow-hidden bg-white">
                                    <img src={dev?.avatarUrl || `https://ui-avatars.com/api/?name=${dev?.name || 'Dev'}`} className="w-full h-full object-cover" />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-300">ENTREGA HOJE</span>
                                <span className="text-lg font-black text-white leading-none">{randomTask.title}</span>
                                <span className="text-xs font-bold text-purple-300 mt-1">{dev?.name || 'Colaborador'}</span>
                            </div>
                        </div>
                    );
                    addNotification(msg, 'LOW', 6000);
                    return; // Prioriza essa mensagem neste ciclo
                }
            }


            const currentPeriod = PERIOD_MESSAGES.find(p => {
                const start = p.range[0] * 60 + p.range[1];
                const end = p.range[2] * 60 + p.range[3];
                return currentTimeInMinutes >= start && currentTimeInMinutes <= end;
            });

            if (!currentPeriod) return;

            const nowTs = Date.now();
            if (nowTs - lastRotationTime.current >= 6000) {
                if (currentNotificationRef.current) return;

                const periodKey = currentPeriod.id.includes('fora_horario') ? 'fora_horario' : currentPeriod.id;
                const idx = rotationIndexRef.current[periodKey] || 0;
                const msg = currentPeriod.messages[idx];

                addNotification(msg, 'LOW');
                rotationIndexRef.current[periodKey] = (idx + 1) % currentPeriod.messages.length;
                lastRotationTime.current = Date.now();
            }
        };

        const interval = setInterval(runRotation, 2000);
        return () => clearInterval(interval);
    }, []);

    // Sistema de notificações em tempo real (HIGH Priority)
    useEffect(() => {
        const channel = supabase
            .channel('monitoring_notifications')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'fato_tarefas', filter: 'StatusTarefa=eq.Done' }, (payload: any) => {
                const user = usersRef.current.find(u => u.id === String(payload.new.ID_Colaborador));
                const taskName = payload.new.Afazer || 'Tarefa';
                addNotification(`✅ ${user?.name || 'Colaborador'} finalizou: ${taskName}`, 'HIGH');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dim_projetos' }, async (payload: any) => {
                // Lookup client
                const client = clientsRef.current.find(c => c.id === String(payload.new.ID_Cliente));

                // Fetch members with a small delay to allow for member insertion
                await new Promise(resolve => setTimeout(resolve, 2000));

                let members: User[] = [];
                try {
                    const { data: memberData } = await supabase
                        .from('project_members')
                        .select('id_colaborador')
                        .eq('id_projeto', payload.new.ID_Projeto);

                    if (memberData) {
                        members = memberData.map((m: any) => usersRef.current.find(u => u.id === m.id_colaborador)).filter(Boolean) as User[];
                    }
                } catch (e) {
                    console.error('Error fetching new project members', e);
                }

                const msg = (
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1 flex-1">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                <Zap size={14} /> Novo Projeto Criado
                            </span>
                            <span className="text-xl font-black text-white">{payload.new.NomeProjeto || 'Novo Projeto'}</span>
                            <span className="text-sm font-bold text-slate-300">Cliente: {client?.name || 'Cliente'}</span>
                        </div>

                        {members.length > 0 && (
                            <div className="flex -space-x-3">
                                {members.slice(0, 4).map(m => (
                                    <div key={m.id} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden shadow-lg">
                                        <img src={m.avatarUrl || `https://ui-avatars.com/api/?name=${m.name}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                {members.length > 4 && (
                                    <div className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                        +{members.length - 4}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );

                // Projeto novo: 10 segundos, mostrar uma vez (HIGH priority garante destaque)
                addNotification(msg, 'HIGH', 10000);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fato_tarefas' }, (payload: any) => {
                const user = usersRef.current.find(u => u.id === String(payload.new.ID_Colaborador));
                const taskName = payload.new.Afazer || 'Nova Tarefa';
                const msg = (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs border border-white/20">
                            NEW
                        </div>
                        <div className="flex flex-col">
                            <span className="text-base font-bold text-white leading-tight">{taskName}</span>
                            <span className="text-xs text-blue-300">Criada para {user?.name || 'Equipe'}</span>
                        </div>
                    </div>
                );
                addNotification(msg, 'HIGH', 5000);
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dim_clientes' }, (payload: any) => {
                addNotification(`🏢 Cliente cadastrado: ${payload.new.NomeCliente || 'Novo Cliente'}`, 'HIGH');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // 1. Timer para limpar a notificação atual (Dinâmico base na duration)
    useEffect(() => {
        if (!currentNotification) return;

        // @ts-ignore - duration vem do obj original no state, mas aqui é simplificado
        const notifObj = notifications.find(n => n.id === currentNotification.id);
        const duration = notifObj?.duration || 5000;

        const timer = setTimeout(() => {
            const idToRemove = currentNotification.id;
            setCurrentNotification(null);
            setNotifications(prev => prev.filter(n => n.id !== idToRemove));
            lastNotificationEndTime.current = Date.now();
        }, duration);

        return () => clearTimeout(timer);
    }, [currentNotification?.id, notifications]);

    // 2. Gerenciador da Fila e Preempt
    useEffect(() => {
        const firstHighIndex = notifications.findIndex(n => n.priority === 'HIGH');
        const hasHighQueued = firstHighIndex !== -1;

        if (currentNotification) {
            const currentObj = notifications.find(n => n.id === currentNotification.id);
            if (currentObj?.priority === 'LOW' && hasHighQueued) {
                setCurrentNotification(null);
            }
            return;
        }

        if (notifications.length === 0) return;

        const now = Date.now();
        const timeSinceLast = now - lastNotificationEndTime.current;
        if (timeSinceLast < 1000) {
            const retry = setTimeout(() => setNotifications(prev => [...prev]), 300);
            return () => clearTimeout(retry);
        }

        const nextIndex = hasHighQueued ? firstHighIndex : 0;
        const next = notifications[nextIndex];

        setCurrentNotification({ message: next.message, id: next.id });
    }, [notifications, currentNotification]);

    const [taskPage, setTaskPage] = useState(0);

    const tasksInProgressRaw = useMemo(() =>
        allTasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return status === 'in progress' || status === 'review';
        }),
        [allTasks]);

    const tasksInProgress = tasksInProgressRaw;

    useEffect(() => {
        const totalPages = Math.ceil(tasksInProgress.length / 6);
        if (totalPages <= 1) return;

        const interval = setInterval(() => {
            setTaskPage((prev) => (prev + 1) % totalPages);
        }, 10000);

        return () => clearInterval(interval);
    }, [tasksInProgress.length]);

    const activeCargos = ['desenvolvedor', 'infraestrutura de ti'];
    const filteredUsers = useMemo(() =>
        allUsers.filter(u => u.active !== false && activeCargos.includes(u.cargo?.toLowerCase() || '')),
        [allUsers]);

    const userMap = useMemo(() => new Map(filteredUsers.map(u => [u.id, u])), [filteredUsers]);

    const clientMap = useMemo(() => new Map(allClients.map(c => [c.id, c])), [allClients]);
    const projectMap = useMemo(() => new Map(allProjects.map(p => [p.id, p])), [allProjects]);

    const isTaskDelayed = (task: Task) => task.status !== 'Done' && task.status !== 'Review' && (task.progress || 0) < 100 && (task.daysOverdue ?? 0) > 0;
    const isCollaboratorDelayed = (task: Task) => task.status !== 'Done' && task.status !== 'Review' && (task.progress || 0) < 100 && (task.daysOverdue ?? 0) > 0;

    const activeProjects = useMemo(() => {
        return allProjects.filter(p => {
            const projTasks = allTasks.filter(t => t.projectId === p.id);
            const hasIncomplete = projTasks.some(t => t.status !== 'Done');
            return projTasks.length > 0 && hasIncomplete;
        });
    }, [allProjects, allTasks]);

    const teamStatus = useMemo(() => {
        const now = new Date();
        const hour = now.getHours();
        const isAfter16h = hour >= 16;
        const todayStr = now.toISOString().split('T')[0];

        const members = filteredUsers.map(user => {
            // Tarefas onde ele é o principal ou colaborador extra
            const userTasks = allTasks.filter(t =>
                t.developerId === user.id ||
                (t.collaboratorIds && t.collaboratorIds.includes(user.id))
            );

            // Tarefas ativas: Não Iniciado (Todo) ou Trabalhando (In Progress)
            const activeTasks = userTasks.filter(t => {
                const s = (t.status || '').toLowerCase();
                return s === 'todo' || s === 'in progress';
            });

            // Tarefas em atraso (entre as ativas)
            const delayedTasksForStatus = activeTasks.filter(t => isCollaboratorDelayed(t));

            // Check de estudo
            const hasStudy = userTasks.some(t => t.title.toLowerCase().includes('estudo'));
            const isStudyCargo = user.cargo?.toLowerCase().includes('estudo');

            // Check de apontamento (pelo menos um registro no dia de hoje)
            const hasTimesheetToday = allTimesheets.some(entry =>
                entry.userId === user.id &&
                entry.date === todayStr
            );

            let status: 'LIVRE' | 'ESTUDANDO' | 'TRABALHANDO' | 'APONTADO' | 'ATRASADO' = 'LIVRE';

            // Hierarquia: Atrasado > Apontado (após 16h) > Trabalhando > Estudando > Livre
            if (delayedTasksForStatus.length > 0) {
                status = 'ATRASADO';
            } else if (isAfter16h && hasTimesheetToday) {
                status = 'APONTADO';
            } else if (activeTasks.length > 0) {
                status = 'TRABALHANDO';
            } else if (isStudyCargo || hasStudy) {
                status = 'ESTUDANDO';
            }

            return { ...user, boardStatus: status };
        });

        return members;
    }, [allUsers, allTasks, allTimesheets]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#f5f3ff]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inicializando Sistemas...</span>
            </div>
        </div>
    );

    const weekDay = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();

    return (
        <div className="h-screen w-full bg-[#f5f3ff] flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-purple-100">

            {/* --- BARRA INFORMATIVA --- */}
            <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-800 px-8 h-[85px] flex items-center justify-between shrink-0 shadow-lg overflow-hidden">
                {/* Clima - Esquerda */}
                <div className="flex items-center min-w-max h-full">
                    {weather ? (
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                <img src={weather.icon} alt="Clima" className="w-full h-full object-contain scale-125" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-start">
                                    <span className="text-3xl font-black text-white tabular-nums leading-none drop-shadow-md">{weather.temp}</span>
                                    <span className="text-lg font-bold text-purple-300 ml-0.5 mt-0.5 leading-none">°C</span>
                                </div>
                                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] mt-1 opacity-80 leading-none">{weather.condition}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-32 h-14 rounded-2xl bg-white/5 animate-pulse" />
                    )}
                </div>

                {/* Notificações - Centro */}
                <div className="flex-1 flex items-center justify-center px-8">
                    <AnimatePresence mode="wait">
                        {currentNotification && (
                            <motion.div
                                key={currentNotification.id}
                                initial={{ opacity: 0, y: -60 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                className="px-12 py-3"
                            >
                                <span className="text-[18px] font-black text-white tracking-wide drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                                    {currentNotification.message}
                                </span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Botão Tela Cheia (TV) - Oculto se tiver token */}
                    {!(new URLSearchParams(window.location.search).get('token') === 'xyz123') && (
                        <button
                            onClick={handleFullScreen}
                            className="ml-4 p-2 rounded-lg bg-purple-800/30 hover:bg-purple-700/50 text-purple-300 transition-colors border border-purple-700/50 group"
                            title="Tela Cheia"
                        >
                            <Maximize className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    )}
                </div>

                {/* Hora e Data - Direita */}
                <div className="flex items-center gap-6 min-w-[320px] justify-end">
                    <div className="flex flex-col items-end">
                        <span className="text-3xl font-black text-white tabular-nums tracking-tight leading-none">
                            {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-[8px] font-bold text-purple-300 uppercase tracking-wider mt-0.5 leading-none">HORÁRIO</span>
                    </div>
                    <div className="w-[1px] h-8 bg-purple-700" />
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-white tabular-nums leading-none">
                            {weekDay}
                        </span>
                        <span className="text-[11px] font-bold text-purple-300 tabular-nums leading-none mt-1">
                            {currentTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="flex-1 p-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar">

                {/* Section 1: OPERAÇÕES EM EXECUÇÃO */}
                {/* Section 1: OPERAÇÕES EM EXECUÇÃO (Snake Carousel) */}
                <section className="shrink-0 flex flex-col">
                    {(() => {
                        const reviewCount = tasksInProgress.filter(t => t.status === 'Review').length;
                        return (
                            <SectionHeader
                                label={`Operaçoes em Execução & Teste ${reviewCount > 0 ? `• Atenção: ${reviewCount} em teste` : ''}`}
                                icon={Activity}
                                colorClass={reviewCount > 0 ? "bg-amber-500" : "bg-purple-600"}
                            />
                        );
                    })()}

                    <div className="relative min-h-[220px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={taskPage}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.5 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                            >
                                {tasksInProgress.slice(taskPage * 4, (taskPage + 1) * 4).map((task) => {
                                    const dev = userMap.get(task.developerId || '');
                                    // Skip tasks assigned to non-filtered users (safety)
                                    if (!dev && task.developerId) return null;

                                    const client = clientMap.get(task.clientId || '');
                                    const project = projectMap.get(task.projectId || '');
                                    const delayed = isTaskDelayed(task);
                                    const isReview = task.status === 'Review';
                                    const statusLabel = task.status === 'In Progress' ? 'Trabalhando' :
                                        task.status === 'Review' ? 'Teste' :
                                            (task.status as any) === 'Todo' ? 'Não Iniciado' : 'Concluído';

                                    const shadowClass = delayed
                                        ? 'shadow-[0_0_20px_rgba(239,68,68,0.3)] border-red-500 border-2'
                                        : isReview
                                            ? 'shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-200'
                                            : 'shadow-sm';

                                    const finalStatusLabel = delayed ? `Atrasado` : statusLabel;

                                    // Obter colaboradores extras
                                    const extraCollaborators = (task.collaboratorIds || [])
                                        .map(id => userMap.get(id)) // Use userMap instead of allUsersMap to prevent error
                                        .filter(Boolean) as User[];

                                    return (
                                        <div key={task.id} className={`bg-white border rounded-[1.5rem] p-4 relative flex flex-col group h-[200px] hover:border-purple-200 transition-all ${shadowClass} overflow-hidden shadow-md`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge status={delayed ? 'atraso' : statusLabel.toLowerCase()} className="text-[9px] py-0.5 px-2">{finalStatusLabel}</Badge>
                                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center overflow-hidden shadow-sm group-hover:bg-white transition-all shrink-0">
                                                    <img
                                                        src={client?.logoUrl || 'https://placehold.co/100x100?text=Logo'}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 flex flex-col justify-start gap-1 min-w-0">
                                                <h3 className="text-[15px] font-bold text-slate-800 uppercase leading-snug line-clamp-1">{task.title}</h3>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase truncate">Cliente: {client?.name || 'Interno'}</span>
                                                    <span className="text-[10px] font-bold text-purple-700 uppercase truncate">
                                                        Proj: {project?.name || 'N/A'}
                                                    </span>
                                                    {task.status !== 'Done' && task.estimatedDelivery && (
                                                        <span className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-1">
                                                            {(() => {
                                                                const parts = task.estimatedDelivery.split('-');
                                                                const deadline = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                                                const formattedDate = deadline.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                                                                if (task.status === 'Review') return `📅 ${formattedDate}`;

                                                                const now = new Date();
                                                                now.setHours(0, 0, 0, 0);

                                                                const diffTime = deadline.getTime() - now.getTime();
                                                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                                let countdown = '';
                                                                if (diffDays < 0) countdown = 'Atrasado';
                                                                else if (diffDays === 0) countdown = 'Hoje';
                                                                else if (diffDays === 1) countdown = 'Amanhã';
                                                                else if (diffDays <= 3) countdown = `Faltam ${diffDays}d`;

                                                                return `📅 ${formattedDate}${countdown ? ` • ${countdown}` : ''}`;
                                                            })()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Barra de Progresso Visual Compacta */}
                                            <div className="mt-3 mb-1">
                                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-500 ${delayed ? 'bg-red-500' : 'bg-purple-600'}`}
                                                        style={{ width: `${task.progress}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="flex -space-x-2">
                                                        {/* Avatar Responsável */}
                                                        <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm shrink-0 z-10 bg-white">
                                                            <img
                                                                src={dev?.avatarUrl || `https://ui-avatars.com/api/?name=${task.developer}&background=f8fafc&color=475569`}
                                                                className="w-full h-full object-cover"
                                                                title={`Responsável: ${task.developer}`}
                                                            />
                                                        </div>

                                                        {/* Avatares Colaboradores */}
                                                        {(extraCollaborators || []).slice(0, 3).map((collab) => (
                                                            <div
                                                                key={collab.id}
                                                                className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-white"
                                                                title={`Colaborador: ${collab.name}`}
                                                            >
                                                                <img
                                                                    src={collab.avatarUrl || `https://ui-avatars.com/api/?name=${collab.name}&background=e0e7ff&color=6366f1`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[7px] font-black uppercase text-slate-400 leading-none">Equipe</span>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[100px] leading-tight">
                                                            {dev?.name ? dev.name.split(' ')[0] : task.developer}
                                                            {extraCollaborators.length > 0 && ` +${extraCollaborators.length}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-0.5 shrink-0 ml-4">
                                                    <span className={`text-xl font-black tabular-nums leading-none ${delayed ? 'text-red-500' : 'text-purple-600'}`}>{task.progress}%</span>
                                                    {(() => {
                                                        if (task.status === 'Done') return null;
                                                        const daysLate = task.daysOverdue || 0;
                                                        if (daysLate > 0) {
                                                            return <span className="text-[9px] font-black text-red-500 uppercase whitespace-nowrap leading-none">{daysLate} dia{daysLate > 1 ? 's' : ''} de atraso</span>;
                                                        }
                                                        return null;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Pagination Indicators */}
                    {Math.ceil(tasksInProgress.length / 4) > 1 && (
                        <div className="flex justify-center gap-2 mt-2">
                            {Array.from({ length: Math.ceil(tasksInProgress.length / 4) }).map((_, idx) => (
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
                <div className="flex flex-col gap-4 min-h-0 flex-1">

                    {/* ECOSSISTEMA DE PROJETOS ATIVOS */}
                    {activeProjects.length > 0 && (
                        <section className="flex flex-col min-h-0 overflow-hidden">
                            <SectionHeader label="Ecossistema de Projetos Ativos" icon={Timer} colorClass="bg-blue-600" />
                            <div className="relative w-full overflow-hidden pb-3">
                                <div className="flex gap-4 w-max animate-marquee hover:[animation-play-state:paused]">
                                    {[...activeProjects, ...activeProjects, ...activeProjects].map((proj, idx) => { // Triplicated for infinite loop
                                        const Icons = [Cloud, Database, Zap, Shield, Box, Activity, Cpu, Wifi];
                                        const ProjIcon = Icons[idx % Icons.length];

                                        // LOGICA DE STATUS REAL
                                        const projTasks = allTasks.filter(t => t.projectId === proj.id);
                                        const hasDelay = projTasks.some(t => isTaskDelayed(t));
                                        const hasReview = projTasks.some(t => t.status === 'Review');
                                        const hasInProgress = projTasks.some(t => t.status === 'In Progress');

                                        let statusLabel = 'SAUDÁVEL';
                                        let statusColor = 'text-emerald-500';
                                        let dotColor = 'bg-emerald-500';

                                        if (hasDelay) {
                                            statusLabel = 'CRÍTICO';
                                            statusColor = 'text-red-500';
                                            dotColor = 'bg-red-500';
                                        } else if (hasReview) {
                                            statusLabel = 'EM TESTE';
                                            statusColor = 'text-amber-500';
                                            dotColor = 'bg-amber-500';
                                        } else if (hasInProgress) {
                                            statusLabel = 'ATIVO';
                                            statusColor = 'text-blue-500';
                                            dotColor = 'bg-blue-500';
                                        }

                                        const client = clientMap.get(proj.clientId || '');

                                        return (
                                            <div key={`${proj.id}-${idx}`} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-md min-w-[320px] h-[90px] group hover:border-blue-300 transition-all">
                                                <div className="flex items-center gap-5 min-w-0">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-blue-200 transition-all overflow-hidden p-2 shadow-sm">
                                                        {client?.logoUrl ? (
                                                            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <ProjIcon className="w-6 h-6 text-slate-300 group-hover:text-blue-500 transition-colors" />
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{client?.name || 'Tecnologia'}</span>
                                                        <span className="text-[18px] font-black text-slate-800 uppercase truncate max-w-[180px] tracking-tight leading-tight">{proj.name}</span>

                                                        {/* Task Summary Metrics */}
                                                        <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
                                                            {hasInProgress && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                                    <span className="text-[8px] font-bold text-slate-500 uppercase">{projTasks.filter(t => t.status === 'In Progress').length} em andamento</span>
                                                                </div>
                                                            )}
                                                            {hasReview && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <div className="w-1 h-1 rounded-full bg-amber-500" />
                                                                    <span className="text-[8px] font-bold text-slate-500 uppercase">{projTasks.filter(t => t.status === 'Review').length} em teste</span>
                                                                </div>
                                                            )}
                                                            {hasDelay && (
                                                                <div className="flex items-center gap-1 shrink-0">
                                                                    <div className="w-1 h-1 rounded-full bg-red-500" />
                                                                    <span className="text-[8px] font-bold text-red-600 uppercase">{projTasks.filter(t => isTaskDelayed(t)).length} atrasadas</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-4 border-l border-slate-50 ml-2">
                                                    <div className={`w-2 h-2 rounded-full mb-1 ${dotColor} shadow-sm`} />
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${statusColor}`}>{statusLabel}</span>
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
                                        'TRABALHANDO': 'text-purple-500 border-purple-500 bg-purple-50',
                                        'ESTUDANDO': 'text-blue-500 border-blue-500 bg-blue-50',
                                        'ATRASADO': 'text-red-500 border-red-500 bg-red-50',
                                        'APONTADO': 'text-indigo-600 border-indigo-400 bg-indigo-50'
                                    };
                                    const dotColors: any = {
                                        'LIVRE': 'bg-emerald-500',
                                        'TRABALHANDO': 'bg-purple-500',
                                        'ESTUDANDO': 'bg-blue-500',
                                        'ATRASADO': 'bg-red-500',
                                        'APONTADO': 'bg-indigo-600'
                                    };

                                    return (
                                        <div key={`${member.id}-${idx}`} className="min-w-[240px] h-[115px] bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-md group hover:border-emerald-300 transition-all relative overflow-hidden">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-14 h-14 rounded-full p-0.5 border-2 border-slate-100 shadow-sm shrink-0">
                                                    <img
                                                        src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.name}&background=f8fafc&color=475569`}
                                                        className="w-full h-full rounded-full object-cover"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.onerror = null;
                                                            target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=f8fafc&color=475569`;
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <h4 className="text-[14px] font-black text-slate-800 uppercase tracking-tight truncate leading-tight">{member.name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{member.cargo || 'Especialista'}</p>
                                                </div>
                                            </div>

                                            <div className="border-t border-slate-50 pt-3 flex items-center justify-between">
                                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg border ${colors[member.boardStatus]}`}>
                                                    {member.boardStatus}
                                                </span>
                                                <div className={`w-2.5 h-2.5 rounded-full ${dotColors[member.boardStatus]} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
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
