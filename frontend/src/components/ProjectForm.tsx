// components/ProjectForm.tsx - Adaptado para Router e Project Members
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { Save, Users, Briefcase, Calendar, Info, Zap, DollarSign, Target, Shield, Layout, Clock, ChevronDown, LayoutGrid, AlertCircle, FileSpreadsheet, ExternalLink, CheckSquare, User } from 'lucide-react';
import BackButton from './shared/BackButton';
import { getUserStatus } from '@/utils/userStatus';
import * as CapacityUtils from '@/utils/capacity';

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
    tasks,
    projectMembers, // Para dependência
    createProject,
    updateProject,
    getProjectMembers,
    addProjectMember,
    removeProjectMember,
    timesheetEntries // Import timesheetEntries to pass to availability function
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

  const [valorTotalRs, setValorTotalRs] = useState(0);
  const [horasVendidas, setHorasVendidas] = useState(0);
  const [torre, setTorre] = useState('');

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [memberAllocations, setMemberAllocations] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);

  // balanceAllocations removido conforme nova regra (cálculos nas tarefas)

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

      setValorTotalRs(project.valor_total_rs || 0);
      setHorasVendidas(project.horas_vendidas || 0);
      setTorre(project.torre || '');
    }
  }, [project]);

  // Cálculo automático do prazo removido conforme nova regra de negócio (horas nas tarefas)

  // Carregar membros separadamente para garantir sincronia
  useEffect(() => {
    if (isEdit && projectId && projectMembers.length > 0) {
      const currentProjectMembers = projectMembers.filter(pm => String(pm.id_projeto) === projectId);
      const selectedIds = currentProjectMembers.map(m => String(m.id_colaborador));
      setSelectedUsers(selectedIds);

      const initialAllocations: Record<string, number> = {};
      let totalSum = 0;
      currentProjectMembers.forEach(m => {
        const perc = Number(m.allocation_percentage) || 0;
        initialAllocations[String(m.id_colaborador)] = perc;
        totalSum += perc;
      });

      // Se a soma não for 100 e houver membros, re-balanceia automaticamente
      if (totalSum !== 100 && selectedIds.length > 0) {
        // Se houver membros, inicializa com 100% (flag de presença)
        const all100: Record<string, number> = {};
        selectedIds.forEach(id => all100[id] = 100);
        setMemberAllocations(all100);
      } else {
        setMemberAllocations(initialAllocations);
      }
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

        // Adicionar/Atualizar selecionados - Agora sempre 100% (apenas um flag de "está no projeto")
        for (const userId of selectedUsers) {
          await addProjectMember(targetProjectId, userId, 100);
        }

        // Remover excluídos (apenas em edição)
        if (isEdit) {
          const toRemove = initialMembers.filter(uid => !selectedUsers.includes(uid));
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

  const [memberSearch, setMemberSearch] = useState('');

  const filteredUsers = users
    .filter(u => u.active !== false && u.torre !== 'N/A')
    .filter(u => u.name.toLowerCase().includes(memberSearch.toLowerCase()) || u.role.toLowerCase().includes(memberSearch.toLowerCase()))
    .sort((a, b) => {
      // Selected first
      const aSelected = selectedUsers.includes(a.id);
      const bSelected = selectedUsers.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Header com Transparência e Blur */}
      <div className="px-8 py-6 border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text)' }}>
              <Briefcase className="w-6 h-6 text-[var(--primary)]" />
              {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
            </h1>
            <p className="text-xs font-medium opacity-60 mt-1" style={{ color: 'var(--text)' }}>
              {isEdit ? 'Atualize as informações e escopo do projeto' : 'Defina o escopo, orçamento e equipe do novo projeto'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl font-bold text-xs transition-all hover:bg-[var(--surface-hover)]"
            style={{ color: 'var(--muted)' }}
            disabled={loading}
          >
            CANCELAR
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/20 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
            style={{ backgroundColor: 'var(--primary)' }}
            disabled={loading}
          >
            <Save className="w-4 h-4" />
            {loading ? 'SALVANDO...' : 'SALVAR PROJETO'}
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Left Column (Main Info) - Spans 7 cols */}
          <div className="xl:col-span-7 space-y-8">

            {/* Project Identity Card */}
            <div className="bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Briefcase className="w-32 h-32 transform rotate-12" />
              </div>

              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                Informações Gerais
              </h3>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Nome do Projeto *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-5 py-4 text-lg font-bold border rounded-2xl focus:ring-4 focus:ring-[var(--primary)]/20 outline-none transition-all placeholder:font-normal placeholder:opacity-30"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Ex: Migração SAP S/4HANA"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Cliente *</label>
                    <div className="relative">
                      <select
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl appearance-none font-semibold focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all disabled:opacity-50 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        required
                        disabled={isEdit}
                      >
                        <option value="">Selecione um cliente...</option>
                        {clients.filter(c => c.active !== false && c.tipo_cliente !== 'parceiro').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Parceiro (Opcional)</label>
                    <div className="relative">
                      <select
                        value={partnerId}
                        onChange={(e) => setPartnerId(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl appearance-none font-semibold focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all disabled:opacity-50 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        disabled={isEdit}
                      >
                        <option value="">Sem parceiro</option>
                        {clients.filter(c => c.active !== false && c.tipo_cliente === 'parceiro').map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Status do Projeto</label>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 border rounded-xl appearance-none font-semibold focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all cursor-pointer"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                      >
                        {['Não Iniciado', 'Iniciado', 'Pendente', 'Concluído', 'Em Pausa', 'Cancelado'].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Torre / Vertical</label>
                    <div className="relative">
                      <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input
                        type="text"
                        value={torre}
                        onChange={(e) => setTorre(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 border rounded-xl font-semibold focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all placeholder:font-normal placeholder:opacity-30"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="Ex: Infraestrutura"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Descrição / Escopo</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-5 py-4 border rounded-2xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all placeholder:font-normal placeholder:opacity-30 resize-none min-h-[100px]"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    placeholder="Descreva o objetivo e escopo principal do projeto..."
                  />
                </div>
              </div>
            </div>

            {/* Financial & Complexity Card */}
            <div className="bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <DollarSign className="w-4 h-4" />
                </div>
                Financeiro
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Valor do Projeto (R$)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-30 tracking-widest text-xs">BRL</span>
                      <input
                        type="number"
                        value={valorTotalRs || ''}
                        onChange={(e) => setValorTotalRs(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full pl-14 pr-4 py-4 text-xl font-bold border rounded-2xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all tabular-nums bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Horas Vendidas (Budget)</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input
                        type="number"
                        value={horasVendidas || ''}
                        onChange={(e) => setHorasVendidas(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full pl-11 pr-4 py-4 text-xl font-bold border rounded-2xl focus:ring-2 focus:ring-blue-500/30 outline-none transition-all tabular-nums bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cronograma Card */}
            <div className="bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                  <Calendar className="w-4 h-4" />
                </div>
                Cronograma de Execução
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Decorative line connecting dates */}
                <div className="hidden md:block absolute left-1/2 top-4 bottom-4 w-px bg-[var(--border)] -translate-x-1/2 border-dashed border-l" />

                <div className="space-y-4">
                  <span className="text-xs font-black text-blue-500 uppercase tracking-widest block mb-4">Planejado</span>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">Início Previsto</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-medium bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1 opacity-50">Entrega Estimada</label>
                    <input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-medium bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                  </div>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-black text-purple-500 uppercase tracking-widest block mb-4 md:text-right">Realizado</span>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1 opacity-50 md:text-right">Início Real</label>
                    <input type="date" value={startDateReal} onChange={e => setStartDateReal(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-medium bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase mb-1 opacity-50 md:text-right">Fim Real</label>
                    <input type="date" value={endDateReal} onChange={e => setEndDateReal(e.target.value)} className="w-full px-4 py-2 border rounded-xl font-medium bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Governance Card */}
            <div className="bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-sm">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                  <Shield className="w-4 h-4" />
                </div>
                Governança e Report
              </h3>

              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Link Documentação</label>
                    <div className="relative">
                      <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)} className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" placeholder="https://notion.so/projeto..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Link Status Report</label>
                    <div className="relative">
                      <FileSpreadsheet className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input type="url" value={weeklyStatusReport} onChange={e => setWeeklyStatusReport(e.target.value)} className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)]" placeholder="URL do relatório..." />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Principais Riscos / Gaps</label>
                  <div className="relative">
                    <AlertCircle className="absolute left-4 top-4 w-4 h-4 text-red-400 opacity-50" />
                    <textarea value={gapsIssues} onChange={e => setGapsIssues(e.target.value)} className="w-full pl-11 pr-4 py-3 border rounded-xl text-sm bg-[var(--bg)] border-[var(--border)] text-[var(--text)] resize-none h-24" placeholder="Liste os principais riscos ou impedimentos..." />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column (Squad) - Spans 5 cols */}
          <div className="xl:col-span-5 space-y-8">

            {/* Squad Card */}
            <div className="bg-[var(--surface)] p-8 rounded-3xl border border-[var(--border)] shadow-xl shadow-black/5 sticky top-28 max-h-[calc(100vh-140px)] flex flex-col">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Users className="w-4 h-4" />
                </div>
                Squad e Responsáveis
              </h3>

              <div className="mb-6">
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-60" style={{ color: 'var(--text)' }}>Gestor Responsável (Interno)</label>
                <div className="relative">
                  <select
                    value={responsibleNicLabsId}
                    onChange={(e) => setResponsibleNicLabsId(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 border rounded-xl appearance-none font-bold text-sm focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  >
                    <option value="">Selecione o responsável</option>
                    {users.filter(u => u.active !== false && u.torre !== 'N/A').map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-50" />
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-[10px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text)' }}>Seleção de Time</label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--secondary)]/10 text-[var(--secondary)]">
                    {selectedUsers.length} selecionados
                  </span>
                </div>

                {/* Search Bar for Members */}
                <div className="relative mb-3">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                  <input
                    type="text"
                    placeholder="Buscar colaborador..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium border rounded-xl bg-[var(--bg)] border-[var(--border)] focus:ring-1 focus:ring-[var(--primary)] outline-none"
                  />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                  {filteredUsers.map(user => {
                    const isSelected = selectedUsers.includes(user.id);
                    const status = getUserStatus(user, tasks, projects, clients);
                    const availability = CapacityUtils.getUserMonthlyAvailability(user, new Date().toISOString().slice(0, 7), projects, projectMembers, timesheetEntries);
                    const occupationPercent = Math.round((availability.allocated / availability.capacity) * 100);

                    return (
                      <label
                        key={user.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all group duration-200 ${isSelected ? 'border-[var(--primary)] bg-[var(--primary)]/5' : 'border-transparent hover:bg-[var(--surface-hover)] bg-[var(--bg)]'}`}
                      >
                        <div className="relative shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const next = [...selectedUsers, user.id];
                                setSelectedUsers(next);
                              } else {
                                const next = selectedUsers.filter(id => id !== user.id);
                                setSelectedUsers(next);
                              }
                            }}
                            className="peer sr-only"
                          />
                          <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${isSelected ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg shadow-purple-500/20' : 'border-transparent group-hover:border-[var(--border)] grayscale hover:grayscale-0'}`}>
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[var(--surface-2)] font-bold text-xs">
                                {user.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          {/* Checkmark indicator */}
                          <div className={`absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary)] rounded-full text-white flex items-center justify-center transform scale-0 transition-transform ${isSelected ? 'scale-100' : ''}`}>
                            <CheckSquare className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate transition-colors ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{user.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] uppercase tracking-wider opacity-40 truncate max-w-[80px]" style={{ color: 'var(--text)' }}>{user.cargo || 'Consultor'}</span>
                            {(() => {
                              const status = getUserStatus(user, tasks, projects, clients);
                              return (
                                <div className="flex items-center gap-1 shrink-0">
                                  <div className="w-1 h-1 rounded-full opacity-30" style={{ backgroundColor: 'var(--text)' }} />
                                  <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: status.color }}>{status.label}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {(() => {
                          const availability = CapacityUtils.getUserMonthlyAvailability(user, new Date().toISOString().slice(0, 7), projects, projectMembers, timesheetEntries, tasks);
                          const isLow = availability.available < 20;
                          const occupationPercent = Math.round((availability.allocated / availability.capacity) * 100);

                          return (
                            <>
                              {/* Availability Badge */}
                              <div className={`px-2 py-1 rounded-lg border flex flex-col items-center min-w-[38px] shrink-0 transition-all ${isLow ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                                <span className="text-[6px] font-black opacity-40 uppercase tracking-tighter" style={{ color: isLow ? 'var(--danger)' : 'var(--success)' }}>Disp</span>
                                <span className={`text-[9px] font-black tabular-nums ${isLow ? 'text-red-500' : 'text-emerald-500'}`}>
                                  {availability.available}h
                                </span>
                              </div>

                              {isSelected && (
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                  <div className="flex items-center gap-1.5 glass-purple px-4 py-2 rounded-xl">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">No Projeto</span>
                                  </div>
                                </div>
                              )}

                            </>
                          );
                        })()}
                      </label>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-8 opacity-40">
                      <Users className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">Nenhum colaborador encontrado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </form >
      </div >
    </div >
  );
};

export default ProjectForm;
