// components/UserForm.tsx - Adaptado para Router
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { User } from '../types';
import { ArrowLeft, Save, User as UserIcon, Mail, Briefcase, Shield } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const UserForm: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users } = useDataController();

  const isNew = !userId || userId === 'new';
  const initialUser = !isNew ? users.find(u => u.id === userId) : undefined;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cargo: '',
    role: 'developer' as 'admin' | 'developer',
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
        Nome: formData.name,
        Email: formData.email,
        Cargo: formData.cargo,
        Role: formData.role,
        ativo: formData.active,
        avatar_url: formData.avatarUrl // Assumindo coluna existente ou similar
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
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-8 py-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {isNew ? 'Novo Colaborador' : 'Editar Colaborador'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isNew ? 'Adicionar membro à equipe' : `Editando ${formData.name}`}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-[#4c1d95] text-white rounded-lg font-bold shadow hover:bg-[#3b1675] transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6">

            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border-4 border-slate-50 overflow-hidden text-3xl font-bold text-slate-300">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  formData.name ? formData.name.substring(0, 2).toUpperCase() : <UserIcon className="w-10 h-10" />
                )}
              </div>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-[#4c1d95]" />
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all"
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#4c1d95]" />
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all"
                placeholder="email@exemplo.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cargo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#4c1d95]" />
                  Cargo
                </label>
                <input
                  type="text"
                  list="cargo-options"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all"
                  placeholder="Ex: Full Stack Dev"
                />
                <datalist id="cargo-options">
                  {existingCargos.map(cargo => (
                    <option key={cargo} value={cargo} />
                  ))}
                </datalist>
              </div>

              {/* Role (Permissão) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#4c1d95]" />
                  Permissão
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'developer' })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                >
                  <option value="developer">Desenvolvedor (Padrão)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {/* Avatar URL (Opcional, manual por enquanto) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Avatar URL (Opcional)</label>
              <input
                type="text"
                value={formData.avatarUrl}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm font-mono text-slate-500"
                placeholder="https://..."
              />
            </div>

            {/* Active Checkbox */}
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <input
                type="checkbox"
                id="activeUser"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="w-5 h-5 text-[#4c1d95] rounded focus:ring-[#4c1d95]"
              />
              <label htmlFor="activeUser" className="text-sm font-medium text-slate-700">Colaborador Ativo</label>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};

export default UserForm;
