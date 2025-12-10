import React, { useState } from 'react';
import { TimesheetEntry, Client, Project, User } from '../types';
import { ArrowLeft, Edit2, Calendar, Clock, Users, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';

interface TimesheetAdminDetailProps {
  client: Client;
  projects: Project[];
  entries: TimesheetEntry[];
  users: User[];
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
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientEntries = entries.filter(e => e.clientId === client.id);
  const totalClientHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);

  // Agrupar por Usuário
  const userStats = Array.from(new Set(clientEntries.map(e => e.userId))).map(userId => {
    const userEntries = clientEntries.filter(e => e.userId === userId);
    const totalHours = userEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
    const userName = userEntries[0]?.userName || 'Desconhecido';
    return { userId, userName, totalHours, entries: userEntries };
  }).sort((a, b) => b.totalHours - a.totalHours);

  // Agrupar por Projeto
  const projectStats = clientProjects.map(project => {
    const projectEntries = clientEntries.filter(e => e.projectId === project.id);
    const totalHours = projectEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
    return { projectId: project.id, projectName: project.name, totalHours, entries: projectEntries };
  }).filter(p => p.totalHours > 0).sort((a, b) => b.totalHours - a.totalHours);

  const toggleUserExpand = (userId: string) => {
    const newSet = new Set(expandedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setExpandedUsers(newSet);
  };

  const toggleProjectExpand = (projectId: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(projectId)) {
      newSet.delete(projectId);
    } else {
      newSet.add(projectId);
    }
    setExpandedProjects(newSet);
  };

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
              <h1 className="text-xl font-bold text-slate-800">{client.name} - Resumo de Horas</h1>
              <p className="text-sm text-slate-500">Total Acumulado: <span className="font-bold text-[#4c1d95]">{totalClientHours.toFixed(1)}h</span></p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
        
        {/* SEÇÃO: Colaboradores */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#4c1d95]" />
            Colaboradores ({userStats.length})
          </h2>
          <div className="space-y-2">
            {userStats.map(user => (
              <div 
                key={user.userId}
                className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleUserExpand(user.userId)}
                  className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-100 transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{user.userName}</p>
                    <p className="text-xs text-slate-500">{user.entries.length} apontamentos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#4c1d95] text-lg">{user.totalHours.toFixed(1)}h</span>
                    {expandedUsers.has(user.userId) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expandido: Detalhes do Usuário */}
                {expandedUsers.has(user.userId) && (
                  <div className="bg-white border-t border-slate-200 p-4 space-y-3">
                    {user.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <div 
                        key={entry.id}
                        className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                        onClick={() => onEditEntry(entry)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-1.5 w-24 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(entry.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1.5 w-32 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {entry.startTime} - {entry.endTime}
                          </div>
                          <span className="text-slate-600 italic truncate max-w-[250px]">{entry.description || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 w-16 text-right">{entry.totalHours.toFixed(1)}h</span>
                          <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-[#4c1d95]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SEÇÃO: Projetos */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#4c1d95]" />
            Projetos ({projectStats.length})
          </h2>
          <div className="space-y-2">
            {projectStats.map(project => (
              <div 
                key={project.projectId}
                className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden"
              >
                <button
                  onClick={() => toggleProjectExpand(project.projectId)}
                  className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-100 transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{project.projectName}</p>
                    <p className="text-xs text-slate-500">{project.entries.length} apontamentos</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#4c1d95] text-lg">{project.totalHours.toFixed(1)}h</span>
                    {expandedProjects.has(project.projectId) ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </button>

                {/* Expandido: Detalhes do Projeto */}
                {expandedProjects.has(project.projectId) && (
                  <div className="bg-white border-t border-slate-200 p-4 space-y-3">
                    {project.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <div 
                        key={entry.id}
                        className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group"
                        onClick={() => onEditEntry(entry)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-slate-600 font-medium w-32">{entry.userName}</div>
                          <div className="flex items-center gap-1.5 w-24 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(entry.date).toLocaleDateString('pt-BR')}
                          </div>
                          <div className="flex items-center gap-1.5 w-32 text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {entry.startTime} - {entry.endTime}
                          </div>
                          <span className="text-slate-600 italic truncate max-w-[200px]">{entry.description || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-700 w-16 text-right">{entry.totalHours.toFixed(1)}h</span>
                          <Edit2 className="w-4 h-4 text-slate-300 group-hover:text-[#4c1d95]" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default TimesheetAdminDetail;