import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function getTaskById(taskId) {
    const { data, error } = await supabaseAdmin
        .from('fato_tarefas')
        .select('id_tarefa_novo, ID_Projeto, ID_Colaborador, Afazer')
        .eq('id_tarefa_novo', taskId)
        .maybeSingle();

    if (error) {
        console.error('Erro getTaskById:', error);
        throw error;
    }

    // Add compatibility field for legacy code check
    if (data) {
        data.collaboratorIds = []; // No extra collaborators support in DB yet
    }

    return data;
}
