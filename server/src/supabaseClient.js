const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('[Supabase] Initializing server client. URL:', supabaseUrl?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseKey) {
    console.error('[Supabase] CRITICAL: Missing credentials in environment!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
