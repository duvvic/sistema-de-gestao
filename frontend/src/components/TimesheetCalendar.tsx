// components/TimesheetCalendar.tsx - Com Busca Dropdown
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { TimesheetEntry } from '@/types';
import {
  ChevronLeft, ChevronRight, Plus, Clock, TrendingUp, Trash2,
  Users, AlertTriangle, CheckCircle, Calendar,
  Search, ChevronDown, Check, Coffee, PartyPopper, Flag, Gift, Sparkles, Heart, Hammer
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TimesheetCalendarProps {
  userId?: string;
  embedded?: boolean;
}

const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({ userId, embedded }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, isAdmin } = useAuth();
  const { timesheetEntries, deleteTimesheet, tasks, users, loading, clients, projects } = useDataController();

  // Safety checks
  const allEntries = timesheetEntries || [];
  const safeUsers = users || [];
  const safeTasks = tasks || [];
  const safeClients = clients || [];
  const safeProjects = projects || [];

  const queryMonth = searchParams.get('month');
  const queryYear = searchParams.get('year');
  const initialDate = useMemo(() => {
    if (queryMonth && queryYear) {
      return new Date(Number(queryYear), Number(queryMonth), 1);
    }
    return new Date();
  }, [queryMonth, queryYear]);

  const [currentDate, setCurrentDate] = useState(initialDate);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimesheetEntry | null>(null);


  // Use URL search param for userId if available, otherwise use prop or currentUser
  // Use URL search param for userId if available, otherwise use memory (localStorage), prop or currentUser
  const queryUserId = searchParams.get('userId');
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    if (queryUserId) return queryUserId;
    if (userId) return userId;
    return localStorage.getItem('timesheet_last_selected_user_id') || '';
  });

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown clickable outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update selectedUserId and URL when selection or prop changes
  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    } else if (queryUserId) {
      setSelectedUserId(queryUserId);
    } else if (!selectedUserId) {
      // Fallback to memory or currentUser
      const rememberedValue = localStorage.getItem('timesheet_last_selected_user_id');
      if (rememberedValue) {
        setSelectedUserId(rememberedValue);
      } else if (currentUser) {
        setSelectedUserId(currentUser.id);
      }
    }
  }, [currentUser, userId, queryUserId, selectedUserId]);

  const handleUserSelect = (uid: string) => {
    setSelectedUserId(uid);
    localStorage.setItem('timesheet_last_selected_user_id', uid);
    setSearchParams(prev => {
      prev.set('userId', uid);
      return prev;
    }, { replace: true });
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  // Data Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();

  const canGoNext =
    currentDate.getFullYear() < today.getFullYear() ||
    (currentDate.getFullYear() === today.getFullYear() && currentDate.getMonth() < today.getMonth());

  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const daysInMonth = getDaysInMonth(year, month);
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const firstDay = getFirstDayOfMonth(year, month);
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Helper de Feriados Nacionais (Brasil 2025/2026)
  const getHoliday = (d: number, m: number, y: number) => {
    const dates: { [key: string]: { name: string, icon: any, color: string, bg: string } } = {
      "1-0": { name: "Confraternização Universal", icon: PartyPopper, color: "#EAB308", bg: "rgba(234, 179, 8, 0.05)" }, // Yellow
      "21-3": { name: "Tiradentes", icon: Sparkles, color: "#10B981", bg: "rgba(16, 185, 129, 0.05)" }, // Green
      "1-4": { name: "Dia do Trabalho", icon: Hammer, color: "#EF4444", bg: "rgba(239, 68, 68, 0.05)" }, // Red
      "7-8": { name: "Independência do Brasil", icon: Flag, color: "#F59E0B", bg: "rgba(245, 158, 11, 0.05)" }, // Amber/Gold
      "12-9": { name: "Nossa Sra. Aparecida", icon: Heart, color: "#3B82F6", bg: "rgba(59, 130, 246, 0.05)" }, // Blue
      "2-10": { name: "Finados", icon: Sparkles, color: "#64748B", bg: "rgba(100, 116, 139, 0.05)" }, // Slate
      "15-10": { name: "Proclamação da República", icon: Flag, color: "#065F46", bg: "rgba(6, 95, 70, 0.05)" }, // Dark Green
      "20-10": { name: "Consciência Negra", icon: Sparkles, color: "#7C2D12", bg: "rgba(124, 45, 18, 0.05)" }, // Brown/Rust
      "25-11": { name: "Natal", icon: Gift, color: "#DC2626", bg: "rgba(220, 38, 38, 0.05)" } // Christmas Red
    };
    // Feriados móveis (Exemplo simplificado para 2026)
    if (y === 2026) {
      if (d === 3 && m === 3) return { name: "Sexta-feira Santa", icon: Heart, color: "#4F46E5", bg: "rgba(79, 70, 229, 0.05)" };
      if (d === 5 && m === 3) return { name: "Páscoa", icon: PartyPopper, color: "#EC4899", bg: "rgba(236, 72, 153, 0.05)" };
      if (d === 4 && m === 5) return { name: "Corpus Christi", icon: Sparkles, color: "#FBBF24", bg: "rgba(251, 191, 36, 0.05)" };
    }
    return dates[`${d}-${m}`];
  };

  /* --- LÓGICA DE PENDÊNCIAS --- */
  const calculateDaysMissing = (uid: string) => {
    if (!uid) return 0;

    const userEntries = allEntries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return e.userId === uid && d.getMonth() === month && d.getFullYear() === year;
    });

    const workedDays = new Set(userEntries.map(e => e.date));
    let missing = 0;
    const todayStr = today.toISOString().split('T')[0];

    const checkDate = new Date(year, month, 1);
    let limit = 0;

    while (checkDate.getMonth() === month && limit < 32) {
      limit++;
      const dStr = checkDate.toISOString().split('T')[0];
      if (dStr > todayStr) break;

      const dayOfWeek = checkDate.getDay();
      const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      const holiday = getHoliday(checkDate.getDate(), checkDate.getMonth(), checkDate.getFullYear());

      if (isWorkDay && !workedDays.has(dStr) && !holiday) {
        missing++;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return missing;
  };

  // Processar usuários (apenas para Admin)
  const processedUsers = useMemo(() => {
    if (!isAdmin) return [];

    const activeCargos = ['desenvolvedor', 'infraestrutura de ti'];
    return safeUsers
      .filter(u => u.active !== false && activeCargos.includes(u.cargo?.toLowerCase() || ''))
      .map(u => {
        const missing = calculateDaysMissing(u.id);
        const status = missing > 2 ? 'late' : 'ontime';
        return { ...u, missing, status };
      })
      .sort((a, b) => b.missing - a.missing);
  }, [safeUsers, allEntries, year, month, isAdmin]);

  // Search Filter
  const searchedUsers = useMemo(() => {
    if (!searchTerm) return processedUsers;
    return processedUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [processedUsers, searchTerm]);


  /* --- DADOS DO CALENDÁRIO --- */
  const targetUserId = isAdmin ? (selectedUserId || currentUser?.id) : currentUser?.id;

  const currentEntries = useMemo(() => {
    if (!targetUserId) return [];
    return allEntries.filter(e => e.userId === targetUserId);
  }, [allEntries, targetUserId]);

  const selectedUserStats = useMemo(() => {
    // 1. Filtrar lançamentos do mês/ano selecionados
    const monthEntries = currentEntries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    // 2. Calcular Saldo de Horas (Diferença de 8h/dia) - APENAS DIAS APONTADOS
    let balanceHours = 0;
    const entriesByDate = monthEntries.reduce((acc, curr) => {
      const d = curr.date;
      acc[d] = (acc[d] || 0) + (curr.totalHours || 0);
      return acc;
    }, {} as { [key: string]: number });

    Object.entries(entriesByDate).forEach(([dStr, dayTotal]) => {
      const parts = dStr.split('-');
      const checkDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayOfWeek = checkDate.getDay();
      const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;
      const holiday = getHoliday(checkDate.getDate(), checkDate.getMonth(), checkDate.getFullYear());

      if (isWorkDay && !holiday) {
        // Se trabalhou em dia útil, o saldo é a diferença para as 8h
        balanceHours += (dayTotal - 8);
      } else {
        // Se trabalhou em feriado ou fim de semana, TUDO é extra
        balanceHours += dayTotal;
      }
    });

    // 3. Pendências (Dias sem nenhum apontamento)
    let missing = 0;
    if (isAdmin) {
      const u = processedUsers.find(u => u.id === targetUserId);
      missing = u ? u.missing : 0;
    } else {
      missing = calculateDaysMissing(currentUser?.id || '');
    }

    const totalHours = monthEntries.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);

    return { totalHours, balanceHours, missing };
  }, [currentEntries, year, month, targetUserId, processedUsers, isAdmin, currentUser, today]);

  const handleDelete = async () => {
    if (entryToDelete) {
      try {
        await deleteTimesheet(entryToDelete.id);
      } catch (e) {
        alert("Erro ao excluir.");
      } finally {
        setDeleteModalOpen(false);
        setEntryToDelete(null);
      }
    }
  };

  const updateDateParams = (date: Date) => {
    setSearchParams(prev => {
      prev.set('month', String(date.getMonth()));
      prev.set('year', String(date.getFullYear()));
      return prev;
    }, { replace: true });
  };

  const navPrevMonth = () => {
    const newDate = new Date(year, month - 1, 1);
    setCurrentDate(newDate);
    updateDateParams(newDate);
  };

  const navNextMonth = () => {
    if (canGoNext) {
      const newDate = new Date(year, month + 1, 1);
      setCurrentDate(newDate);
      updateDateParams(newDate);
    }
  };


  return (
    <div className={`h-full flex flex-col ${embedded ? '' : 'p-6 md:p-8'} overflow-hidden gap-6`} style={{ backgroundColor: 'var(--bg)' }}>



      {/* 2. CALENDÁRIO */}
      <div className="flex-1 rounded-2xl shadow-sm border overflow-hidden flex flex-col min-h-0"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
              <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando calendário...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
            {/* Header do Calendário Agora dentro do Scroll para não ficar fixo */}
            <div className="px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-4 text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                    {isAdmin && <Users className="w-3.5 h-3.5 opacity-60" />}
                    {isAdmin ? processedUsers.find(u => u.id === targetUserId)?.name || 'Usuário' : 'Meus Lançamentos'}
                  </h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-black uppercase tracking-widest text-white/60">
                    <span className="flex items-center gap-1 text-white/90">
                      <Clock className="w-3 h-3 text-white/50" /> {selectedUserStats.totalHours.toFixed(1)}h no Mês
                    </span>
                    <span className={`flex items-center gap-1 ${selectedUserStats.balanceHours >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {selectedUserStats.balanceHours >= 0 ? '+' : ''}{selectedUserStats.balanceHours.toFixed(1)}h
                      {selectedUserStats.balanceHours >= 0 ? ' Extra' : ' de Débito'}
                    </span>
                    {selectedUserStats.missing > 0 && (
                      <span className="flex items-center gap-1 text-amber-300">
                        <AlertTriangle className="w-3 h-3" /> {selectedUserStats.missing} Falta(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Search integrated in header for Admins */}
                {isAdmin && !embedded && (
                  <div className="relative" ref={dropdownRef}>
                    <div
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-3 py-1.5 rounded-xl cursor-pointer transition-all backdrop-blur-sm min-w-[200px]"
                    >
                      <Search className="w-3.5 h-3.5 text-white" />
                      <input
                        type="text"
                        placeholder="Buscar membro..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-none outline-none text-xs font-black text-white placeholder:!text-white/80 w-full"
                      />
                      <ChevronDown className={`w-3 h-3 text-white transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full right-0 mt-2 w-72 border rounded-xl shadow-2xl max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200 z-[1001]"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="p-2 space-y-1">
                          {searchedUsers.length === 0 ? (
                            <div className="p-4 text-center text-xs italic" style={{ color: 'var(--muted)' }}>Nenhum colaborador...</div>
                          ) : (
                            searchedUsers.map(user => (
                              <button
                                key={user.id}
                                onClick={() => handleUserSelect(user.id)}
                                className="w-full flex items-center gap-3 p-2 rounded-lg transition-all group hover:bg-[var(--surface-2)]"
                                style={{ backgroundColor: user.id === selectedUserId ? 'var(--surface-2)' : 'transparent' }}
                              >
                                <div className="relative">
                                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] border"
                                    style={{ backgroundColor: 'var(--surface-hover)', borderColor: 'var(--border)', color: 'var(--text)' }}>
                                    {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" /> : user.name.charAt(0)}
                                  </div>
                                  {user.missing > 2 && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--surface)]" />}
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate transition-colors group-hover:text-[var(--primary)]" style={{ color: user.id === selectedUserId ? 'var(--primary)' : 'var(--text)' }}>{user.name}</p>
                                  <p className={`text-[9px] font-black uppercase ${user.missing > 2 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {user.missing > 2 ? `${user.missing} pendências` : 'OK'}
                                  </p>
                                </div>
                                {user.id === selectedUserId && <Check className="w-3 h-3" style={{ color: 'var(--primary)' }} />}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md border border-white/5">
                  <button onClick={navPrevMonth} className="p-1 hover:bg-white/10 rounded-lg text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="px-2 font-black text-[11px] uppercase tracking-widest flex items-center min-w-[120px] justify-center text-white">{monthNames[month]} {year}</span>
                  <button
                    onClick={navNextMonth}
                    disabled={!canGoNext}
                    className={`p-1 rounded-lg text-white transition-colors ${canGoNext ? 'hover:bg-white/10' : 'opacity-20 cursor-not-allowed'}`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/timesheet/new?date=${new Date().toISOString().split('T')[0]}${targetUserId ? `&userId=${targetUserId}` : ''}`)}
                  className="bg-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg transition-all flex items-center gap-2 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0"
                  style={{ color: 'var(--primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lançar
                </button>
              </div>
            </div>

            {/* Grid Days Header (Sticky) - Agora dentro do Scroll */}
            <div className="grid border-b flex-shrink-0 sticky top-0 z-10"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                gridTemplateColumns: 'minmax(0, 0.4fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.4fr)'
              }}>
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => (
                <div key={day} className={`py-3 text-center text-[11px] font-black tracking-widest`}
                  style={{ color: (idx === 0 || idx === 6) ? 'var(--danger)' : 'var(--text-2)' }}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid min-h-full gap-[1px] border-b"
              style={{
                backgroundColor: 'var(--border)',
                borderColor: 'var(--border)',
                gridTemplateColumns: 'minmax(0, 0.4fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 0.4fr)'
              }}>
              {/* Empty Slots */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[60px]" style={{ backgroundColor: 'var(--surface-hover)', opacity: 0.3 }}></div>
              ))}

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dayEntries = currentEntries.filter(e => e.date === dateStr);

                // Recalculate total hours to fix any inconsistencies
                const totalDayHours = dayEntries.reduce((acc, entry) => acc + (entry.totalHours || 0), 0);

                const hasEntries = dayEntries.length > 0;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const todayStr = today.toISOString().split('T')[0];
                const isPast = dateStr < todayStr;

                const dayOfWeek = new Date(year, month, d).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const holiday = getHoliday(d, month, year);
                const HolidayIcon = holiday?.icon || Coffee;

                const isMissing = !hasEntries && !isWeekend && !holiday && isPast;

                return (
                  <div
                    key={d}
                    onClick={() => navigate(`/timesheet/new?date=${dateStr}${targetUserId ? `&userId=${targetUserId}` : ''}`)}
                    className={`
                                        p-1.5 relative cursor-pointer min-h-[60px] transition-all group hover:z-10 hover:shadow-xl border-r border-b flex flex-col
                                    `}
                    style={{
                      backgroundColor: isToday ? 'var(--primary-soft)' : (holiday || isWeekend) ? 'var(--surface-2)' : isMissing ? '#FFFBEB' : 'var(--surface)',
                      borderTop: holiday ? `3px solid ${holiday.color}` : isMissing ? `3px solid #FBBF24` : 'none',
                      borderColor: 'var(--border)'
                    }}
                  >
                    {/* Header: Day Number and Hours Badge */}
                    <div className="flex justify-between items-start mb-1 h-6">
                      <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded transition-colors`}
                        style={{
                          backgroundColor: isToday ? 'var(--primary)' : holiday ? holiday.color : 'transparent',
                          color: isToday || holiday ? 'white' : 'var(--text)',
                        }}>
                        {d}
                      </span>
                      {hasEntries && (
                        <span className={`text-[11px] font-black text-white px-2.5 py-1 rounded-lg shadow-lg border border-white/10 leading-none transition-all hover:scale-110 ${totalDayHours > 9 ? 'bg-amber-500' : totalDayHours >= 8 ? 'bg-emerald-600' : 'bg-blue-500'}`}>
                          {totalDayHours.toFixed(1)}h
                        </span>
                      )}
                    </div>

                    {/* Holiday Indicator */}
                    {holiday && (
                      <div className="flex-1 flex flex-col items-center justify-center py-2 text-center pointer-events-none">
                        <HolidayIcon className="w-5 h-5 mb-1" style={{ color: holiday.color }} />
                        <span className="text-[7px] font-black uppercase whitespace-normal leading-tight px-1" style={{ color: holiday.color }}>
                          {holiday.name}
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {dayEntries.map(entry => {
                        const task = safeTasks.find(t => t.id === entry.taskId);
                        const client = safeClients.find(c => c.id === entry.clientId);
                        const project = safeProjects.find(p => p.id === entry.projectId);

                        // Título Inteligente: Tarefa > Descrição > Projeto > "Horas Avulsas"
                        let displayTitle = task?.title;
                        if (!displayTitle) {
                          if (entry.description) displayTitle = entry.description;
                          else if (project) displayTitle = `${project.name} (S/ Tarefa)`;
                          else displayTitle = 'Horas Avulsas';
                        }

                        return (
                          <div
                            key={entry.id}
                            onClick={(e) => { e.stopPropagation(); navigate(`/timesheet/${entry.id}`); }}
                            className="border shadow-md rounded-xl px-3 py-2.5 text-[11px] transition-all flex flex-col items-start gap-1.5 group/item mb-2 hover:-translate-y-0.5"
                            style={{
                              backgroundColor: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--text)',
                            }}
                            title={`${client?.name || 'Cliente?'} - ${project?.name || 'Projeto?'}\n${entry.description || ''}`}
                          >
                            <div className="flex w-full justify-between items-center gap-2">
                              <div className="flex items-center gap-1.5 truncate flex-1 min-w-0">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black text-white shrink-0 shadow-sm leading-none ${entry.totalHours >= 4 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                  {entry.totalHours.toFixed(1)}h
                                </span>
                                <span className="truncate font-black leading-tight" style={{ color: 'var(--text)' }}>{displayTitle}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEntryToDelete(entry); setDeleteModalOpen(true); }}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-500 shrink-0"
                                style={{ color: 'var(--muted)' }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Client & Project Mini-Tags */}
                            <div className="flex flex-wrap gap-2 w-full overflow-hidden mt-0.5">
                              {client && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg truncate max-w-[100px] border transition-colors shadow-sm"
                                  style={{
                                    backgroundColor: 'var(--surface-2)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--text-2)'
                                  }}>
                                  {client.name}
                                </span>
                              )}
                              {project && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-lg truncate max-w-[100px] border transition-colors shadow-sm"
                                  style={{
                                    backgroundColor: 'var(--primary-soft)',
                                    borderColor: 'rgba(124, 58, 237, 0.2)',
                                    color: 'var(--primary)'
                                  }}>
                                  {project.name}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!hasEntries && !isWeekend && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <div className="bg-primary-soft p-2 rounded-full shadow-sm" style={{ backgroundColor: 'var(--primary-soft)' }}>
                          <Plus className="w-5 h-5 text-primary" style={{ color: 'var(--primary)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Apontamento"
        message="Tem certeza que deseja excluir este registro?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div >
  );
};

export default TimesheetCalendar;
