const { createSupabaseClient } = require('../supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data');

  // Проверка аутентификации
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    return res.status(401).json({ error: 'Unauthorized: No init data' });
  }
  
  try {
    // Проверяем подпись
    const BOT_TOKEN = process.env.GARDEN_BOT_TOKEN;
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN is not set');
    }
    
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    
    // Формируем строку для проверки
    const checkString = [...urlParams.entries()]
      .filter(([key]) => key !== 'hash')
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');
    
    const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');
    
    if (hmac !== hash) {
      return res.status(401).json({ error: 'Unauthorized: Invalid hash' });
    }
    
    // Извлекаем данные пользователя
    const user = urlParams.get('user') ? JSON.parse(decodeURIComponent(urlParams.get('user'))) : null;
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid user data' });
    }
    
    // Создаем клиент Supabase с заголовком x-telegram-id
    const supabase = createSupabaseClient({
      'x-telegram-id': user.id.toString()
    });
    
    // Проверка, является ли пользователь администратором
    const {  admin, error: adminError } = await supabase
      .from('admins')
      .select('telegram_id')
      .eq('telegram_id', user.id)
      .maybeSingle();
    
    if (adminError || !admin) {
      return res.status(403).json({ 
        isAdmin: false,
        message: 'Доступ запрещен' 
      });
    }
    
    return res.status(200).json({ 
      isAdmin: true,
      message: 'Доступ подтвержден' 
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ 
      isAdmin: false,
      error: 'Internal server error' 
    });
  }
};