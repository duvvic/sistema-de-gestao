import React, { useState } from 'react';
import { TimesheetEntry, Client, Project } from '../types';
import { Building2, ArrowRight, Clock, Briefcase } from 'lucide-react';

interface TimesheetAdminDashboardProps {
  entries: TimesheetEntry[];
  clients: Client[];
  projects: Project[];
  onClientClick: (clientId: string) => void;
}

const TimesheetAdminDashboard: React.FC<TimesheetAdminDashboardProps> = ({ 
  entries, 
  clients, 
  projects, 
  onClientClick 
}) => {
  
  // Aggregate Logic
  const getClientStats = (clientId: string) => {
    const clientEntries = entries.filter(e => e.clientId === clientId);
    const totalHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
    
    // Get unique project count for this client based on entries
    const activeProjectIds = new Set(clientEntries.map(e => e.projectId));
    
    return { totalHours, projectCount: activeProjectIds.size };
  };

  return (
    <div className="h-full flex flex-col p-2">
       <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Horas</h1>
          <p className="text-slate-500 mt-1">Resumo de horas trabalhadas por cliente</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-4 custom-scrollbar">
          {clients.map(client => {
            const stats = getClientStats(client.id);
            // Get all projects for this client definition (not just those with entries)
            const clientProjects = projects.filter(p => p.clientId === client.id);

            return (
              <div 
                key={client.id}
                onClick={() => onClientClick(client.id)}
                className="bg-white rounded-2xl border border-slate-200 p-6 cursor-pointer hover:shadow-lg hover:border-[#4c1d95]/30 transition-all group flex flex-col h-full relative"
              >
                 <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-2 flex items-center justify-center">
                      <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#4c1d95] transition-colors">
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-white" />
                    </div>
                 </div>

                 <h3 className="text-lg font-bold text-slate-800 mb-2">{client.name}</h3>

                 <div className="mt-auto space-y-3">
                    <div className="flex justify-between items-center py-2 border-t border-slate-100">
                       <span className="text-sm text-slate-500 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#4c1d95]" /> Horas Totais
                       </span>
                       <span className="text-lg font-bold text-[#4c1d95]">{stats.totalHours.toFixed(1)}h</span>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                       <Briefcase className="w-3.5 h-3.5" />
                       {clientProjects.length} Projetos cadastrados
                       {stats.projectCount > 0 && ` (${stats.projectCount} com apontamentos)`}
                    </div>
                 </div>
              </div>
            );
          })}
       </div>
    </div>
  );
};

export default TimesheetAdminDashboard;