// components/TransferResponsibilityModal.tsx
import React, { useState } from 'react';
import { User, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface TransferResponsibilityModalProps {
    isOpen: boolean;
    currentOwner: { id: string; name: string };
    collaborators: { id: string; name: string }[];
    onConfirm: (newOwnerId: string) => void;
    onCancel: () => void;
}

const TransferResponsibilityModal: React.FC<TransferResponsibilityModalProps> = ({
    isOpen,
    currentOwner,
    collaborators,
    onConfirm,
    onCancel
}) => {
    const [selectedCollaboratorId, setSelectedCollaboratorId] = useState<string>('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selectedCollaboratorId) {
            onConfirm(selectedCollaboratorId);
            setSelectedCollaboratorId('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border" style={{ borderColor: 'var(--border)' }}>
                {/* Header */}
                <div className="p-6 border-b" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--warning-soft)' }}>
                                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Transferir Responsabilidade</h3>
                                <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Escolha o novo responsável</p>
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="p-1 rounded-full transition-colors hover:bg-gray-100"
                        >
                            <X className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Current Owner */}
                    <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--muted)' }}>Responsável Atual</p>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
                                {currentOwner.name.charAt(0)}
                            </div>
                            <div>
                                <p className="font-bold" style={{ color: 'var(--text)' }}>{currentOwner.name}</p>
                                <p className="text-xs" style={{ color: 'var(--muted)' }}>Será movido para colaborador extra</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center">
                        <ArrowRight className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                    </div>

                    {/* New Owner Selection */}
                    <div>
                        <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>
                            Novo Responsável *
                        </label>
                        {collaborators.length === 0 ? (
                            <div className="p-4 rounded-xl border text-center" style={{ backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                                    Nenhum colaborador extra disponível para transferência
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {collaborators.map(collab => (
                                    <button
                                        key={collab.id}
                                        onClick={() => setSelectedCollaboratorId(collab.id)}
                                        className={`w-full p-4 rounded-xl border transition-all flex items-center gap-3 ${selectedCollaboratorId === collab.id ? 'ring-2 ring-purple-500' : ''
                                            }`}
                                        style={{
                                            backgroundColor: selectedCollaboratorId === collab.id ? 'var(--primary-soft)' : 'var(--surface)',
                                            borderColor: selectedCollaboratorId === collab.id ? 'var(--primary)' : 'var(--border)'
                                        }}
                                    >
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                                            style={{
                                                backgroundColor: selectedCollaboratorId === collab.id ? 'var(--primary)' : 'var(--surface-2)',
                                                color: selectedCollaboratorId === collab.id ? 'white' : 'var(--text)'
                                            }}>
                                            {collab.name.charAt(0)}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold" style={{ color: 'var(--text)' }}>{collab.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--muted)' }}>Colaborador Extra</p>
                                        </div>
                                        {selectedCollaboratorId === collab.id && (
                                            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--primary)' }}>
                                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Warning */}
                    <div className="p-4 rounded-xl border flex gap-3" style={{ backgroundColor: 'var(--warning-soft)', borderColor: 'var(--warning)' }}>
                        <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--warning)' }} />
                        <div className="text-xs" style={{ color: 'var(--warning-text)' }}>
                            <p className="font-bold mb-1">Atenção:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Você será movido para colaborador extra</li>
                                <li>O novo responsável terá controle total da tarefa</li>
                                <li>Esta ação não pode ser desfeita automaticamente</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex gap-3" style={{ borderColor: 'var(--border)' }}>
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 rounded-xl font-bold transition-all border"
                        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--surface)'}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedCollaboratorId}
                        className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--primary)' }}
                        onMouseEnter={(e) => !selectedCollaboratorId ? null : e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={(e) => !selectedCollaboratorId ? null : e.currentTarget.style.backgroundColor = 'var(--primary)'}
                    >
                        Transferir Responsabilidade
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferResponsibilityModal;
