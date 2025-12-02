import React, { useState } from 'react';
import { TimesheetEntry, Client, Project, User } from '../types';
import { ArrowLeft, Edit2, Calendar, Clock } from 'lucide-react';

interface TimesheetAdminDetailProps {
  client: Client;
  projects: Project[];
  entries: TimesheetEntry[];
  users: User[]; // To map names if needed, though entry has name
  onBack: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
}

const TimesheetAdminDetail: React.FC<TimesheetAdminDetailProps> = ({ 
  client, 
  projects, 
  entries, 
  onBack,
  onEditEntry
}) => {
  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientEntries = entries.filter(e => e.clientId === client.id);
  const totalClientHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4 bg-white sticky top-0 z-10">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-4">
           <img src={client.logoUrl} alt={client.name} className="w-12 h-12 rounded-lg object-contain bg-slate-50 border border-slate-200 p-1" />
           <div>
              <h1 className="text-xl font-bold text-slate-800">{client.name} - Detalhe de Horas</h1>
              <p className="text-sm text-slate-500">Total Acumulado: <span className="font-bold text-[#4c1d95]">{totalClientHours.toFixed(1)}h</span></p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
         {clientProjects.map(project => {
            const projectEntries = clientEntries.filter(e => e.projectId === project.id);
            if (projectEntries.length === 0) return null;

            const projectTotal = projectEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
            
            // Group by User
            const usersInProject = Array.from(new Set(projectEntries.map(e => e.userId)));

            return (
               <div key={project.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-b border-slate-200">
                     <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#4c1d95]"></div>
                        {project.name}
                     </h2>
                     <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-sm font-bold text-[#4c1d95]">
                        {projectTotal.toFixed(1)}h
                     </span>
                  </div>

                  <div className="p-6 space-y-6">
                     {usersInProject.map(userId => {
                        const userEntries = projectEntries.filter(e => e.userId === userId);
                        const userTotal = userEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
                        const userName = userEntries[0]?.userName || 'Desconhecido';

                        return (
                           <div key={userId} className="space-y-3">
                              <div className="flex justify-between items-center text-sm font-semibold text-slate-600 border-b border-slate-100 pb-2">
                                 <span>{userName}</span>
                                 <span>{userTotal.toFixed(1)}h</span>
                              </div>
                              
                              <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                                 {userEntries.map(entry => (
                                    <div 
                                      key={entry.id} 
                                      className="flex items-center justify-between text-sm hover:bg-slate-50 p-2 rounded-lg group transition-colors cursor-pointer"
                                      onClick={() => onEditEntry(entry)}
                                    >
                                       <div className="flex items-center gap-4 text-slate-500">
                                          <div className="flex items-center gap-1.5 w-24">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(entry.date).toLocaleDateString()}
                                          </div>
                                          <div className="flex items-center gap-1.5 w-24">
                                            <Clock className="w-3.5 h-3.5" />
                                            {entry.startTime} - {entry.endTime}
                                          </div>
                                          <span className="text-slate-400 italic truncate max-w-[200px]">{entry.description || '-'}</span>
                                       </div>
                                       
                                       <div className="flex items-center gap-4">
                                          <span className="font-medium text-slate-700">{entry.totalHours.toFixed(1)}h</span>
                                          <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-[#4c1d95]" />
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            );
         })}
      </div>
    </div>
  );
};

export default TimesheetAdminDetail;