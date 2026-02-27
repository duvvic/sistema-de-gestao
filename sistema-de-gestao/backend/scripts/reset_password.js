
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar dotenv para ler do arquivo .env na raiz do backend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Erro: Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidas.');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const targetEmail = 'miguel.teodoro@geradornv.com.br';
const newPassword = 'adm@2025';

async function resetPassword() {
    console.log(`Buscando usuário por email: ${targetEmail}...`);

    // Listar usuários para encontrar o ID (fallback se getUserById não for opção direta por email na admin api em algumas versoes)
    // A API Admin tem listUsers.
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
        console.error('Erro ao listar usuários:', listError);
        return;
    }

    const user = users.find(u => u.email && u.email.toLowerCase() === targetEmail.toLowerCase());

    if (!user) {
        console.error(`Usuário com email ${targetEmail} não encontrado no Authentication.`);
        // Opcional: Criar o usuário se não existir? O usuario pediu "crie a senha", assume-se que o usuário existe ou deve ser criado com essa senha.
        // Vou assumir apenas reset, mas se não existir, aviso.
        return;
    }

    console.log(`Usuário encontrado: ${user.id}. Atualizando senha...`);

    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
    );

    if (updateError) {
        console.error('Erro ao atualizar senha:', updateError);
    } else {
        console.log(`Senha atualizada com sucesso para ${targetEmail}`);
    }
}

resetPassword();
