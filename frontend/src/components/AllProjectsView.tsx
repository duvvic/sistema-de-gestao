// components/AllProjectsView.tsx - Adaptado para Router
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { Plus, Briefcase, CheckSquare, LayoutGrid, List, Building2 } from 'lucide-react';

type ViewMode = 'grid' | 'list';

const AllProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, clients, tasks, users, projectMembers, error, loading } = useDataController();
  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const saved = localStorage.getItem('project_view_mode_admin');
    return (saved as ViewMode) || 'list';
  });

  const handleToggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('project_view_mode_admin', mode);
  };

  return (
    <div className="h-full flex flex-col p-8">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
            <Briefcase className="w-6 h-6" style={{ color: 'var(--brand)' }} />
            Todos os Projetos
          </h1>
          <p className="mt-1" style={{ color: 'var(--textMuted)' }}>{projects.length} projetos cadastrados</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-white/10 p-1 rounded-xl border mr-2" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => handleToggleViewMode('grid')}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'grid' ? 'bg-[#4c1d95] text-white shadow-md' : 'text-muted hover:bg-white/5'}`}
              title="Visualização em Blocos"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:block">Blocos</span>
            </button>
            <button
              onClick={() => handleToggleViewMode('list')}
              className={`p-2 rounded-lg transition-all flex items-center gap-2 ${viewMode === 'list' ? 'bg-[#4c1d95] text-white shadow-md' : 'text-muted hover:bg-white/5'}`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
              <span className="text-xs font-bold hidden md:block">Lista</span>
            </button>
          </div>

          <button
            onClick={() => navigate('/admin/projects/new')}
            className="px-4 py-2 text-white rounded-lg flex items-center gap-2 transition-colors shadow"
            style={{ backgroundColor: 'var(--brand)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--brandHover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--brand)'}
          >
            <Plus className="w-4 h-4" />
            Novo Projeto
          </button>
        </div>
      </div>

      {/* Lista de Projetos */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--brand)' }}></div>
              <p className="animate-pulse" style={{ color: 'var(--textMuted)' }}>Carregando projetos...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--textMuted)' }}>
            <div className="text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Nenhum projeto cadastrado</p>
              <button
                onClick={() => navigate('/admin/projects/new')}
                className="hover:underline"
                style={{ color: 'var(--brand)' }}
              >
                Criar primeiro projeto
              </button>
            </div>
          </div>
        ) : viewMode === 'list' ? (
          /* MODO LISTA */
          <div className="space-y-8 pb-10">
            {clients
              .filter(client => projects.some(p => p.clientId === client.id))
              .map(client => {
                const clientProjects = projects.filter(p => p.clientId === client.id);
                return (
                  <div key={client.id} className="space-y-4">
                    {/* Linha do Cliente */}
                    <div
                      onClick={() => navigate(`/admin/clients/${client.id}`)}
                      className="flex items-center gap-4 py-3 px-4 border-l-4 rounded-r-xl bg-white/5 cursor-pointer hover:bg-slate-50 transition-colors"
                      style={{ borderColor: 'var(--brand)' }}
                    >
                      <div className="w-10 h-10 rounded-lg border p-1.5 flex items-center justify-center bg-white" style={{ borderColor: 'var(--border)' }}>
                        {client.logoUrl ? (
                          <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg" style={{ color: 'var(--textTitle)' }}>{client.name}</h3>
                        <p className="text-xs" style={{ color: 'var(--textMuted)' }}>{clientProjects.length} projetos vinculados</p>
                      </div>
                    </div>

                    {/* Projetos do Cliente */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pl-4 md:pl-10">
                      {clientProjects.map(project => {
                        const projectTasks = tasks.filter(t => t.projectId === project.id);
                        const doneTasks = projectTasks.filter(t => t.status === 'Done').length;

                        return (
                          <button
                            key={project.id}
                            onClick={() => navigate(`/admin/projects/${project.id}`)}
                            className="border-2 rounded-xl p-5 hover:shadow-lg transition-all text-left group"
                            style={{
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--brand)]" style={{ color: 'var(--textTitle)' }}>
                              {project.name}
                            </h3>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                                <CheckSquare className="w-4 h-4 text-green-500" />
                                <span>{doneTasks}/{projectTasks.length} tarefas concluídas</span>
                              </div>
                            </div>

                            {/* Equipe do Projeto */}
                            <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                              <div className="flex -space-x-2">
                                {projectMembers
                                  .filter(pm => String(pm.id_projeto) === String(project.id))
                                  .map(pm => {
                                    const member = users.find(u => u.id === String(pm.id_colaborador));
                                    if (!member) return null;
                                    return (
                                      <div
                                        key={member.id}
                                        className="w-7 h-7 rounded-full border-2 flex items-center justify-center overflow-hidden"
                                        style={{
                                          backgroundColor: 'var(--bgApp)',
                                          borderColor: 'var(--surface)'
                                        }}
                                        title={member.name}
                                      >
                                        {member.avatarUrl ? (
                                          <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <span className="text-[10px] font-bold" style={{ color: 'var(--textMuted)' }}>
                                            {member.name.substring(0, 2).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => {
              const client = clients.find(c => c.id === project.clientId);
              const projectTasks = tasks.filter(t => t.projectId === project.id);
              const doneTasks = projectTasks.filter(t => t.status === 'Done').length;

              return (
                <button
                  key={project.id}
                  onClick={() => navigate(`/admin/projects/${project.id}`)}
                  className="border-2 rounded-xl p-6 hover:shadow-lg transition-all text-left group"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {/* Cliente Logo */}
                  {client && (
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-8 h-8 rounded p-1 flex items-center justify-center" style={{ backgroundColor: 'var(--bgApp)' }}>
                        <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--textMuted)' }}>{client.name}</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--brand)]" style={{ color: 'var(--textTitle)' }}>
                    {project.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                      <CheckSquare className="w-4 h-4 text-green-500" />
                      <span>{doneTasks}/{projectTasks.length} tarefas concluídas</span>
                    </div>

                    {project.status && (
                      <div className="text-xs" style={{ color: 'var(--textMuted)' }}>
                        Status: <span className="font-medium" style={{ color: 'var(--text)' }}>{project.status}</span>
                      </div>
                    )}
                  </div>

                  {/* Equipe do Projeto */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex -space-x-2">
                      {projectMembers
                        .filter(pm => String(pm.id_projeto) === String(project.id))
                        .map(pm => {
                          const member = users.find(u => u.id === String(pm.id_colaborador));
                          if (!member) return null;
                          return (
                            <div
                              key={member.id}
                              className="w-7 h-7 rounded-full border-2 flex items-center justify-center overflow-hidden"
                              style={{
                                backgroundColor: 'var(--bgApp)',
                                borderColor: 'var(--surface)'
                              }}
                              title={member.name}
                            >
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold" style={{ color: 'var(--textMuted)' }}>
                                  {member.name.substring(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    {projectMembers.filter(pm => String(pm.id_projeto) === String(project.id)).length === 0 && (
                      <span className="text-[10px] italic" style={{ color: 'var(--textMuted)' }}>Sem equipe</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllProjectsView;
