import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  variant?: 'default' | 'purple' | 'white';
  className?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  label = 'Voltar',
  variant = 'default',
  className = ''
}) => {
  const baseStyles = "px-4 py-2 rounded-lg transition-all font-medium flex items-center gap-2";
  
  const variantStyles = {
    default: "bg-slate-100 hover:bg-[#4c1d95] text-slate-700 hover:text-white",
    purple: "bg-[#4c1d95] hover:bg-[#3b1675] text-white",
    white: "bg-white/20 hover:bg-white/30 text-white"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      title={label}
    >
      <ArrowLeft className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

export default BackButton;
