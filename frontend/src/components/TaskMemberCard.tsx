// components/TaskMemberCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Crown, X, Lock, AlertTriangle, CheckCircle, Clock, TrendingUp, ChevronRight, Activity } from 'lucide-react';
import { User } from '@/types';
import { formatDecimalToTime, parseTimeToDecimal } from '@/utils/normalizers';

interface AvailabilityInfo {
  capacityInRange: number;
  continuousCommitment: number;
  reservedInOtherTasks: number;
  availableHours: number;
}

interface TaskMemberCardProps {
  user: User;
  isResponsible: boolean;
  hasPeriod: boolean;
  avail: AvailabilityInfo | null;
  reservedHours: number;
  memberRealHours: number;
  isOverReserved: boolean;
  saldoDisponivel: number | null;
  taskBalance: number;
  monthlyBalance?: number | null;
  onReservedChange: (hours: number) => void;
  onRemove?: () => void;
}

// ─── Micro-component: Stat cell in the capacity breakdown row ───────────────
const StatCell: React.FC<{
  label: string;
  value: string;
  color?: string;
  prefix?: string;
}> = ({ label, value, color, prefix }) => (
  <div className="flex flex-col gap-0.5 px-2 py-1.5">
    <span
      className="text-[7px] font-black uppercase tracking-widest leading-none"
      style={{ color: 'var(--text-muted)' }}
    >
      {prefix && <span className="opacity-70">{prefix}</span>}
      {label}
    </span>
    <span
      className="text-[11px] font-black tabular-nums leading-none"
      style={{ color: color || 'var(--text)' }}
    >
      {value}
    </span>
  </div>
);

