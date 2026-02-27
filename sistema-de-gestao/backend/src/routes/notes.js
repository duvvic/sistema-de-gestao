import { Router } from 'express';
import { supabaseAuth } from '../config/supabaseAuth.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

const router = Router();

// Middleware de autenticação básico (sem exigir admin)
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace(/^Bearer\s+/i, '');
        if (!token) {
            return res.status(401).json({ error: 'Missing token' });
        }

        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const authUser = userData.user;
        const email = (authUser.email || '').trim().toLowerCase();

        // Identificar colaborador
        // 1) auth_user_id
        let { data: colab, error: colabErr } = await supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador')
            .eq('auth_user_id', authUser.id)
            .maybeSingle();

        if (!colab && email) {
            // 2) fallback email
            const { data: rColab } = await supabaseAdmin
                .from('dim_colaboradores')
                .select('ID_Colaborador, NomeColaborador')
                .eq('email', email)
                .maybeSingle();
            colab = rColab;
        }

        if (!colab) {
            return res.status(403).json({ error: 'Collaborator not found' });
        }

        req.colaborador = colab;
        next();
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(500).json({ error: 'Internal auth error' });
    }
}

router.get('/links', requireAuth, async (req, res) => {
    try {
        const { ID_Colaborador } = req.colaborador;

        let baseSlug = null;
        let notesConfig = [];
        let linkRecordId = null;

        // 1. Tentar buscar direto na tabela (mais confiável para pegar o ID e o JSON)
        const { data: existingData } = await supabaseAdmin
            .from('user_notas_links')
            .select('*')
            .eq('colaborador_id', ID_Colaborador)
            .maybeSingle();

        if (existingData) {
            baseSlug = existingData.base_slug;
            notesConfig = existingData.notes_config || [];
            linkRecordId = existingData.id;
        }

        // 2. Se não tem baseSlug, tenta gerar via RPC legacy (garantia de backward compat)
        if (!baseSlug) {
            const { data: newData, error: ensureErr } = await supabaseAdmin
                .rpc('ensure_user_notas_link', { p_colaborador_id: ID_Colaborador });

            if (ensureErr) {
                console.error('Error generating link:', ensureErr);
                return res.status(500).json({ error: 'Failed to generate notes link' });
            }

            // Recarregar registro criado
            const { data: reloaded } = await supabaseAdmin
                .from('user_notas_links')
                .select('*')
                .eq('colaborador_id', ID_Colaborador)
                .single();

            if (reloaded) {
                baseSlug = reloaded.base_slug;
                notesConfig = reloaded.notes_config || [];
                linkRecordId = reloaded.id;
            }
        }

        if (!baseSlug) {
            return res.status(500).json({ error: 'Could not resolve base_slug' });
        }

        // 3. Inicialização Lazy: Se notesConfig estiver vazio, cria o padrão e salva
        if (!notesConfig || notesConfig.length === 0) {
            notesConfig = [
                { key: 'notas', label: 'Minhas Anotações', slug: 'notas', type: 'notas' }
            ];

            if (linkRecordId) {
                await supabaseAdmin
                    .from('user_notas_links')
                    .update({ notes_config: notesConfig })
                    .eq('id', linkRecordId);
            }
        }

        // Atualizar timestamp de acesso (Background - sem await para não travar a resposta)
        if (linkRecordId) {
            supabaseAdmin
                .from('user_notas_links')
                .update({ last_opened_at: new Date() })
                .eq('id', linkRecordId)
                .then(({ error }) => {
                    if (error) console.error('Erro ao atualizar last_opened_at (background):', error);
                })
                .catch(err => console.error('Erro inesperado last_opened_at:', err));
        }

        // 4. Montar resposta final com URLs
        const tabs = notesConfig.map(tab => ({
            ...tab,
            url: `https://dontpad.com/${baseSlug}/${tab.slug}`
        }));

        return res.json({
            base_slug: baseSlug,
            tabs
        });

    } catch (e) {
        console.error('Error in /links:', e);
        res.status(500).json({ error: 'Server error' });
    }
});

// Nova rota para salvar/sincronizar abas
router.post('/sync', requireAuth, async (req, res) => {
    try {
        const { ID_Colaborador } = req.colaborador;
        const { tabs } = req.body;

        if (!Array.isArray(tabs)) {
            return res.status(400).json({ error: 'Tabs must be an array' });
        }

        // Sanitização básica
        const cleanTabs = tabs.map(t => ({
            key: String(t.key || Date.now()),
            label: String(t.label || 'Nova Nota').slice(0, 50),
            slug: String(t.slug || 'nova-nota').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            type: String(t.type || 'notas')
        }));

        const { error } = await supabaseAdmin
            .from('user_notas_links')
            .update({ notes_config: cleanTabs })
            .eq('colaborador_id', ID_Colaborador);

        if (error) throw error;

        return res.json({ ok: true, tabs: cleanTabs });

    } catch (e) {
        console.error('Error in /sync:', e);
        res.status(500).json({ error: 'Sync error' });
    }
});

export default router;
