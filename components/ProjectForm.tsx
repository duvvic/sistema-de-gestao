import React, { useState } from 'react';
import { Project, Client } from '../types';
import { ArrowLeft, Save, Building2, Calendar, DollarSign, UserCircle } from 'lucide-react';

interface ProjectFormProps {
  clients: Client[];
  onSave: (project: Project) => void;
  onBack: () => void;
  preSelectedClientId?: string;
}

const ProjectForm: React.FC<ProjectFormProps> = ({ clients, onSave, onBack, preSelectedClientId }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    clientId: preSelectedClientId || '',
    description: '',
    startDate: '',
    estimatedDelivery: '',
    budget: undefined,
    manager: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) {
      alert("Nome e Cliente são obrigatórios");
      return;
    }

    onSave({
      id: crypto.randomUUID(),
      name: formData.name!,
      clientId: formData.clientId!,
      description: formData.description,
      startDate: formData.startDate,
      estimatedDelivery: formData.estimatedDelivery,
      budget: formData.budget,
      manager: formData.manager,
    });
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Cadastrar Novo Projeto</h1>
            <p className="text-sm text-slate-500">Defina o escopo e detalhes do projeto</p>
          </div>
        </div>
        <button onClick={handleSubmit} className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium">
          <Save className="w-4 h-4" />
          Salvar Projeto
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Cliente / Empresa</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                  disabled={!!preSelectedClientId}
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Projeto</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Desenvolvimento App Mobile"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Descrição Detalhada</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all resize-none text-slate-800"
                placeholder="Objetivos, escopo e requisitos principais..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Data de Início</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entrega Estimada</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="date"
                  value={formData.estimatedDelivery}
                  onChange={(e) => setFormData({...formData, estimatedDelivery: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Orçamento (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="number"
                  value={formData.budget || ''}
                  onChange={(e) => setFormData({...formData, budget: Number(e.target.value)})}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Gerente de Projeto</label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  placeholder="Nome do líder"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all text-slate-800"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProjectForm;
