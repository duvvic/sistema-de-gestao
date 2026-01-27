// components/UserForm.tsx - Adaptado para Router
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { User, Role } from '@/types';
import { ArrowLeft, Save, User as UserIcon, Mail, Briefcase, Shield, Zap } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

const UserForm: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users } = useDataController();

  const isNew = !userId || userId === 'new';
  const initialUser = !isNew ? users.find(u => u.id === userId) : undefined;

  const [loading, setLoading] = useState(false);
  const [isManualCargo, setIsManualCargo] = useState(false);
  const [isManualLevel, setIsManualLevel] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cargo: '',
    nivel: '',
    role: 'developer' as Role,
    active: true,
    avatarUrl: '',
    tower: '',
    hourlyCost: 0,
    dailyAvailableHours: 8,
    monthlyAvailableHours: 160
  });

  useEffect(() => {
    if (initialUser) {
      setFormData({
        name: initialUser.name,
        email: initialUser.email,
        cargo: initialUser.cargo || '',
        nivel: initialUser.nivel || '',
        role: initialUser.role,
        active: initialUser.active !== false,
        avatarUrl: initialUser.avatarUrl || '',
        tower: initialUser.tower || '',
        hourlyCost: initialUser.hourlyCost || 0,
        dailyAvailableHours: initialUser.dailyAvailableHours || 8,
        monthlyAvailableHours: initialUser.monthlyAvailableHours || 160
      });
    }
  }, [initialUser]);

  const existingCargos = useMemo(() => {
    const cargos = users
      .map(u => u.cargo)
      .filter((cargo): cargo is string => !!cargo && cargo.trim() !== '');
    return Array.from(new Set(cargos)).sort();
  }, [users]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      alert('Por favor, preencha nome e email.');
      return;
    }

    setLoading(true);
    try {
      // Preparar payload para dim_colaboradores
      const payload = {
        NomeColaborador: formData.name,
        email: formData.email,
        Cargo: formData.cargo,
        nivel: formData.nivel,
        role: formData.role.charAt(0).toUpperCase() + formData.role.slice(1),
        ativo: formData.active,
        avatar_url: formData.avatarUrl,
        torre: formData.tower,
        custo_hora: formData.hourlyCost,
        horas_disponiveis_dia: formData.dailyAvailableHours,
        horas_disponiveis_mes: formData.monthlyAvailableHours
      };

      if (isNew) {
        const { error } = await supabase.from('dim_colaboradores').insert(payload);
        if (error) throw error;
        alert('Colaborador criado com sucesso!');
      } else {
        const { error } = await supabase
          .from('dim_colaboradores')
          .update(payload)
          .eq('ID_Colaborador', userId);
        if (error) throw error;
        alert('Colaborador atualizado com sucesso!');
      }
      navigate(-1);
    } catch (error: any) {
      console.error(error);
      alert('Erro ao salvar colaborador: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isNew && !initialUser) {
    return <div className="p-8">Colaborador não encontrado.</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bgApp)]">
      {/* Header */}
      <div className="px-8 py-6 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors text-[var(--textMuted)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-[var(--textTitle)] flex items-center gap-2">
              {isNew ? 'Novo Colaborador' : 'Editar Colaborador'}
            </h2>
            <p className="text-[var(--textMuted)] text-sm">
              {isNew ? 'Adicionar membro à equipe' : `Editando ${formData.name}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-[var(--brand)] text-white rounded-lg font-bold shadow hover:bg-[var(--brandHover)] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSave} className="bg-[var(--surface)] rounded-2xl shadow-sm border border-[var(--border)] p-8 space-y-6">

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-[var(--bgApp)] flex items-center justify-center border-4 border-[var(--surface)] overflow-hidden text-3xl font-bold text-[var(--textMuted)]">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  formData.name ? formData.name.substring(0, 2).toUpperCase() : <UserIcon className="w-10 h-10" />
                )}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[var(--brand)]" />
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-[var(--text)]"
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[var(--brand)]" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-[var(--text)]"
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cargo */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[var(--brand)]" />
                    Cargo
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManualCargo(!isManualCargo)}
                    className="text-xs font-bold text-[var(--brand)] hover:opacity-80 transition-opacity"
                  >
                    {isManualCargo ? 'Selecionar da lista' : '+ Criar novo cargo'}
                  </button>
                </div>

                {isManualCargo ? (
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-[var(--text)]"
                    placeholder="Digite o novo cargo..."
                    autoFocus
                  />
                ) : (
                  <select
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-[var(--text)]"
                  >
                    <option value="" disabled hidden>Selecione um cargo...</option>
                    {existingCargos.map(cargo => (
                      <option key={cargo} value={cargo}>{cargo}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Nível (Condicional) */}
              {(() => {
                const cargoLower = formData.cargo.toLowerCase();
                let options: string[] = [];
                let showLevelField = false;
                let isInfra = false;

                if (cargoLower.includes('desenvolvedor') || cargoLower.includes('developer')) {
                  options = ['Estagiário', 'Trainee', 'Júnior', 'Pleno', 'Sênior', 'Especialista'];
                  showLevelField = true;
                } else if (cargoLower.includes('administrador') || cargoLower.includes('admin')) {
                  options = ['RH', 'Estagiário', 'Jovem Aprendiz', 'Assistente', 'Analista'];
                  showLevelField = true;
                } else if (cargoLower.includes('infra') || cargoLower.includes('ti')) {
                  // Lógica Infra: checkbox Estágio
                  isInfra = true;
                  showLevelField = true;
                }

                if (!showLevelField) return null;

                if (isInfra) {
                  return (
                    <div>
                      <label className="block text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--brand)]" />
                        Nível
                      </label>
                      <div className="flex items-center gap-3 p-3 border rounded-xl bg-[var(--bgApp)] border-[var(--border)]">
                        <input
                          type="checkbox"
                          id="infraIntern"
                          checked={formData.nivel === 'Estagiário'}
                          onChange={(e) => setFormData({ ...formData, nivel: e.target.checked ? 'Estagiário' : '' })}
                          className="w-5 h-5 text-[var(--brand)] rounded focus:ring-[var(--brand)]"
                        />
                        <label htmlFor="infraIntern" className="text-sm text-[var(--text)]">Estágio</label>
                      </div>
                    </div>
                  );
                }

                // Dropdown padrão para outros cargos permitidos

                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-[var(--text)] flex items-center gap-2">
                        <Shield className="w-4 h-4 text-[var(--brand)]" />
                        Nível
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsManualLevel(!isManualLevel)}
                        className="text-xs font-bold text-[var(--brand)] hover:opacity-80 transition-opacity"
                      >
                        {isManualLevel ? 'Selecionar da lista' : '+ Criar novo nível'}
                      </button>
                    </div>

                    {isManualLevel ? (
                      <input
                        type="text"
                        value={formData.nivel}
                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none transition-all text-[var(--text)]"
                        placeholder="Digite o novo nível..."
                        autoFocus
                      />
                    ) : (
                      <select
                        value={formData.nivel}
                        onChange={(e) => setFormData({ ...formData, nivel: e.target.value })}
                        className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none text-[var(--text)]"
                      >
                        <option value="" disabled hidden>Selecione...</option>
                        {options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })()}

              {/* Role (Permissão) */}
              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--brand)]" />
                  Permissão
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'developer' })}
                  className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none text-[var(--text)]"
                >
                  <option value="developer">Desenvolvedor (Padrão)</option>
                  <option value="consultor">Consultor</option>
                  <option value="tech_lead">Tech Lead</option>
                  <option value="gestor">Gestor / Gerente</option>
                  <option value="pmo">PMO</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="diretoria">Diretoria</option>
                  <option value="admin">Administrador Sistema</option>
                </select>
              </div>
            </div>

            {/* Especialização & Torre */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Torre de Atuação / Especialidade
              </label>
              <select
                value={formData.tower}
                onChange={(e) => setFormData({ ...formData, tower: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none text-[var(--text)]"
              >
                <option value="">Selecione a torre...</option>
                <option value="ABAP">ABAP</option>
                <option value="Fiori">Fiori / UI5</option>
                <option value="GP">Gerência de Projetos (GP)</option>
                <option value="Funcional SD">Funcional SD</option>
                <option value="Funcional MM">Funcional MM</option>
                <option value="Funcional FI/CO">Funcional FI/CO</option>
                <option value="Basis">Basis / Infra</option>
                <option value="FullStack">FullStack / Web</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            {/* Disponibilidade e Custos (Acesso Restrito) */}
            <div className="p-6 rounded-2xl border space-y-6 transition-all shadow-inner" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--muted)' }}>
                <Shield className="w-3 h-3 text-[var(--primary)]" /> Dados Executivos (Restrito)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Custo Hora (IDL/Nic-Labs)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourlyCost}
                      onChange={(e) => setFormData({ ...formData, hourlyCost: Number(e.target.value) })}
                      className="w-full pl-10 pr-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-600"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase font-mono">Avatar URL (Opcional)</label>
                  <input
                    type="text"
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none text-xs font-mono text-[var(--textMuted)]"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Disponibilidade Diária (Horas)</label>
                  <input
                    type="number"
                    value={formData.dailyAvailableHours}
                    onChange={(e) => setFormData({ ...formData, dailyAvailableHours: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none font-black text-slate-700 dark:text-slate-200"
                    min="0"
                    max="24"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Disponibilidade Mensal (Horas)</label>
                  <input
                    type="number"
                    value={formData.monthlyAvailableHours}
                    onChange={(e) => setFormData({ ...formData, monthlyAvailableHours: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none font-black text-slate-700 dark:text-slate-200"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
              <input
                type="checkbox"
                id="activeUser"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-5 h-5 text-[var(--brand)] rounded focus:ring-[var(--brand)]"
              />
              <label htmlFor="activeUser" className="text-sm font-medium text-[var(--text)]">Colaborador Ativo</label>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
