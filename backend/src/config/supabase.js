const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Only use for admin tasks

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in .env');
}

// Default client (public/anon) - Use sparingly in backend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to create a client for a specific user (preserves RLS)
const createAuthClient = (accessToken) => {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    });
};

// Admin client (bypasses RLS)
const createAdminClient = () => {
    if (!supabaseServiceKey) throw new Error('Service Role Key not configured');
    return createClient(supabaseUrl, supabaseServiceKey);
}

module.exports = {
    supabase,
    createAuthClient,
    createAdminClient
};
