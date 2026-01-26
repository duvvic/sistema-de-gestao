import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkAvatars() {
    const { data: users, error } = await supabase
        .from('dim_colaboradores')
        .select('NomeColaborador, avatar_url')
        .in('NomeColaborador', ['Lucas Teixeira', 'Isabela Salustiano', 'Jônatas Freire', 'João Aguiar']);

    if (error) {
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log(JSON.stringify(users, null, 2));
    }
}

checkAvatars();
