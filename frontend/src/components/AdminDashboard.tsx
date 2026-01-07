// components/AdminDashboard.tsx - Versão adaptada para React Router
import React, { useState, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useDataController } from '@/controllers/useDataController';
import { Client, Project, Task } from "@/types";
import { Plus, Building2, ArrowDownAZ, Briefcase } from "lucide-react";

type SortOption = 'recent' | 'alphabetical' | 'creation';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { clients: initialClients, projects: initialProjects, tasks: initialTasks, error, loading, users } = useDataController();

  const [clients, setClients] = useState(initialClients);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(initialTasks);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Atualizar quando os dados mudarem
  React.useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  React.useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  React.useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Painel de debug

  // Proteção contra undefined
  const safeClients = clients || [];
  const safeProjects = projects || [];
  const safeTasks = tasks || [];

  // Realtime subscriptions
  useSupabaseRealtime('dim_clientes', (payload) => {
    if (payload.eventType === 'INSERT') setClients(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setClients(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
    else if (payload.eventType === 'DELETE') setClients(prev => prev.filter(c => c.id !== payload.old.id));
  });

  useSupabaseRealtime('dim_projetos', (payload) => {
    if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
  });

  useSupabaseRealtime('fato_tarefas', (payload) => {
    if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
    else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
  });

  // Separar clientes ativos
  const activeClients = useMemo(() =>
    safeClients.filter(c => c.active !== false),
    [safeClients]
  );

  // Tarefa mais recente de um cliente
  const getMostRecentTaskDate = (clientId: string): Date | null => {
    const clientTasks = safeTasks.filter(t => t.clientId === clientId);
    if (clientTasks.length === 0) return null;

    const dates = clientTasks
      .map(t => t.actualStart)
      .filter(Boolean)
      .map(d => new Date(d!));

    if (dates.length === 0) return null;
    return new Date(Math.max(...dates.map(d => d.getTime())));
  };

  // Ordenar clientes
  const sortedClients = useMemo(() => {
    return [...activeClients].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        case 'creation':
          return a.id.localeCompare(b.id);
        case 'recent':
        default:
          const dateA = getMostRecentTaskDate(a.id);
          const dateB = getMostRecentTaskDate(b.id);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateB.getTime() - dateA.getTime();
      }
    });
  }, [activeClients, sortBy, safeTasks]);

  return (
    <div className="h-full flex flex-col p-8" style={{ backgroundColor: 'var(--bg)' }}>


      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <Building2 className="w-6 h-6" style={{ color: 'var(--primary)' }} />
            Gerenciamento de Clientes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {activeClients.length} {activeClients.length === 1 ? 'cliente ativo' : 'clientes ativos'}
          </p>
        </div>

        <button
          className="text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow transition-colors font-medium"
          style={{ backgroundColor: 'var(--primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
          onClick={() => navigate('/admin/clients/new')}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Aviso */}
      <div className="mb-4 rounded-lg border px-3 py-2.5 flex items-start gap-2 shadow-sm"
        style={{
          backgroundColor: 'var(--primary-soft)',
          borderColor: 'var(--border)',
          color: 'var(--text)'
        }}>
        <div className="mt-0.5">
          <Briefcase className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <div className="text-sm leading-relaxed">
          Para criar um projeto, primeiro selecione o cliente e abra seus detalhes; lá o botão "+ Novo Projeto" já vem no contexto correto.
        </div>
      </div>

      {/* FILTRO DE ORDENAÇÃO */}
      <div className="flex items-center gap-3 mb-4">
        <ArrowDownAZ className="w-5 h-5" style={{ color: 'var(--muted)' }} />
        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Ordenar por:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border`}
            style={{
              backgroundColor: sortBy === 'recent' ? 'var(--primary)' : 'var(--surface)',
              color: sortBy === 'recent' ? 'white' : 'var(--text)',
              borderColor: sortBy === 'recent' ? 'transparent' : 'var(--border)'
            }}
          >
            Recentes
          </button>
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border`}
            style={{
              backgroundColor: sortBy === 'alphabetical' ? 'var(--primary)' : 'var(--surface)',
              color: sortBy === 'alphabetical' ? 'white' : 'var(--text)',
              borderColor: sortBy === 'alphabetical' ? 'transparent' : 'var(--border)'
            }}
          >
            Alfabética
          </button>
          <button
            onClick={() => setSortBy('creation')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border`}
            style={{
              backgroundColor: sortBy === 'creation' ? 'var(--primary)' : 'var(--surface)',
              color: sortBy === 'creation' ? 'white' : 'var(--text)',
              borderColor: sortBy === 'creation' ? 'transparent' : 'var(--border)'
            }}
          >
            Data de Criação
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
            <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando clientes...</p>
          </div>
        </div>
      ) : sortedClients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center" style={{ color: 'var(--muted)' }}>
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">
              Nenhum cliente ativo
            </p>
            <p className="text-sm">
              Clique em "Novo Cliente" para começar
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto custom-scrollbar">
          {sortedClients.map((client) => (
            <div
              key={client.id}
              className="group border rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              onClick={() => navigate(`/admin/clients/${client.id}`)}
            >
              {/* LOGO */}
              <div className="w-full h-[180px] p-6 flex items-center justify-center border-b transition-all duration-300"
                style={{
                  backgroundColor: 'var(--surface-hover)',
                  borderColor: 'var(--border)'
                }}>
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                  onError={(e) =>
                  (e.currentTarget.src =
                    "https://placehold.co/200x200?text=Logo")
                  }
                />
              </div>

              {/* INFO */}
              <div className="p-4 flex-1 flex flex-col justify-between" style={{ backgroundColor: 'var(--surface)' }}>
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-sm font-bold mb-2 line-clamp-2 leading-tight transition-colors text-center group-hover:text-[var(--primary)]" style={{ color: 'var(--text)' }}>
                    {client.name}
                  </h2>
                  <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="font-semibold" style={{ color: 'var(--primary)' }}>
                      {safeProjects.filter((p) => p.clientId === client.id).length}
                    </span>
                    <span>
                      {safeProjects.filter((p) => p.clientId === client.id).length === 1 ? 'projeto' : 'projetos'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
