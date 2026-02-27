// components/shared/BackButton.tsx
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

interface BackButtonProps {
    /** Rota personalizada para onde voltar (opcional) */
    fallbackRoute?: string;
    /** Força usar o fallback ao invés do histórico */
    forceFallback?: boolean;
    /** Classe CSS adicional */
    className?: string;
    /** Label customizado (padrão: sem texto, só ícone) */
    label?: string;
    /** Variante de estilo */
    variant?: 'default' | 'minimal' | 'outlined';
}

/**
 * Botão de voltar padronizado para todo o sistema
 * Usa navegação inteligente com preservação de scroll
 */
export const BackButton: React.FC<BackButtonProps> = ({
    fallbackRoute,
    forceFallback = false,
    className = '',
    label,
    variant = 'default',
}) => {
    const { goBack, getContextualFallback } = useSmartNavigation();

    const handleClick = () => {
        const targetRoute = fallbackRoute || getContextualFallback();
        goBack({
            fallbackRoute: targetRoute,
            forceFallback
        });
    };

    const baseStyles = 'inline-flex items-center gap-2 transition-all duration-200 rounded-lg';

    const variantStyles = {
        default: 'p-2 hover:bg-[var(--surface-hover)] text-[var(--text)]',
        minimal: 'p-1.5 hover:bg-[var(--surface-hover)] text-[var(--muted)] hover:text-[var(--text)]',
        outlined: 'px-4 py-2 border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)] hover:border-[var(--primary)]',
    };

    return (
        <button
            onClick={handleClick}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            title="Voltar"
            type="button"
        >
            <ArrowLeft className="w-5 h-5" />
            {label && <span className="font-medium text-sm">{label}</span>}
        </button>
    );
};

export default BackButton;
