
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
    console.log('Searching precise "EF 159"...');

    const { data, error } = await supabase
        .from('dim_projetos')
        .select('*')
        .ilike('NomeProjeto', '%EF 159%');

    if (error) { console.error(error); return; }

    if (data.length === 0) {
        console.log('No project found with name EF 159');
    }

    data.forEach(p => {
        console.log(`FOUND: ID=${p.ID_Projeto} | Name="${p.NomeProjeto}" | Ativo=${p.ativo}`);
    });
}

run();
