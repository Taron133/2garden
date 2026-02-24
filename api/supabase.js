const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.GARDEN_SUPABASE_URL;
const supabaseKey = process.env.GARDEN_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Создаем базовый клиент без специфичных для запроса заголовков
const createSupabaseClient = (customHeaders = {}) => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        ...customHeaders
      }
    }
  });
};

module.exports = {
  createSupabaseClient
};