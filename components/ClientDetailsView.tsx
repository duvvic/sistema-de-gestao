// components/ClientDetailsView.tsx - Adaptado para Router
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { ArrowLeft, Plus, Briefcase, CheckSquare, Clock, Edit, LayoutGrid, ListTodo, Filter } from 'lucide-react';

const ClientDetailsView: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { clients, projects, tasks, users, getClientById } = useDataController();

  const [activeTab, setActiveTab] = useState<'projects' | 'tasks'>('projects');
  const [selectedDeveloperId, setSelectedDeveloperId] = useState<string>('');

  const client = clientId ? getClientById(clientId) : null;
  const clientProjects = useMemo(() =>
    projects.filter(p => p.clientId === clientId),
    [projects, clientId]
  );

  const clientTasks = useMemo(() =>
    tasks.filter(t => t.clientId === clientId),
    [tasks, clientId]
  );

  const filteredTasks = useMemo(() => {
    if (!selectedDeveloperId) return clientTasks;
    return clientTasks.filter(t => t.developerId === selectedDeveloperId);
  }, [clientTasks, selectedDeveloperId]);

  const developersWithTasks = useMemo(() => {
    const devIds = new Set(clientTasks.map(t => t.developerId).filter(id => id));
    return users.filter(u => devIds.has(u.id));
  }, [clientTasks, users]);

  if (!client) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Cliente não encontrado</h2>
          <button
            onClick={() => navigate('/admin/clients')}
            className="text-[#4c1d95] hover:underline"
          >
            Voltar para lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/clients')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>

        <div className="flex-1 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white border-2 border-slate-200 p-2 flex items-center justify-center">
            <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
            <p className="text-slate-500">{clientProjects.length} projetos • {clientTasks.length} tarefas</p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/admin/clients/${clientId}/edit`)}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 flex items-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Editar
        </button>

        <button
          onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)}
          className="px-4 py-2 bg-[#4c1d95] text-white rounded-lg hover:bg-[#3b1675] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'projects'
            ? 'text-[#4c1d95] border-[#4c1d95]'
            : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
        >
          <LayoutGrid className="w-4 h-4" />
          Projetos
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`pb-3 text-sm font-bold flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'tasks'
            ? 'text-[#4c1d95] border-[#4c1d95]'
            : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
        >
          <ListTodo className="w-4 h-4" />
          Tarefas
        </button>
      </div>

      {/* Content: Projetos */}
      {activeTab === 'projects' && (
        <div className="flex-1 overflow-y-auto">
          {clientProjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum projeto cadastrado</p>
              <button
                onClick={() => navigate(`/admin/clients/${clientId}/projects/new`)}
                className="mt-4 text-[#4c1d95] hover:underline"
              >
                Criar primeiro projeto
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientProjects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const doneTasks = projectTasks.filter(t => t.status === 'Done').length;

                return (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/admin/projects/${project.id}`)}
                    className="bg-white border-2 border-slate-200 rounded-xl p-6 hover:border-[#4c1d95] hover:shadow-lg transition-all text-left group"
                  >
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
                          Status: <span className="font-medium">{project.status}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content: Tarefas */}
      {activeTab === 'tasks' && (
        <div className="flex-1 overflow-y-auto">
          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
              <Filter className="w-4 h-4 text-slate-500 ml-2" />
              <select
                value={selectedDeveloperId}
                onChange={(e) => setSelectedDeveloperId(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none p-1.5 min-w-[200px]"
              >
                <option value="">Todos os Colaboradores</option>
                {developersWithTasks
                  .filter(u => u.active !== false)
                  .map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))
                }
              </select>
            </div>

            <div className="text-sm text-slate-500">
              {filteredTasks.length} tarefas encontradas
            </div>
          </div>

          {clientTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma tarefa cadastrada para este cliente.</p>
              <button
                onClick={() => navigate(`/tasks/new?client=${clientId}`)}
                className="mt-4 text-[#4c1d95] hover:underline"
              >
                Criar primeira tarefa
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>Nenhuma tarefa encontrada com este filtro.</p>
              <button
                onClick={() => setSelectedDeveloperId('')}
                className="mt-2 text-[#4c1d95] hover:underline text-sm"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const developerUser = users.find(u => u.id === task.developerId);

                return (
                  <button
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:border-[#4c1d95] hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${task.status === 'Done' ? 'bg-green-100 text-green-700' :
                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'Review' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-slate-100 text-slate-700'
                        }`}>
                        {task.status === 'Todo' ? 'A Fazer' :
                          task.status === 'In Progress' ? 'Em Progresso' :
                            task.status === 'Review' ? 'Revisão' : 'Concluído'}
                      </span>
                      {task.priority && (
                        <span className={`text-[10px] font-bold ${task.priority === 'Critical' ? 'text-red-600' :
                          task.priority === 'High' ? 'text-orange-600' : 'text-slate-400'
                          }`}>
                          {task.priority === 'Critical' ? 'CRÍTICA' : task.priority}
                        </span>
                      )}
                    </div>

                    <h4 className="font-semibold text-slate-800 group-hover:text-[#4c1d95] mb-1 line-clamp-2">
                      {task.title}
                    </h4>

                    {project && (
                      <div className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        {project.name}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-auto">
                      <div className="flex items-center gap-2">
                        {developerUser?.avatarUrl ? (
                          <img src={developerUser.avatarUrl} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                            {task.developer?.substring(0, 2).toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-xs text-slate-500 truncate max-w-[80px]">
                          {task.developer || 'Sem resp.'}
                        </span>
                      </div>

                      {task.estimatedDelivery && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" />
                          {new Date(task.estimatedDelivery).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ClientDetailsView;
