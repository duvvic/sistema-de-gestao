// components/TeamList.tsx - Adaptado para Router
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataController } from '@/controllers/useDataController';
import { User, Task } from '@/types';
import { Briefcase, Mail, CheckSquare, ShieldCheck, User as UserIcon, Search, Trash2, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const TeamList: React.FC = () => {
  const navigate = useNavigate();
  const { users, tasks, timesheetEntries, deleteUser, loading } = useDataController();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCargo, setSelectedCargo] = useState<'Todos' | string>('Todos');
  const [showInactive, setShowInactive] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Livre' | 'Ocupado' | 'Ausente'>('Todos');

  // Deletion state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Filter Logic
  const visibleUsers = useMemo(() => {
    return showInactive
      ? users.filter(u => u.active === false)
      : users.filter(u => u.active !== false);
  }, [users, showInactive]);

  const cargoOptions = useMemo(() => {
    return Array.from(new Set(visibleUsers.map(user => user.cargo || 'Sem cargo informado')));
  }, [visibleUsers]);

  const filteredUsers = useMemo(() => {
    return visibleUsers.filter(user => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const cargoValue = user.cargo || 'Sem cargo informado';
      const matchesCargo = selectedCargo === 'Todos' || cargoValue === selectedCargo;

      // Status Logic
      const userAllTasks = tasks.filter(t => t.developerId === user.id);
      const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');

      let matchesStatus = true;
      if (statusFilter === 'Livre') {
        matchesStatus = userActiveTasks.length === 0;
      } else if (statusFilter === 'Ocupado') {
        matchesStatus = userActiveTasks.length > 0;
      } else if (statusFilter === 'Ausente') {
        matchesStatus = false; // TODO: Implement logic based on timesheet
      }

      return matchesSearch && matchesCargo && matchesStatus;
    });
  }, [visibleUsers, searchTerm, selectedCargo, statusFilter, tasks]);

  // Helpers
  const isTaskDelayed = (task: Task): boolean => {
    if (task.status === 'Done') return false;
    if (!task.estimatedDelivery) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const parts = task.estimatedDelivery.split('-');
    const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return today > dueDate;
  };

  const getUserMissingDays = (userId: string) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let workDaysCount = 0;
    const foundDays = new Set<string>();

    const userEntries = timesheetEntries.filter(e =>
      e.userId === userId &&
      new Date(e.date).getMonth() === currentMonth &&
      new Date(e.date).getFullYear() === currentYear
    );

    userEntries.forEach(e => foundDays.add(e.date));

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    for (let d = new Date(firstDayOfMonth); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (day >= 1 && day <= 5) workDaysCount++; // Mon-Fri
    }

    const workedDays = userEntries.map(e => e.date).filter((v, i, a) => a.indexOf(v) === i).length;
    // Simplificação: apenas dias passados vs entradas únicas. 
    // Lógica completa requereria verificar feriados e map exato.

    return Math.max(0, workDaysCount - workedDays);
  };

  const handleDeleteClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        // Se o controller tiver metodo deleteUser (precisa adicionar se não tiver)
        if (deleteUser) {
          await deleteUser(userToDelete.id);
        } else {
          alert("Funcionalidade de exclusão não implementada no controller ainda.");
        }
      } catch (e) {
        alert("Erro ao excluir usuário");
      }
    }
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl shadow-sm border overflow-hidden"
      style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
      <div className="px-6 py-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>{showInactive ? 'Colaboradores Desligados' : 'Equipe'}</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>{showInactive ? 'Colaboradores inativos' : 'Colaboradores, papéis e carga de tarefas'}</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          {!showInactive && (
            <button
              onClick={() => navigate('/admin/team/new')}
              className="px-4 py-2 text-white rounded-xl font-semibold text-sm shadow flex items-center gap-2 transition-colors"
              style={{ backgroundColor: 'var(--primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          )}

          <div className="relative w-full md:w-56">
            <select
              value={selectedCargo}
              onChange={(e) => setSelectedCargo(e.target.value)}
              className="w-full appearance-none pl-3 pr-9 py-2 rounded-xl border focus:ring-2 focus:ring-[var(--ring)] outline-none text-sm shadow-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            >
              <option value="Todos">Todos os cargos</option>
              {cargoOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <Briefcase className="absolute right-3 top-2.5 w-4 h-4 pointer-events-none" style={{ color: 'var(--muted)' }} />
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-[var(--ring)] outline-none text-sm shadow-sm"
              style={{
                backgroundColor: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Status Filter Bar */}
      {!showInactive && (
        <div className="px-6 py-3 border-b flex gap-2 overflow-x-auto"
          style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
          <button onClick={() => setStatusFilter('Todos')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors border shadow-sm`}
            style={{
              backgroundColor: statusFilter === 'Todos' ? 'var(--primary)' : 'var(--surface)',
              color: statusFilter === 'Todos' ? 'white' : 'var(--text)',
              borderColor: statusFilter === 'Todos' ? 'transparent' : 'var(--border)'
            }}>Todos</button>
          <button onClick={() => setStatusFilter('Livre')} className={`px-4 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-colors`}
            style={{
              backgroundColor: statusFilter === 'Livre' ? 'var(--success)' : 'var(--surface)',
              color: statusFilter === 'Livre' ? 'white' : 'var(--text)',
              borderColor: statusFilter === 'Livre' ? 'transparent' : 'var(--border)'
            }}>Livres</button>
          <button onClick={() => setStatusFilter('Ocupado')} className={`px-4 py-1.5 rounded-lg text-xs font-bold border shadow-sm transition-colors`}
            style={{
              backgroundColor: statusFilter === 'Ocupado' ? 'var(--warning)' : 'var(--surface)',
              color: statusFilter === 'Ocupado' ? 'white' : 'var(--text)',
              borderColor: statusFilter === 'Ocupado' ? 'transparent' : 'var(--border)'
            }}>Ocupados</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--primary)' }}></div>
              <p className="animate-pulse" style={{ color: 'var(--muted)' }}>Carregando equipe...</p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--muted)' }}>
            <div className="text-center">
              <UserIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nenhum colaborador encontrado</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUsers.map(user => {
              const userAllTasks = tasks.filter(t => t.developerId === user.id);
              const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');
              const delayedTasks = userActiveTasks.filter(isTaskDelayed);
              const onTimeTasks = userActiveTasks.filter(t => !isTaskDelayed(t));
              const missingDays = getUserMissingDays(user.id);

              return (
                <div
                  key={user.id}
                  className="p-5 rounded-2xl border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                  style={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  onClick={() => navigate(`/admin/team/${user.id}`)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-white shadow-sm overflow-hidden font-bold text-xl"
                      style={{ backgroundColor: 'var(--surface-2)', color: 'var(--muted)' }}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold truncate" style={{ color: 'var(--text)' }}>{user.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase`}
                          style={{ backgroundColor: 'var(--primary-soft)', color: 'var(--primary)' }}>
                          {user.role === 'admin' ? 'Admin' : 'Time'}
                        </span>
                        {user.cargo && (
                          <p className="text-xs font-semibold truncate" style={{ color: 'var(--primary)' }}>{user.cargo}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4" style={{ color: 'var(--text)' }}>
                    <div className="flex items-center gap-2 text-xs">
                      <Mail className="w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs font-semibold mt-2">
                      {delayedTasks.length > 0 && (
                        <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100 flex items-center gap-1 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800">
                          <AlertCircle className="w-3 h-3" /> {delayedTasks.length} atrasos
                        </span>
                      )}
                      {userActiveTasks.length === 0 ? (
                        <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1 dark:bg-green-900/40 dark:text-green-300 dark:border-green-800">
                          <CheckSquare className="w-3 h-3" /> Livre
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-full border border-amber-100 flex items-center gap-1 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3" /> {userActiveTasks.length} tarefas
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ borderColor: 'var(--border)' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/team/${user.id}/edit`); }}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--primary)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(e, user)}
                      className="text-xs font-bold text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Excluir Colaborador"
        message={`Tem certeza que deseja remover "${userToDelete?.name}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default TeamList;
