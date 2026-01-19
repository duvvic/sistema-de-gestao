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
            case 'notas': return { icon: <StickyNote size={20} className="text-yellow-400" />, bg: 'bg-yellow-500/10', border: 'group-hover:border-yellow-500/30', desc: 'Anotações gerais.' };
            case 'pendencias': return { icon: <CheckSquare size={20} className="text-blue-400" />, bg: 'bg-blue-500/10', border: 'group-hover:border-blue-500/30', desc: 'Tarefas e pendências.' };
            case 'docs': return { icon: <BookOpen size={20} className="text-purple-400" />, bg: 'bg-purple-500/10', border: 'group-hover:border-purple-500/30', desc: 'Docs e referências.' };
            case 'temp': return { icon: <Clipboard size={20} className="text-orange-400" />, bg: 'bg-orange-500/10', border: 'group-hover:border-orange-500/30', desc: 'Área temporária.' };
            case 'brainstorm': return { icon: <Lightbulb size={20} className="text-green-400" />, bg: 'bg-green-500/10', border: 'group-hover:border-green-500/30', desc: 'Ideias e insights.' };
            default: return { icon: <StickyNote size={20} className="text-gray-400" />, bg: 'bg-gray-500/10', border: 'group-hover:border-gray-500/30', desc: 'Nota pessoal.' };
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
            console.error(err);
            setError('Falha ao carregar links de notas.');
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
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        <span className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 text-yellow-500 border border-yellow-500/20">
                            <StickyNote size={24} />
                        </span>
                        Minhas Anotações
                    </h1>
                    <p className="mt-1 text-[var(--textMuted)] text-sm max-w-2xl">
                        Gerencie seus blocos de notas pessoais.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                >
                    <Plus size={18} />
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
                            className={`group relative bg-[var(--surface)] p-5 rounded-xl border border-white/5 ${meta.border} hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden`}
                        >
                            <div className={`absolute -top-10 -right-10 w-24 h-24 ${meta.bg} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${meta.bg} backdrop-blur-sm border border-white/5`}>{meta.icon}</div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <button onClick={(e) => handleCopy(e, tab.url, tab.key)} className="p-1.5 hover:bg-white/10 rounded text-[var(--textMuted)] hover:text-white transition-colors" title="Copiar Link">
                                                {copiedKey === tab.key ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                            </button>
                                            {!isProtected && (
                                                <button onClick={(e) => handleDelete(e, tab.key)} className="p-1.5 hover:bg-red-500/20 rounded text-[var(--textMuted)] hover:text-red-400 transition-colors" title="Excluir">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <h3 className="text-base font-bold text-[var(--text)] group-hover:text-white transition-colors mb-1 truncate">{tab.label}</h3>
                                    <p className="text-[var(--textMuted)] text-xs leading-relaxed line-clamp-2">{meta.desc}</p>
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
                            className="bg-[#18181b] border border-white/10 rounded-2xl p-0 w-full max-w-lg shadow-2xl relative overflow-hidden"
                        >
                            {/* Header com Gradiente */}
                            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-white/5 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg shadow-lg shadow-blue-500/30">
                                        <Plus className="text-white" size={20} />
                                    </div>
                                    Nova Nota
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Input Nome */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Nome da Nota</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            placeholder="Ex: Roadmap Q3"
                                            value={newNoteLabel}
                                            onChange={(e) => setNewNoteLabel(e.target.value)}
                                            className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 pl-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-base"
                                            autoFocus
                                        />
                                        <div className="absolute inset-0 rounded-xl ring-1 ring-white/5 group-hover:ring-white/10 pointer-events-none transition-all" />
                                    </div>
                                </div>

                                {/* Select Customizado (Visual) */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400 ml-1">Categoria & Estilo</label>
                                    <div className="relative">
                                        <select
                                            value={newNoteType}
                                            onChange={(e) => setNewNoteType(e.target.value)}
                                            className="w-full bg-[#09090b] border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-base appearance-none cursor-pointer"
                                        >
                                            <option value="notas">📝 Anotação (Amarelo)</option>
                                            <option value="pendencias">✅ Pendências (Azul)</option>
                                            <option value="docs">📚 Documentação (Roxo)</option>
                                            <option value="temp">📋 Rascunho (Laranja)</option>
                                            <option value="brainstorm">💡 Brainstorm (Verde)</option>
                                        </select>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                            <ArrowRight size={16} className="rotate-90" />
                                        </div>
                                    </div>
                                </div>

                                {/* Preview Rápido */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex items-center gap-4">
                                    <div className={`p-2.5 rounded-lg ${newNoteType ? getMetaForKey(newNoteType).bg : ''}`}>
                                        {newNoteType ? getMetaForKey(newNoteType).icon : <StickyNote size={20} />}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-medium text-white truncate">{newNoteLabel || 'Nome da nota...'}</p>
                                        <p className="text-xs text-gray-500 truncate">{newNoteType ? getMetaForKey(newNoteType).desc : 'Selecione um tipo'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 pt-0 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors font-medium border border-transparent hover:border-white/5"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleCreateNote}
                                    disabled={!newNoteLabel.trim() || creating}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Notes;
