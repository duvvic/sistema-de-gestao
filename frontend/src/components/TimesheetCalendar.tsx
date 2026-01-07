// components/TimesheetCalendar.tsx - Com Busca Dropdown
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { useAuth } from '@/contexts/AuthContext';
import { TimesheetEntry } from '@/types';
import {
  ChevronLeft, ChevronRight, Plus, Clock, TrendingUp, Trash2,
  Users, AlertTriangle, CheckCircle, Calendar,
  Search, ChevronDown, Check
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const TimesheetCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { timesheetEntries, deleteTimesheet, tasks, users, loading } = useDataController();

  // Safety checks
  const allEntries = timesheetEntries || [];
  const safeUsers = users || [];
  const safeTasks = tasks || [];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimesheetEntry | null>(null);

  const isAdmin = currentUser?.role === 'admin';
  const [selectedUserId, setSelectedUserId] = useState<string>('');

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

  // Inicializar com usuário logado
  useEffect(() => {
    if (!selectedUserId && currentUser) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser]);

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

      if (isWorkDay && !workedDays.has(dStr)) {
        missing++;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    return missing;
  };

  // Processar usuários (apenas para Admin)
  const processedUsers = useMemo(() => {
    if (!isAdmin) return [];

    return safeUsers
      .filter(u => u.active !== false)
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
    const monthEntries = currentEntries.filter(e => {
      if (!e.date) return false;
      const d = new Date(e.date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const totalHours = monthEntries.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);

    let missing = 0;
    if (isAdmin) {
      const u = processedUsers.find(u => u.id === targetUserId);
      missing = u ? u.missing : 0;
    } else {
      missing = calculateDaysMissing(currentUser?.id || '');
    }

    return { totalHours, missing };
  }, [currentEntries, year, month, targetUserId, processedUsers, isAdmin, currentUser]);

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

  const navPrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const navNextMonth = () => {
    if (canGoNext) setCurrentDate(new Date(year, month + 1, 1));
  };


  return (
    <div className="h-full flex flex-col p-6 md:p-8 overflow-hidden gap-6" style={{ backgroundColor: 'var(--bg)' }}>

      {/* 1. SELEÇÃO DE EQUIPE (ADMIN) */}
      {isAdmin && (
        <div className="rounded-2xl shadow-sm border p-6 flex-shrink-0 z-20"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text)' }}>
                <Users className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                Visão da Equipe
              </h2>
              <p className="text-xs font-medium mt-1" style={{ color: 'var(--muted)' }}>
                Selecione um colaborador para visualizar o ponto
              </p>
            </div>

            {/* Search Dropdown */}
            <div className="relative w-full md:w-96" ref={dropdownRef}>
              <div
                className={`
                            flex items-center gap-2 border rounded-xl p-3 cursor-pointer transition-all
                            ${isDropdownOpen ? 'ring-2' : ''}
                        `}
                style={{
                  backgroundColor: isDropdownOpen ? 'var(--surface)' : 'var(--surface-2)',
                  borderColor: isDropdownOpen ? 'var(--primary)' : 'var(--border)',
                  boxShadow: isDropdownOpen ? 'var(--shadow-md)' : 'none'
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Search className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  className="bg-transparent outline-none flex-1 text-sm font-medium placeholder:text-slate-400 cursor-pointer"
                  style={{ color: 'var(--text)' }}
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }} />
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-xl max-h-[320px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200 z-30"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="p-2 space-y-1">
                    {searchedUsers.length === 0 ? (
                      <div className="p-4 text-center text-sm italic" style={{ color: 'var(--muted)' }}>Nenhum colaborador encontrado</div>
                    ) : (
                      searchedUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => { setSelectedUserId(user.id); setIsDropdownOpen(false); setSearchTerm(''); }}
                          className={`
                                                 w-full flex items-center gap-3 p-3 rounded-lg transition-colors group
                                             `}
                          style={{
                            backgroundColor: user.id === selectedUserId ? 'var(--surface-2)' : 'transparent'
                          }}
                          onMouseEnter={(e) => { if (user.id !== selectedUserId) e.currentTarget.style.backgroundColor = 'var(--surface-hover)' }}
                          onMouseLeave={(e) => { if (user.id !== selectedUserId) e.currentTarget.style.backgroundColor = 'transparent' }}
                        >
                          <div className="relative flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover border" style={{ borderColor: 'var(--border)' }} alt="" />
                            ) : (
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border"
                                style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                                {user.name.charAt(0)}
                              </div>
                            )}
                            {user.missing > 2 && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate group-hover:text-[var(--primary)]`}
                              style={{ color: user.id === selectedUserId ? 'var(--primary)' : 'var(--text)' }}>
                              {user.name}
                            </p>
                            <p className={`text-[10px] font-medium truncate ${user.missing > 2 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {user.missing > 2 ? `${user.missing} pendências` : 'Em dia'}
                            </p>
                          </div>
                          {user.id === selectedUserId && <Check className="w-4 h-4" style={{ color: 'var(--primary)' }} />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          <>
            {/* Header do Calendário */}
            <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-white flex-shrink-0"
              style={{ background: 'linear-gradient(to right, var(--primary), var(--primary-hover))' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    {isAdmin ? processedUsers.find(u => u.id === targetUserId)?.name || 'Usuário' : 'Minhas Horas'}
                  </h2>
                  <div className="flex gap-4 text-xs font-medium text-white/70">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Total: {selectedUserStats.totalHours.toFixed(1)}h
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Pendências: {selectedUserStats.missing} dias
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex bg-black/20 p-1 rounded-lg backdrop-blur-md">
                  <button onClick={navPrevMonth} className="p-1.5 hover:bg-white/10 rounded-md text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                  <span className="px-3 font-bold text-sm flex items-center min-w-[100px] justify-center text-white">{monthNames[month]} {year}</span>
                  <button
                    onClick={navNextMonth}
                    disabled={!canGoNext}
                    className={`p-1.5 rounded-md text-white transition-colors ${canGoNext ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onClick={() => navigate(`/timesheet/new?date=${new Date().toISOString().split('T')[0]}${targetUserId ? `&userId=${targetUserId}` : ''}`)}
                  className="bg-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2 hover:bg-white/90"
                  style={{ color: 'var(--primary)' }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Lançar</span>
                </button>
              </div>
            </div>

            {/* Grid Days Header (Sticky) */}
            <div className="grid grid-cols-7 border-b flex-shrink-0 sticky top-0 z-10"
              style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
              {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => (
                <div key={day} className={`py-3 text-center text-[11px] font-bold tracking-widest`}
                  style={{ color: (idx === 0 || idx === 6) ? 'var(--danger)' : 'var(--muted)' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative" style={{ backgroundColor: 'var(--border)' }}>
              <div className="grid grid-cols-7 min-h-full auto-rows-fr gap-[1px] border-b" style={{ backgroundColor: 'var(--border)', borderColor: 'var(--border)' }}>
                {/* Empty Slots */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px]" style={{ backgroundColor: 'var(--surface-2)', opacity: 0.5 }}></div>
                ))}

                {/* Days */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const d = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const dayEntries = currentEntries.filter(e => e.date === dateStr);
                  const totalDayHours = dayEntries.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
                  const hasEntries = dayEntries.length > 0;
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  const dayOfWeek = new Date(year, month, d).getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                  return (
                    <div
                      key={d}
                      onClick={() => navigate(`/timesheet/new?date=${dateStr}${targetUserId ? `&userId=${targetUserId}` : ''}`)}
                      className={`
                                        p-2 relative cursor-pointer min-h-[120px] transition-all group hover:z-10 hover:shadow-xl
                                    `}
                      style={{
                        backgroundColor: isToday ? 'var(--primary-soft)' : (isWeekend ? 'var(--surface-2)' : 'var(--surface)')
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors`}
                          style={{
                            backgroundColor: isToday ? 'var(--primary)' : 'transparent',
                            color: isToday ? 'white' : 'var(--muted)',
                            boxShadow: isToday ? 'var(--shadow-md)' : 'none'
                          }}>
                          {d}
                        </span>
                        {hasEntries && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
                            {totalDayHours.toFixed(1)}h
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {dayEntries.map(entry => {
                          const task = safeTasks.find(t => t.id === entry.taskId);
                          const title = task?.title || entry.description || 'Horas';

                          return (
                            <div
                              key={entry.id}
                              onClick={(e) => { e.stopPropagation(); navigate(`/timesheet/${entry.id}`); }}
                              className="border shadow-sm rounded-md px-2 py-1.5 text-[10px] truncate transition-all flex justify-between items-center group/item"
                              style={{
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border)',
                                color: 'var(--text)'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.color = 'var(--primary)';
                                e.currentTarget.style.backgroundColor = 'var(--surface-hover)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.color = 'var(--text)';
                                e.currentTarget.style.backgroundColor = 'var(--surface)';
                              }}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${entry.totalHours >= 8 ? 'bg-emerald-400' : 'bg-purple-400'}`}></div>
                                <span className="truncate font-medium">{title}</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEntryToDelete(entry); setDeleteModalOpen(true); }}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity hover:text-red-500"
                                style={{ color: 'var(--muted)' }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
          </>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Apontamento"
        message="Tem certeza que deseja excluir este registro?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default TimesheetCalendar;
