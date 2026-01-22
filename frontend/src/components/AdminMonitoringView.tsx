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

const Badge = ({ children, status }: { children: React.ReactNode, status: string }) => {
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
    const [weather, setWeather] = useState<{ temp: number; icon: string } | null>(null);
    const [notifications, setNotifications] = useState<Array<{ id: string; message: string; timestamp: number; priority: 'HIGH' | 'LOW' }>>([]);
    const [currentNotification, setCurrentNotification] = useState<{ message: string; id: string } | null>(null);
    const currentNotificationRef = useRef(currentNotification);
    const lastNotificationEndTime = useRef<number>(0);
    const rotationIndexRef = useRef<{ [key: string]: number }>({});
    const lastRotationTime = useRef<number>(0);
    const processingRef = useRef(false);

    // Sincronizar ref para acesso em intervalos
    useEffect(() => {
        currentNotificationRef.current = currentNotification;
    }, [currentNotification]);

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

    // Atualizar hora a cada segundo
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Buscar clima de Sabará-MG
    useEffect(() => {
        const fetchWeather = async () => {
            try {
                // Usando Open-Meteo API (gratuita, sem necessidade de API key)
                const response = await fetch(
                    'https://api.open-meteo.com/v1/forecast?latitude=-19.8833&longitude=-43.8056&current_weather=true&timezone=America/Sao_Paulo'
                );
                const data = await response.json();
                if (data.current_weather) {
                    const code = data.current_weather.weathercode;
                    let iconUrl = '';

                    // Mapeamento para Microsoft Fluent Emoji (Animated GIFs)
                    // Mais grossos e expressivos, ideais para visualização em TV
                    if (code <= 1) iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/2600_fe0f/512.gif'; // Sol
                    else if (code <= 3) iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f324_fe0f/512.gif'; // Parcialmente nublado
                    else if (code >= 95) iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/26c8_fe0f/512.gif'; // Tempestade
                    else if (code >= 51 || code === 80) iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f327_fe0f/512.gif'; // Chuva forte
                    else if (code >= 45 && code <= 48) iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f32b_fe0f/512.gif'; // Névoa
                    else iconUrl = 'https://fonts.gstatic.com/s/e/notoemoji/latest/2601_fe0f/512.gif'; // Nublado

                    setWeather({
                        temp: Math.round(data.current_weather.temperature),
                        icon: iconUrl
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

    // Criar mapa de usuários (precisa estar antes do useEffect de notificações)
    const allUsersMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    // Adicionar notificação à fila (precisa estar antes do useEffect que a usa)
    // Adicionar notificação à fila com prioridade
    const addNotification = (message: string, priority: 'HIGH' | 'LOW' = 'HIGH') => {
        const id = `${Date.now()}-${Math.random()}`;
        setNotifications(prev => {
            if (priority === 'HIGH') {
                // Preempt: Coloca no início da fila de processamento (logo após a atual se houver)
                return [{ id, message, timestamp: Date.now(), priority }, ...prev];
            }
            return [...prev, { id, message, timestamp: Date.now(), priority }];
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

            const currentPeriod = PERIOD_MESSAGES.find(p => {
                const start = p.range[0] * 60 + p.range[1];
                const end = p.range[2] * 60 + p.range[3];
                return currentTimeInMinutes >= start && currentTimeInMinutes <= end;
            });

            if (!currentPeriod) return;

            const nowTs = Date.now();
            if (nowTs - lastRotationTime.current >= 15000) {
                // Se já tem algo na tela ou na fila, espera um pouco mais para não acumular
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
                const user = allUsersMap.get(String(payload.new.ID_Colaborador));
                const taskName = payload.new.Afazer || 'Tarefa';
                addNotification(`✅ ${user?.name || 'Colaborador'} finalizou: ${taskName}`, 'HIGH');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dim_projetos' }, (payload: any) => {
                addNotification(`🚀 Projeto criado: ${payload.new.NomeProjeto || 'Novo Projeto'}`, 'HIGH');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'fato_tarefas' }, (payload: any) => {
                addNotification(`📋 Tarefa criada: ${payload.new.Afazer || 'Nova Tarefa'}`, 'HIGH');
            })
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dim_clientes' }, (payload: any) => {
                addNotification(`🏢 Cliente cadastrado: ${payload.new.NomeCliente || 'Novo Cliente'}`, 'HIGH');
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [allUsersMap]);

    // 1. Timer para limpar a notificação atual
    useEffect(() => {
        if (!currentNotification) return;

        const duration = 8000;
        const timer = setTimeout(() => {
            const idToRemove = currentNotification.id;
            setCurrentNotification(null);
            setNotifications(prev => prev.filter(n => n.id !== idToRemove));
            lastNotificationEndTime.current = Date.now();
        }, duration);

        return () => clearTimeout(timer);
    }, [currentNotification?.id]);

    // 2. Gerenciador da Fila e Preempt
    useEffect(() => {
        const firstHighIndex = notifications.findIndex(n => n.priority === 'HIGH');
        const hasHighQueued = firstHighIndex !== -1;

        // Lógica de Preempt: Se houver uma HIGH na fila e a atual for LOW, interrompe.
        if (currentNotification) {
            const currentObj = notifications.find(n => n.id === currentNotification.id);
            if (currentObj?.priority === 'LOW' && hasHighQueued) {
                // Ao setar null, o useEffect de Timer é limpo e este effect rodará de novo no próximo ciclo
                setCurrentNotification(null);
            }
            return;
        }

        if (notifications.length === 0) return;

        // Regra de Gap: 2s entre mensagens
        const now = Date.now();
        const timeSinceLast = now - lastNotificationEndTime.current;
        if (timeSinceLast < 2000) {
            // Re-checa em breve para não ficar parado
            const retry = setTimeout(() => setNotifications(prev => [...prev]), 500);
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

    const isTaskDelayed = (task: Task) => {
        if (task.status === 'Done' || task.status === 'Review') return false;
        if (!task.estimatedDelivery) return false;
        const deadline = new Date(task.estimatedDelivery);
        deadline.setHours(23, 59, 59, 999);
        return deadline < new Date();
    };

    const activeProjects = useMemo(() => {
        return allProjects.filter(p => {
            const projTasks = allTasks.filter(t => t.projectId === p.id);
            const hasIncomplete = projTasks.some(t => t.status !== 'Done');
            return projTasks.length > 0 && hasIncomplete;
        });
    }, [allProjects, allTasks]);

    const teamStatus = useMemo(() => {
        const members = filteredUsers.map(user => {
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

    const weekDay = currentTime.toLocaleDateString('pt-BR', { weekday: 'long' }).toUpperCase();

    return (
        <div className="h-screen w-full bg-[#f8fafc] flex flex-col overflow-hidden font-sans text-slate-900 selection:bg-purple-100">

            {/* --- BARRA INFORMATIVA --- */}
            <header className="bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900 border-b border-purple-800 px-8 py-2.5 flex items-center justify-between shrink-0 shadow-lg">
                {/* Clima - Esquerda */}
                <div className="flex items-center gap-4 min-w-[220px]">
                    {weather ? (
                        <>
                            <div className="w-16 h-16 flex items-center justify-center filter drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]">
                                <img
                                    src={weather.icon}
                                    alt="Clima"
                                    className="w-full h-full object-contain scale-125"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const parent = e.currentTarget.parentElement;
                                        if (parent) parent.innerHTML = '<span class="text-3xl">☁️</span>';
                                    }}
                                />
                            </div>
                            <div className="flex flex-col -ml-1">
                                <span className="text-3xl font-black text-white tabular-nums leading-none mb-1 drop-shadow-md">{weather.temp}°C</span>
                                <span className="text-[10px] font-black text-purple-300 uppercase tracking-[0.2em] drop-shadow-sm leading-none">Sabará-MG</span>
                            </div>
                        </>
                    ) : (
                        <div className="w-14 h-14 rounded-lg bg-purple-800/30 animate-pulse" />
                    )}
                </div>

                {/* Notificações - Centro */}
                <div className="flex-1 flex items-center justify-center px-8">
                    <AnimatePresence mode="wait">
                        {currentNotification && (
                            <motion.div
                                key={currentNotification.id}
                                initial={{ opacity: 0, y: -40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.6, ease: "easeOut" }}
                                className="px-10 py-3"
                            >
                                <span className="text-[15px] font-black text-white tracking-wide">{currentNotification.message}</span>
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
            <main className="flex-1 p-8 flex flex-col gap-12 overflow-y-auto custom-scrollbar">

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

                    <div className="relative min-h-[430px]"> {/* Altura fixa para evitar pulos de layout */}
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
                                        ? 'shadow-[0_0_20px_rgba(239,68,68,0.15)] border-red-100'
                                        : isReview
                                            ? 'shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-200'
                                            : 'shadow-sm';

                                    const finalStatusLabel = delayed ? `Atrasado` : statusLabel;

                                    // Obter colaboradores extras
                                    const extraCollaborators = (task.collaboratorIds || [])
                                        .map(id => allUsersMap.get(id))
                                        .filter(Boolean) as User[];

                                    return (
                                        <div key={task.id} className={`bg-white border rounded-[1.5rem] p-5 relative flex flex-col justify-between group h-[200px] hover:border-purple-200 transition-all ${shadowClass}`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <Badge status={delayed ? 'atraso' : statusLabel.toLowerCase()}>{finalStatusLabel}</Badge>
                                                {/* Logo do Cliente no Topo Direito */}
                                                <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center overflow-hidden shadow-sm group-hover:bg-white transition-all duration-300 shrink-0">
                                                    <img
                                                        src={client?.logoUrl || 'https://placehold.co/100x100?text=Logo'}
                                                        className="w-full h-full object-contain transition-all duration-300"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-slate-800 uppercase leading-tight line-clamp-2 mb-1">{task.title}</h3>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide truncate block">Cliente: {client?.name || 'Interno'}</span>
                                                <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wide truncate block">Projeto: {project?.name || 'N/A'}</span>
                                            </div>

                                            <div className="flex items-end justify-between mt-3">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    {/* Desenvolvedor Responsável */}
                                                    <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-purple-200 shadow-sm shrink-0">
                                                        <img src={dev?.avatarUrl || `https://ui-avatars.com/api/?name=${task.developer}&background=f8fafc&color=475569`} className="w-full h-full object-cover" />
                                                    </div>

                                                    {/* Colaboradores Extras */}
                                                    {extraCollaborators.length > 0 && (
                                                        <div className="flex -space-x-2">
                                                            {extraCollaborators.slice(0, 3).map((collab) => (
                                                                <div
                                                                    key={collab.id}
                                                                    className="w-7 h-7 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0"
                                                                    title={collab.name}
                                                                >
                                                                    <img
                                                                        src={collab.avatarUrl || `https://ui-avatars.com/api/?name=${collab.name}&background=e0e7ff&color=6366f1`}
                                                                        className="w-full h-full object-cover"
                                                                    />
                                                                </div>
                                                            ))}
                                                            {extraCollaborators.length > 3 && (
                                                                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                                                                    <span className="text-[8px] font-black text-slate-600">+{extraCollaborators.length - 3}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col min-w-0 ml-1">
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
                                            <div key={`${proj.id}-${idx}`} className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center justify-between shadow-md min-w-[380px] h-[110px] group hover:border-blue-300 transition-all">
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
                                        <div key={`${member.id}-${idx}`} className="min-w-[280px] h-[140px] bg-white border border-slate-200 rounded-[2rem] p-5 flex flex-col justify-between shadow-md group hover:border-emerald-300 transition-all relative overflow-hidden">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="w-14 h-14 rounded-full p-0.5 border-2 border-slate-100 shadow-sm shrink-0">
                                                    <img src={member.avatarUrl || `https://ui-avatars.com/api/?name=${member.name}&background=f8fafc&color=475569`} className="w-full h-full rounded-full object-cover" />
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
