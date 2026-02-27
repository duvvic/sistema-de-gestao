
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Book,
    Key,
    CheckSquare,
    Briefcase,
    ArrowRight,
    HelpCircle,
    StickyNote,
    Image as ImageIcon,
    ExternalLink,
    Zap,
    Clock,
    Users,
    PlusCircle,
    ArrowUp
} from 'lucide-react';

// Import screenshots
import accessImg from '@/assets/docs/access.png';
import projectsImg from '@/assets/docs/projects_main.png';
import taskFormImg from '@/assets/docs/task_form_details.png';
import kanbanImg from '@/assets/docs/kanban_main.png';
import taskCardImg from '@/assets/docs/task_card.png';
import notesImg from '@/assets/docs/notes_main.png';

const SystemDocs: React.FC = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setShowScrollTop(e.currentTarget.scrollTop > 400);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element && scrollRef.current) {
            const containerTop = scrollRef.current.getBoundingClientRect().top;
            const elementTop = element.getBoundingClientRect().top;
            const scrollOffset = elementTop - containerTop + scrollRef.current.scrollTop - 40;

            scrollRef.current.scrollTo({
                top: scrollOffset,
                behavior: 'smooth'
            });
        }
    };

    const scrollToTop = () => {
        scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const sections = [
        {
            id: 'access',
            title: '1. Acesso ao Sistema',
            icon: Key,
            color: 'blue',
            screenshot: accessImg,
            content: [
                {
                    title: 'Login e Primeiro Acesso',
                    text: 'Na tela de login, insira o e-mail do colaborador. Se for seu primeiro acesso, o sistema enviará automaticamente um token de verificação para o e-mail informado para que você crie sua senha.'
                },
                {
                    title: 'Recuperação de Acesso',
                    text: 'Caso não lembre a senha, basta errar uma vez ou deixar o campo em branco. O sistema mostrará a opção "Esqueci a senha", que repete o processo de envio de token.'
                }
            ]
        },
        {
            id: 'projects',
            title: '2. Tela de Projetos',
            icon: Briefcase,
            color: 'purple',
            screenshot: projectsImg,
            content: [
                {
                    title: 'Contexto do Portfólio',
                    text: 'Visualize todos os projetos vinculados a você. Os cards exibem o progresso atual e a equipe alocada.'
                },
                {
                    title: 'Status Visual',
                    text: 'As cores das bordas dos cards indicam a saúde do projeto: bordas vermelhas alertam para a existência de tarefas atrasadas no cronograma.'
                },
                {
                    title: 'Atalhos de Projeto',
                    text: 'Ao clicar em um projeto, você pode visualizar detalhes específicos e criar tarefas que já virão preenchidas com o cliente e projeto corretos.'
                }
            ]
        },
        {
            id: 'tasks',
            title: '3. Tela de Tarefas (Kanban & Criação)',
            icon: CheckSquare,
            color: 'green',
            screenshot: kanbanImg,
            secondaryScreenshot: taskFormImg,
            content: [
                {
                    title: 'Fluxo Kanban',
                    text: 'Gerencie suas demandas arrastando os cards entre as colunas conforme o progresso. Use o botão "+ Nova Tarefa" para abrir o formulário de cadastro.'
                },
                {
                    title: 'Formulário de Tarefa',
                    text: 'Na tela de criação (imagem em destaque), defina o Contexto do Projeto, o responsável, colaboradores extras e prazos de entrega.'
                },
                {
                    title: 'Regras de Atraso (Status PENDENTE)',
                    text: 'Dica importante: Tarefas movidas para a coluna "PENDENTE" param de contar como atraso para o colaborador, indicando que a entrega depende agora de validação externa.'
                },
                {
                    title: 'Interação e Apontamento',
                    text: 'Nos cards de tarefa, você pode adicionar colegas para auxílio e realizar o apontamento de horas com desconto automático de almoço.'
                }
            ]
        },
        {
            id: 'notes',
            title: '4. Tela de Notas Online',
            icon: StickyNote,
            color: 'yellow',
            screenshot: notesImg,
            content: [
                {
                    title: 'Organização e IDs únicos',
                    text: 'Crie vários blocos de notas pessoais. Cada um possui uma URL única, garantindo que você possa acessar seus links e anotações rapidamente.'
                },
                {
                    title: 'Segurança e Boas Práticas',
                    text: 'O sistema é seguro, mas como as notas são online, recomendamos não colocar informações sensíveis como senhas ou chaves de acesso.'
                }
            ]
        }
    ];

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-auto no-scrollbar bg-[var(--bg)] p-6 md:p-12 pb-24 text-[var(--text)] relative"
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto space-y-16"
            >
                {/* Hero Header */}
                <header className="text-center space-y-6 pt-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center justify-center p-4 rounded-3xl bg-blue-600/10 text-blue-600 mb-2"
                    >
                        <Book size={40} />
                    </motion.div>
                    <div className="space-y-2">
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter">
                            Portal <span className="text-blue-600">Documentação</span>
                        </h1>
                        <p className="text-xl text-[var(--textMuted)] max-w-2xl mx-auto font-medium">
                            Guia completo de uso das funcionalidades do sistema para colaboradores.
                        </p>
                    </div>
                </header>

                {/* Navigation */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {sections.map((s, idx) => (
                        <motion.button
                            key={s.id}
                            onClick={() => scrollToSection(s.id)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            className="p-6 rounded-[2rem] bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center text-center gap-4 hover:border-blue-500/50 hover:shadow-2xl transition-all group cursor-pointer"
                        >
                            <div className={`p-4 rounded-2xl bg-${s.color}-500/10 text-${s.color}-500 group-hover:scale-110 transition-transform`}>
                                <s.icon size={28} />
                            </div>
                            <span className="font-bold text-md">{s.title.split('. ')[1].split(' (')[0]}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Content */}
                <div className="space-y-48 pt-10">
                    {sections.map((section, idx) => {
                        const isEven = idx % 2 === 0;

                        return (
                            <section key={section.id} id={section.id} className="scroll-mt-32">
                                <div className="flex flex-col lg:flex-row gap-16 items-start">
                                    {/* Images Container */}
                                    <motion.div
                                        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        className={`w-full lg:w-3/5 space-y-6 ${!isEven && 'lg:order-2'}`}
                                    >
                                        <div className="relative group">
                                            <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="relative rounded-[2rem] overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] shadow-2xl">
                                                <img
                                                    src={section.screenshot}
                                                    alt={section.title}
                                                    className="w-full h-auto object-cover"
                                                />
                                            </div>
                                        </div>

                                        {section.secondaryScreenshot && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 30 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                viewport={{ once: true }}
                                                className="relative group w-full"
                                            >
                                                <div className="absolute -inset-2 bg-gradient-to-tr from-green-600/10 to-emerald-600/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="relative rounded-[2rem] overflow-hidden border border-[var(--border)] bg-[var(--surface-2)] shadow-2xl">
                                                    <img
                                                        src={section.secondaryScreenshot}
                                                        alt={`${section.title} Detalhe`}
                                                        className="w-full h-auto object-cover"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>

                                    {/* Text Content */}
                                    <div className="w-full lg:w-2/5 space-y-8">
                                        <div className="space-y-4">
                                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-${section.color}-500/10 text-${section.color}-500 text-sm font-bold uppercase tracking-widest`}>
                                                <Zap size={14} /> Passo {idx + 1}
                                            </div>
                                            <h2 className="text-4xl font-black tracking-tight leading-tight">{section.title}</h2>
                                        </div>

                                        <div className="space-y-8">
                                            {section.content.map((item, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    whileInView={{ opacity: 1, y: 0 }}
                                                    viewport={{ once: true }}
                                                    className="flex gap-4 p-2"
                                                >
                                                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2.5 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                                    <div className="space-y-2">
                                                        <h4 className="font-bold text-xl text-[var(--text)]">{item.title}</h4>
                                                        <p className="text-[var(--textMuted)] leading-relaxed text-md font-medium">
                                                            {item.text}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </section>
                        );
                    })}
                </div>

                {/* Footer */}
                <footer className="pt-20 pb-12 text-center border-t border-[var(--border)] text-[var(--muted)] text-sm">
                    <p className="font-medium">© 2026 NIC-LABS Portal • Guia Visual v3.1</p>
                </footer>
            </motion.div>

            {/* Float Back to Top Button */}
            <AnimatePresence>
                {showScrollTop && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5, y: 20 }}
                        onClick={scrollToTop}
                        className="fixed bottom-10 right-10 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-500 transition-all z-50 border border-white/10 group flex items-center justify-center"
                        title="Voltar ao topo"
                    >
                        <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SystemDocs;
