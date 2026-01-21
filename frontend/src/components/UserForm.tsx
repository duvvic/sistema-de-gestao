// components/UserForm.tsx - Adaptado para Router
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { User, Role } from '@/types';
import { ArrowLeft, Save, User as UserIcon, Mail, Briefcase, Shield } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';

const UserForm: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users } = useDataController();

  const isNew = !userId || userId === 'new';
  const initialUser = !isNew ? users.find(u => u.id === userId) : undefined;

  const [loading, setLoading] = useState(false);
  const [isManualCargo, setIsManualCargo] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cargo: '',
    role: 'developer' as Role,
    active: true,
    avatarUrl: ''
  });

  useEffect(() => {
    if (initialUser) {
      setFormData({
        name: initialUser.name,
        email: initialUser.email,
        cargo: initialUser.cargo || '',
        role: initialUser.role,
        active: initialUser.active !== false,
        avatarUrl: initialUser.avatarUrl || ''
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
        papel: formData.role === 'admin' ? 'Administrador' : 'Padrão',
        ativo: formData.active,
        avatar_url: formData.avatarUrl
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
                  <option value="developer">Padrão</option>
                  <option value="admin">Administrativo</option>
                </select>
              </div>
            </div>

            {/* Avatar URL (Opcional, manual por enquanto) */}
            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">Avatar URL (Opcional)</label>
              <input
                type="text"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bgApp)] border border-[var(--border)] rounded-xl focus:ring-2 focus:ring-[var(--brand)] outline-none text-sm font-mono text-[var(--textMuted)]"
                placeholder="https://..."
              />
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
