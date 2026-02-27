import { supabaseAdmin } from '../config/supabaseAdmin.js';

export async function getUserById(userId) {
    const { data, error } = await supabaseAdmin
        .from('dim_colaboradores')
        .select('ID_Colaborador, NomeColaborador, role, tower, email')
        .eq('ID_Colaborador', userId)
        .maybeSingle();

    if (error) {
        console.error('Erro getUserById:', error);
        throw error;
    }
    return data;
}
