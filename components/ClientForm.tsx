import React from "react";
import { Client, Project } from "../types";
import { Trash2, Plus, Building2 } from "lucide-react";
import { supabase } from "../services/supabaseClient";

interface AdminDashboardProps {
  clients: Client[];
  projects: Project[];
  onSelectClient: (id: string) => void;
  onAddClient: () => void;

  // ❗ Removido onDeleteClient
  loadClients?: () => void; 
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  clients,
  projects,
  onSelectClient,
  onAddClient,
  loadClients
}) => {

  // --------- NOVA FUNÇÃO COMPLETA DE EXCLUSÃO ---------
  const handleDeleteClient = async (clientId: string) => {
    if (!confirm("Tem certeza que deseja desativar este cliente?")) return;

    try {
      const { error } = await supabase
        .from("dim_clientes")
        .update({ Ativo: false })
        .eq("ID_Cliente", clientId);

      if (error) {
        console.error(error);
        alert("Erro ao desativar cliente.");
        return;
      }

      alert("Cliente desativado com sucesso!");

      if (loadClients) loadClients();
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao excluir.");
    }
  };

  return (
    <div className="h-full flex flex-col">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#4c1d95]" />
          Clientes
        </h1>

        <button
          className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          onClick={onAddClient}
        >
          <Plus size={18} />
          Novo Cliente
        </button>
      </div>

      {/* LISTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div
            key={client.id}
            className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition cursor-pointer"
          >
            <div onClick={() => onSelectClient(client.id)} className="flex-1">

              {/* LOGO */}
              <div className="w-full h-24 flex items-center justify-center mb-4">
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="h-full object-contain"
                  onError={(e) =>
                    (e.currentTarget.src =
                      "https://via.placeholder.com/150?text=Logo")
                  }
                />
              </div>

              <h2 className="text-lg font-bold text-slate-800">{client.name}</h2>
              <p className="text-sm text-slate-500 mt-1">
                Projetos:{" "}
                {projects.filter((p) => p.clientId === client.id).length}
              </p>
            </div>

            {/* BOTÃO EXCLUIR */}
            <button
              className="mt-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-2 text-sm"
              onClick={() => handleDeleteClient(client.id)}
            >
              <Trash2 size={16} />
              Desativar Cliente
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
