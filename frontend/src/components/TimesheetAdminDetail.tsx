import React, { useState } from 'react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { TimesheetEntry, Client, Project, User, Task } from '@/types';
import { ArrowLeft, Edit2, Calendar, Clock, Users, Briefcase, ChevronDown, ChevronUp, CheckSquare } from 'lucide-react';
import { formatDecimalToTime } from '@/utils/normalizers';

interface TimesheetAdminDetailProps {
  client: Client;
  projects: Project[];
  entries: TimesheetEntry[];
  users: User[];
  tasks: Task[];
  onBack: () => void;
  onEditEntry: (entry: TimesheetEntry) => void;
}

const TimesheetAdminDetail: React.FC<TimesheetAdminDetailProps> = ({
  client,
  projects: initialProjects,
  entries: initialEntries,
  tasks: initialTasks,
  users: initialUsers,
  onBack,
  onEditEntry
}) => {
  const [projects, setProjects] = useState(initialProjects);
  const [entries, setEntries] = useState(initialEntries);
  const [tasks, setTasks] = useState(initialTasks);
  const [users, setUsers] = useState(initialUsers);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  // Realtime subscriptions
  useSupabaseRealtime('dim_projetos', (payload) => {
    if (payload.eventType === 'INSERT') setProjects(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setProjects(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    else if (payload.eventType === 'DELETE') setProjects(prev => prev.filter(p => p.id !== payload.old.id));
  });
  useSupabaseRealtime('fato_tarefas', (payload) => {
    if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
    else if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
  });
  useSupabaseRealtime('fato_apontamentos', (payload) => {
    if (payload.eventType === 'INSERT') setEntries(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new : e));
    else if (payload.eventType === 'DELETE') setEntries(prev => prev.filter(e => e.id !== payload.old.id));
  });
  useSupabaseRealtime('dim_colaboradores', (payload) => {
    if (payload.eventType === 'INSERT') setUsers(prev => [...prev, payload.new]);
    else if (payload.eventType === 'UPDATE') setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new : u));
    else if (payload.eventType === 'DELETE') setUsers(prev => prev.filter(u => u.id !== payload.old.id));
  });

  const clientProjects = projects.filter(p => p.clientId === client.id);
  const clientEntries = entries.filter(e => e.clientId === client.id);
  const totalClientHours = clientEntries.reduce((acc, curr) => acc + curr.totalHours, 0);

  // Agrupar por Usuário
  const userStats = Array.from(new Set(clientEntries.map(e => e.userId))).map((userId: string) => {
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

  const toggleTaskExpand = (taskId: string) => {
    const newSet = new Set(expandedTasks);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setExpandedTasks(newSet);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-md border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="px-8 py-6 border-b flex items-center justify-between sticky top-0 z-20 shadow-sm" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl border p-1 flex items-center justify-center bg-white shadow-sm">
              <img src={client.logoUrl} alt={client.name} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{client.name} - Resumo de Horas</h1>
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                Total Acumulado: <span className="font-black" style={{ color: 'var(--primary)' }}>{formatDecimalToTime(totalClientHours)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8" style={{ backgroundColor: 'var(--bg)' }}>

        {/* SEÇÃO: Colaboradores */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Colaboradores ({userStats.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {userStats.map(user => (
              <div
                key={user.userId}
                className="rounded-2xl border shadow-sm overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => toggleUserExpand(user.userId)}
                  className="w-full px-5 py-4 flex justify-between items-center transition-colors text-left"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-sm"
                      style={{ backgroundColor: 'var(--primary)' }}>
                      {user.userName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{user.userName}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{user.entries.length} apontamentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-xl" style={{ color: 'var(--primary)' }}>{formatDecimalToTime(user.totalHours)}</span>
                    {expandedUsers.has(user.userId) ? (
                      <ChevronUp className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    ) : (
                      <ChevronDown className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    )}
                  </div>
                </button>

                {/* Expandido: Detalhes do Usuário */}
                {expandedUsers.has(user.userId) && (
                  <div className="border-t p-4 space-y-3 shadow-inner" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    {user.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between text-sm p-3 rounded-xl border shadow-sm transition-all cursor-pointer group hover:scale-[1.01]"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                        onClick={() => onEditEntry(entry)}
                      >
                        <div className="flex items-center gap-6 flex-1">
                          <div className="flex items-center gap-2 w-28 font-bold" style={{ color: 'var(--muted)' }}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-mono">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex items-center gap-2 w-36 font-bold" style={{ color: 'var(--muted)' }}>
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-mono">{entry.startTime} - {entry.endTime}</span>
                          </div>
                          <span className="italic truncate max-w-[250px]" style={{ color: 'var(--text)' }}>{entry.description || '-'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-black w-16 text-right" style={{ color: 'var(--text)' }}>{formatDecimalToTime(entry.totalHours)}</span>
                          <Edit2 className="w-4 h-4 transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }} />
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
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider" style={{ color: 'var(--text)' }}>
            <Briefcase className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            Projetos ({projectStats.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {projectStats.map(project => (
              <div
                key={project.projectId}
                className="rounded-2xl border shadow-sm overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <button
                  onClick={() => toggleProjectExpand(project.projectId)}
                  className="w-full px-5 py-4 flex justify-between items-center transition-colors text-left"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[var(--primary)] shadow-sm border"
                      style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{project.projectName}</p>
                      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{project.entries.length} apontamentos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-black text-xl" style={{ color: 'var(--primary)' }}>{formatDecimalToTime(project.totalHours)}</span>
                    {expandedProjects.has(project.projectId) ? (
                      <ChevronUp className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    ) : (
                      <ChevronDown className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                    )}
                  </div>
                </button>

                {/* Expandido: Tarefas do Projeto */}
                {expandedProjects.has(project.projectId) && (
                  <div className="border-t p-4 space-y-3 shadow-inner" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                    {(() => {
                      // Agrupar apontamentos por tarefa
                      const taskGroups = Array.from(new Set(project.entries.map(e => e.taskId))).map((taskId: string) => {
                        const taskEntries = project.entries.filter(e => e.taskId === taskId);
                        const taskInfo = tasks.find(t => t.id === taskId);
                        const totalHours = taskEntries.reduce((acc, curr) => acc + curr.totalHours, 0);
                        return {
                          taskId,
                          taskTitle: taskInfo?.title || 'Tarefa sem título',
                          totalHours,
                          entries: taskEntries
                        };
                      }).sort((a, b) => b.totalHours - a.totalHours);

                      return taskGroups.map(taskGroup => (
                        <div key={taskGroup.taskId} className="rounded-xl border shadow-sm overflow-hidden"
                          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                          <button
                            onClick={() => toggleTaskExpand(taskGroup.taskId)}
                            className="w-full px-4 py-3 flex justify-between items-center transition-colors text-left"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <div className="flex items-center gap-3">
                              <CheckSquare className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                              <div>
                                <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>{taskGroup.taskTitle}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{taskGroup.entries.length} apontamentos</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="font-black" style={{ color: 'var(--primary)' }}>{formatDecimalToTime(taskGroup.totalHours)}</span>
                              {expandedTasks.has(taskGroup.taskId) ? (
                                <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                              ) : (
                                <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                              )}
                            </div>
                          </button>

                          {/* Expandido: Apontamentos da Tarefa */}
                          {expandedTasks.has(taskGroup.taskId) && (
                            <div className="border-t p-3 space-y-2 shadow-inner" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                              {taskGroup.entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(entry => (
                                <div
                                  key={entry.id}
                                  className="flex items-center justify-between text-sm p-3 rounded-xl border shadow-sm transition-all cursor-pointer group hover:scale-[1.01]"
                                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                                  onClick={() => onEditEntry(entry)}
                                >
                                  <div className="flex items-center gap-6 flex-1">
                                    <div className="font-bold w-36 truncate" style={{ color: 'var(--text)' }}>{entry.userName}</div>
                                    <div className="flex items-center gap-2 w-28 font-bold" style={{ color: 'var(--muted)' }}>
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span className="text-[11px] font-mono">{new Date(entry.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 w-36 font-bold" style={{ color: 'var(--muted)' }}>
                                      <Clock className="w-3.5 h-3.5" />
                                      <span className="text-[11px] font-mono">{entry.startTime} - {entry.endTime}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <span className="font-black w-16 text-right" style={{ color: 'var(--text)' }}>{formatDecimalToTime(entry.totalHours)}</span>
                                    <Edit2 className="w-4 h-4 transition-colors group-hover:text-[var(--primary)]" style={{ color: 'var(--muted)' }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
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
