import { Router } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import crypto from 'crypto';

const router = Router();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // 1. Busca colaborador na dim_colaboradores
        const { data: colab, error: colabErr } = await supabaseAdmin
            .from('dim_colaboradores')
            .select('ID_Colaborador, NomeColaborador, email, "E-mail", papel, ativo, avatar_url, Cargo')
            .or(`email.eq.${normalizedEmail},"E-mail".eq.${normalizedEmail}`)
            .maybeSingle();

        if (colabErr) throw colabErr;

        if (!colab) {
            return res.status(401).json({ error: 'E-mail não encontrado ou usuário não cadastrado.' });
        }

        if (colab.ativo === false) {
            return res.status(403).json({ error: 'Esta conta está desativada.' });
        }

        // 2. Verifica Papel
        const papel = String(colab.papel || '').toLowerCase();
        const isAdmin = papel === 'administrador' || papel === 'admin';
        const isDeveloper = papel === 'desenvolvedor' || papel === 'dev';

        if (!isAdmin && !isDeveloper) {
            return res.status(403).json({ error: 'Usuário sem permissão de acesso (Papel inválido).' });
        }

        // 3. Verifica credenciais na user_credentials
        const { data: creds, error: credsErr } = await supabaseAdmin
            .from('user_credentials')
            .select('password_hash')
            .eq('colaborador_id', colab.ID_Colaborador)
            .maybeSingle();

        if (credsErr) throw credsErr;

        if (!creds) {
            return res.status(401).json({ error: 'Senha não definida para este usuário. Use "Primeiro Acesso".' });
        }

        const inputHash = hashPassword(password);
        if (inputHash !== creds.password_hash) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        // 4. Se chegou aqui, as credenciais estão OK. 
        // Agora precisamos garantir uma sessão no Supabase para que o frontend possa continuar usando as ferramentas dele.
        // Tentamos fazer o login "oficial" no Supabase Auth.
        // Como o admin validou a senha da nossa tabela, podemos usar a mesma senha para o signIn do Supabase (presumindo que estão em sync)
        const { data: authData, error: authErr } = await supabaseAdmin.auth.signInWithPassword({
            email: normalizedEmail,
            password: password
        });

        if (authErr) {
            console.error('[AuthBackend] Erro ao sincronizar com Supabase Auth:', authErr.message);
            // Se o login nas tabelas deu certo mas no auth deu errado, pode ser que a senha no Auth esteja diferente.
            // Nesse caso, poderíamos resetar a senha do Auth usando o Admin API se quiséssemos.
            // Mas por enquanto, vamos retornar erro para manter segurança.
            return res.status(401).json({ error: 'Erro de sincronização de acesso. Tente redefinir sua senha.' });
        }

        // Retorna os dados do usuário e do token de sessão
        return res.json({
            user: {
                id: String(colab.ID_Colaborador),
                name: colab.NomeColaborador,
                email: colab.email || colab['E-mail'],
                role: isAdmin ? 'admin' : 'developer',
                avatarUrl: colab.avatar_url,
                cargo: colab.Cargo,
                active: true
            },
            session: authData.session
        });

    } catch (err) {
        console.error('[AuthBackend] Erro no login:', err);
        return res.status(500).json({ error: 'Erro interno no servidor de autenticação.' });
    }
});

export default router;
