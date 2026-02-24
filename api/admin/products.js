const supabase = require('../supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data, Content-Type');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data, Content-Type');

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
    
    // Проверка, является ли пользователь администратором
    const user = urlParams.get('user') ? JSON.parse(decodeURIComponent(urlParams.get('user'))) : null;
    if (!user || String(user.id) !== process.env.GARDEN_ADMIN_TELEGRAM_ID) {
      return res.status(403).json({ error: 'Forbidden: Not an admin' });
    }
    
    // Обработка POST запроса
    if (req.method === 'POST') {
      const { name, price, category, image, description } = req.body;
      
      // Валидация данных
      if (!name || !price || !category || !image || !description) {
        return res.status(400).json({ 
          error: 'Missing required fields', 
          required: ['name', 'price', 'category', 'image', 'description'] 
        });
      }
      
      if (typeof price !== 'number' || price <= 0) {
        return res.status(400).json({ error: 'Invalid price' });
      }
      
      // Сохраняем товар в Supabase
      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          price,
          category,
          image,
          description
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to save product', data:data, error:error.message });
      }
      
      return res.status(201).json({ 
        success: true,
        product: data,
        message: 'Товар успешно добавлен'
      });
    } else {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Admin product error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};