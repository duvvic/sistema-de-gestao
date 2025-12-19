// components/TimesheetCalendar.tsx - Com Busca Dropdown
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '../controllers/useDataController';
import { useAuth } from '../contexts/AuthContext';
import { TimesheetEntry } from '../types';
import {
  ChevronLeft, ChevronRight, Plus, Clock, TrendingUp, Trash2,
  Users, AlertTriangle, CheckCircle, Calendar,
  Search, ChevronDown, Check
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const TimesheetCalendar: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { timesheetEntries, deleteTimesheet, tasks, users } = useDataController();

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
    <div className="h-full flex flex-col bg-slate-50 p-6 md:p-8 overflow-hidden gap-6">

      {/* 1. SELEÇÃO DE EQUIPE (ADMIN) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex-shrink-0 z-20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-[#4c1d95]" />
                Visão da Equipe
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Selecione um colaborador para visualizar o ponto
              </p>
            </div>

            {/* Search Dropdown */}
            <div className="relative w-full md:w-96" ref={dropdownRef}>
              <div
                className={`
                            flex items-center gap-2 bg-slate-50 border rounded-xl p-3 cursor-pointer transition-all
                            ${isDropdownOpen ? 'border-[#4c1d95] ring-2 ring-[#4c1d95]/10 bg-white' : 'border-slate-200 hover:border-purple-300'}
                        `}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar colaborador..."
                  className="bg-transparent outline-none flex-1 text-sm font-medium text-slate-700 placeholder:text-slate-400 cursor-pointer"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setIsDropdownOpen(true); }}
                  onClick={(e) => e.stopPropagation()}
                />
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-[320px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 space-y-1">
                    {searchedUsers.length === 0 ? (
                      <div className="p-4 text-center text-slate-400 text-sm italic">Nenhum colaborador encontrado</div>
                    ) : (
                      searchedUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => { setSelectedUserId(user.id); setIsDropdownOpen(false); setSearchTerm(''); }}
                          className={`
                                                w-full flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors group
                                                ${user.id === selectedUserId ? 'bg-purple-50 hover:bg-purple-100' : ''}
                                            `}
                        >
                          <div className="relative flex-shrink-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover border border-slate-200" alt="" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs border border-slate-200">
                                {user.name.charAt(0)}
                              </div>
                            )}
                            {user.missing > 2 && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate group-hover:text-[#4c1d95] ${user.id === selectedUserId ? 'text-[#4c1d95]' : 'text-slate-700'}`}>
                              {user.name}
                            </p>
                            <p className={`text-[10px] font-medium truncate ${user.missing > 2 ? 'text-red-500' : 'text-emerald-600'}`}>
                              {user.missing > 2 ? `${user.missing} pendências` : 'Em dia'}
                            </p>
                          </div>
                          {user.id === selectedUserId && <Check className="w-4 h-4 text-[#4c1d95]" />}
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
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-0">
        {/* Header do Calendário */}
        <div className="bg-gradient-to-r from-[#4c1d95] to-[#5b21b6] px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 text-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                {isAdmin ? processedUsers.find(u => u.id === targetUserId)?.name || 'Usuário' : 'Minhas Horas'}
              </h2>
              <div className="flex gap-4 text-xs font-medium text-purple-200">
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
              <span className="px-3 font-bold text-sm flex items-center min-w-[100px] justify-center">{monthNames[month]} {year}</span>
              <button
                onClick={navNextMonth}
                disabled={!canGoNext}
                className={`p-1.5 rounded-md text-white transition-colors ${canGoNext ? 'hover:bg-white/10' : 'opacity-30 cursor-not-allowed'}`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => navigate(`/timesheet/new?date=${new Date().toISOString().split('T')[0]}`)}
              className="bg-white text-[#4c1d95] hover:bg-purple-50 px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Lançar</span>
            </button>
          </div>
        </div>

        {/* Grid Days Header (Sticky) */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100 flex-shrink-0 sticky top-0 z-10">
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day, idx) => (
            <div key={day} className={`py-3 text-center text-[10px] font-black tracking-widest ${idx === 0 || idx === 6 ? 'text-red-400' : 'text-slate-400'}`}>
              {day}
            </div>
          ))}
        </div>

        {/* Grid Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50 relative">
          <div className="grid grid-cols-7 min-h-full auto-rows-fr bg-slate-50 gap-px border-b border-slate-200">
            {/* Empty Slots */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-white min-h-[100px]"></div>
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
                  onClick={() => navigate(`/timesheet/new?date=${dateStr}`)}
                  className={`
                                    bg-white p-2 relative cursor-pointer min-h-[120px] transition-all group border-transparent hover:z-10 hover:shadow-lg
                                    ${isToday ? 'bg-purple-50/20' : ''}
                                `}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${isToday ? 'bg-[#4c1d95] text-white shadow-md' : 'text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100'}`}>
                      {d}
                    </span>
                    {hasEntries && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        {totalDayHours.toFixed(1)}h
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEntries.map(entry => {
                      const task = safeTasks.find(t => t.id === entry.taskId);
                      const title = task?.title || entry.description || 'Horas';

                      return (
                        <div
                          key={entry.id}
                          onClick={(e) => { e.stopPropagation(); navigate(`/timesheet/${entry.id}`); }}
                          className="bg-slate-50 border border-slate-100 rounded px-1.5 py-1 text-[10px] text-slate-600 truncate hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors flex justify-between items-center group/item"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <div className={`w-1 h-1 rounded-full shrink-0 ${entry.totalHours >= 8 ? 'bg-emerald-400' : 'bg-purple-400'}`}></div>
                            <span className="truncate">{title}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEntryToDelete(entry); setDeleteModalOpen(true); }}
                            className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {!hasEntries && !isWeekend && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      <Plus className="w-8 h-8 text-slate-200" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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