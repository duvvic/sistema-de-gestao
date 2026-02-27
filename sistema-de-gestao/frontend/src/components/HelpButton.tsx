
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { HelpCircle, X, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { getHelpContent } from '@/data/helpContent';

const HelpButton: React.FC = () => {
    const location = useLocation();
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState<ReturnType<typeof getHelpContent>>(null);

    // Atualiza o conteúdo sempre que a rota mudar
    useEffect(() => {
        const helpText = getHelpContent(location.pathname, currentUser?.role);
        setContent(helpText);
        // Fecha o modal ao trocar de tela
        setIsOpen(false);
    }, [location.pathname, currentUser]);

    // Se não houver ajuda para esta tela, não renderiza nada
    if (!content) return null;

    return (
        <>
            {/* Botão Flutuante */}
            <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center z-50 hover:bg-blue-700 transition-colors"
                title="Ajuda desta tela"
            >
                <HelpCircle size={24} />
            </motion.button>

            {/* Modal / Popover */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
                        />

                        {/* Content Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            className="fixed bottom-20 right-6 w-[90vw] md:w-[400px] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl z-[70] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="bg-blue-600 p-4 flex items-center justify-between">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <HelpCircle size={18} />
                                    {content.title}
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/80 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-6">
                                <div className="space-y-3">
                                    {content.description.map((paragraph, index) => (
                                        <p
                                            key={index}
                                            className={`text-sm leading-relaxed ${paragraph.startsWith('•') ? 'pl-2 text-[var(--text)]' : 'text-[var(--textMuted)]'}`}
                                        >
                                            {paragraph}
                                        </p>
                                    ))}
                                </div>

                                <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-3">
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            window.location.href = '/docs';
                                        }}
                                        className="w-full py-2 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <Book size={14} />
                                        Ver Documentação Completa
                                    </button>
                                    <p className="text-[10px] text-center text-[var(--muted)]">
                                        Sistema de Ajuda Contextual v1.0
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};

export default HelpButton;
