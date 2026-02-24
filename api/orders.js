const crypto = require('crypto');

module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data, Content-Type');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков для всех ответов
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data, Content-Type');

  // Проверка аутентификации
  const initData = req.headers['x-telegram-init-data'];
  
  if (!initData) {
    return res.status(401).json({ error: 'Unauthorized: No init data' });
  }
  
  try {
    // Проверяем подпись
    const BOT_TOKEN = process.env.BOT_TOKEN;
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
    
    // Обработка POST запроса
    if (req.method === 'POST') {
      const { items, total, delivery } = req.body;
      
      // Валидация данных
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order items' });
      }
      
      if (total <= 0) {
        return res.status(400).json({ error: 'Invalid order total' });
      }
      
      // Здесь должна быть логика сохранения заказа в БД
      console.log('New order:', {
        items,
        total,
        delivery,
        timestamp: new Date().toISOString()
      }); 
      
      // Имитация сохранения заказа
      return res.status(201).json({ 
        success: true,
        orderId: 'ORD-' + Date.now(),
        message: 'Заказ успешно оформлен'
      });
    } else {
      res.setHeader('Allow', ['POST', 'OPTIONS']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Order error:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
};