// components/ProjectForm.tsx - Adaptado para Router e Project Members
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Users, Briefcase, Calendar, Info, Zap, DollarSign, Target, Shield, Layout, Clock, ChevronDown, LayoutGrid, AlertCircle, FileSpreadsheet, ExternalLink, CheckSquare, User } from 'lucide-react';
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

  // Cálculo automático do prazo
  useEffect(() => {
    if (startDate && horasVendidas > 0 && selectedUsers.length > 0) {
      const teamUsers = users.filter(u => selectedUsers.includes(u.id));
      const calculatedDeadline = CapacityUtils.calculateProjectDeadline(startDate, horasVendidas, teamUsers);
      if (calculatedDeadline) {
        setEstimatedDelivery(calculatedDeadline);
      }
    }
  }, [startDate, horasVendidas, selectedUsers, users]);

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
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 hover:bg-[var(--surface-hover)] rounded-xl transition-all text-[var(--muted)] hover:text-[var(--text)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
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
                Financeiro e Complexidade
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Valor do Projeto (R$)</label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold opacity-30 tracking-widest text-xs">BRL</span>
                      <input
                        type="number"
                        value={valorTotalRs}
                        onChange={(e) => setValorTotalRs(Number(e.target.value))}
                        className="w-full pl-14 pr-4 py-4 text-xl font-bold border rounded-2xl focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all tabular-nums bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: 'var(--text)' }}>Horas Vendidas (Budget)</label>
                    <div className="relative group">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
                      <input
                        type="number"
                        value={horasVendidas}
                        onChange={(e) => setHorasVendidas(Number(e.target.value))}
                        className="w-full pl-12 pr-4 py-3 font-bold border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none transition-all tabular-nums bg-transparent"
                        style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                        placeholder="0h"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg)]/50">
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-4 opacity-60" style={{ color: 'var(--text)' }}>Nível de Complexidade</label>
                  <div className="flex flex-col gap-3">
                    {['Baixa', 'Média', 'Alta'].map((c) => {
                      const isSelected = complexity === c;
                      let activeColor = 'var(--primary)';
                      if (c === 'Baixa') activeColor = 'var(--success)';
                      if (c === 'Média') activeColor = 'var(--warning)';
                      if (c === 'Alta') activeColor = 'var(--danger)';

                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setComplexity(c as any)}
                          className={`flex items-center justify-between px-5 py-3 rounded-xl border transition-all ${isSelected ? 'shadow-md border-transparent transform scale-[1.02]' : 'border-transparent hover:bg-[var(--surface-hover)]'}`}
                          style={{
                            backgroundColor: isSelected ? activeColor : 'transparent',
                            color: isSelected ? '#fff' : 'var(--muted)'
                          }}
                        >
                          <span className="font-bold text-sm">{c}</span>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </button>
                      );
                    })}
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
                    <input type="date" value={estimatedDelivery} readOnly className="w-full px-4 py-2 border rounded-xl font-bold bg-[var(--surface-2)] border-[var(--border)] opacity-60 cursor-not-allowed" />
                    <div className="flex items-center gap-1 mt-1.5 text-[9px] text-[var(--primary)] font-bold opacity-80">
                      <Zap className="w-3 h-3" />
                      Calculada automaticamente (Budget/Equipe)
                    </div>
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
                              if (e.target.checked) setSelectedUsers(prev => [...prev, user.id]);
                              else setSelectedUsers(prev => prev.filter(id => id !== user.id));
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
                          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-0.5">
                            <span className="text-[9px] uppercase tracking-wider opacity-50 truncate max-w-[100px]">{user.cargo || 'Consultor'}</span>

                            {/* Status Dots */}
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-[var(--surface-2)]">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color }} />
                              <span className={`text-[8px] font-black ${availability.available < 20 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {availability.available}h
                              </span>
                            </div>
                          </div>
                        </div>
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

        </form>
      </div>
    </div>
  );
};

export default ProjectForm;
