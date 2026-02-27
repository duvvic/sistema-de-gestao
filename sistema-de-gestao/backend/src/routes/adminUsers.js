import { Router } from "express";
import { supabaseAdmin } from "../supabaseAdmin.js";

const router = Router();

/**
 * POST /api/admin/users
 * body: { nome, cargo, email, password, papel, ativo }
 */
router.post("/admin/users", async (req, res) => {
    try {
        const nome = String(req.body.nome || "").trim();
        const cargo = String(req.body.cargo || "").trim();
        const emailRaw = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        const role = String(req.body.role || req.body.papel || "resource").trim();
        const ativo = req.body.ativo ?? true;

        if (!nome || !emailRaw || !password) {
            return res.status(400).json({ error: "Campos obrigatórios: nome, email, password" });
        }

        // 1) cria usuário no Supabase Auth (Admin API)
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: emailRaw,
            password,
            email_confirm: true
        });

        if (createErr) {
            // se já existir no Auth, tentamos recuperar e seguir
            // Supabase pode retornar "User already registered"
            const msg = (createErr.message || "").toLowerCase();
            if (!msg.includes("already")) {
                return res.status(400).json({ error: createErr.message });
            }
        }

        // Descobrir o user_id no Auth (para linkar se quiser)
        // (se createUser deu erro "already", listamos por email)
        let authUserId = created?.user?.id;
        if (!authUserId) {
            const { data: listData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
            if (!listErr && listData?.users?.length) {
                const found = listData.users.find(u => (u.email || "").toLowerCase() === emailRaw);
                authUserId = found?.id || null;
            }
        }

        // 2) upsert na dim_colaboradores (SEMPRE padronizando email)
        // Obs: sua tabela tem coluna "E-mail" e também criou "email".
        // Vamos gravar as duas pra manter compatibilidade.
        const payload = {
            "NomeColaborador": nome,
            "Cargo": cargo || null,
            "E-mail": emailRaw, // legado
            email: emailRaw,    // coluna padrão
            role,
            ativo: !!ativo,
            auth_user_id: authUserId // se essa coluna existir, ótimo; se não existir, remova essa linha
        };

        // Se sua tabela NÃO tem auth_user_id, comente a linha acima
        // ou faça um try/catch simples:
        const { error: upsertErr } = await supabaseAdmin
            .from("dim_colaboradores")
            .upsert(payload, { onConflict: "email" });

        if (upsertErr) {
            // fallback: tentar upsert pelo "E-mail" se seu unique ainda estiver nele
            const { error: fallbackErr } = await supabaseAdmin
                .from("dim_colaboradores")
                .upsert(payload, { onConflict: `"E-mail"` });

            if (fallbackErr) {
                return res.status(400).json({ error: fallbackErr.message });
            }
        }

        return res.json({ ok: true, email: emailRaw, auth_user_id: authUserId });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
});

export default router;
