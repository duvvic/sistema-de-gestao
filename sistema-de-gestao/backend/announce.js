import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Erro: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env do backend.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newUrl = process.argv[2];

if (!newUrl) {
    console.error('❌ Erro: Forneça a nova URL. Exemplo: node announce.js https://xyz.trycloudflare.com');
    process.exit(1);
}

// Garante que a URL termina com /api
let formattedUrl = newUrl.replace(/\/$/, '');
if (!formattedUrl.endsWith('/api')) {
    formattedUrl += '/api';
}

async function updateUrl() {
    console.log(`🚀 Atualizando URL da API para: ${formattedUrl}...`);

    const { error } = await supabase
        .from('system_settings')
        .upsert({ key: 'api_url', value: formattedUrl, updated_at: new Date() });

    if (error) {
        console.error('❌ Erro ao atualizar no Supabase:', error.message);
        process.exit(1);
    }

    console.log('✅ URL atualizada com sucesso no Supabase!');
    console.log('O site https://sistema-de-gestao-b58.pages.dev/ agora já sabe o novo endereço.');
}

updateUrl();
