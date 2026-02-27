import React, { useMemo } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { Absence, User } from '@/types';
import { Calendar, Palmtree, AlertCircle, Coffee, Briefcase, CheckSquare, CalendarDays, User as UserIcon } from 'lucide-react';

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

    const formatShortDate = (dateStr: string) => {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getTypeDisplay = (type: Absence['type']) => {
        switch (type) {
            case 'férias': return 'Férias';
            case 'atestado': return 'Atestado Médico';
            case 'day-off': return 'Day Off / Folga';
            default: return 'Ausência planejada';
        }
    };

    // Usar uma imagem genérica ou ícone para o robô, já que não temos a original
    const robotAvatarUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=niclabs&backgroundColor=f8f9fa";

    return (
        <div className="bg-white dark:bg-[var(--surface-2)] rounded-[24px] border border-gray-100 dark:border-[var(--border)] shadow-sm overflow-hidden flex flex-col font-sans">
            {/* Cabecalho */}
            <div className="p-5 flex items-center gap-4 border-b border-gray-100 dark:border-[var(--border)]">
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center shrink-0 border-4 border-white dark:border-[var(--surface)] shadow-sm overflow-hidden">
                    <img src={robotAvatarUrl} alt="Relatório" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h2 className="text-[18px] font-medium text-slate-800 dark:text-[var(--text)] leading-tight">Relatório de Ausências</h2>
                    <p className="text-[14px] text-slate-500 dark:text-[var(--muted)] mt-0.5 font-normal">Atualização Diária</p>
                </div>
            </div>

            <div className="flex flex-col divide-y divide-gray-100 dark:divide-[var(--border)]">
                {/* 1. DE VOLTA HOJE */}
                {statusData.returningToday.length > 0 && (
                    <div className="p-5">
                        <h3 className="text-[16px] font-normal text-slate-800 dark:text-[var(--text)] mb-4">De volta hoje!</h3>
                        <div className="space-y-4">
                            {statusData.returningToday.map(({ user }) => (
                                <div key={user.id} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden border border-blue-200 shadow-sm">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-blue-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-[13px] text-slate-600 dark:text-[var(--muted)] mb-0.5 leading-none">De volta hoje!</p>
                                        <p className="text-[15px] font-medium text-slate-800 dark:text-[var(--text)] mb-1 leading-none">{user.name}</p>
                                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
                                            <CheckSquare size={14} className="fill-emerald-100 dark:fill-emerald-500/20" />
                                            <span className="text-[13px] font-medium">Disponível</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. AUSENTES HOJE */}
                {statusData.absentToday.length > 0 && (
                    <div className="p-5">
                        <h3 className="text-[16px] font-normal text-slate-800 dark:text-[var(--text)] mb-4">Ausentes hoje</h3>
                        <div className="space-y-4">
                            {statusData.absentToday.map(({ user, absence }) => (
                                <div key={absence.id} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 overflow-hidden border border-amber-200 shadow-sm">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-amber-500" />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-[13px] text-slate-600 dark:text-[var(--muted)] mb-0.5 leading-none">{getTypeDisplay(absence.type)}</p>
                                        <p className="text-[15px] font-medium text-slate-800 dark:text-[var(--text)] mb-1 leading-none">{user.name}</p>
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                            {absence.type === 'férias' ? (
                                                <Palmtree size={14} className="text-orange-500" />
                                            ) : (
                                                <CalendarDays size={14} className="text-blue-400" />
                                            )}
                                            <span className="text-[13px] font-normal">Volta em: {formatShortDate(addBusinessDaysString(absence.endDate, 1))}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 3. PRÓXIMAS AUSÊNCIAS */}
                {statusData.futureAbsences.length > 0 && (
                    <div className="p-5">
                        <h3 className="text-[16px] font-normal text-slate-800 dark:text-[var(--text)] mb-4">Próximas Ausências</h3>
                        <div className="space-y-4">
                            {statusData.futureAbsences.slice(0, 5).map(({ user, absence }) => (
                                <div key={absence.id} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-[13px] text-slate-600 dark:text-[var(--muted)] mb-0.5 leading-none">{getTypeDisplay(absence.type)}</p>
                                        <p className="text-[15px] font-medium text-slate-800 dark:text-[var(--text)] mb-1 leading-none">{user.name}</p>
                                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                                            <CalendarDays size={14} className="text-indigo-400" />
                                            <span className="text-[13px] font-normal">{formatShortDate(absence.startDate)} - {formatShortDate(absence.endDate)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* EMPTy STATE */}
                {statusData.returningToday.length === 0 && statusData.absentToday.length === 0 && statusData.futureAbsences.length === 0 && (
                    <div className="p-8 flex items-center justify-center flex-col text-center opacity-50">
                        <Calendar size={32} className="text-slate-400 mb-3" />
                        <p className="text-[14px] text-slate-600 dark:text-[var(--muted)]">Nenhum registro de ausência no momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper function equivalent to adding 1 day, roughly (without holiday logic, just simple +1 day)
function addBusinessDaysString(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    // Skip weekends
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);

    return d.toISOString().split('T')[0];
}

export default AbsenceStatusWidget;
