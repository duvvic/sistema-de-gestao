import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const url = `${process.env.SUPABASE_URL}/rest/v1/horas_trabalhadas?select=*`;
const headers = {
    "apikey": process.env.SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${process.env.SUPABASE_ANON_KEY}`
};

try {
    const res = await fetch(url, { headers });
    const data = await res.json();
    if (!Array.isArray(data)) {
        console.error('Erro:', data);
    } else {
        console.log(`Total registros (Service Role): ${data.length}`);
    }
} catch (e) {
    console.error(e);
}
