import React, { useMemo } from 'react';
import { useDataController } from '@/controllers/useDataController';
import { Absence, User } from '@/types';
import { Calendar, Palmtree, AlertCircle, Coffee, Briefcase, CheckSquare, CalendarDays, User as UserIcon } from 'lucide-react';
import { addBusinessDays } from '@/utils/capacity';

const AbsenceStatusWidget: React.FC = () => {
    const { absences, users, holidays } = useDataController();

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

            const nextBizDay = addBusinessDays(a.endDate, 1, holidays);
            const isReturningToday = nextBizDay === today.toISOString().split('T')[0];

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
        <div className="rounded-[24px] shadow-sm overflow-hidden flex flex-col font-sans" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            {/* Cabecalho */}
            <div className="p-5 flex items-center gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center shrink-0 border-4 shadow-sm overflow-hidden" style={{ borderColor: 'var(--surface)' }}>
                    <img src={robotAvatarUrl} alt="Relatório" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h2 className="text-[18px] font-medium leading-tight" style={{ color: 'var(--text)' }}>Relatório de Ausências</h2>
                    <p className="text-[14px] mt-0.5 font-normal" style={{ color: 'var(--text-muted)' }}>Atualização Diária</p>
                </div>
            </div>

            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                {/* 1. DE VOLTA HOJE */}
                {statusData.returningToday.length > 0 && (
                    <div className="p-5">
                        <h3 className="text-[16px] font-normal mb-4" style={{ color: 'var(--text)' }}>De volta hoje!</h3>
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
                                        <p className="text-[13px] mb-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>De volta hoje!</p>
                                        <p className="text-[15px] font-medium mb-1 leading-none" style={{ color: 'var(--text)' }}>{user.name}</p>
                                        <div className="flex items-center gap-1.5 text-emerald-500">
                                            <CheckSquare size={14} />
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
                        <h3 className="text-[16px] font-normal mb-4" style={{ color: 'var(--text)' }}>Ausentes hoje</h3>
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
                                        <p className="text-[13px] mb-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>{getTypeDisplay(absence.type)}</p>
                                        <p className="text-[15px] font-medium mb-1 leading-none" style={{ color: 'var(--text)' }}>{user.name}</p>
                                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                                            {absence.type === 'férias' ? (
                                                <Palmtree size={14} className="text-orange-500" />
                                            ) : (
                                                <CalendarDays size={14} className="text-blue-400" />
                                            )}
                                            <span className="text-[13px] font-normal">Volta em: {formatShortDate(addBusinessDays(absence.endDate, 1, holidays))}</span>
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
                        <h3 className="text-[16px] font-normal mb-4" style={{ color: 'var(--text)' }}>Próximas Ausências</h3>
                        <div className="space-y-4">
                            {statusData.futureAbsences.slice(0, 5).map(({ user, absence }) => (
                                <div key={absence.id} className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm icon-box">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon size={20} className="text-slate-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <p className="text-[13px] mb-0.5 leading-none" style={{ color: 'var(--text-muted)' }}>{getTypeDisplay(absence.type)}</p>
                                        <p className="text-[15px] font-medium mb-1 leading-none" style={{ color: 'var(--text)' }}>{user.name}</p>
                                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
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
                        <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>Nenhum registro de ausência no momento.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default AbsenceStatusWidget;
