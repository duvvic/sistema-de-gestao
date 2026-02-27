// BentoCard.tsx - Card para Bento Grid Dashboard
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface BentoCardProps {
  title: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  children,
  icon: Icon,
  className = '',
  size = 'medium',
  onClick
}) => {
  const sizeClasses = {
    small: '',
    medium: 'md:col-span-2',
    large: 'md:col-span-2 md:row-span-2',
    xlarge: 'md:col-span-4'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      className={`
        rounded-2xl border p-6 transition-all duration-300
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:shadow-lg' : ''}
        ${className}
      `}
      style={{
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-card)'
      }}
      whileHover={onClick ? {
        scale: 1.02,
        transition: { duration: 0.2 }
      } : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--primary-soft)' }}
            >
              <Icon className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            </div>
          )}
          <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
            {title}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div style={{ color: 'var(--text)' }}>
        {children}
      </div>
    </motion.div>
  );
};

// Componente auxiliar para métricas grandes
export const BentoMetric: React.FC<{
  value: string | number;
  label: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}> = ({ value, label, change, changeType = 'neutral' }) => {
  const changeColors = {
    positive: 'var(--success)',
    negative: 'var(--danger)',
    neutral: 'var(--muted)'
  };

  return (
    <div>
      <div className="text-4xl font-bold mb-2" style={{ color: 'var(--text)' }}>
        {value}
      </div>
      <div className="text-sm mb-1" style={{ color: 'var(--text-2)' }}>
        {label}
      </div>
      {change && (
        <div className="text-xs font-medium" style={{ color: changeColors[changeType] }}>
          {change}
        </div>
      )}
    </div>
  );
};

// Componente auxiliar para mini lista
export const BentoList: React.FC<{
  items: Array<{
    id: string;
    title: string;
    subtitle?: string;
    value?: string;
    valueColor?: string;
    onClick?: () => void;
  }>;
}> = ({ items }) => {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div
          key={item.id}
          onClick={item.onClick}
          className={`
            p-3 rounded-lg border transition-all
            ${item.onClick ? 'cursor-pointer hover:shadow-md' : ''}
          `}
          style={{
            backgroundColor: 'var(--surface-2)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm" style={{ color: 'var(--text)' }}>
                {item.title}
              </div>
              {item.subtitle && (
                <div className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                  {item.subtitle}
                </div>
              )}
            </div>
            {item.value && (
              <div
                className="text-sm font-bold ml-3"
                style={{ color: item.valueColor || 'var(--text)' }}
              >
                {item.value}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
