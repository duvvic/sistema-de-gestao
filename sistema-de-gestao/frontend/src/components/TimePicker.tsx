import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TimePickerProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    icon?: React.ReactNode;
    disabledHours?: string[]; // Array of hours to disable (e.g., ['08', '09', '10'])
    disabledRanges?: { start: string; end: string }[]; // Array of time ranges to disable
}

const ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = 200;

const TimePicker: React.FC<TimePickerProps> = ({ label, value, onChange, icon, disabledHours = [], disabledRanges = [] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeColumn, setActiveColumn] = useState<'hours' | 'minutes'>('hours');
    const containerRef = useRef<HTMLDivElement>(null);
    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);

    // Parse value
    const [hoursStr, minutesStr] = (value || '00:00').split(':');

    // Key buffer for direct typing
    const [buffer, setBuffer] = useState('');
    const bufferTimeout = useRef<NodeJS.Timeout>(null);

    // Arrays
    const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')), []);
    const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')), []);

    // Snap to valid interval on load/change
    useEffect(() => {
        // Optional: Auto-correct input value to match 5-min steps if strictly required by UI
        // For now we just use the strings to find scroll position.
        // If value is 12:03, scroll might miss. We should probably snap visualization.
    }, [value]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Scroll Sync
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                // Find exact or closest match for scrolling
                let h = hoursStr;
                let m = minutesStr;

                // Simple clamp/snap for view only if exact match missing
                if (!hours.includes(h)) h = hours.find(x => parseInt(x) >= parseInt(h)) || hours[hours.length - 1];

                // Round minutes to closest 5
                const mInt = parseInt(m);
                const closestM = Math.round(mInt / 5) * 5;
                m = closestM.toString().padStart(2, '0');
                if (m === '60') m = '55';

                scrollToValue(hoursRef.current, h);
                scrollToValue(minutesRef.current, m);
            }, 10);
        }
    }, [isOpen, hoursStr, minutesStr, hours, minutes]);

    const scrollToValue = (element: HTMLDivElement | null, val: string) => {
        if (!element) return;
        const target = element.querySelector(`[data-value="${val}"]`) as HTMLElement;
        if (target) {
            element.scrollTo({
                top: target.offsetTop - (WHEEL_HEIGHT / 2) + (ITEM_HEIGHT / 2),
                behavior: 'instant' // Instant first, then smooth for user interactions
            });
        }
    };

    const updateTime = (h: string, m: string) => {
        // Check if hour is disabled
        if (disabledHours.includes(h)) return;
        onChange(`${h}:${m}`);
    };

    // Typing Logic
    const handleTyping = (key: string) => {
        const newBuffer = buffer + key;
        setBuffer(newBuffer);

        if (bufferTimeout.current) clearTimeout(bufferTimeout.current);
        bufferTimeout.current = setTimeout(() => setBuffer(''), 1000);

        const num = parseInt(newBuffer, 10);

        if (activeColumn === 'hours') {
            if (newBuffer.length === 2 || num > 2) {
                let val = Math.max(0, Math.min(23, num)).toString().padStart(2, '0');
                // Better logic: if user types '0', wait. '07' ok. '6' -> wait? '8' -> '08'.
                // Simple approach: strict clamp
                updateTime(val, minutesStr);
                setBuffer('');
                setActiveColumn('minutes');
            }
        } else {
            if (newBuffer.length === 2 || num > 5) {
                // Round to nearest 5 for minutes?
                let closest = Math.round(Math.min(59, num) / 5) * 5;
                if (closest === 60) closest = 55;
                updateTime(hoursStr, closest.toString().padStart(2, '0'));
                setBuffer('');
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Tab') return; // Default behavior

        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            return;
        }

        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === ' ')) {
            setIsOpen(true);
            e.preventDefault();
            return;
        }

        // Number keys
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            handleTyping(e.key);
            if (!isOpen) setIsOpen(true); // Open on type
            return;
        }

        // Arrow Navigation
        if (isOpen) {
            if (e.key === 'ArrowLeft') { setActiveColumn('hours'); e.preventDefault(); }
            if (e.key === 'ArrowRight') { setActiveColumn('minutes'); e.preventDefault(); }

            const currentHIndex = hours.indexOf(hoursStr);
            const currentMIndex = minutes.indexOf(minutesStr);

            // Helper to find closest index if current value is off-grid
            const getClosestIndex = (arr: string[], val: string) => {
                const idx = arr.indexOf(val);
                if (idx !== -1) return idx;
                // Find closest
                const intVal = parseInt(val);
                let closestI = 0;
                let minDiff = Infinity;
                arr.forEach((str, i) => {
                    const diff = Math.abs(parseInt(str) - intVal);
                    if (diff < minDiff) { minDiff = diff; closestI = i; }
                });
                return closestI;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (activeColumn === 'hours') {
                    const idx = currentHIndex !== -1 ? currentHIndex : getClosestIndex(hours, hoursStr);
                    const prevIndex = (idx - 1 + hours.length) % hours.length;
                    updateTime(hours[prevIndex], minutesStr);
                } else {
                    const idx = currentMIndex !== -1 ? currentMIndex : getClosestIndex(minutes, minutesStr);
                    const prevIndex = (idx - 1 + minutes.length) % minutes.length;
                    updateTime(hoursStr, minutes[prevIndex]);
                }
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (activeColumn === 'hours') {
                    const idx = currentHIndex !== -1 ? currentHIndex : getClosestIndex(hours, hoursStr);
                    const nextIndex = (idx + 1) % hours.length;
                    updateTime(hours[nextIndex], minutesStr);
                } else {
                    const idx = currentMIndex !== -1 ? currentMIndex : getClosestIndex(minutes, minutesStr);
                    const nextIndex = (idx + 1) % minutes.length;
                    updateTime(hoursStr, minutes[nextIndex]);
                }
            }
        }
    };

    return (
        <div className="relative group w-full" ref={containerRef} onKeyDown={handleKeyDown}>
            <style>{`
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>

            <label className="block text-xs font-bold mb-2 flex items-center gap-2 uppercase tracking-wider text-[var(--muted)]">
                {icon} {label}
            </label>

            {/* Trigger Area */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                    w-full p-4 border rounded-xl flex items-center justify-between transition-all outline-none
                    ${isOpen
                            ? 'opacity-0 pointer-events-none'  // Hide button when open, so Picker appears "in place"
                            : 'border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-hover)]'}
                `}
                >
                    <span className="text-xl font-mono font-bold tracking-widest text-[var(--text)]">
                        {value || '00:00'}
                    </span>
                    <ChevronDown className="w-5 h-5 text-[var(--muted)]" />
                </button>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="absolute top-0 left-0 w-full z-50 rounded-xl overflow-hidden shadow-2xl border border-[var(--border)]"
                            style={{ backgroundColor: '#18181b', height: '240px' }}
                        >
                            {/* Header/Close */}
                            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10">
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                                    {activeColumn === 'hours' ? 'Digitando Horas...' : 'Digitando Minutos...'}
                                </span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                    className="p-1 hover:bg-white/10 rounded text-[var(--primary)] font-bold text-xs"
                                >
                                    OK
                                </button>
                            </div>

                            {/* Relative Container for Wheel */}
                            <div className="relative h-[200px] flex items-center justify-center bg-[#18181b]">

                                {/* Selection Bar (The "Middle" Overlay) */}
                                <div className="absolute top-[80px] left-0 right-0 h-[40px] bg-[var(--primary)]/10 border-y border-[var(--primary)]/30 pointer-events-none z-0" />

                                {/* Masks */}
                                <div className="absolute top-0 left-0 right-0 h-[80px] bg-gradient-to-b from-[#18181b] to-transparent z-10 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-[#18181b] to-transparent z-10 pointer-events-none" />

                                <div className="flex w-full px-8 z-20">
                                    {/* Hours */}
                                    <div
                                        className={`flex-1 h-[200px] overflow-y-auto no-scrollbar snap-y snap-mandatory text-center cursor-pointer outline-none ${activeColumn === 'hours' ? 'text-white' : 'text-white/30'}`}
                                        ref={hoursRef}
                                        onClick={() => setActiveColumn('hours')}
                                    >
                                        <div className="h-[80px]" />
                                        {hours.map(h => {
                                            const isDisabled = disabledHours.includes(h);
                                            return (
                                                <div
                                                    key={h}
                                                    data-value={h}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isDisabled) {
                                                            updateTime(h, minutesStr);
                                                            setActiveColumn('hours');
                                                        }
                                                    }}
                                                    className={`h-[40px] flex items-center justify-center snap-center font-bold text-xl transition-all
                                                ${isDisabled ? 'opacity-20 cursor-not-allowed line-through text-red-400' :
                                                            hoursStr === h ? 'text-[var(--primary)] scale-110' : 'opacity-40 hover:opacity-70 cursor-pointer'}`}
                                                >
                                                    {h}
                                                </div>
                                            );
                                        })}
                                        <div className="h-[80px]" />
                                    </div>

                                    <div className="flex items-center justify-center text-white/20 pb-1 font-mono text-xl">:</div>

                                    {/* Minutes */}
                                    <div
                                        className={`flex-1 h-[200px] overflow-y-auto no-scrollbar snap-y snap-mandatory text-center cursor-pointer outline-none ${activeColumn === 'minutes' ? 'text-white' : 'text-white/30'}`}
                                        ref={minutesRef}
                                        onClick={() => setActiveColumn('minutes')}
                                    >
                                        <div className="h-[80px]" />
                                        {minutes.map(m => (
                                            <div
                                                key={m}
                                                data-value={m}
                                                onClick={(e) => { e.stopPropagation(); updateTime(hoursStr, m); setActiveColumn('minutes'); }}
                                                className={`h-[40px] flex items-center justify-center snap-center font-bold text-xl transition-all
                                                ${minutesStr === m ? 'text-[var(--primary)] scale-110' : 'opacity-40 hover:opacity-70'}`}
                                            >
                                                {m}
                                            </div>
                                        ))}
                                        <div className="h-[80px]" />
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default TimePicker;
