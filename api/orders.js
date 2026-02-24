const supabase = require('./supabase');
const crypto = require('crypto');

// Функция для отправки сообщения через Telegram Bot API
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const botToken = process.env.GARDEN_BOT_TOKEN;
  const telegramApiUrl = process.env.TELEGRAM_API_URL;
  
  if (!botToken || !telegramApiUrl) {
    throw new Error('Missing Telegram environment variables');
  }
  
  const url = `${telegramApiUrl}${botToken}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

// Функция для отправки уведомления администратору
async function sendOrderNotification(orderId, orderData) {
  const adminChatId = process.env.GARDEN_ADMIN_TELEGRAM_ID;
  
  if (!adminChatId) {
    throw new Error('ADMIN_TELEGRAM_ID is not set');
  }
  
  const message = `📦 <b>Новый заказ #${orderId}</b>\n\n` +
    `👤 Пользователь: ${orderData.user.first_name} ${orderData.user.last_name || ''}\n` +
    `📱 Telegram: @${orderData.user.username || 'не указано'}\n` +
    `💰 Сумма: ${orderData.total} руб.\n` +
    `📞 Телефон: ${orderData.delivery.phone}\n` +
    `🏠 Адрес: ${orderData.delivery.address}\n\n` +
    `<b>Товары:</b>\n${orderData.items.map(item => `• ${item.product.name} x${item.quantity} (${item.product.price} руб.)`).join('\n')}\n\n` +
    `Заказ создан: ${new Date().toLocaleString()}`;
  
  // Кнопки для управления заказом
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `confirm_order_${orderId}` },
        { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
      ],
      [
        { text: '💬 Ответить клиенту', callback_data: `reply_order_${orderId}` }
      ]
    ]
  };
  
  return sendTelegramMessage(adminChatId, message, replyMarkup);
}

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
    
    // Обработка POST запроса
    if (req.method === 'POST') {
      const { items, total, delivery } = req.body;
      const user = urlParams.get('user') ? JSON.parse(decodeURIComponent(urlParams.get('user'))) : null;
      
      // Валидация данных
      if (!user) {
        return res.status(400).json({ error: 'Invalid user data' });
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order items' });
      }
      
      if (total <= 0) {
        return res.status(400).json({ error: 'Invalid order total' });
      }
      
      // Сохраняем заказ в Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          telegram_user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          items: items,
          total: total,
          delivery_name: delivery.name,
          delivery_phone: delivery.phone,
          delivery_address: delivery.address
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Supabase error:', orderError);
        return res.status(500).json({ error: 'Failed to save order' });
      }
      
      // Отправляем уведомление администратору
      try {
        await sendOrderNotification(order.id, {
          items,
          total,
          delivery,
          user
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Продолжаем выполнение, даже если уведомление не отправлено
      }
      
      return res.status(201).json({ 
        success: true,
        orderId: order.id,
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
};const supabase = require('./supabase');
const crypto = require('crypto');

// Функция для отправки сообщения через Telegram Bot API
async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  const botToken = process.env.GARDEN_BOT_TOKEN;
  const telegramApiUrl = process.env.TELEGRAM_API_URL;
  
  if (!botToken || !telegramApiUrl) {
    throw new Error('Missing Telegram environment variables');
  }
  
  const url = `${telegramApiUrl}${botToken}/sendMessage`;
  
  const body = {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML'
  };
  
  if (replyMarkup) {
    body.reply_markup = replyMarkup;
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  
  return response.json();
}

// Функция для отправки уведомления администратору
async function sendOrderNotification(orderId, orderData) {
  const adminChatId = process.env.GARDEN_ADMIN_TELEGRAM_ID;
  
  if (!adminChatId) {
    throw new Error('ADMIN_TELEGRAM_ID is not set');
  }
  
  const message = `📦 <b>Новый заказ #${orderId}</b>\n\n` +
    `👤 Пользователь: ${orderData.user.first_name} ${orderData.user.last_name || ''}\n` +
    `📱 Telegram: @${orderData.user.username || 'не указано'}\n` +
    `💰 Сумма: ${orderData.total} руб.\n` +
    `📞 Телефон: ${orderData.delivery.phone}\n` +
    `🏠 Адрес: ${orderData.delivery.address}\n\n` +
    `<b>Товары:</b>\n${orderData.items.map(item => `• ${item.product.name} x${item.quantity} (${item.product.price} руб.)`).join('\n')}\n\n` +
    `Заказ создан: ${new Date().toLocaleString()}`;
  
  // Кнопки для управления заказом
  const replyMarkup = {
    inline_keyboard: [
      [
        { text: '✅ Подтвердить', callback_data: `confirm_order_${orderId}` },
        { text: '❌ Отменить', callback_data: `cancel_order_${orderId}` }
      ],
      [
        { text: '💬 Ответить клиенту', callback_data: `reply_order_${orderId}` }
      ]
    ]
  };
  
  return sendTelegramMessage(adminChatId, message, replyMarkup);
}

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
    
    // Обработка POST запроса
    if (req.method === 'POST') {
      const { items, total, delivery } = req.body;
      const user = urlParams.get('user') ? JSON.parse(decodeURIComponent(urlParams.get('user'))) : null;
      
      // Валидация данных
      if (!user) {
        return res.status(400).json({ error: 'Invalid user data' });
      }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Invalid order items' });
      }
      
      if (total <= 0) {
        return res.status(400).json({ error: 'Invalid order total' });
      }
      
      // Сохраняем заказ в Supabase
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          telegram_user_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          items: items,
          total: total,
          delivery_name: delivery.name,
          delivery_phone: delivery.phone,
          delivery_address: delivery.address
        })
        .select()
        .single();
      
      if (orderError) {
        console.error('Supabase error:', orderError);
        return res.status(500).json({ error: 'Failed to save order' });
      }
      
      // Отправляем уведомление администратору
      try {
        await sendOrderNotification(order.id, {
          items,
          total,
          delivery,
          user
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
        // Продолжаем выполнение, даже если уведомление не отправлено
      }
      
      return res.status(201).json({ 
        success: true,
        orderId: order.id,
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