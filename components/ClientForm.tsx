// components/ClientForm.tsx - Adaptado para Router
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { ArrowLeft, Save, Upload } from 'lucide-react';

const ClientForm: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getClientById, createClient, updateClient } = useDataController();

  const isEdit = !!clientId;
  const client = clientId ? getClientById(clientId) : null;

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl || '');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Nome do cliente é obrigatório');
      return;
    }

    try {
      setLoading(true);

      if (isEdit && clientId) {
        await updateClient(clientId, { name, logoUrl });
        alert('Cliente atualizado com sucesso!');
      } else {
        await createClient({ name, logoUrl, active: true });
        alert('Cliente criado com sucesso!');
      }

      navigate('/admin/clients');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/clients')}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Nome do Cliente *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent"
              placeholder="Ex: Empresa XYZ"
              required
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL do Logo
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4c1d95] focus:border-transparent"
                placeholder="https://exemplo.com/logo.png"
              />
              <button
                type="button"
                className="px-4 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
            {logoUrl && (
              <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50">
                <p className="text-sm text-slate-600 mb-2">Preview:</p>
                <img
                  src={logoUrl}
                  alt="Preview"
                  className="h-20 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/200x200?text=Logo';
                  }}
                />
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/clients')}
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
              {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ClientForm;
