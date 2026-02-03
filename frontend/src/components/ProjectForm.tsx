// components/ProjectForm.tsx - Adaptado para Router e Project Members
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Users, Briefcase, Calendar, Info, Zap, DollarSign, Target, Shield, Layout, Clock } from 'lucide-react';

const ProjectForm: React.FC = () => {
  const { projectId, clientId: routeClientId } = useParams<{ projectId?: string; clientId?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();

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
  const [partnerId, setPartnerId] = useState('');
  const [status, setStatus] = useState('Não Iniciado');
  const [description, setDescription] = useState('');
  const [managerClient, setManagerClient] = useState('');
  const [responsibleNicLabsId, setResponsibleNicLabsId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [startDateReal, setStartDateReal] = useState('');
  const [endDateReal, setEndDateReal] = useState('');
  const [risks, setRisks] = useState('');
  const [successFactor, setSuccessFactor] = useState('');
  const [criticalDate, setCriticalDate] = useState('');
  const [docLink, setDocLink] = useState('');
  const [gapsIssues, setGapsIssues] = useState('');
  const [importantConsiderations, setImportantConsiderations] = useState('');
  const [weeklyStatusReport, setWeeklyStatusReport] = useState('');
  const [complexity, setComplexity] = useState<'Alta' | 'Média' | 'Baixa'>('Média');
  const [valorTotalRs, setValorTotalRs] = useState(0);
  const [horasVendidas, setHorasVendidas] = useState(0);
  const [torre, setTorre] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (project) {
      setName(project.name);
      setClientId(project.clientId);
      setPartnerId(project.partnerId || '');
      setStatus(project.status || 'Não Iniciado');
      setDescription(project.description || '');
      setManagerClient(project.managerClient || '');
      setResponsibleNicLabsId(project.responsibleNicLabsId || '');
      setStartDate(project.startDate || '');
      setEstimatedDelivery(project.estimatedDelivery || '');
      setStartDateReal(project.startDateReal || '');
      setEndDateReal(project.endDateReal || '');
      setRisks(project.risks || '');
      setSuccessFactor(project.successFactor || '');
      setCriticalDate(project.criticalDate || '');
      setDocLink(project.docLink || '');
      setGapsIssues(project.gapsIssues || '');
      setImportantConsiderations(project.importantConsiderations || '');
      setWeeklyStatusReport(project.weeklyStatusReport || '');
      setComplexity(project.complexidade || 'Média');
      setValorTotalRs(project.valor_total_rs || 0);
      setHorasVendidas(project.horas_vendidas || 0);
      setTorre(project.torre || '');
    }
  }, [project]);

  // Carregar membros separadamente para garantir sincronia
  useEffect(() => {
    if (isEdit && projectId) {
      const currentMembers = getProjectMembers(projectId);
      setSelectedUsers(currentMembers);
    }
  }, [isEdit, projectId, projectMembers]); // Re-executa se os membros globais mudarem (ex: ao terminar de carregar)

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
      const projectData = {
        name,
        clientId,
        partnerId: partnerId || undefined,
        status,
        description,
        managerClient,
        responsibleNicLabsId: responsibleNicLabsId || undefined,
        startDate: startDate || undefined,
        estimatedDelivery: estimatedDelivery || undefined,
        startDateReal: startDateReal || undefined,
        endDateReal: endDateReal || undefined,
        risks,
        successFactor,
        criticalDate: criticalDate || undefined,
        docLink,
        gaps_issues: gapsIssues,
        important_considerations: importantConsiderations,
        weekly_status_report: weeklyStatusReport,
        complexidade: complexity,
        valor_total_rs: valorTotalRs,
        horas_vendidas: horasVendidas,
        torre: torre,
        active: true
      };

      if (isEdit && projectId) {
        await updateProject(projectId, projectData);
      } else {
        targetProjectId = await createProject(projectData);
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

    } catch (error: any) {
      console.error('Erro ao salvar projeto:', error);
      alert(`Erro ao salvar projeto: ${error.message || 'Erro desconhecido'}. Tente novamente.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--muted)]" />
        </button>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
          {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">

          {/* Left Column */}
          <div className="space-y-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Briefcase className="w-5 h-5" />
                Informações do Projeto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Nome *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Nome do projeto"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Cliente *</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    required
                  >
                    <option value="">Selecione</option>
                    {clients.filter(c => c.active !== false && c.tipo_cliente !== 'parceiro').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Parceiro</label>
                  <select
                    value={partnerId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Nenhum</option>
                    {clients.filter(c => c.active !== false && c.tipo_cliente === 'parceiro').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="Não Iniciado">Não Iniciado</option>
                    <option value="Iniciado">Iniciado</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Conclusão">Conclusão</option>
                    <option value="Em Pausa">Em Pausa</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Torre / Vertical</label>
                  <input
                    type="text"
                    value={torre}
                    onChange={(e) => setTorre(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Ex: ERP, Infra, Dev"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <DollarSign className="w-5 h-5" />
                Dados Financeiros e Complexidade
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Valor Total (R$)</label>
                  <input
                    type="number"
                    value={valorTotalRs}
                    onChange={(e) => setValorTotalRs(Number(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Horas Vendidas</label>
                  <input
                    type="number"
                    value={horasVendidas}
                    onChange={(e) => setHorasVendidas(Number(e.target.value))}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Complexidade Estimada</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Baixa', 'Média', 'Alta'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setComplexity(c as any)}
                        className={`py-3 rounded-xl font-bold border transition-all ${complexity === c ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md translate-y-[-2px]' : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] opacity-60'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Calendar className="w-5 h-5" />
                Cronograma
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Início Previsto</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Entrega Estimada</label>
                  <input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Início Real</label>
                  <input type="date" value={startDateReal} onChange={e => setStartDateReal(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Fim Real</label>
                  <input type="date" value={endDateReal} onChange={e => setEndDateReal(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] shadow-md space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Users className="w-5 h-5" />
                Squad e Responsáveis
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Responsável Nic-Labs</label>
                  <select
                    value={responsibleNicLabsId}
                    onChange={(e) => setResponsibleNicLabsId(e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all font-bold"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Selecione o responsável interno</option>
                    {users.filter(u => u.active !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.cargo || u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-70" style={{ color: 'var(--text)' }}>Colaboradores do Projeto</label>
                  <div className="border rounded-xl p-4 max-h-[340px] overflow-y-auto grid grid-cols-1 gap-2 custom-scrollbar shadow-inner"
                    style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                    {users.filter(u => u.active !== false).sort((a, b) => a.name.localeCompare(b.name)).map(user => (
                      <label key={user.id} className={`flex items-center gap-3 cursor-pointer hover:bg-[var(--surface-hover)] p-2.5 rounded-xl transition-all border ${selectedUsers.includes(user.id) ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-transparent opacity-70'}`}>
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
                          className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--ring)]"
                        />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm border border-white/10"
                            style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)' }}>
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              user.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase tracking-tighter" style={{ color: 'var(--text)' }}>{user.name}</p>
                            <p className="text-[9px] font-bold uppercase opacity-50" style={{ color: 'var(--muted)' }}>{user.cargo || user.role}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-2)] p-6 rounded-2xl border border-[var(--border)] shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                <Shield className="w-5 h-5" />
                Governança e Gaps
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Link Documentação</label>
                  <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)} className="w-full px-4 py-2.5 border rounded-xl font-bold bg-[var(--surface)] border-[var(--border)] text-[var(--text)]" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Impedimentos / Gaps</label>
                  <textarea value={gapsIssues} onChange={e => setGapsIssues(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-xs bg-[var(--surface)] border-[var(--border)] transition-all h-20 resize-none" placeholder="Problemas detectados..." />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest mb-1 opacity-70" style={{ color: 'var(--text)' }}>Status Report Semanal</label>
                  <textarea value={weeklyStatusReport} onChange={e => setWeeklyStatusReport(e.target.value)} className="w-full px-4 py-2 border rounded-xl text-xs bg-[var(--surface)] border-[var(--border)] transition-all h-24 resize-none" placeholder="Texto para o cliente..." />
                </div>
              </div>
            </div>

            {/* Save Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 px-6 py-4 border rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:bg-red-500/10 hover:text-red-500"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-[2] px-6 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl transition-all transform active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary)' }}
                disabled={loading}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Processando...' : isEdit ? 'Atualizar Projeto' : 'Criar Novo Projeto'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ProjectForm;
