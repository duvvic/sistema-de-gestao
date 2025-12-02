import React, { useState } from 'react';
import { Task, Client, Project, Status, User } from '../types';
import { Calendar, MoreHorizontal, User as UserIcon, StickyNote, ArrowLeft, AlertCircle, Search, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface KanbanBoardProps {
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (taskId: string) => void;
  onNewTask: () => void;
  onNewProject?: () => void;
  filteredClientId?: string | null;
  onBackToAdmin?: () => void;
  onDeleteTask?: (taskId: string) => void;
  user?: User;
}

const KanbanColumn: React.FC<{
  title: string;
  status: Status;
  tasks: Task[];
  clients: Client[];
  projects: Project[];
  onTaskClick: (taskId: string) => void;
  onDeleteClick?: (e: React.MouseEvent, task: Task) => void;
  isAdmin: boolean;
}> = ({ title, status, tasks, clients, projects, onTaskClick, onDeleteClick, isAdmin }) => {
  const filteredTasks = tasks.filter((t) => t.status === status);

  const getStatusColor = (s: Status) => {
    switch (s) {
      case 'Todo': return 'bg-slate-100 border-slate-200';
      case 'In Progress': return 'bg-blue-50 border-blue-100';
      case 'Review': return 'bg-purple-50 border-purple-100';
      case 'Done': return 'bg-green-50 border-green-100';
    }
  };

  const getHeaderColor = (s: Status) => {
    switch (s) {
      case 'Todo': return 'text-slate-600';
      case 'In Progress': return 'text-blue-600';
      case 'Review': return 'text-purple-600';
      case 'Done': return 'text-green-600';
    }
  };

  // Helper to check delay
  const isTaskDelayed = (task: Task) => {
    if (task.status === 'Done') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(task.estimatedDelivery);
    return today > due;
  };

  return (
    <div className={`flex-1 min-w-[300px] flex flex-col h-full rounded-2xl ${getStatusColor(status)} p-4`}>
      <div className={`flex justify-between items-center mb-4 ${getHeaderColor(status)}`}>
        <h3 className="font-bold text-sm uppercase tracking-wider">{title}</h3>
        <span className="bg-white/60 px-2 py-1 rounded-md text-xs font-bold shadow-sm">{filteredTasks.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {filteredTasks.map((task) => {
          const client = clients.find(c => c.id === task.clientId);
          const project = projects.find(p => p.id === task.projectId);
          const isDelayed = isTaskDelayed(task);
          
          return (
            <div 
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className={`
                p-4 rounded-xl shadow-sm border cursor-pointer hover:shadow-md transition-all group relative overflow-hidden
                ${isDelayed 
                  ? 'bg-red-50 border-red-200 hover:border-red-300' 
                  : 'bg-white border-slate-100 hover:border-purple-200'}
              `}
            >
              {isDelayed && (
                 <div className="absolute top-0 right-0 bg-red-100 text-red-600 p-1 rounded-bl-lg z-10">
                    <AlertCircle className="w-3 h-3" />
                 </div>
              )}

              {/* Admin Delete Action */}
              {isAdmin && onDeleteClick && (
                 <button 
                   onClick={(e) => onDeleteClick(e, task)}
                   className="absolute top-2 right-2 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all z-20"
                   title="Excluir Tarefa"
                 >
                    <Trash2 className="w-3.5 h-3.5" />
                 </button>
              )}

              {/* Company Info & Project Chip */}
              <div className="flex flex-col gap-2 mb-3">
                 {/* Company Header */}
                 <div className="flex items-center gap-2">
                    {client?.logoUrl && (
                      <img src={client.logoUrl} alt="Logo" className="w-5 h-5 object-contain rounded-sm" />
                    )}
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                      {client?.name || 'Sem Empresa'}
                    </span>
                 </div>
                 
                 <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold tracking-wide uppercase text-[#4c1d95] bg-purple-50 px-2 py-1 rounded-md truncate max-w-[180px]">
                      {project?.name}
                    </span>
                 </div>
              </div>
              
              {/* Task Title */}
              <h4 className="font-semibold text-slate-800 mb-3 text-sm leading-snug pr-4">{task.title}</h4>
              
              {/* Progress */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-1.5 bg-slate-200/50 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isDelayed ? 'bg-red-500' : 'bg-[#4c1d95]'}`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>
                <span className={`text-[10px] font-bold ${isDelayed ? 'text-red-600' : 'text-slate-500'}`}>{task.progress}%</span>
              </div>

              {/* Footer: Date, Dev, Notes */}
              <div className={`flex items-center justify-between pt-3 border-t ${isDelayed ? 'border-red-100' : 'border-slate-50'}`}>
                <div className="flex items-center gap-2">
                   {/* Developer Avatar */}
                   <div 
                      className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-500"
                      title={`Dev: ${task.developer || 'Unassigned'}`}
                   >
                      <UserIcon className="w-3.5 h-3.5" />
                   </div>
                   
                   {/* Notes Indicator */}
                   {task.notes && (
                     <div className="text-slate-400" title="Has notes">
                        <StickyNote className="w-3.5 h-3.5" />
                     </div>
                   )}
                </div>
                
                <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-slate-50 text-slate-400'}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.estimatedDelivery).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  tasks, 
  clients, 
  projects, 
  onTaskClick, 
  onNewTask, 
  onNewProject, 
  filteredClientId, 
  onBackToAdmin,
  onDeleteTask,
  user
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  
  // Filter Logic (Client + Search)
  const displayTasks = tasks.filter(t => {
     const matchesClient = filteredClientId ? t.clientId === filteredClientId : true;
     const matchesSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase());
     return matchesClient && matchesSearch;
  });

  const currentClient = filteredClientId ? clients.find(c => c.id === filteredClientId) : null;
  const isAdmin = user?.role === 'admin';

  const handleDeleteClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete && onDeleteTask) {
      onDeleteTask(taskToDelete.id);
    }
    setDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 px-1 gap-4">
        <div className="flex items-center gap-3">
          {filteredClientId && onBackToAdmin && (
             <button onClick={onBackToAdmin} className="p-2 bg-white border border-slate-200 rounded-full text-slate-500 hover:text-[#4c1d95] hover:border-[#4c1d95] transition-all">
                <ArrowLeft className="w-5 h-5" />
             </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {currentClient ? (
                <>
                  <img src={currentClient.logoUrl} className="w-8 h-8 rounded-lg object-contain bg-white border border-slate-200 p-1"/>
                  {currentClient.name}
                </>
              ) : 'Board de Projetos'}
            </h1>
            <p className="text-slate-500 text-sm">
              {currentClient 
                ? 'Gerencie projetos e entregas desta empresa' 
                : 'Visão geral de todas as tarefas'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Bar */}
          <div className="relative flex-1 md:w-56">
             <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
             <input 
               type="text"
               placeholder="Filtrar tarefas..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none text-sm shadow-sm"
             />
          </div>

          {onNewProject && (
            <button 
              onClick={onNewProject}
              className="bg-white border border-[#4c1d95] text-[#4c1d95] hover:bg-purple-50 px-4 py-2 rounded-xl shadow-sm transition-colors flex items-center gap-2 font-bold text-xs md:text-sm whitespace-nowrap h-10"
            >
              + Novo Projeto
            </button>
          )}
          <button 
            onClick={onNewTask}
            className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-5 py-2 rounded-xl shadow-md transition-colors flex items-center gap-2 font-bold text-xs md:text-sm whitespace-nowrap h-10"
          >
            + Nova Tarefa
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar w-full">
        <KanbanColumn 
          title="A Fazer" 
          status="Todo" 
          tasks={displayTasks} 
          clients={clients} 
          projects={projects} 
          onTaskClick={onTaskClick} 
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />
        <KanbanColumn 
          title="Em Progresso" 
          status="In Progress" 
          tasks={displayTasks} 
          clients={clients} 
          projects={projects} 
          onTaskClick={onTaskClick} 
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />
        <KanbanColumn 
          title="Revisão" 
          status="Review" 
          tasks={displayTasks} 
          clients={clients} 
          projects={projects} 
          onTaskClick={onTaskClick} 
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />
        <KanbanColumn 
          title="Concluído" 
          status="Done" 
          tasks={displayTasks} 
          clients={clients} 
          projects={projects} 
          onTaskClick={onTaskClick} 
          onDeleteClick={handleDeleteClick}
          isAdmin={isAdmin}
        />
      </div>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Tarefa"
        message={`Tem certeza que deseja deletar a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default KanbanBoard;