const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://awbfibpmylkfkfqarclk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YmZpYnBteWxrZmtmcWFyY2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzAwNDAsImV4cCI6MjA3OTg0NjA0MH0.jXBE-HnVJNAg2pPjlPu8THjnNfVnJADdlNEOvlyiUFU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    console.log('Testing connection to Supabase...');
    try {
        const { data, error } = await supabase.from('dim_colaboradores').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Error fetching from dim_colaboradores:', error.message);
        } else {
            console.log('Success! Connection works. Count data:', data);
        }
    } catch (e) {
        console.error('Fatal error:', e.message);
    }
}

test();
