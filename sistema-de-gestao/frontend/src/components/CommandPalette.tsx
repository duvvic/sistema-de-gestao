// CommandPalette.tsx - Navegação rápida tipo Linear/Cursor (Ctrl+K)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Briefcase,
  CheckSquare,
  Users,
  Clock,
  Building2,
  FolderOpen,
  Plus,
  Settings,
  BarChart2,
  FileText,
  Command
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
  category: 'navigation' | 'project' | 'task' | 'client' | 'action';
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { projects, tasks, clients } = useDataController();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Comandos de navegação estáticos
  const navigationCommands: CommandItem[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      subtitle: 'Visão geral dos projetos',
      icon: BarChart2,
      action: () => navigate('/admin/clients'),
      category: 'navigation',
      keywords: ['home', 'início', 'dashboard']
    },
    {
      id: 'nav-projects',
      title: 'Todos os Projetos',
      subtitle: 'Lista completa de projetos',
      icon: FolderOpen,
      action: () => navigate('/admin/projects'),
      category: 'navigation',
      keywords: ['projetos', 'projects']
    },
    {
      id: 'nav-tasks',
      title: 'Kanban de Tarefas',
      subtitle: 'Visualização em kanban',
      icon: CheckSquare,
      action: () => navigate('/tasks'),
      category: 'navigation',
      keywords: ['tarefas', 'tasks', 'kanban']
    },
    {
      id: 'nav-team',
      title: 'Colaboradores',
      subtitle: 'Gerenciar equipe',
      icon: Users,
      action: () => navigate('/admin/team'),
      category: 'navigation',
      keywords: ['equipe', 'team', 'colaboradores']
    },
    {
      id: 'nav-timesheet',
      title: 'Timesheet',
      subtitle: 'Registro de horas',
      icon: Clock,
      action: () => navigate('/timesheet'),
      category: 'navigation',
      keywords: ['horas', 'timesheet']
    },
    {
      id: 'nav-reports',
      title: 'Relatórios',
      subtitle: 'Análises e relatórios',
      icon: FileText,
      action: () => navigate('/admin/reports'),
      category: 'navigation',
      keywords: ['relatórios', 'reports', 'analytics']
    }
  ];

  // Ações rápidas
  const actionCommands: CommandItem[] = [
    {
      id: 'action-new-project',
      title: 'Novo Projeto',
      subtitle: 'Criar um novo projeto',
      icon: Plus,
      action: () => navigate('/admin/projects/new'),
      category: 'action',
      keywords: ['criar', 'novo', 'projeto']
    },
    {
      id: 'action-new-task',
      title: 'Nova Tarefa',
      subtitle: 'Criar uma nova tarefa',
      icon: Plus,
      action: () => navigate('/tasks/new'),
      category: 'action',
      keywords: ['criar', 'nova', 'tarefa']
    },
    {
      id: 'action-new-timesheet',
      title: 'Registrar Horas',
      subtitle: 'Novo registro de timesheet',
      icon: Plus,
      action: () => navigate('/timesheet/new'),
      category: 'action',
      keywords: ['criar', 'horas', 'timesheet']
    }
  ];

  // Comandos dinâmicos baseados em dados
  const dynamicCommands = useMemo(() => {
    const projectCmds: CommandItem[] = projects.slice(0, 10).map(p => ({
      id: `project-${p.id}`,
      title: p.name,
      subtitle: `Projeto • ${clients.find(c => c.id === p.clientId)?.name || 'Cliente'}`,
      icon: Briefcase,
      action: () => navigate(`/admin/projects/${p.id}`),
      category: 'project',
      keywords: [p.name.toLowerCase()]
    }));

    const taskCmds: CommandItem[] = tasks.slice(0, 10).map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      subtitle: `Tarefa • ${t.projectName || 'Projeto'}`,
      icon: CheckSquare,
      action: () => navigate(`/tasks/${t.id}`),
      category: 'task',
      keywords: [t.title.toLowerCase()]
    }));

    const clientCmds: CommandItem[] = clients.slice(0, 10).map(c => ({
      id: `client-${c.id}`,
      title: c.name,
      subtitle: 'Cliente',
      icon: Building2,
      action: () => navigate(`/admin/clients/${c.id}`),
      category: 'client',
      keywords: [c.name.toLowerCase()]
    }));

    return [...projectCmds, ...taskCmds, ...clientCmds];
  }, [projects, tasks, clients, navigate]);

  // Todos os comandos
  const allCommands = [...navigationCommands, ...actionCommands, ...dynamicCommands];

  // Filtrar comandos baseado na busca
  const filteredCommands = useMemo(() => {
    if (!search.trim()) {
      return allCommands.slice(0, 8); // Mostrar apenas primeiros 8 quando não há busca
    }

    const searchLower = search.toLowerCase();
    return allCommands.filter(cmd => {
      const titleMatch = cmd.title.toLowerCase().includes(searchLower);
      const subtitleMatch = cmd.subtitle?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some(k => k.includes(searchLower));
      return titleMatch || subtitleMatch || keywordMatch;
    }).slice(0, 12);
  }, [search, allCommands]);

  // Resetar seleção quando filtros mudarem
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          handleClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands]);

  const handleClose = () => {
    setSearch('');
    setSelectedIndex(0);
    onClose();
  };

  const handleCommandClick = (cmd: CommandItem) => {
    cmd.action();
    handleClose();
  };

  if (!isOpen) return null;

  const categoryLabels = {
    navigation: 'Navegação',
    action: 'Ações Rápidas',
    project: 'Projetos',
    task: 'Tarefas',
    client: 'Clientes'
  };

  // Agrupar comandos por categoria
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-[100]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-[101] px-4"
          >
            <div
              className="rounded-2xl shadow-2xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-xl)'
              }}
            >
              {/* Search Input */}
              <div className="p-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3">
                  <Search className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar comandos, projetos, tarefas..."
                    className="flex-1 bg-transparent outline-none text-base"
                    style={{ color: 'var(--text)' }}
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <kbd
                      className="px-2 py-1 text-xs rounded border"
                      style={{
                        backgroundColor: 'var(--surface-2)',
                        borderColor: 'var(--border)',
                        color: 'var(--muted)'
                      }}
                    >
                      ESC
                    </kbd>
                  </div>
                </div>
              </div>

              {/* Commands List */}
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {filteredCommands.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: 'var(--muted)' }}>
                    <p>Nenhum resultado encontrado</p>
                  </div>
                ) : (
                  Object.entries(groupedCommands).map(([category, commands]) => (
                    <div key={category}>
                      <div
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider sticky top-0 z-10"
                        style={{
                          backgroundColor: 'var(--surface-2)',
                          color: 'var(--muted)'
                        }}
                      >
                        {categoryLabels[category as keyof typeof categoryLabels] || category}
                      </div>
                      {commands.map((cmd, idx) => {
                        const globalIndex = filteredCommands.indexOf(cmd);
                        const isSelected = globalIndex === selectedIndex;
                        const Icon = cmd.icon;

                        return (
                          <button
                            key={cmd.id}
                            onClick={() => handleCommandClick(cmd)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-colors"
                            style={{
                              backgroundColor: isSelected ? 'var(--surface-hover)' : 'transparent',
                              color: 'var(--text)'
                            }}
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{
                                backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--surface-2)'
                              }}
                            >
                              <Icon
                                className="w-5 h-5"
                                style={{ color: isSelected ? 'var(--primary)' : 'var(--muted)' }}
                              />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <div className="font-medium truncate">{cmd.title}</div>
                              {cmd.subtitle && (
                                <div className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                                  {cmd.subtitle}
                                </div>
                              )}
                            </div>
                            {isSelected && (
                              <kbd
                                className="px-2 py-1 text-xs rounded border flex-shrink-0"
                                style={{
                                  backgroundColor: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                  color: 'var(--muted)'
                                }}
                              >
                                ↵
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div
                className="px-4 py-3 border-t flex items-center justify-between text-xs"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--muted)'
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>↑</kbd>
                    <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>↓</kbd>
                    <span className="ml-1">Navegar</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border)' }}>↵</kbd>
                    <span className="ml-1">Selecionar</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Command className="w-3 h-3" />
                  <span>+K para abrir</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
