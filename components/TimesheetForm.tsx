import React, { useState, useEffect } from 'react';
import { TimesheetEntry, Client, Project, Task, User } from '../types';
import { ArrowLeft, Save, Clock, Trash2 } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

interface TimesheetFormProps {
  initialEntry?: TimesheetEntry | null; // Null if creating
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  user: User;
  preSelectedDate?: string;
  onSave: (entry: TimesheetEntry) => void;
  onDelete?: (entryId: string) => void;
  onBack: () => void;
}

const TimesheetForm: React.FC<TimesheetFormProps> = ({ 
  initialEntry, 
  clients, 
  projects, 
  tasks, 
  user, 
  preSelectedDate,
  onSave, 
  onDelete,
  onBack 
}) => {
  const isAdmin = user.role === 'admin';
  const isEditing = !!initialEntry;

  const [formData, setFormData] = useState<Partial<TimesheetEntry>>({
    clientId: '',
    projectId: '',
    taskId: '',
    date: preSelectedDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '18:00',
    description: '',
    userId: user.id,
    userName: user.name
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (initialEntry) {
      setFormData(initialEntry);
    }
  }, [initialEntry]);

  // Calculations
  const calculateTotalHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    
    let diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) diffMinutes += 24 * 60; // Handle overnight if needed
    
    return Number((diffMinutes / 60).toFixed(2));
  };

  const totalHours = calculateTotalHours(formData.startTime || '00:00', formData.endTime || '00:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId || !formData.projectId || !formData.taskId || !formData.date || !formData.startTime || !formData.endTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    onSave({
      id: initialEntry?.id || crypto.randomUUID(),
      userId: formData.userId || user.id,
      userName: formData.userName || user.name,
      clientId: formData.clientId!,
      projectId: formData.projectId!,
      taskId: formData.taskId!,
      date: formData.date!,
      startTime: formData.startTime!,
      endTime: formData.endTime!,
      totalHours: totalHours,
      description: formData.description,
    });
  };

  // Filter Logic
  const filteredProjects = projects.filter(p => !formData.clientId || p.clientId === formData.clientId);
  const filteredTasks = tasks.filter(t => !formData.projectId || t.projectId === formData.projectId);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
       {/* Header */}
       <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isEditing ? 'Editar Apontamento' : 'Criar Apontamento de Horas'}
            </h1>
            <p className="text-sm text-slate-500">Registre suas atividades diárias</p>
          </div>
        </div>
        <div className="flex gap-2">
           {isEditing && onDelete && (
             <button 
               onClick={() => setDeleteModalOpen(true)}
               className="bg-white border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 font-medium"
             >
               <Trash2 className="w-4 h-4" />
               Excluir
             </button>
           )}
           <button 
             onClick={handleSubmit} 
             className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium"
           >
             <Save className="w-4 h-4" />
             Salvar Apontamento
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
         <div className="max-w-2xl mx-auto space-y-8">
            
            {/* Context Card */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Colaborador</label>
                  <input 
                     type="text" 
                     value={formData.userName} 
                     disabled={!isAdmin} // Admin can edit user if we extended logic, but prompt says edit date/time mainly. Keeping ReadOnly for safety unless needed.
                     className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Cliente</label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => setFormData({...formData, clientId: e.target.value, projectId: '', taskId: ''})}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                    >
                       <option value="">Selecione...</option>
                       {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Projeto</label>
                    <select
                      value={formData.projectId}
                      onChange={(e) => setFormData({...formData, projectId: e.target.value, taskId: ''})}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={!formData.clientId}
                    >
                       <option value="">Selecione...</option>
                       {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
               </div>

               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Tarefa</label>
                  <select
                    value={formData.taskId}
                    onChange={(e) => setFormData({...formData, taskId: e.target.value})}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!formData.projectId}
                  >
                      <option value="">Selecione a tarefa...</option>
                      {filteredTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
               </div>
            </div>

            {/* Time Card */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
               <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Clock className="w-5 h-5 text-[#4c1d95]" />
                  <h3 className="font-bold text-slate-800">Horário</h3>
               </div>
               
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Data</label>
                  <input 
                     type="date" 
                     value={formData.date}
                     onChange={(e) => setFormData({...formData, date: e.target.value})}
                     className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                  />
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Início</label>
                     <input 
                        type="time" 
                        value={formData.startTime}
                        onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Fim</label>
                     <input 
                        type="time" 
                        value={formData.endTime}
                        onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none"
                     />
                  </div>
               </div>

               <div className="flex justify-between items-center bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <span className="font-medium text-slate-700">Total Calculado:</span>
                  <span className="text-2xl font-bold text-[#4c1d95]">{totalHours}h</span>
               </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">Descrição / Notas (Opcional)</label>
               <textarea 
                  rows={3}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none resize-none"
                  placeholder="O que foi feito neste período..."
               />
            </div>
         </div>
      </div>

      <ConfirmationModal 
        isOpen={deleteModalOpen}
        title="Excluir Apontamento"
        message="Tem certeza que deseja remover este apontamento de horas? O total será recalculado."
        onConfirm={() => {
          if (initialEntry && onDelete) onDelete(initialEntry.id);
          setDeleteModalOpen(false);
        }}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </div>
  );
};

export default TimesheetForm;