// ─── Micro-component: Progress Bar ──────────────────────────────────────────
const MiniBar: React.FC<{
  value: number;   // 0–100 percentage
  color: string;
  bgColor?: string;
  height?: number;
}> = ({ value, color, bgColor, height = 3 }) => {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, backgroundColor: bgColor || 'var(--border)' }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const TaskMemberCard: React.FC<TaskMemberCardProps> = ({
  user,
  isResponsible,
  hasPeriod,
  avail,
  reservedHours,
  memberRealHours,
  isOverReserved,
  saldoDisponivel,
  taskBalance,
  monthlyBalance,
  onReservedChange,
  onRemove,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const [reservedInput, setReservedInput] = React.useState(
    formatDecimalToTime(reservedHours)
  );

  // Sincroniza o input apenas quando não estiver em foco
  React.useEffect(() => {
    if (!isFocused) {
      setReservedInput(formatDecimalToTime(reservedHours));
    }
  }, [reservedHours, isFocused]);
  // Derived values
  const utilizationPct =
    saldoDisponivel && saldoDisponivel > 0
      ? Math.min(100, (reservedHours / saldoDisponivel) * 100)
      : reservedHours > 0
        ? 100
        : 0;

  const execPct =
    reservedHours > 0
      ? Math.min(100, (memberRealHours / reservedHours) * 100)
      : memberRealHours > 0
        ? 100
        : 0;

  // Colors
  const accentColor = isOverReserved
    ? '#ef4444'
    : isResponsible
      ? 'var(--primary)'
      : 'var(--border-strong)';

  const saldoColor =
    saldoDisponivel === null
      ? 'var(--text-muted)'
      : isOverReserved
        ? '#ef4444'
        : saldoDisponivel === 0
          ? '#f59e0b'
          : 'var(--success)';

  const utilizationBarColor = isOverReserved
    ? '#ef4444'
    : utilizationPct >= 90
      ? '#f59e0b'
      : 'var(--primary)';

  const execBarColor =
    execPct >= 100 ? 'var(--success)' : execPct >= 60 ? '#3b82f6' : '#94a3b8';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border overflow-hidden flex flex-col transition-shadow"
      style={{
        backgroundColor: 'var(--bg)',
        borderColor: isOverReserved ? '#ef444444' : 'var(--border)',
        boxShadow: isOverReserved
          ? '0 0 0 1px rgba(239,68,68,0.25), var(--shadow-xs)'
          : 'var(--shadow-xs)',
      }}
    >
      {/* ── Top Accent Bar ─────────────────────────────────────────────── */}
      <div
        className="h-0.5 w-full shrink-0"
        style={{ backgroundColor: accentColor }}
      />

      {/* ── Header: Avatar + Name + Badge ──────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-black border shadow-sm"
          style={{
            borderColor: accentColor,
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
          }}
        >
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{user.name.substring(0, 2).toUpperCase()}</span>
          )}
        </div>

        {/* Name + badge */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[11px] font-extrabold uppercase truncate leading-tight"
            style={{ color: 'var(--text)' }}
          >
            {user.name.split(' (')[0]}
          </p>
          <div className="mt-0.5">
            {isResponsible ? (
              <span className="inline-flex items-center gap-0.5 text-[7px] font-black bg-yellow-400 text-yellow-950 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                <Crown size={7} />
                Responsável
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                Membro
              </span>
            )}
          </div>
        </div>

        {/* Remove button (non-responsible only) */}
        {!isResponsible && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-all opacity-30 hover:opacity-100 hover:bg-red-500/10 hover:text-red-500 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* ── Capacity Breakdown ─────────────────────────────────────────── */}
      {hasPeriod && avail ? (
        <div className="px-3 pb-2 text-center">
          <div
            className={`rounded-xl border flex flex-col items-center justify-center py-2.5 transition-all duration-300 ${taskBalance < 0 ? 'bg-red-500/10 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-[var(--surface)] border-[var(--border)]'}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[7px] font-black uppercase tracking-widest leading-none opacity-40">Saldo da Tarefa (A distribuir)</span>
              {taskBalance < 0 && <AlertTriangle size={8} className="text-red-500 animate-pulse" />}
            </div>
            <span
              className={`text-xl font-black tabular-nums leading-none tracking-tight ${taskBalance < 0 ? 'text-red-500' : taskBalance === 0 ? 'opacity-40' : 'text-[var(--primary)]'}`}
            >
              {formatDecimalToTime(taskBalance)}
            </span>
            {taskBalance < 0 ? (
              <p className="text-[6px] font-black mt-1 text-red-500 uppercase tracking-tighter italic">Distribuição maior que o planejado!</p>
            ) : (
              <p className="text-[6px] font-bold mt-1 opacity-20 uppercase tracking-tighter italic">Baseado nas Horas da Tarefa (Forecast)</p>
            )}
          </div>
        </div>
      ) : (
        <div className="px-3 pb-2">
          <div
            className="rounded-xl px-3 py-2 border border-dashed text-center"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <span className="text-[8px] font-bold italic" style={{ color: 'var(--text-muted)' }}>
              Defina o período da tarefa para ver a capacidade
            </span>
          </div>
        </div>
      )}

      {/* ── Saldo + HRS Reservadas + Utilization bar ───────────────────── */}
      <div
        className="px-3 pb-2 pt-1 mx-3 mb-2 rounded-xl border"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              <Lock size={7} /> Saldo (Mensal)
            </span>
            <span
              className="text-sm font-black tabular-nums leading-none"
              style={{ color: (monthlyBalance ?? 0) < 0 ? '#ef4444' : 'var(--success)' }}
            >
              {monthlyBalance !== null && monthlyBalance !== undefined ? formatDecimalToTime(monthlyBalance) : '--'}
            </span>
            {hasPeriod && saldoDisponivel !== null && (
              <p className="text-[6px] font-bold opacity-30 uppercase mt-0.5">
                Período: {formatDecimalToTime(saldoDisponivel)}
              </p>
            )}
          </div>

          {/* Horas Reservadas input */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[7px] font-black uppercase tracking-widest flex items-center gap-0.5"
              style={{ color: isOverReserved ? '#ef4444' : 'var(--text-muted)' }}
            >
              {isOverReserved && <AlertTriangle size={7} />}
              Hrs Reservadas
            </span>
            <input
              type="text"
              value={reservedInput}
              placeholder="0:00"
              onChange={e => {
                const val = e.target.value;
                // Remove qualquer 'h' acidental durante a digitação para manter limpo
                const cleanVal = val.replace(/h/g, '');
                setReservedInput(cleanVal);
              }}
              onFocus={e => {
                setIsFocused(true);
                // Ao focar, remove o 'h' e formatação para edição limpa
                const cleanValue = reservedHours === 0 ? '' : reservedHours.toString().replace('.', ':');
                setReservedInput(cleanValue);
                setTimeout(() => e.target.select(), 0);
              }}
              onBlur={() => {
                setIsFocused(false);
                const decimal = parseTimeToDecimal(reservedInput);
                onReservedChange(decimal);
                // O useEffect cuidará de formatar o valor final com 'h'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={`w-full px-2 py-2.5 text-sm font-black border rounded-xl outline-none transition-all text-center ${taskBalance < 0
                ? 'border-red-500 bg-red-500/10 text-red-500 ring-2 ring-red-500/20'
                : isOverReserved
                  ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                  : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:border-[var(--primary)]'
                }`}
            />
          </div>
        </div>

        {/* Utilization bar: reserved / available */}
        {hasPeriod && saldoDisponivel !== null && (
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[7px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                Utilização
              </span>
              <span
                className="text-[7px] font-black tabular-nums"
                style={{ color: utilizationBarColor }}
              >
                {utilizationPct.toFixed(0)}%
              </span>
            </div>
            <MiniBar value={utilizationPct} color={utilizationBarColor} height={4} />
          </div>
        )}
      </div>

      {/* ── Real Executed ───────────────────────────────────────────────── */}
      <div
        className="px-3 pb-3 flex flex-col gap-1"
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[7px] font-black uppercase tracking-widest flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            <CheckCircle size={8} className="text-emerald-500" />
            Real Exec.
          </span>
          <span className="text-[11px] font-black tabular-nums" style={{ color: 'var(--success)' }}>
            {formatDecimalToTime(memberRealHours)}
          </span>
        </div>
        {/* Execution progress vs reserved */}
        {reservedHours > 0 && (
          <>
            <MiniBar value={execPct} color={execBarColor} bgColor="var(--border-muted)" height={3} />
            <div className="flex justify-between items-center">
              <span className="text-[6px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                Executado
              </span>
              <span className="text-[6px] font-black tabular-nums" style={{ color: execBarColor }}>
                {execPct.toFixed(0)}% do reservado
              </span>
            </div>
          </>
        )}

        {/* Overload alert (Reserved vs Availability) */}
        {isOverReserved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg mt-0.5"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle size={9} className="text-red-500 animate-pulse flex-shrink-0" />
            <span className="text-[7px] font-black text-red-500 uppercase tracking-wide">
              Reserva excede o saldo disponível
            </span>
          </motion.div>
        )}

        {/* Execution Alert (Real vs Reserved) */}
        {memberRealHours > reservedHours && reservedHours > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg mt-1"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <Activity size={9} className="text-red-500 flex-shrink-0" />
            <span className="text-[7px] font-black text-red-500 uppercase tracking-wide">
              Execução excedeu a reserva ({formatDecimalToTime(memberRealHours - reservedHours)})
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default TaskMemberCard;
