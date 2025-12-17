import React, { useState } from 'react';
import { Project, Client } from '../types';
import { ArrowLeft, Search, Folder, Filter, Plus } from 'lucide-react';

interface AllProjectsViewProps {
  projects: Project[];
  clients: Client[];
  onBack?: () => void;
  onSelectProject?: (projectId: string) => void;
  onNewProject?: () => void;
}

const AllProjectsView: React.FC<AllProjectsViewProps> = ({
  projects,
  clients,
  onBack,
  onSelectProject,
  onNewProject,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Mapear clientes por ID para fácil acesso
  const clientMap = new Map<string, Client>(clients.map(c => [c.id, c]));

  // Filtrar projetos por busca e status (status derivado de ativo)
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase());
    const derivedStatus = project.active ? 'Em andamento' : 'Concluído';
    const matchesStatus = !selectedStatus || derivedStatus === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Agrupar projetos por cliente
  const projectsByClient = new Map<string, Project[]>();
  filteredProjects.forEach(project => {
    const clientProjects = projectsByClient.get(project.clientId) || [];
    clientProjects.push(project);
    projectsByClient.set(project.clientId, clientProjects);
  });

  // Obter status permitidos (apenas "Em andamento" e "Concluído")
  const allowedStatuses = ["Em andamento", "Concluído"] as const;
  const uniqueStatuses = Array.from(
    new Set(
      projects
        .map(p => (p.active ? 'Em andamento' : 'Concluído'))
        .filter((s): s is string => Boolean(s) && allowedStatuses.includes(s as any))
    )
  );

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-slate-100 hover:bg-[#4c1d95] text-slate-700 hover:text-white rounded-lg transition-all font-medium flex items-center gap-2"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-800">Projetos</h1>
            <p className="text-sm text-slate-500">Todos os projetos das empresas</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold text-[#4c1d95]">{filteredProjects.length}</div>
            <p className="text-sm text-slate-500">projetos</p>
          </div>
          {onNewProject && (
            <button
              onClick={onNewProject}
              className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 font-bold text-base"
            >
              <Plus size={20} />
              Novo Projeto
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Filtros */}
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome do projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
              />
            </div>

            {/* Filtro de Status */}
            {uniqueStatuses.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedStatus('')}
                  className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                    selectedStatus === ''
                      ? 'bg-[#4c1d95] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="inline w-4 h-4 mr-1" />
                  Todos
                </button>
                {uniqueStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => setSelectedStatus(status)}
                    className={`px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                      selectedStatus === status
                        ? 'bg-[#4c1d95] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Projetos por Cliente */}
          {filteredProjects.length === 0 ? (
            <div className="bg-slate-50 p-12 rounded-2xl border border-dashed border-slate-200 text-center">
              <Folder className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">Nenhum projeto encontrado</p>
              <p className="text-slate-500 text-sm mt-1">Tente ajustar seus filtros</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(projectsByClient.entries()).map(([clientId, clientProjects]) => {
                const client = clientMap.get(clientId);
                return (
                  <div key={clientId}>
                    <div className="flex items-center gap-3 mb-4">
                      {client?.logoUrl && (
                        <img
                          src={client.logoUrl}
                          alt={client.name}
                          className="w-8 h-8 object-contain rounded"
                          onError={(e) => (e.currentTarget.style.display = 'none')}
                        />
                      )}
                      <h2 className="text-lg font-bold text-slate-800">{client?.name || 'Cliente Desconhecido'}</h2>
                      <span className="ml-auto text-sm font-medium text-slate-500">
                        {clientProjects.length} {clientProjects.length === 1 ? 'projeto' : 'projetos'}
                      </span>
                    </div>

                    <div className="grid gap-3">
                      {clientProjects.map((project) => (
                        <div
                          key={project.id}
                          onClick={() => onSelectProject?.(project.id)}
                          className={`bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow ${
                            onSelectProject ? 'cursor-pointer hover:border-[#4c1d95]' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-800">{project.name}</h3>
                              {project.description && (
                                <p className="text-sm text-slate-600 mt-1 line-clamp-2">{project.description}</p>
                              )}
                              <div className="flex gap-4 mt-3 text-xs text-slate-600">
                                <span className="inline-block px-3 py-1 bg-slate-100 rounded-full">
                                  {project.active ? 'Em andamento' : 'Concluído'}
                                </span>
                                {project.manager && (
                                  <span className="flex items-center gap-1">
                                    👤 {project.manager}
                                  </span>
                                )}
                                {project.budget && (
                                  <span className="flex items-center gap-1">
                                    💰 R$ {project.budget.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllProjectsView;
