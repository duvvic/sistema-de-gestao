import React, { useState } from 'react';
import { User, Task } from '../types';
import { Briefcase, Mail, CheckSquare, ShieldCheck, User as UserIcon, Search, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TeamListProps {
  users: User[];
  tasks: Task[];
  onUserClick: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
}

const TeamList: React.FC<TeamListProps> = ({ users, tasks, onUserClick, onDeleteUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Função para verificar se uma tarefa está atrasada
  const isTaskDelayed = (task: Task): boolean => {
    if (task.status === 'Done') return false;
    if (!task.estimatedDelivery) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const parts = task.estimatedDelivery.split('-');
    const dueDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    
    return today > dueDate;
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation();
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete && onDeleteUser) {
      onDeleteUser(userToDelete.id);
    }
    setDeleteModalOpen(false);
    setUserToDelete(null);
  };

  return (
    <div className="h-full flex flex-col p-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Equipe</h1>
          <p className="text-slate-500 mt-1">Gerencie os colaboradores e suas alocações</p>
        </div>
        
        <div className="relative w-full md:w-72">
           <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
           <input 
             type="text"
             placeholder="Pesquisar por nome ou email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-4 custom-scrollbar">
        {filteredUsers.map(user => {
          const userAllTasks = tasks.filter(t => t.developerId === user.id);
          const userActiveTasks = userAllTasks.filter(t => t.status !== 'Done');
          const delayedTasks = userActiveTasks.filter(isTaskDelayed);
          const onTimeTasks = userActiveTasks.filter(t => !isTaskDelayed(t));
          
          return (
            <div 
              key={user.id}
              onClick={() => onUserClick(user.id)}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-purple-200 transition-all group relative"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-white shadow-sm overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{user.name}</h3>
                  <div className="flex items-center gap-1.5 text-xs font-medium mt-1">
                    {user.role === 'admin' ? (
                      <span className="bg-purple-100 text-[#4c1d95] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> Developer
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                 <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    {user.email}
                 </div>
                 
                 {/* Tarefas Atrasadas (Vermelho) */}
                 {delayedTasks.length > 0 && (
                   <div className="flex items-center gap-3 text-sm font-semibold">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">{delayedTasks.length} Atrasada{delayedTasks.length > 1 ? 's' : ''}</span>
                   </div>
                 )}
                 
                 {/* Tarefas No Prazo (Verde) */}
                 {onTimeTasks.length > 0 && (
                   <div className="flex items-center gap-3 text-sm font-semibold">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">{onTimeTasks.length} No Prazo</span>
                   </div>
                 )}
                 
                 {/* Se não tem tarefas ativas */}
                 {userActiveTasks.length === 0 && (
                   <div className="flex items-center gap-3 text-sm text-slate-500">
                      <CheckSquare className="w-4 h-4 text-slate-400" />
                      <span>Sem tarefas ativas</span>
                   </div>
                 )}
              </div>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
                 {onDeleteUser ? (
                    <button 
                       onClick={(e) => handleDeleteClick(e, user)}
                       className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                       title="Excluir Colaborador"
                    >
                       <Trash2 className="w-4 h-4" />
                    </button>
                 ) : <div></div>}
                <span className="text-sm font-medium text-[#4c1d95] group-hover:underline">Ver Detalhes</span>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Colaborador"
        message={`Tem certeza que deseja remover "${userToDelete?.name}" da equipe?`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default TeamList;