const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.GARDEN_SUPABASE_URL;
const supabaseKey = process.env.GARDEN_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Добавляем метод для установки кастомного заголовка
supabase.setTelegramIdHeader = function(telegramId) {
  this.auth.api.headers['x-telegram-id'] = telegramId.toString();
  return this;
};

module.exports = supabase;