import React, { useMemo } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { Absence, User } from '@/types';
import {
    Calendar, Clock, Palmtree, ArrowRight, CheckCircle2,
    AlertCircle, PartyPopper, Coffee, Briefcase
} from 'lucide-react';

const AbsenceStatusWidget: React.FC = () => {
    const { absences, users } = useDataController();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isMonday = today.getDay() === 1;

    const statusData = useMemo(() => {
        const activeAbsences = (absences || []).filter(a => a.status === 'finalizada_dp');

        const returningToday: { user: User; absence: Absence }[] = [];
        const absentToday: { user: User; absence: Absence }[] = [];
        const futureAbsences: { user: User; absence: Absence }[] = [];

        activeAbsences.forEach(a => {
            const user = users.find(u => u.id === a.userId);
            if (!user) return;

            const start = new Date(a.startDate + 'T00:00:00');
            const end = new Date(a.endDate + 'T00:00:00');

            const isReturningFromWeekend = isMonday && (end >= new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000) && end < today);
            const isReturningToday = end.getTime() === yesterday.getTime() || isReturningFromWeekend;

            if (isReturningToday) {
                returningToday.push({ user, absence: a });
            } else if (start <= today && end >= today) {
                absentToday.push({ user, absence: a });
            } else if (start > today) {
                futureAbsences.push({ user, absence: a });
            }
        });

        futureAbsences.sort((a, b) => new Date(a.absence.startDate).getTime() - new Date(b.absence.startDate).getTime());
        absentToday.sort((a, b) => new Date(a.absence.startDate).getTime() - new Date(b.absence.startDate).getTime());

        return { returningToday, absentToday, futureAbsences };
    }, [absences, users, today, isMonday, yesterday]);

    const getTypeIcon = (type: Absence['type']) => {
        switch (type) {
            case 'férias': return <Palmtree size={12} className="text-emerald-500" />;
            case 'atestado': return <AlertCircle size={12} className="text-red-500" />;
            case 'day-off': return <Coffee size={12} className="text-amber-500" />;
            default: return <Briefcase size={12} className="text-blue-500" />;
        }
    };

    if (statusData.returningToday.length === 0 && statusData.absentToday.length === 0 && statusData.futureAbsences.length === 0) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text)] flex items-center gap-2 opacity-70">
                <Calendar size={12} className="text-[var(--primary)]" />
                Painel de Disponibilidade em Tempo Real
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* 1. DE VOLTA HOJE */}
                <div className="bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-emerald-600 mb-2">
                        <PartyPopper size={10} /> De Volta Hoje
                    </div>
                    <div className="space-y-1">
                        {statusData.returningToday.length > 0 ? (
                            statusData.returningToday.map(({ user }) => (
                                <div key={user.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-[8px] font-black text-emerald-700 shrink-0 capitalize">
                                        {user.name.charAt(0)}
                                    </div>
                                    <p className="text-[10px] font-black text-[var(--text)] truncate">{user.name}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-[7px] font-bold text-[var(--muted)] italic text-center p-1 opacity-40">Nenhum retorno</p>
                        )}
                    </div>
                </div>

                {/* 2. AUSENTES HOJE */}
                <div className="bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-amber-600 mb-2">
                        <Clock size={10} /> Ausentes Agora
                    </div>
                    <div className="space-y-1">
                        {statusData.absentToday.length > 0 ? (
                            statusData.absentToday.map(({ user, absence }) => (
                                <div key={absence.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
                                    <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[8px] font-black text-amber-700 shrink-0">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-[var(--text)] truncate leading-none mb-0.5">{user.name}</p>
                                        <div className="flex items-center gap-1">
                                            {getTypeIcon(absence.type)}
                                            <span className="text-[7px] font-black text-amber-600 uppercase">Volta {new Date(absence.endDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[7px] font-bold text-[var(--muted)] italic text-center p-1 opacity-40">Time completo</p>
                        )}
                    </div>
                </div>

                {/* 3. PRÓXIMAS AUSÊNCIAS */}
                <div className="bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase text-[var(--primary)] mb-2">
                        <ArrowRight size={10} /> Escala Próxima
                    </div>
                    <div className="space-y-1">
                        {statusData.futureAbsences.length > 0 ? (
                            statusData.futureAbsences.slice(0, 3).map(({ user, absence }) => (
                                <div key={absence.id} className="flex items-center gap-2 px-2 py-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg opacity-80">
                                    <div className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[8px] font-black text-[var(--muted)] shrink-0">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-black text-[var(--text)] truncate leading-none mb-0.5">{user.name}</p>
                                        <span className="text-[7px] font-bold text-[var(--muted)] uppercase">Início {new Date(absence.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[7px] font-bold text-[var(--muted)] italic text-center p-1 opacity-40">Sem agendamentos</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AbsenceStatusWidget;
