import React, { useState } from 'react';
import { Client, Project } from '../types';
import { Building2, Plus, ArrowRight, FolderKanban, Search, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface AdminDashboardProps {
  clients: Client[];
  projects: Project[];
  onSelectClient: (clientId: string) => void;
  onAddClient: () => void;
  onDeleteClient?: (clientId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ clients, projects, onSelectClient, onAddClient, onDeleteClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (clientToDelete && onDeleteClient) {
      onDeleteClient(clientToDelete.id);
    }
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gerenciamento de Clientes</h1>
          <p className="text-slate-500 mt-1">Visão administrativa de empresas e portfólios</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Pesquisar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm"
            />
          </div>
          <button 
            onClick={onAddClient}
            className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-5 py-2.5 rounded-xl shadow-md transition-colors flex items-center gap-2 font-medium whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">Cadastrar Nova Empresa</span>
            <span className="md:hidden">Novo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-4 custom-scrollbar">
        {filteredClients.map((client) => {
          const clientProjects = projects.filter(p => p.clientId === client.id);
          
          return (
            <div 
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg hover:border-[#4c1d95]/30 transition-all group flex flex-col h-full relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                  <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                </div>
                <div className="flex gap-2">
                   {onDeleteClient && (
                     <button 
                       onClick={(e) => handleDeleteClick(e, client)}
                       className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors z-10"
                       title="Excluir Cliente"
                     >
                        <Trash2 className="w-4 h-4" />
                     </button>
                   )}
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#4c1d95] transition-colors">
                     <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                   </div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-2">{client.name}</h3>
              
              <div className="mt-auto pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <FolderKanban className="w-4 h-4 text-[#4c1d95]" />
                  <span>{clientProjects.length} Projetos Ativos</span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Placeholder Card for Adding */}
        <button
          onClick={onAddClient}
          className="rounded-2xl border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-[#4c1d95] hover:border-[#4c1d95] hover:bg-purple-50 transition-all min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
            <Plus className="w-6 h-6" />
          </div>
          <span className="font-medium">Cadastrar Empresa</span>
        </button>
      </div>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Empresa"
        message={`Tem certeza que deseja deletar o cliente "${clientToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboard;