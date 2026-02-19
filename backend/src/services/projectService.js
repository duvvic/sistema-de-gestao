import { supabaseAdmin } from '../config/supabaseAdmin.js';

/**
 * Obtém um projeto pelo ID
 * @param {string|number} projectId 
 */
export async function getProjectById(projectId) {
    const { data, error } = await supabaseAdmin
        .from('dim_projetos')
        .select(`
            ID_Projeto,
            NomeProjeto,
            ID_Cliente,
            responsible_user_id,
            project_manager_id,
            manager,
            StatusProjeto
        `)
        .eq('ID_Projeto', projectId)
        .maybeSingle();

    if (error) {
        console.error('Erro getProjectById:', error);
        throw error;
    }
    return data;
}

/**
 * Verifica se um usuário é membro do projeto
 * @param {string|number} projectId 
 * @param {string|number} userId (ID_Colaborador)
 */
export async function checkUserIsMember(projectId, userId) {
    const { data, error } = await supabaseAdmin
        .from('project_members')
        .select('id_pc')
        .eq('id_projeto', projectId)
        .eq('id_colaborador', userId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found' sometimes depending on method
        console.error('Erro checkUserIsMember:', error);
        // Não lança erro, retorna false para não quebrar fluxo, mas loga
        return false;
    }
    return !!data;
}

/**
 * Verifica se o usuário tem tarefas atribuídas no projeto
 * @param {string|number} projectId 
 * @param {string|number} userId 
 */
export async function checkUserHasTasks(projectId, userId) {
    // Verifica na tabela de tarefas se existe alguma tarefa para este usuário neste projeto
    const { data, error } = await supabaseAdmin
        .from('fato_tarefas')
        .select('id_tarefa_novo')
        .eq('ID_Projeto', projectId)
        .eq('ID_Colaborador', userId)
        .limit(1);

    if (error) {
        console.error('Erro checkUserHasTasks:', error);
        return false;
    }
    return data && data.length > 0;
}

/**
 * Verifica se existe algum membro no projeto que pertença à torre do usuário (Tech Lead)
 * @param {string|number} projectId 
 * @param {string} towerName 
 */
export async function checkTowerMembersInProject(projectId, towerName) {
    if (!towerName) return false;

    // 1. Buscar membros do projeto
    const { data: members, error } = await supabaseAdmin
        .from('project_members')
        .select('id_colaborador')
        .eq('id_projeto', projectId);

    if (error || !members || members.length === 0) return false;

    const memberIds = members.map(m => m.id_colaborador);

    // 2. Verificar se algum desses membros é da torre especificada
    const { data: towerMembers, error: towerError } = await supabaseAdmin
        .from('dim_colaboradores')
        .select('ID_Colaborador')
        .in('ID_Colaborador', memberIds)
        .eq('tower', towerName)
        .limit(1);

    if (towerError) {
        console.error('Erro checkTowerMembersInProject:', towerError);
        return false;
    }

    return towerMembers && towerMembers.length > 0;
}

/**
 * Verifica se o projeto tem tarefas criadas
 * @param {string|number} projectId 
 * @returns {Promise<boolean>}
 */
export async function checkProjectHasTasks(projectId) {
    const { data, error } = await supabaseAdmin
        .from('fato_tarefas')
        .select('id_tarefa_novo')
        .eq('ID_Projeto', projectId)
        .is('deleted_at', null)
        .limit(1);

    if (error) {
        console.error('Erro checkProjectHasTasks:', error);
        throw error;
    }
    return data && data.length > 0;
}

/**
 * Verifica se a tarefa tem horas apontadas
 * @param {string} taskId 
 * @returns {Promise<boolean>}
 */
export async function checkTaskHasHours(taskId) {
    const { data, error } = await supabaseAdmin
        .from('horas_trabalhadas')
        .select('ID_Horas_Trabalhadas')
        .eq('id_tarefa_novo', taskId)
        .is('deleted_at', null)
        .limit(1);

    if (error) {
        console.error('Erro checkTaskHasHours:', error);
        throw error;
    }
    return data && data.length > 0;
}
