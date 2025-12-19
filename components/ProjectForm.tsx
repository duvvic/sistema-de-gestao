// components/ProjectForm.tsx - Adaptado para Router e Project Members
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { ArrowLeft, Save } from 'lucide-react';

const ProjectForm: React.FC = () => {
  const { projectId, clientId: routeClientId } = useParams<{ projectId?: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Incluindo funções de membros do projeto
  const {
    clients,
    projects,
    users,
    projectMembers, // Para dependência
    createProject,
    updateProject,
    getProjectMembers,
    addProjectMember,
    removeProjectMember
  } = useDataController();

  const isEdit = !!projectId;
  const project = projectId ? projects.find(p => p.id === projectId) : null;

  // Cliente pode vir da rota ou query param
  const initialClientId = routeClientId || searchParams.get('clientId') || project?.clientId || '';

  const [name, setName] = useState('');
  const [clientId, setClientId] = useState(initialClientId);
  const [status, setStatus] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (project) {
      setName(project.name);
      setClientId(project.clientId);
      setStatus(project.status || '');
    }
  }, [project]);

  // Carregar membros separadamente para garantir sincronia
  useEffect(() => {
    if (isEdit && projectId && projectMembers.length > 0) {
      const currentMembers = getProjectMembers(projectId);
      setSelectedUsers(currentMembers);
    }
  }, [isEdit, projectId, projectMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !clientId) {
      alert('Nome e cliente são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      let targetProjectId = projectId;

      // 1. Salvar/Criar Projeto
      if (isEdit && projectId) {
        await updateProject(projectId, { name, clientId, status });
      } else {
        targetProjectId = await createProject({ name, clientId, status, active: true });
      }

      // 2. Atualizar Membros (apenas se tiver ID de projeto válido)
      if (targetProjectId) {
        // Membros que já estavam no banco
        const initialMembers = isEdit ? getProjectMembers(targetProjectId) : [];
        const currentMembersSet = new Set(initialMembers);
        const newMembersSet = new Set(selectedUsers);

        // Adicionar novos
        const toAdd = selectedUsers.filter(uid => !currentMembersSet.has(uid));
        for (const userId of toAdd) {
          await addProjectMember(targetProjectId, userId);
        }

        // Remover excluídos (apenas em edição)
        if (isEdit) {
          const toRemove = initialMembers.filter(uid => !newMembersSet.has(uid));
          for (const userId of toRemove) {
            await removeProjectMember(targetProjectId, userId);
          }
        }
      }

      alert(isEdit ? 'Projeto atualizado com sucesso!' : 'Projeto criado com sucesso!');

      // Navegar de volta
      if (isEdit) {
        navigate(`/admin/projects/${targetProjectId}`);
      } else {
        navigate(`/admin/clients/${clientId}`);
      }

    } catch (error) {
      console.error('Erro ao salvar projeto:', error);
      alert('Erro ao salvar projeto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Cliente *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent"
              required
              disabled={isEdit} // Não pode mudar cliente em edição
            >
              <option value="">Selecione um cliente</option>
              {clients.filter(c => c.active !== false).map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Nome do Projeto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do Projeto *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent"
              placeholder="Ex: Desenvolvimento do Website"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent"
            >
              <option value="">Selecione um status</option>
              <option value="Planejamento">Planejamento</option>
              <option value="Em Andamento">Em Andamento</option>
              <option value="Em Pausa">Em Pausa</option>
              <option value="Concluído">Concluído</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Membros do Projeto */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Membros do Projeto
            </label>
            <div className="border border-slate-300 rounded-lg p-4 max-h-60 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {users.filter(u => u.active !== false).map(user => (
                <label key={user.id} className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(prev => [...prev, user.id]);
                      } else {
                        setSelectedUsers(prev => prev.filter(id => id !== user.id));
                      }
                    }}
                    className="w-5 h-5 text-[#4c1d95] rounded border-slate-300 focus:ring-[#4c1d95]"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#4c1d95] text-white flex items-center justify-center text-xs font-bold overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{user.name}</p>
                      <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Selecione os colaboradores que trabalharão neste projeto.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-[#4c1d95] text-white rounded-lg hover:bg-[#3b1675] flex items-center gap-2 disabled:opacity-50"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
