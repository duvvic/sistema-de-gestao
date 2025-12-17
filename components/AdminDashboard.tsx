import React, { useState, useMemo } from "react";
import { Client, Project, Task } from "../types";
import { Plus, Building2, ArrowDownAZ, Briefcase } from "lucide-react";
import { supabase } from "../services/supabaseClient";

interface AdminDashboardProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  onSelectClient: (id: string) => void;
  onSelectClientProjects?: (id: string) => void;
  onAddClient: () => void;
  onDeleteClient?: (clientId: string) => void; // Mantém compatibilidade com App.tsx
  loadClients?: () => void; 
}

type SortOption = 'recent' | 'alphabetical' | 'creation';

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  projects,
  tasks,
  onSelectClient,
  onSelectClientProjects,
  onAddClient,
  onDeleteClient,
  loadClients
}) => {
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [sortBy, setSortBy] = useState<SortOption>('recent');



  // --------- PROTEÇÃO CONTRA UNDEFINED ---------
  const safeClients = clients || [];
  const safeProjects = projects || [];
  const safeTasks = tasks || [];

  // Separar clientes ativos e inativos
  const activeClients = useMemo(() => 
    safeClients.filter(c => c.active !== false), 
    [safeClients]
  );
  
  const inactiveClients = useMemo(() => 
    safeClients.filter(c => c.active === false), 
    [safeClients]
  );

  // Função auxiliar para obter a tarefa mais recente de um cliente
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

  // Ordenar clientes com base no filtro selecionado
  const sortedClients = useMemo(() => {
    const clientsToSort = activeTab === 'active' ? activeClients : inactiveClients;
    
    return [...clientsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        
        case 'creation':
          // Assumindo que clients não têm campo de data, usar ID como proxy
          return a.id.localeCompare(b.id);
        
        case 'recent':
        default:
          const dateA = getMostRecentTaskDate(a.id);
          const dateB = getMostRecentTaskDate(b.id);
          
          // Clientes sem tarefas vão pro final
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          
          // Mais recente primeiro
          return dateB.getTime() - dateA.getTime();
      }
    });
  }, [activeClients, inactiveClients, activeTab, sortBy, safeTasks]);

  const displayedClients = sortedClients;

  return (
    <div className="h-full flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[#4c1d95]" />
            Gerenciamento de Clientes
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {activeClients.length} ativos • {inactiveClients.length} desativados
          </p>
        </div>

        <button
          className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          onClick={onAddClient}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* Aviso de fluxo de criação de projeto */}
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
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'recent'
                ? 'bg-[#4c1d95] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Recentes
          </button>
          <button
            onClick={() => setSortBy('alphabetical')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'alphabetical'
                ? 'bg-[#4c1d95] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Alfabética
          </button>
          <button
            onClick={() => setSortBy('creation')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              sortBy === 'creation'
                ? 'bg-[#4c1d95] text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Data de Criação
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-[#4c1d95] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Ativos ({activeClients.length})
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'inactive'
              ? 'bg-[#4c1d95] text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Desativados ({inactiveClients.length})
        </button>
      </div>

      {/* LOADING STATE */}
      {displayedClients.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">
              {activeTab === 'active' ? 'Nenhum cliente ativo' : 'Nenhum cliente desativado'}
            </p>
            <p className="text-sm">
              {activeTab === 'active' && 'Clique em "Novo Cliente" para começar'}
            </p>
          </div>
        </div>
      ) : (
        /* LISTA DE CLIENTES */
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto">
          {displayedClients.map((client) => (
            <div
              key={client.id}
              className="group bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-[#4c1d95] transition-all duration-300 cursor-pointer flex flex-col h-[280px]"
              onClick={() => onSelectClientProjects?.(client.id)}
            >
              {/* LOGO CONTAINER */}
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

              {/* INFO CONTAINER */}
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
