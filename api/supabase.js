const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.GARDEN_SUPABASE_URL;
const supabaseKey = process.env.GARDEN_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;