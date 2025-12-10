import React, { useState } from 'react';
import { TimesheetEntry } from '../types';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';

interface TimesheetCalendarProps {
  entries: TimesheetEntry[];
  onDateClick: (date: string) => void;
  onEntryClick: (entry: TimesheetEntry) => void;
  tasks?: { id: string; title: string }[];
}

const TimesheetCalendar: React.FC<TimesheetCalendarProps> = ({ entries, onDateClick, onEntryClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(<div key={`empty-${i}`} className="bg-slate-50 border border-slate-100 min-h-[100px]"></div>);
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEntries = entries.filter(e => e.date === dateStr);
    const totalHours = dayEntries.reduce((acc, curr) => acc + curr.totalHours, 0);

    const isToday = new Date().toISOString().split('T')[0] === dateStr;
    const hasEntries = dayEntries.length > 0;

    days.push(
      <div 
        key={d} 
        onClick={() => onDateClick(dateStr)}
        className={`
          min-h-[120px] p-2 relative group cursor-pointer transition-all border-2
          ${hasEntries
            ? 'bg-green-50/40 border-green-300 hover:bg-green-50/60'
            : isToday
            ? 'bg-purple-50/40 border-purple-300 hover:bg-purple-50/60'
            : 'bg-white border-slate-100 hover:bg-slate-50'
          }
        `}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`
            text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
            ${hasEntries
              ? 'bg-green-500 text-white'
              : isToday
              ? 'bg-[#4c1d95] text-white'
              : 'text-slate-700'
            }
          `}>
            {d}
          </span>
          {hasEntries && (
            <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-1 rounded-full flex items-center gap-1">
              <span>✓</span>
              <span>{totalHours.toFixed(1)}h</span>
            </span>
          )}
        </div>

        <div className="space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
          {(() => {
            if (dayEntries.length === 0) {
              return (
                <div className="text-[11px] text-slate-400 italic px-2 py-1">
                  Sem apontamentos
                </div>
              );
            }

            const previews = dayEntries.slice(0, 3).map(entry => {
              const taskTitle = tasks?.find(t => t.id === entry.taskId)?.title || entry.description || 'Sem descrição';
              return (
                <div
                  key={entry.id}
                  onClick={(e) => { e.stopPropagation(); onEntryClick(entry); }}
                  className="text-[11px] bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300 truncate hover:bg-green-200 transition-colors cursor-pointer"
                >
                  {entry.startTime} • {taskTitle}
                </div>
              );
            });

            const more = dayEntries.length - previews.length;
            return (
              <>
                {previews}
                {more > 0 && (
                  <div className="text-[11px] text-green-700 font-semibold px-2 py-1">+{more} mais</div>
                )}
              </>
            );
          })()}
        </div>

        {/* Hover Add Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
           <div className="bg-[#4c1d95] text-white p-2 rounded-full shadow-lg">
              <Plus className="w-5 h-5" />
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
           <Clock className="w-6 h-6 text-[#4c1d95]" />
           Apontamento de Horas
        </h2>
        
        <div className="flex items-center gap-4">
          <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
             <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-slate-800 min-w-[150px] text-center">
            {monthNames[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
             <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button 
          onClick={() => onDateClick(new Date().toISOString().split('T')[0])}
          className="bg-[#4c1d95] text-white px-4 py-2 rounded-xl font-medium shadow-md hover:bg-[#3b1675] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar Hoje
        </button>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar bg-slate-100 gap-px border-l border-slate-100">
        {days}
      </div>
    </div>
  );
};

export default TimesheetCalendar;