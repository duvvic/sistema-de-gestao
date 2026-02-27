
$path = "c:\Users\login\OneDrive\Área de Trabalho\Projetos\sistema-de-gest-o\frontend\src\components\TaskDetail.tsx"
$content = Get-Content $path -Raw

# 1. Update weight calculation
$oldWeight = @'
    // Peso baseado na soma das reservas individuais
    const otherTasks = tasks.filter(t => t.projectId === formData.projectId && t.id !== taskId);
    const totalForecast = otherTasks.reduce((acc, t) => acc + (Number(t.estimatedHours) || 0), 0) + totalReservedHours;

    const weight = totalForecast > 0
      ? (totalReservedHours / totalForecast) * 100
      : (otherTasks.length + 1 > 0 ? (100 / (otherTasks.length + 1)) : 0);

    const soldHours = (project?.horas_vendidas || 0) > 0 ? (weight / 100) * project.horas_vendidas : 0;
    return { weight, soldHours };
'@

$newWeight = @'
    // Peso baseado no Forecast manual da tarefa (formData.estimatedHours)
    const otherTasks = tasks.filter(t => t.projectId === formData.projectId && t.id !== taskId);
    const taskForecast = Number(formData.estimatedHours) || 0;
    const projectForecast = otherTasks.reduce((acc, t) => acc + (Number(t.estimatedHours) || 0), 0) + taskForecast;

    const weight = projectForecast > 0
      ? (taskForecast / projectForecast) * 100
      : (otherTasks.length + 1 > 0 ? (100 / (otherTasks.length + 1)) : 0);

    const soldHours = (project?.horas_vendidas || 0) > 0 ? (weight / 100) * project.horas_vendidas : 0;
    return { weight, soldHours };
'@

if ($content.Contains($oldWeight)) {
    $content = $content.Replace($oldWeight, $newWeight)
    Write-Host "Weight logic updated."
} else {
    Write-Host "Weight logic NOT found."
}

# 2. Add Forecast field to Timeline
$oldTimeline = @'
                    </div>
                  </div>

                </div>
'@

$newTimeline = @'
                    </div>
                  </div>

                  {/* NOVO: Forecast Manual (Previsão de Esforço) */}
                  <div className="mt-2 p-3 rounded-xl border bg-blue-500/5 group/forecast transition-all" style={{ borderColor: 'var(--primary-soft)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target size={12} className="text-blue-500" />
                        <h5 className="text-[8px] font-black uppercase tracking-widest text-blue-500">Previsão de Esforço</h5>
                      </div>
                      <div className="text-[10px] font-black text-blue-500/40">MANUAL</div>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.estimatedHours || 0}
                        onChange={e => { setFormData({ ...formData, estimatedHours: Number(e.target.value) }); markDirty(); }}
                        className="w-full bg-transparent border-none p-0 text-2xl font-black text-blue-500 outline-none focus:ring-0 placeholder-blue-500/20"
                        placeholder="0"
                      />
                      <span className="absolute right-0 bottom-1 text-[10px] font-bold text-blue-500/40">horas</span>
                    </div>
                    <p className="mt-1 text-[7px] font-semibold opacity-30 uppercase tracking-tighter italic">Define o peso desta tarefa no projeto</p>
                  </div>
                </div>
'@

if ($content.Contains($oldTimeline)) {
    $content = $content.Replace($oldTimeline, $newTimeline)
    Write-Host "Timeline field added."
} else {
    Write-Host "Timeline block NOT found."
}

# 3. Clean up Esforço card
$oldEsforco = @'
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase mb-0.5 block opacity-60">Horas Apontadas (Total)</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 text-emerald-500" />
                      <div className="w-full pl-8 pr-2 py-1.5 text-base font-black border rounded-lg bg-emerald-500/5 border-emerald-500/20 text-emerald-500 flex items-baseline gap-1.5">
                        <span>{formatDecimalToTime(actualHoursSpent)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-black uppercase mb-0.5 block opacity-60">Peso Projeto</label>
                      <div className="px-2 py-1 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-600 font-black text-xs">
                        {taskWeight.weight.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase mb-0.5 block opacity-60">Forecast</label>
                      <div className="px-2 py-1 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-600 font-black text-xs">
                        {formatDecimalToTime(taskWeight.soldHours)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pb-0.5">
                  <label className="text-[9px] font-black uppercase mb-1 block opacity-60">Progresso ({formData.progress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={formData.progress || 0}
                    onChange={e => {
                      const newProgress = Number(e.target.value);
                      let newStatus = formData.status;
                      let newActualDelivery = formData.actualDelivery;

                      if (formData.status === 'Done' && newProgress < 100) {
                        newStatus = 'In Progress';
                        newActualDelivery = '';
                      }

                      setFormData({
                        ...formData,
                        progress: newProgress,
                        status: newStatus,
                        actualDelivery: newActualDelivery
                      });
                      markDirty();
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>
              </div>
'@

$newEsforco = @'
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black uppercase mb-0.5 block opacity-60">Horas Apontadas (Total)</label>
                    <div className="relative">
                      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30 text-emerald-500" />
                      <div className="w-full pl-8 pr-2 py-1.5 text-base font-black border rounded-lg bg-emerald-500/5 border-emerald-500/20 text-emerald-500 flex items-baseline gap-1.5">
                        <span>{formatDecimalToTime(actualHoursSpent)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Peso no Projeto & Sold Info */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-[var(--border)]">
                    <div>
                      <label className="text-[8px] font-black uppercase mb-0.5 block opacity-60">Peso Projeto</label>
                      <div className="px-2 py-1 rounded-lg bg-purple-500/5 border border-purple-500/20 text-purple-600 font-black text-xs">
                        {taskWeight.weight.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black uppercase mb-0.5 block opacity-60">Horas Vendidas</label>
                      <div className="px-2 py-1 rounded-lg bg-blue-500/5 border border-blue-500/20 text-blue-600 font-black text-xs">
                        {formatDecimalToTime(taskWeight.soldHours)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo de Reservas vs Real */}
                <div className="mt-auto space-y-2">
                  <div className="flex items-center justify-between text-[8px] font-bold opacity-40 uppercase">
                    <span>Soma Reservas Equipe</span>
                    <span className="font-black text-blue-500">{formatDecimalToTime(totalReservedHours)}</span>
                  </div>
                  
                  <div>
                    <label className="text-[9px] font-black uppercase mb-2 block opacity-60">Progresso ({formData.progress}%)</label>
                    <input
                      type="range" min="0" max="100"
                      value={formData.progress || 0}
                      onChange={e => {
                        const newProgress = Number(e.target.value);
                        let newStatus = formData.status;
                        let newActualDelivery = formData.actualDelivery;
                        if (formData.status === 'Done' && newProgress < 100) {
                          newStatus = 'In Progress';
                          newActualDelivery = '';
                        }
                        setFormData({ ...formData, progress: newProgress, status: newStatus, actualDelivery: newActualDelivery });
                        markDirty();
                      }}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                </div>
              </div>
'@

if ($content.Contains($oldEsforco)) {
    $content = $content.Replace($oldEsforco, $newEsforco)
    Write-Host "Esforco card updated."
} else {
    Write-Host "Esforco block NOT found."
}

$content | Set-Content $path -NoNewline
