import React, { useState, useEffect, useCallback } from 'react';
import { Project, Client, Task } from '@/types';
import { Plus, Trash2, FileText } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import BackButton from './BackButton';

interface ProjectsViewProps {
  client: Client;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  onNewProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onProjectClick?: (projectId: string) => void;
  onTaskClick?: (taskId: string) => void;
}

const ProjectsView: React.FC<ProjectsViewProps> = ({
  client,
  projects,
  tasks,
  onBack,
  onNewProject,
  onDeleteProject,
  onProjectClick,
  onTaskClick,
}) => {

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    managerClient: '',
    startDate: '',
    estimatedDelivery: '',
  });

  // Realtime updates for projects and tasks
  const handleProjectRealtime = useCallback((payload) => {
    // Atualize a lista de projetos conforme necessário
    // Exemplo: refetchProjects();
    // Ou chame onNewProject/onDeleteProject se apropriado
    // Aqui apenas um console.log para debug

  }, []);

  const handleTaskRealtime = useCallback((payload) => {
    // Atualize a lista de tarefas conforme necessário
    // Exemplo: refetchTasks();
    // Ou chame onTaskClick se apropriado

  }, []);

  useSupabaseRealtime('projects', handleProjectRealtime);
  useSupabaseRealtime('tasks', handleTaskRealtime);

  const clientProjects = projects.filter(p => p.clientId === client.id);
  const tasksByProject = (projectId: string) => tasks.filter(t => t.projectId === projectId);



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Nome do projeto é obrigatório');
      return;
    }

    const newProject: Project = {
      id: crypto.randomUUID(),
      name: formData.name,
      clientId: client.id,
      description: formData.description || undefined,
      budget: formData.budget ? Number(formData.budget) : undefined,
      managerClient: formData.managerClient || undefined,
      startDate: formData.startDate || undefined,
      estimatedDelivery: formData.estimatedDelivery || undefined,
      status: 'Em andamento',
    };

    onNewProject(newProject);

    // Reset form
    setFormData({
      name: '',
      description: '',
      budget: '',
      managerClient: '',
      startDate: '',
      estimatedDelivery: '',
    });
    setShowForm(false);
  };

  const handleDelete = (projectId: string) => {
    if (window.confirm('Tem certeza que deseja desativar este projeto?')) {
      onDeleteProject(projectId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <BackButton onClick={onBack} />
          <div>
            <h1 className="text-xl font-bold text-slate-800">Projetos: {client.name}</h1>
            <p className="text-sm text-slate-500">Gerencie os projetos deste cliente</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Form - Novo Projeto */}
          {showForm && (
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Novo Projeto</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Projeto *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Desenvolvimento do Dashboard"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descreva o escopo do projeto..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Orçamento</label>
                    <input
                      type="number"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      placeholder="0.00"
                      step="0.01"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Gerente</label>
                    <input
                      type="text"
                      value={formData.managerClient}
                      onChange={(e) => setFormData({ ...formData, managerClient: e.target.value })}
                      placeholder="Nome do gerente"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Data de Início</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Data de Entrega Estimada</label>
                    <input
                      type="date"
                      value={formData.estimatedDelivery}
                      onChange={(e) => setFormData({ ...formData, estimatedDelivery: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-3 rounded-lg shadow-md transition-all font-medium"
                  >
                    Salvar Projeto
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-3 rounded-lg transition-all font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de Projetos */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Projetos ({clientProjects.length})</h2>

            {clientProjects.length === 0 ? (
              <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Nenhum projeto criado para este cliente ainda</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-[#4c1d95] hover:underline font-medium"
                >
                  Criar primeiro projeto
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {clientProjects.map((project) => {
                  const projectTasks = tasksByProject(project.id);
                  return (
                    <div
                      key={project.id}
                      className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => onProjectClick?.(project.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-slate-800">{project.name}</h3>
                          {project.description && (
                            <p className="text-sm text-slate-600 mt-2">{project.description}</p>
                          )}
                          <div className="flex gap-6 mt-4 text-sm text-slate-600">
                            {project.managerClient && (
                              <div>
                                <span className="font-medium">Gerente:</span> {project.managerClient}
                              </div>
                            )}
                            {project.budget && (
                              <div>
                                <span className="font-medium">Orçamento:</span> R$ {project.budget.toFixed(2)}
                              </div>
                            )}
                            {project.startDate && (
                              <div>
                                <span className="font-medium">Início:</span> {new Date(project.startDate).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(project.id);
                          }}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Desativar projeto"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>

                      {/* Tarefas do Projeto */}
                      <div className="mt-4 bg-slate-50 border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-slate-700">Tarefas ({projectTasks.length})</h4>
                          <span className="text-xs text-slate-500">Fonte: fato_tarefas</span>
                        </div>
                        {projectTasks.length === 0 ? (
                          <p className="text-sm text-slate-500">Nenhuma tarefa para este projeto.</p>
                        ) : (
                          <div className="space-y-2">
                            {projectTasks.slice(0, 5).map((task) => (
                              <div
                                key={task.id}
                                onClick={() => onTaskClick?.(task.id)}
                                className="flex items-center justify-between text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-purple-200 cursor-pointer hover:bg-purple-50 transition-colors"
                              >
                                <div className="truncate pr-2">
                                  <div className="font-medium text-slate-800 truncate">{task.title}</div>
                                  <div className="text-xs text-slate-500 truncate">Status: {task.status || 'Sem status'}</div>
                                </div>
                                <span className="text-[11px] font-semibold text-[#4c1d95] bg-purple-50 px-2 py-1 rounded-full">
                                  {task.status === 'Done' ? 'Concluída' : 'Em andamento'}
                                </span>
                              </div>
                            ))}
                            {projectTasks.length > 5 && (
                              <p className="text-xs text-slate-500">+{projectTasks.length - 5} tarefas adicionais</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectsView;
