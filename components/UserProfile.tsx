// components/UserProfile.tsx - Adaptado para Router
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDataController } from '../controllers/useDataController';
import { Save, User as UserIcon, Mail, Briefcase, Trash2, Camera, ArrowLeft } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  // Use controller to get fresh data about current user if needed, or rely on AuthContext
  const { users } = useDataController();

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
      const { error } = await supabase
        .from('dim_colaboradores')
        .update({ avatar_url: url })
        .eq('ID_Colaborador', user.id);

      if (error) throw error;
      setIsEditing(false);
      // O realtime deve atualizar a UI do avatar
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
    <div className="h-full flex flex-col bg-slate-50">
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Meu Perfil</h1>
          <p className="text-slate-500 text-sm">Gerencie suas informações pessoais</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Avatar Section */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#4c1d95]" />
              Foto de Perfil
            </h2>

            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg text-4xl font-bold text-slate-300">
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

              <div className="w-full">
                <label className="block text-sm font-semibold text-slate-700 mb-2">URL da Foto</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setIsEditing(true);
                    }}
                    placeholder="https://exemplo.com/minha-foto.jpg"
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
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

          {/* User Info */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#4c1d95]" />
              Informações Pessoais
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nome Completo</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-medium">
                  {user.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#4c1d95]" /> Email
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                  {user.email}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#4c1d95]" /> Cargo
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">
                  {user.cargo || 'Não informado'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Função</label>
                <div className={`p-3 border rounded-xl font-medium ${user.role === 'admin'
                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                  {user.role === 'admin' ? '👑 Administrador' : '💼 Desenvolvedor'}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserProfile;
