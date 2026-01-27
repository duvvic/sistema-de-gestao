// components/ClientForm.tsx - Adaptado para Router
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { ArrowLeft, Save, Upload, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const ClientForm: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { getClientById, createClient, updateClient, deleteClient, clients } = useDataController();

  const isEdit = !!clientId;
  const client = clientId ? getClientById(clientId) : null;

  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo_cliente, setTipoCliente] = useState<'parceiro' | 'cliente_final'>('cliente_final');
  const [partner_id, setPartnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryTipo = urlParams.get('tipo') as 'parceiro' | 'cliente_final';
    const queryPartnerId = urlParams.get('partnerId');

    if (queryTipo) setTipoCliente(queryTipo);
    if (queryPartnerId) setPartnerId(queryPartnerId);
  }, []);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setLogoUrl(client.logoUrl || '');
      setCnpj(client.cnpj || '');
      setTelefone(client.telefone || '');
      setTipoCliente(client.tipo_cliente || 'cliente_final');
      setPartnerId(client.partner_id || '');
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

      const payload = {
        name,
        logoUrl,
        cnpj,
        telefone,
        tipo_cliente,
        partner_id: tipo_cliente === 'cliente_final' ? partner_id : undefined
      };

      if (isEdit && clientId) {
        await updateClient(clientId, payload);
        alert('Cliente atualizado com sucesso!');
      } else {
        // Coleta dados extras do formulário nativo
        const form = e.currentTarget as HTMLFormElement;
        const choice = (form.elements.namedItem('contractChoice') as HTMLSelectElement)?.value;
        const months = (form.elements.namedItem('contractMonths') as HTMLInputElement)?.value;

        await createClient({
          ...payload,
          active: true,
          // @ts-ignore
          contractChoice: choice,
          contractMonths: months
        });
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

  const handleDelete = async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      await deleteClient(clientId);
      alert('Cliente excluído com sucesso!');
      navigate('/admin/clients');
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      alert('Erro ao excluir cliente. Verifique se existem projetos vinculados.');
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-[var(--surfaceHover)] rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--textMuted)]" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--textTitle)]">
          {isEdit ? 'Editar Cliente' : 'Novo Cliente'}
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {/* Dados Básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Nome do Cliente *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text)]"
                placeholder="Ex: Empresa XYZ"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text)]"
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Telefone
              </label>
              <input
                type="text"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text)]"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[var(--text)] mb-2">
                Tipo de Cliente
              </label>
              <div className="flex gap-4">
                <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${tipo_cliente === 'cliente_final' ? 'border-[var(--brand)] bg-[var(--brandMuted)] text-[var(--brandHover)]' : 'border-[var(--border)] hover:bg-[var(--surfaceHover)]'}`}>
                  <input
                    type="radio"
                    name="tipo"
                    value="cliente_final"
                    checked={tipo_cliente === 'cliente_final'}
                    onChange={() => setTipoCliente('cliente_final')}
                    className="sr-only"
                  />
                  <span className="font-semibold">Cliente Final</span>
                </label>
                <label className={`flex-1 flex items-center justify-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${tipo_cliente === 'parceiro' ? 'border-[var(--brand)] bg-[var(--brandMuted)] text-[var(--brandHover)]' : 'border-[var(--border)] hover:bg-[var(--surfaceHover)]'}`}>
                  <input
                    type="radio"
                    name="tipo"
                    value="parceiro"
                    checked={tipo_cliente === 'parceiro'}
                    onChange={() => setTipoCliente('parceiro')}
                    className="sr-only"
                  />
                  <span className="font-semibold">Parceiro Nic-Labs</span>
                </label>
              </div>
            </div>

            {tipo_cliente === 'cliente_final' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                  Vincular a um Parceiro (Opcional)
                </label>
                <select
                  value={partner_id}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)]"
                >
                  <option value="">Nenhum Parceiro (Direto)</option>
                  {(clients || []).filter(c => c.tipo_cliente === 'parceiro' && c.id !== clientId).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-sm font-medium text-[var(--text)] mb-2">
              URL do Logo
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="flex-1 px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent text-[var(--text)]"
                placeholder="https://exemplo.com/logo.png"
              />
              <button
                type="button"
                className="px-4 py-3 border border-[var(--border)] rounded-lg hover:bg-[var(--surfaceHover)] flex items-center gap-2 text-[var(--text)]"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
            {logoUrl && (
              <div className="mt-4 p-4 border border-[var(--border)] rounded-lg bg-[var(--bgApp)]">
                <p className="text-sm text-[var(--textMuted)] mb-2">Preview:</p>
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

          {!isEdit && (
            <div className="bg-[var(--bgApp)] p-4 rounded-xl border border-[var(--border)] space-y-4">
              <h3 className="font-semibold text-[var(--textTitle)]">Contrato de Serviço</h3>

              <div>
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Possui tempo de contrato determinado?</label>
                <select
                  name="contractChoice"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)]"
                  defaultValue="nao"
                  id="contractChoiceSelect"
                  onChange={(e) => {
                    const monthsInput = document.getElementById('monthsInput');
                    if (monthsInput) {
                      if (e.target.value === 'sim') {
                        monthsInput.classList.remove('hidden');
                      } else {
                        monthsInput.classList.add('hidden');
                      }
                    }
                  }}
                >
                  <option value="nao">Não (Indeterminado)</option>
                  <option value="sim">Sim (Determinado)</option>
                </select>
              </div>

              <div id="monthsInput" className="hidden">
                <label className="block text-sm font-medium text-[var(--text)] mb-2">Duração (Meses)</label>
                <input
                  type="number"
                  name="contractMonths"
                  min="1"
                  defaultValue="12"
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--brand)] text-[var(--text)]"
                />
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-[var(--border)] text-[var(--text)] rounded-lg hover:bg-[var(--surfaceHover)]"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-[var(--brand)] text-white rounded-lg hover:bg-[var(--brandHover)] flex items-center gap-2 disabled:opacity-50"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
                {loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Cliente'}
              </button>
            </div>

            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors"
                disabled={loading}
              >
                <Trash2 className="w-4 h-4" />
                Excluir Cliente
              </button>
            )}
          </div>
        </div>
      </form>

      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Cliente"
        message={`Tem certeza que deseja excluir o cliente "${name}"? Esta ação não poderá ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
        confirmText={loading ? 'Excluindo...' : 'Excluir'}
        confirmColor="red"
      />
    </div>
  );
};

export default ClientForm;
