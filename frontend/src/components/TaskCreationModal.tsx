
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDataController } from '@/controllers/useDataController';
import { Dialog } from '@headlessui/react';
import { X, Save, AlertCircle } from 'lucide-react';
import { Priority } from '@/types';

interface TaskCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedClientId?: string;
    preSelectedProjectId?: string;
}

export const TaskCreationModal: React.FC<TaskCreationModalProps> = ({ isOpen, onClose, preSelectedClientId, preSelectedProjectId }) => {
    const { clients, projects, users, projectMembers, createTask } = useDataController();
    const { currentUser, isAdmin } = useAuth();

    const [clientId, setClientId] = useState(preSelectedClientId || '');
    const [projectId, setProjectId] = useState(preSelectedProjectId || '');
    const [developerId, setDeveloperId] = useState('');
    const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
    const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [notes, setNotes] = useState('');
    const [priority, setPriority] = useState<Priority>('Medium');
    const [estimatedDelivery, setEstimatedDelivery] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Reset fields when opening/closing or changing initial props
    useEffect(() => {
        if (isOpen) {
            // Se temos um projeto pré-selecionado, precisamos setar o cliente automaticamente
            let initialClientId = preSelectedClientId || '';

            if (preSelectedProjectId && !preSelectedClientId) {
                // Buscar o projeto para pegar o clientId
                const project = projects.find(p => p.id === preSelectedProjectId);
                if (project) {
                    initialClientId = project.clientId;
                }
            }

            setClientId(initialClientId);
            setProjectId(preSelectedProjectId || '');
            // Force developerId to be the current user
            setDeveloperId(currentUser?.id || '');
            setCollaboratorIds([]);
            setTitle('');
            setDescription('');
            setNotes('');
            setPriority('Medium');

            // Set default estimated delivery to 7 days from now
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            setEstimatedDelivery(nextWeek.toISOString().split('T')[0]);

            setError('');
        }
    }, [isOpen, preSelectedClientId, preSelectedProjectId, currentUser, projects]);

    // Derived state for selects

    // Filter projects based on Client AND User Permissions
    const filteredProjects = projects.filter(p => {
        const matchesClient = p.clientId === clientId;
        const isActive = p.active !== false;

        // Permissão: Admin vê tudo, Colaborador vê apenas onde é membro
        const isMember = isAdmin || projectMembers.some(pm => String(pm.id_projeto) === String(p.id) && String(pm.id_colaborador) === String(currentUser?.id));

        return matchesClient && isActive && isMember;
    });

    // Filter Clients: Only show clients that have at least one accessible project
    const availableClients = clients.filter(c => {
        if (c.active === false) return false;
        if (isAdmin) return true;

        // Se não for admin, só mostra clientes que possuem projetos vinculados ao usuário
        const hasAccessibleProject = projects.some(p =>
            p.clientId === c.id &&
            p.active !== false &&
            projectMembers.some(pm => String(pm.id_projeto) === String(p.id) && String(pm.id_colaborador) === String(currentUser?.id))
        );

        return hasAccessibleProject;
    });



    const eligibleUsers = useMemo(() => {
        return projectId
            ? users.filter(u => u.active !== false && u.torre !== 'N/A' && projectMembers.some(pm => String(pm.id_projeto) === String(projectId) && String(pm.id_colaborador) === String(u.id)))
            : users.filter(u => u.active !== false && u.torre !== 'N/A');
    }, [users, projectId, projectMembers]);

    const handleSave = async () => {
        if (!title.trim()) {
            setError('O título da tarefa é obrigatório.');
            return;
        }
        if (!clientId) {
            setError('O cliente é obrigatório.');
            return;
        }
        if (!projectId) {
            setError('O projeto é obrigatório.');
            return;
        }

        try {
            setLoading(true);
            setError('');

            await createTask({
                clientId,
                projectId,
                title,
                description,
                notes,
                developerId: developerId || undefined,
                collaboratorIds: collaboratorIds || undefined,
                priority,
                estimatedDelivery: estimatedDelivery || undefined,
                status: 'Todo',
                progress: 0
            });

            onClose();
        } catch (err) {
            console.error(err);
            setError('Erro ao criar tarefa. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg)]">
                    <h2 className="text-lg font-bold">Nova Tarefa</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-[var(--surface-hover)] transition-colors"
                    >
                        <X className="w-5 h-5 text-[var(--muted)]" />
                    </button>
                </div>

                {/* Body and Footer wrapped in Form */}
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="flex flex-col flex-1 overflow-hidden">
                    {/* Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-500 text-sm font-medium">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Cliente */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Cliente *</label>
                            <select
                                value={clientId}
                                onChange={(e) => { setClientId(e.target.value); setProjectId(''); }}
                                disabled={!!preSelectedClientId}
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)] disabled:opacity-50"
                            >
                                <option value="">Selecione o Cliente...</option>
                                {availableClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Projeto */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Projeto *</label>
                            <select
                                value={projectId}
                                onChange={(e) => { setProjectId(e.target.value); }}
                                disabled={!clientId || !!preSelectedProjectId}
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)] disabled:opacity-50"
                            >
                                <option value="">Selecione o Projeto...</option>
                                {filteredProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Colaborador (Responsável Principal) */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Responsável Principal</label>
                            {isAdmin ? (
                                <select
                                    value={developerId}
                                    onChange={(e) => setDeveloperId(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                                >
                                    <option value="">Selecione o Responsável...</option>
                                    {eligibleUsers
                                        .map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))
                                    }
                                </select>
                            ) : (
                                <div className="w-full p-2.5 border rounded-lg bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text)] font-medium text-sm opacity-70 cursor-not-allowed">
                                    {currentUser?.name || 'Seu Usuário'} (Você)
                                </div>
                            )}
                        </div>

                        {/* Colaboradores Adicionais */}
                        <div className="relative">
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Colaboradores Adicionais</label>
                            <button
                                type="button"
                                onClick={() => setIsCollaboratorsOpen(!isCollaboratorsOpen)}
                                disabled={!projectId}
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm flex items-center justify-between focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)] disabled:opacity-50 text-left"
                            >
                                <span className={collaboratorIds.length === 0 ? 'text-[var(--muted)]' : ''}>
                                    {collaboratorIds.length === 0
                                        ? 'Selecione colaboradores...'
                                        : `${collaboratorIds.length} selecionado(s)`}
                                </span>
                                <span className="text-[10px] opacity-50">▼</span>
                            </button>

                            {isCollaboratorsOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border rounded-lg shadow-xl bg-[var(--surface)] z-10 border-[var(--border)]">
                                    {eligibleUsers.filter(u => u.id !== developerId).map(u => (
                                        <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-[var(--surface-hover)] cursor-pointer text-sm">
                                            <input
                                                type="checkbox"
                                                checked={collaboratorIds.includes(u.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setCollaboratorIds([...collaboratorIds, u.id]);
                                                    } else {
                                                        setCollaboratorIds(collaboratorIds.filter(id => id !== u.id));
                                                    }
                                                }}
                                                className="rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                                            />
                                            <span>{u.name}</span>
                                        </label>
                                    ))}
                                    {eligibleUsers.filter(u => u.id !== developerId).length === 0 && (
                                        <div className="p-3 text-center text-xs text-[var(--muted)]">
                                            Nenhum outro colaborador disponível.
                                        </div>
                                    )}
                                </div>
                            )}
                            <p className="text-[10px] text-[var(--muted)] mt-1">
                                {projectId && eligibleUsers.length === 0 ? 'Nenhum membro no projeto.' : 'Membros extras da equipe.'}
                            </p>
                        </div>

                        {/* Overlay to close dropdown when clicking outside */}
                        {isCollaboratorsOpen && (
                            <div className="fixed inset-0 z-0" onClick={() => setIsCollaboratorsOpen(false)} />
                        )}

                        <div className="h-px bg-[var(--border)] my-1" />

                        {/* Título */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Título da Tarefa *</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Criar tela de login"
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                            />
                        </div>

                        {/* Descrição */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalhes da tarefa..."
                                rows={2}
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm resize-none focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                            />
                        </div>

                        {/* Observações Rápidas */}
                        <div>
                            <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Observações Rápidas</label>
                            <input
                                type="text"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Notas rápidas..."
                                className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                            />
                        </div>

                        {/* Extra Row */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Prioridade */}
                            <div>
                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Prioridade</label>
                                <select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                                >
                                    <option value="Low">Baixa</option>
                                    <option value="Medium">Média</option>
                                    <option value="High">Alta</option>
                                    <option value="Critical">Crítica</option>
                                </select>
                            </div>

                            {/* Entrega Estimada */}
                            <div>
                                <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider opacity-70">Entrega Estimada</label>
                                <input
                                    type="date"
                                    value={estimatedDelivery}
                                    onChange={(e) => setEstimatedDelivery(e.target.value)}
                                    className="w-full p-2.5 border rounded-lg outline-none font-medium text-sm focus:ring-1 focus:ring-[var(--primary)] bg-[var(--bg)] border-[var(--border)] text-[var(--text)]"
                                />
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[var(--border)] bg-[var(--bg)] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg font-bold text-sm transition-colors hover:bg-[var(--surface-hover)] border border-transparent text-[var(--muted)] hover:text-[var(--text)]"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg font-bold text-sm transition-colors bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? 'Salvando...' : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Criar Tarefa
                                </>
                            )}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
};
