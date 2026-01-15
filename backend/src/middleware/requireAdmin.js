import { supabaseAuth } from '../config/supabaseAuth.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';

function getBearer(req) {
    const auth = req.headers.authorization || req.headers.Authorization || '';
    if (!auth) {
        console.warn('[requireAdmin] No Authorization header found. Headers:', JSON.stringify(req.headers));
        return null;
    }
    const [type, token] = auth.split(' ');
    if (type?.toLowerCase() !== 'bearer' || !token) {
        console.warn(`[requireAdmin] Invalid auth header format: "${auth}"`);
        return null;
    }
    return token;
}

export async function requireAdmin(req, res, next) {
    try {
        const token = getBearer(req);
        if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' });

        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData?.user) {
            return res.status(401).json({ error: 'Invalid session token' });
        }

        const authUser = userData.user;
        const authUserId = authUser.id;
        const email = (authUser.email || '').trim().toLowerCase();

        // 1) tenta pelo auth_user_id
        let { data: colab, error: colabErr } = await supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador, papel, ativo, auth_user_id, email, "E-mail"')
            .eq('auth_user_id', authUserId)
            .maybeSingle();

        if ((colabErr || !colab) && email) {
            // 2) fallback por email padronizado
            const { data: rColab } = await supabaseAdmin
                .from('dim_colaboradores')
                .select('ID_Colaborador, NomeColaborador, papel, ativo, auth_user_id, email, "E-mail"')
                .eq('email', email)
                .maybeSingle();
            colab = rColab;
        }

        if (!colab) return res.status(403).json({ error: 'User not mapped in dim_colaboradores' });
        if (colab.ativo === false) return res.status(403).json({ error: 'User is inactive' });

        const papel = String(colab.papel || '').toLowerCase();
        if (papel !== 'administrador' && papel !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        req.user = {
            authUserId,
            email,
            colaboradorId: colab.ID_Colaborador,
            nome: colab.NomeColaborador
        };

        next();
    } catch (e) {
        console.error('[requireAdmin] error:', e);
        return res.status(500).json({ error: 'Internal error' });
    }
}
