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
    <div className="h-full flex flex-col p-8">


      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#4c1d95]" />
            Gerenciamento de Clientes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeClients.length} {activeClients.length === 1 ? 'cliente ativo' : 'clientes ativos'}
          </p>
        </div>

        <button
          className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          onClick={() => navigate('/admin/clients/new')}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Aviso */}
      <div className="mb-4 rounded-lg border border-purple-100 bg-purple-50 text-slate-800 px-3 py-2.5 flex items-start gap-2 shadow-sm">
        <div className="mt-0.5">
          <Briefcase className="w-4 h-4 text-[#4c1d95]" />
        </div>
        <div className="text-sm leading-relaxed">
          Para criar um projeto, primeiro selecione o cliente e abra seus detalhes; lá o botão "+ Novo Projeto" já vem no contexto correto.
        </div>
      </div>

      {/* FILTRO DE ORDENAÇÃO */}
      <div className="flex items-center gap-3 mb-4">
        <ArrowDownAZ className="w-5 h-5 text-slate-500" />
        <span className="text-sm font-medium text-slate-600">Ordenar por:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortBy === 'recent'
              ? 'bg-[#4c1d95] text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            Recentes
          </button>
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortBy === 'alphabetical'
              ? 'bg-[#4c1d95] text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            Alfabética
          </button>
          <button
            onClick={() => setSortBy('creation')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${sortBy === 'creation'
              ? 'bg-[#4c1d95] text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            Data de Criação
          </button>
        </div>
      </div>

      {/* LISTA DE CLIENTES */}
      {sortedClients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
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
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto">
          {sortedClients.map((client) => (
            <div
              key={client.id}
              className="group bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#4c1d95] transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
              onClick={() => navigate(`/admin/clients/${client.id}`)}
            >
              {/* LOGO */}
              <div className="w-full h-[180px] bg-gradient-to-br from-slate-50 to-slate-100 p-6 flex items-center justify-center border-b-2 border-slate-100 group-hover:from-purple-50 group-hover:to-purple-100 transition-all duration-300">
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
              <div className="p-4 flex-1 flex flex-col justify-between bg-white">
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-sm font-bold text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-[#4c1d95] transition-colors text-center">
                    {client.name}
                  </h2>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span className="font-semibold text-[#4c1d95]">
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
