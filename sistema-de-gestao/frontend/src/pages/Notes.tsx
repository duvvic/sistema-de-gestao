import React, { useEffect, useState } from 'react';
import { getNotesLinks, syncNotes, NoteTab } from '@/services/notesApi';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseClient';
import { ExternalLink, StickyNote, CheckSquare, BookOpen, Clipboard, Lightbulb, ArrowRight, Copy, Check, Plus, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Notes: React.FC = () => {
    const { currentUser } = useAuth();
    const [tabs, setTabs] = useState<NoteTab[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNoteLabel, setNewNoteLabel] = useState('');
    const [newNoteType, setNewNoteType] = useState('notas');
    const [creating, setCreating] = useState(false);

    // Helpers para UI
    const getMetaForKey = (type: string) => {
        switch (type) {
            case 'notas': return { icon: <StickyNote size={20} style={{ color: 'var(--note-yellow)' }} />, bg: 'var(--note-bg-yellow)', border: 'var(--note-yellow)', desc: 'Anotações gerais.' };
            case 'pendencias': return { icon: <CheckSquare size={20} style={{ color: 'var(--note-blue)' }} />, bg: 'var(--note-bg-blue)', border: 'var(--note-blue)', desc: 'Tarefas e pendências.' };
            case 'docs': return { icon: <BookOpen size={20} style={{ color: 'var(--note-purple)' }} />, bg: 'var(--note-bg-purple)', border: 'var(--note-purple)', desc: 'Docs e referências.' };
            case 'temp': return { icon: <Clipboard size={20} style={{ color: 'var(--note-orange)' }} />, bg: 'var(--note-bg-orange)', border: 'var(--note-orange)', desc: 'Área temporária.' };
            case 'brainstorm': return { icon: <Lightbulb size={20} style={{ color: 'var(--note-green)' }} />, bg: 'var(--note-bg-green)', border: 'var(--note-green)', desc: 'Ideias e insights.' };
            default: return { icon: <StickyNote size={20} style={{ color: 'var(--muted)' }} />, bg: 'rgba(156, 163, 175, 0.1)', border: 'var(--muted)', desc: 'Nota pessoal.' };
        }
    };

    // Cache key specific to user
    const CACHE_KEY = `notes_cache_${currentUser?.id}`;

    const fetchLinks = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        try {
            const data = await getNotesLinks(session.access_token);
            setTabs(data.tabs);
            // Save to cache
            localStorage.setItem(CACHE_KEY, JSON.stringify(data.tabs));
        } catch (err) {
            console.error('[Notes] Erro ao carregar links:', err);
            // Silently fail - keep cached data if available
            // Don't set error to avoid breaking the UI
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            // Load from cache immediately
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                try {
                    setTabs(JSON.parse(cached));
                    setLoading(false);
                } catch (e) {
                    console.warn('Invalid cache');
                }
            }
            // Fetch fresh data in background
            fetchLinks();
        }
    }, [currentUser]);

    const handleCopy = (e: React.MouseEvent, url: string, key: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(url);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDelete = async (e: React.MouseEvent, keyToDelete: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const updatedTabs = tabs.filter(t => t.key !== keyToDelete);
            const tabsToSend = updatedTabs.map(t => ({
                key: t.key,
                label: t.label,
                slug: t.slug,
                type: t.type
            }));

            await syncNotes(session.access_token, tabsToSend);
            await fetchLinks();
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir nota.');
        }
    };

    const handleCreateNote = async () => {
        if (!newNoteLabel.trim()) return;
        setCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const newItem = {
                key: Date.now().toString(),
                label: newNoteLabel,
                slug: newNoteLabel.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                type: newNoteType
            };

            const updatedTabs = [...tabs.map(t => ({ key: t.key, label: t.label, slug: t.slug, type: t.type })), newItem];
            await syncNotes(session.access_token, updatedTabs);

            await fetchLinks(); // Recarrega para pegar URLs completas
            setIsModalOpen(false);
            setNewNoteLabel('');
            setNewNoteType('notas');
        } catch (e) {
            console.error(e);
            alert('Erro ao criar nota');
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="flex items-center justify-center h-full min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div></div>;
    if (error) return <div className="p-8 text-red-500">{error}</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto text-[var(--text)] relative">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold flex items-center gap-4">
                        <span className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400/20 via-orange-500/10 to-transparent text-[var(--note-yellow)] border border-[var(--note-bg-yellow)] shadow-sm">
                            <StickyNote size={28} />
                        </span>
                        Minhas Anotações
                    </h1>
                    <p className="mt-2 text-[var(--muted)] text-base max-w-2xl font-medium opacity-80">
                        Gerencie seus blocos de notas pessoais com acesso rápido aos seus links.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus size={20} />
                    Nova Nota
                </button>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tabs.map((tab, index) => {
                    const meta = getMetaForKey(tab.type || 'notas'); // Fallback para tipo antigo
                    // Protege a nota principal contra exclusão
                    const isProtected = tab.slug === 'notas';

                    return (
                        <motion.div
                            key={tab.key}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => window.open(tab.url, '_blank', 'noopener,noreferrer')}
                            className="group relative p-5 rounded-xl border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ backgroundColor: meta.bg }} />

                            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2.5 rounded-xl backdrop-blur-sm border border-white/10`} style={{ backgroundColor: meta.bg }}>{meta.icon}</div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                            <button onClick={(e) => handleCopy(e, tab.url, tab.key)} className="p-1.5 rounded-lg transition-colors border border-transparent hover:border-[var(--border)]" style={{ color: 'var(--muted)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} title="Copiar Link">
                                                {copiedKey === tab.key ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                            </button>
                                            {!isProtected && (
                                                <button onClick={(e) => handleDelete(e, tab.key)} className="p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-500/20" style={{ color: 'var(--muted)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }} title="Excluir">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold mb-1 truncate transition-colors" style={{ color: 'var(--text)' }}>{tab.label}</h3>
                                    <p className="text-[var(--text-2)] opacity-70 text-xs leading-relaxed line-clamp-2">{meta.desc}</p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* Modal de Criação Premium */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 10 }}
                            className="rounded-2xl p-0 w-full max-w-lg shadow-2xl relative overflow-hidden border"
                            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                        >
                            {/* Header com Gradiente */}
                            <div className="p-6 border-b flex justify-between items-center" style={{ background: 'linear-gradient(to right, rgba(109, 40, 217, 0.1), rgba(139, 92, 246, 0.05))', borderColor: 'var(--border)' }}>
                                <h2 className="text-xl font-bold flex items-center gap-3" style={{ color: 'var(--text)' }}>
                                    <div className="p-2 bg-[var(--primary)] rounded-lg shadow-lg shadow-purple-500/30">
                                        <Plus className="text-white" size={20} />
                                    </div>
                                    Nova Nota
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-full transition-colors" style={{ color: 'var(--muted)' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text)'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleCreateNote(); }}>
                                <div className="p-6 space-y-6">
                                    {/* Input Nome */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1" style={{ color: 'var(--muted)' }}>Nome da Nota</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                placeholder="Ex: Roadmap Q3"
                                                value={newNoteLabel}
                                                onChange={(e) => setNewNoteLabel(e.target.value)}
                                                className="w-full rounded-xl p-4 pl-4 focus:outline-none focus:ring-1 transition-all text-base border"
                                                style={{
                                                    backgroundColor: 'var(--surface-2)',
                                                    borderColor: 'var(--border)',
                                                    color: 'var(--text)'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                autoFocus
                                            />
                                            <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 group-hover:ring-white/10 pointer-events-none transition-all" />
                                        </div>
                                    </div>

                                    {/* Select Customizado (Visual) */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium ml-1" style={{ color: 'var(--muted)' }}>Categoria & Estilo</label>
                                        <div className="relative">
                                            <select
                                                value={newNoteType}
                                                onChange={(e) => setNewNoteType(e.target.value)}
                                                className="w-full rounded-xl p-4 focus:outline-none focus:ring-1 transition-all text-base appearance-none cursor-pointer border"
                                                style={{
                                                    backgroundColor: 'var(--surface-2)',
                                                    borderColor: 'var(--border)',
                                                    color: 'var(--text)'
                                                }}
                                                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                                                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <option value="notas">📝 Anotação (Amarelo)</option>
                                                <option value="pendencias">✅ Pendências (Azul)</option>
                                                <option value="docs">📚 Documentação (Roxo)</option>
                                                <option value="temp">📋 Rascunho (Laranja)</option>
                                                <option value="brainstorm">💡 Brainstorm (Verde)</option>
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
                                                <ArrowRight size={16} className="rotate-90" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preview Rápido */}
                                    <div className="rounded-xl p-4 border flex items-center gap-4 transition-all" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                                        <div className={`p-2.5 rounded-xl backdrop-blur-sm border border-white/10`} style={{ backgroundColor: newNoteType ? getMetaForKey(newNoteType).bg : 'transparent' }}>
                                            {newNoteType ? getMetaForKey(newNoteType).icon : <StickyNote size={20} />}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>{newNoteLabel || 'Nome da nota...'}</p>
                                            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>{newNoteType ? getMetaForKey(newNoteType).desc : 'Selecione um tipo'}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Actions */}
                                <div className="p-6 pt-0 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl transition-colors font-medium border"
                                        style={{ color: 'var(--muted)', borderColor: 'transparent' }}
                                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.backgroundColor = 'var(--surface-hover)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newNoteLabel.trim() || creating}
                                        className="px-6 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:brightness-110 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Criando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Plus size={18} />
                                                <span>Criar Nota</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notes;
