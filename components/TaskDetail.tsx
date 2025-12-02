import React, { useState, useEffect } from 'react';
import { Task, Client, Project, Status, Priority, Impact, User } from '../types';
import { ArrowLeft, Save, Sparkles, Calendar, PieChart, Briefcase, Image as ImageIcon, User as UserIcon, StickyNote, AlertTriangle, ShieldAlert } from 'lucide-react';
import ImageEditor from './ImageEditor';

interface TaskDetailProps {
  task?: Task; // If null, we are creating a new task
  clients: Client[];
  projects: Project[];
  users?: User[]; // List of available users for assignment
  onSave: (task: Task) => void;
  onBack: () => void;
  preSelectedClientId?: string;
  user?: User | null;
}

const TaskDetail: React.FC<TaskDetailProps> = ({ task, clients, projects, users, onSave, onBack, preSelectedClientId, user }) => {
  const isNew = !task;
  const isAdmin = user?.role === 'admin';
  const isDeveloper = user?.role === 'developer';
  
  // Helper for default date (7 days from now)
  const getDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  // Form State
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    status: 'Todo',
    progress: 0,
    estimatedDelivery: getDefaultDate(), // Default to 7 days ahead
    description: '',
    attachment: '',
    clientId: preSelectedClientId || '',
    developer: '',
    notes: '',
    // New Fields
    scheduledStart: '',
    actualStart: '',
    actualDelivery: '',
    priority: 'Medium',
    impact: 'Medium',
    risks: '',
  });

  const [showImageEditor, setShowImageEditor] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        estimatedDelivery: task.estimatedDelivery.split('T')[0],
        scheduledStart: task.scheduledStart,
        actualStart: task.actualStart,
        actualDelivery: task.actualDelivery,
        priority: task.priority || 'Medium',
        impact: task.impact || 'Medium',
        risks: task.risks || '',
      });
    } else {
      // Logic for new tasks
      if (isDeveloper && user?.name) {
        setFormData(prev => ({ ...prev, developer: user.name }));
      }
    }
  }, [task, isDeveloper, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.clientId || !formData.title) {
        alert("Preencha todos os campos obrigatórios");
        return;
    }

    onSave({
      id: task?.id || crypto.randomUUID(),
      title: formData.title!,
      projectId: formData.projectId!,
      clientId: formData.clientId!,
      status: formData.status as Status || 'Todo',
      estimatedDelivery: formData.estimatedDelivery!,
      progress: Number(formData.progress) || 0,
      description: formData.description || '',
      attachment: formData.attachment,
      developer: formData.developer,
      notes: formData.notes,
      scheduledStart: formData.scheduledStart,
      actualStart: formData.actualStart,
      actualDelivery: formData.actualDelivery,
      priority: formData.priority,
      impact: formData.impact,
      risks: formData.risks,
    });
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);
  const selectedProject = projects.find(p => p.id === formData.projectId);

  // Delay Calculation (Local Time)
  const getDelayDays = () => {
     if (formData.status === 'Done') return 0;
     if (!formData.estimatedDelivery) return 0;
     
     const today = new Date();
     today.setHours(0,0,0,0);
     
     // Parse YYYY-MM-DD manually to avoid UTC issues
     const parts = formData.estimatedDelivery.split('-');
     const due = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
     
     if (today <= due) return 0;

     const diffTime = today.getTime() - due.getTime();
     const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
     return days > 0 ? days : 0;
  };
  
  const daysDelayed = getDelayDays();

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {isNew ? 'Criar Nova Tarefa' : 'Detalhes da Tarefa'}
              {daysDelayed > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" /> Atrasada ({daysDelayed} dias)
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-500">
              {isNew ? 'Preencha os dados para iniciar' : `ID: #${task?.id.slice(0,8)}`}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          className="bg-[#4c1d95] hover:bg-[#3b1675] text-white px-6 py-2.5 rounded-lg shadow-md transition-all flex items-center gap-2 font-medium"
        >
          <Save className="w-4 h-4" />
          Salvar Alterações
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Form Area (Center) */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Context Section (Client/Project) */}
            <div className={`p-6 rounded-2xl border ${daysDelayed > 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'} space-y-6 transition-colors`}>
              <h3 className={`font-semibold flex items-center gap-2 ${daysDelayed > 0 ? 'text-red-800' : 'text-slate-800'}`}>
                <Briefcase className={`w-4 h-4 ${daysDelayed > 0 ? 'text-red-600' : 'text-[#4c1d95]'}`} />
                Contexto do Projeto
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Cliente</label>
                  <select 
                    value={formData.clientId || ''}
                    onChange={(e) => setFormData({...formData, clientId: e.target.value})}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    // Developers can select on Create New, even if pre-selected context exists. Admins can always select.
                    // Disabled only if viewing existing task AND user is not admin.
                    disabled={!isNew && !isAdmin}
                  >
                    <option value="">Selecione um cliente...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Projeto</label>
                  <select 
                    value={formData.projectId || ''}
                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    // Developers can select on Create New. Admins can always select.
                    disabled={(!isNew && !isAdmin)}
                  >
                    <option value="">Selecione um projeto...</option>
                    {projects
                      .filter(p => !formData.clientId || p.clientId === formData.clientId)
                      .map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {selectedClient && (
                <div className="flex items-center gap-4 pt-4 border-t border-slate-200/50">
                   <img src={selectedClient.logoUrl} alt={selectedClient.name} className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-100 p-1" />
                   <div>
                      <p className="font-bold text-slate-800">{selectedClient.name}</p>
                      <p className="text-sm text-slate-500">{selectedProject?.name || 'Sem projeto selecionado'}</p>
                   </div>
                </div>
              )}
            </div>

            {/* Task Details Section */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Tarefa</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Criar Wireframes da Home"
                  className="w-full p-4 text-lg font-medium bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none shadow-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={4}
                  className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none shadow-sm resize-none transition-all"
                  placeholder="Detalhes adicionais sobre a tarefa..."
                />
              </div>

               {/* Notes Field */}
               <div>
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-slate-400" /> Observações Rápidas
                </label>
                <input 
                  type="text"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Ex: Aguardando aprovação do cliente"
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#4c1d95] outline-none transition-all"
                />
              </div>

              {/* Attachment / AI Section */}
              <div>
                 <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-700">Anexo / Mockup</label>
                    <button 
                      type="button"
                      onClick={() => setShowImageEditor(true)}
                      className="text-xs flex items-center gap-1.5 text-[#4c1d95] hover:underline font-medium"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Editar com Gemini AI
                    </button>
                 </div>
                 
                 <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden group">
                    {formData.attachment ? (
                      <>
                        <img src={formData.attachment} alt="Attachment" className="max-h-[300px] w-auto object-contain rounded-lg shadow-sm" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                           <button 
                             type="button"
                             onClick={() => setShowImageEditor(true)}
                             className="bg-white text-slate-900 px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-slate-50 transition-colors"
                           >
                             Editar Imagem
                           </button>
                           <button 
                             type="button"
                             onClick={() => setFormData({...formData, attachment: undefined})}
                             className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg hover:bg-red-600 transition-colors"
                           >
                             Remover
                           </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">Nenhum anexo</p>
                        <button 
                          type="button"
                          onClick={() => setShowImageEditor(true)}
                          className="mt-4 text-[#4c1d95] text-sm font-medium hover:underline"
                        >
                          Criar ou Upload com IA
                        </button>
                      </div>
                    )}
                 </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Metadata (Right) */}
          <div className="space-y-6">
            
            {/* Delay Warning Block */}
            {daysDelayed > 0 && (
               <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <h4 className="font-bold text-red-700 flex items-center gap-2 mb-2">
                     <AlertTriangle className="w-4 h-4" /> Atraso Crítico
                  </h4>
                  <p className="text-sm text-red-600">
                     Esta tarefa está <strong>{daysDelayed} dias</strong> atrasada em relação à data estimada.
                  </p>
               </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">Gestão & Status</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <PieChart className="w-4 h-4" /> Status
                </label>
                <select 
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as Status})}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all"
                >
                  <option value="Todo">A Fazer</option>
                  <option value="In Progress">Em Progresso</option>
                  <option value="Review">Revisão</option>
                  <option value="Done">Concluído</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex justify-between">
                   <span>Porcentagem</span>
                   <span className="text-[#4c1d95] font-bold">{formData.progress}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={formData.progress}
                  onChange={(e) => setFormData({...formData, progress: Number(e.target.value)})}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#4c1d95]"
                />
              </div>

              {/* Priority & Impact (Hidden for Devs) */}
              {!isDeveloper && (
                <div className="grid grid-cols-2 gap-3">
                   <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                      <select 
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value as Priority})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={!isAdmin}
                      >
                        <option value="Low">Baixa</option>
                        <option value="Medium">Média</option>
                        <option value="High">Alta</option>
                        <option value="Critical">Crítica</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Impacto</label>
                      <select 
                        value={formData.impact}
                        onChange={(e) => setFormData({...formData, impact: e.target.value as Impact})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm disabled:bg-slate-100 disabled:text-slate-500"
                        disabled={!isAdmin}
                      >
                        <option value="Low">Baixo</option>
                        <option value="Medium">Médio</option>
                        <option value="High">Alto</option>
                      </select>
                   </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Desenvolvedor
                </label>
                
                {/* Developer Selection Logic */}
                {isAdmin ? (
                   <select
                      value={formData.developer || ''}
                      onChange={(e) => setFormData({...formData, developer: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all"
                   >
                      <option value="">Selecione um responsável...</option>
                      {users?.map(u => (
                        <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                   </select>
                ) : (
                  <input 
                    type="text"
                    value={formData.developer || ''}
                    onChange={(e) => setFormData({...formData, developer: e.target.value})}
                    placeholder="Nome do dev"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#4c1d95] transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    // Read-only for developers (auto-filled on create)
                    disabled={true}
                  />
                )}
              </div>
            </div>

            {/* Dates Management Block */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
               <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                 <Calendar className="w-4 h-4" /> Cronograma
               </h3>

               <div>
                 <label className="block text-xs font-medium text-slate-500 mb-1">Entrega Estimada</label>
                 <input 
                    type="date"
                    value={formData.estimatedDelivery}
                    onChange={(e) => setFormData({...formData, estimatedDelivery: e.target.value})}
                    className={`w-full p-2 bg-slate-50 border rounded-lg text-sm ${daysDelayed > 0 ? 'border-red-300 text-red-600' : 'border-slate-200'}`}
                 />
                 {daysDelayed > 0 && <p className="text-[10px] text-red-500 mt-1 font-bold">Data Passada</p>}
               </div>

               {/* Admin Only Fields */}
               {isAdmin && (
                 <>
                  {/* Changed from grid to flex/stack to ensure dates fit */}
                  <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Início Previsto</label>
                        <input 
                            type="date"
                            value={formData.scheduledStart || ''}
                            onChange={(e) => setFormData({...formData, scheduledStart: e.target.value})}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Início Real</label>
                        <input 
                            type="date"
                            value={formData.actualStart || ''}
                            onChange={(e) => setFormData({...formData, actualStart: e.target.value})}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        />
                      </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Entrega Real</label>
                    <input 
                        type="date"
                        value={formData.actualDelivery || ''}
                        onChange={(e) => setFormData({...formData, actualDelivery: e.target.value})}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                 </>
               )}
            </div>

            {/* Risks Block (Hidden for Devs) */}
            {!isDeveloper && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-3 flex items-center gap-2">
                   <ShieldAlert className="w-4 h-4 text-orange-500" /> Riscos
                 </h3>
                 <textarea 
                    value={formData.risks || ''}
                    onChange={(e) => setFormData({...formData, risks: e.target.value})}
                    rows={3}
                    placeholder="Descreva riscos potenciais..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-orange-300 resize-none"
                 />
              </div>
            )}

          </div>
        </div>
      </div>

      {showImageEditor && (
        <ImageEditor 
          initialImage={formData.attachment}
          onSave={(newImage) => {
            setFormData({...formData, attachment: newImage});
            setShowImageEditor(false);
          }}
          onClose={() => setShowImageEditor(false)}
        />
      )}
    </div>
  );
};

export default TaskDetail;