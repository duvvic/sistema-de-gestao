// components/AllProjectsView.tsx - Adaptado para Router
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { Plus, Briefcase, CheckSquare } from 'lucide-react';

const AllProjectsView: React.FC = () => {
  const navigate = useNavigate();
  const { projects, clients, tasks } = useDataController();

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-[#4c1d95]" />
            Todos os Projetos
          </h1>
          <p className="text-slate-500 mt-1">{projects.length} projetos cadastrados</p>
        </div>

        <button
          onClick={() => navigate('/admin/projects/new')}
          className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg hover:bg-[#3b1675] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Lista de Projetos */}
      <div className="flex-1 overflow-y-auto">
        {projects.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg mb-2">Nenhum projeto cadastrado</p>
              <button
                onClick={() => navigate('/admin/projects/new')}
                className="text-[#4c1d95] hover:underline"
              >
                Criar primeiro projeto
              </button>
            </div>
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
                  className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-[#4c1d95] hover:shadow-lg transition-all text-left group"
                >
                  {/* Cliente Logo */}
                  {client && (
                    <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
                      <div className="w-8 h-8 rounded bg-slate-50 p-1 flex items-center justify-center">
                        <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-xs text-slate-500">{client.name}</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-800 group-hover:text-[#4c1d95] mb-2">
                    {project.name}
                  </h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckSquare className="w-4 h-4 text-green-500" />
                      <span>{doneTasks}/{projectTasks.length} tarefas concluídas</span>
                    </div>

                    {project.status && (
                      <div className="text-xs text-slate-500">
                        Status: <span className="font-medium text-slate-700">{project.status}</span>
                      </div>
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
