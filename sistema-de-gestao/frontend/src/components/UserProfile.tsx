// components/UserProfile.tsx - Adaptado para Router
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Save, User as UserIcon, Mail, Briefcase, Trash2, Camera, ArrowLeft, Zap, Calendar } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { getRoleDisplayName } from '@/utils/normalizers';
import AbsenceManager from './AbsenceManager';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateUser: updateAuthUser, isAdmin } = useAuth();
  // Use controller to get fresh data about current user if needed, or rely on AuthContext
  const { users, updateUser } = useDataController();

  const user = users.find(u => u.id === currentUser?.id) || currentUser;

  const [avatarUrl, setAvatarUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  const saveAvatar = async (url: string | null) => {
    if (!user) return;
    setLoading(true);
    try {
      await updateUser(user.id, { avatarUrl: url || undefined });

      // Atualizar o estado global imediatamente para refletir no MainLayout e outros lugares
      const updatedUser = { ...user, avatarUrl: url || undefined };
      updateAuthUser(updatedUser);

      setIsEditing(false);
      alert("Avatar atualizado com sucesso!");
    } catch (e: any) {
      alert("Erro ao atualizar avatar: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    saveAvatar(avatarUrl);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    saveAvatar(null);
  };

  if (!user) return <div className="p-8">Usuário não encontrado</div>;

  return (
    <div className="h-full flex flex-col" style={{ backgroundColor: 'var(--bgApp)' }}>
      <div className="px-8 py-6 border-b flex items-center gap-4 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full transition-colors"
          style={{ color: 'var(--textMuted)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surfaceHover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--textTitle)' }}>Meu Perfil</h1>
          <p className="text-sm" style={{ color: 'var(--textMuted)' }}>Gerencie suas informações pessoais</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Avatar Section */}
          <div className="p-8 rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
              <Camera className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              Foto de Perfil
            </h2>

            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg text-4xl font-bold"
                  style={{ backgroundColor: 'var(--surfaceHover)', color: 'var(--textMuted)' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    user.name ? user.name.substring(0, 2).toUpperCase() : 'U'
                  )}
                </div>

                {avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-all"
                    title="Remover foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="w-full space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>URL da Foto</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => {
                        setAvatarUrl(e.target.value);
                        setIsEditing(true);
                      }}
                      placeholder="https://exemplo.com/minha-foto.jpg"
                      className="flex-1 px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                      style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}
                    />
                    {isEditing && (
                      <button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-4 py-2 rounded-xl transition-all flex items-center gap-2 font-medium shadow-md disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {loading ? '...' : 'Salvar'}
                      </button>
                    )}
                  </div>
                </div>


              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="p-8 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
              <UserIcon className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              Informações Pessoais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Nome Completo</label>
                <div className="p-3 border rounded-xl font-medium" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {user.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Mail className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Email
                </label>
                <div className="p-3 border rounded-xl" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Briefcase className="w-4 h-4" style={{ color: 'var(--brand)' }} /> Cargo
                </label>
                <div className="p-3 border rounded-xl" style={{ backgroundColor: 'var(--bgApp)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                  {user.cargo || 'Não informado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Função</label>
                <div className="p-3 border rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-sm"
                  style={{
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    borderColor: 'rgba(76, 29, 149, 0.2)'
                  }}>
                  {getRoleDisplayName(user.role)}
                </div>
              </div>
            </div>
          </div>

          {/* Absence Management Section */}
          <div className="p-8 rounded-2xl border shadow-sm space-y-6" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
              <Calendar className="w-5 h-5" style={{ color: 'var(--brand)' }} />
              Solicitar Férias / Ausência
            </h2>
            <p className="text-sm" style={{ color: 'var(--textMuted)' }}>
              Registre e acompanhe seus períodos de férias, afastamentos ou folgas. Suas solicitações entrarão automaticamente no fluxo de aprovação do RH.
            </p>

            <div className="pt-4 border-t border-[var(--border)]">
              <AbsenceManager />
            </div>
          </div>

          {/* Infra / Sincronização Section (Admin Only & Disabled) */}
          {isAdmin && (
            <div className="p-8 rounded-2xl border shadow-sm space-y-4 opacity-50 grayscale pointer-events-none select-none"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--textTitle)' }}>
                  <Zap className="w-5 h-5 text-amber-500" />
                  Configuração de Infra: Sincronização
                </h2>
                <span className="px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 border border-slate-300 dark:border-slate-700">
                  Bloqueado
                </span>
              </div>
              <p className="text-sm italic" style={{ color: 'var(--textMuted)' }}>
                Esta função foi realocada temporariamente e encontra-se desativada por questões de infraestrutura.
                Será reativada em um novo espaço dedicado em breve.
              </p>
              <div className="mt-4 p-4 border border-dashed rounded-xl flex items-center justify-center gap-2" style={{ borderColor: 'var(--border)' }}>
                <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acesso Restrito - Infra</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
