const supabase = require('./supabase');
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  const { callback_query } = req.body;
  
  if (!callback_query) {
    return res.status(400).json({ error: 'Missing callback_query' });
  }
  
  const { id: callbackId, from, data: callbackData } = callback_query;
  const adminChatId = from.id;
  
  // Проверяем, является ли отправитель администратором
  if (String(adminChatId) !== process.env.GARDEN_ADMIN_TELEGRAM_ID) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  try {
    // Обработка действий с заказом
    if (callbackData.startsWith('confirm_order_')) {
      const orderId = callbackData.replace('confirm_order_', '');

      // Создаем клиент Supabase с заголовком x-telegram-id
        const supabase = createSupabaseClient({
            'x-telegram-id': user.id.toString()
        });
      
      // Обновляем статус заказа
      const { error } = await supabase
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      // Отправляем уведомление клиенту
      const { data: order } = await supabase
        .from('orders')
        .select('telegram_user_id')
        .eq('id', orderId)
        .single();
      
      if (order) {
        await sendTelegramMessage(
          order.telegram_user_id,
          `✅ Ваш заказ #${orderId} подтвержден!\n\nОжидайте звонка для уточнения деталей доставки.`
        );
      }
      
      // Отвечаем на callback
      await answerCallback(callbackId, 'Заказ подтвержден!');
      
    } else if (callbackData.startsWith('cancel_order_')) {
      const orderId = callbackData.replace('cancel_order_', '');
      
      // Обновляем статус заказа
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);
      
      if (error) {
        throw error;
      }
      
      // Отправляем уведомление клиенту
      const { data: order } = await supabase
        .from('orders')
        .select('telegram_user_id')
        .eq('id', orderId)
        .single();
      
      if (order) {
        await sendTelegramMessage(
          order.telegram_user_id,
          `❌ Ваш заказ #${orderId} отменен.\n\nЕсли это произошло по ошибке, свяжитесь с нами.`
        );
      }
      
      // Отвечаем на callback
      await answerCallback(callbackId, 'Заказ отменен!');
      
    } else if (callbackData.startsWith('reply_order_')) {
      const orderId = callbackData.replace('reply_order_', '');
      
      // Сохраняем контекст для ответа
      await supabase
        .from('order_context')
        .upsert({
          admin_id: adminChatId,
          order_id: orderId,
          context: 'reply'
        });
      
      // Отправляем сообщение администратору с инструкцией
      await sendTelegramMessage(
        adminChatId,
        `📝 Введите ваше сообщение для заказчика по заказу #${orderId}.\n\nВаше сообщение будет отправлено клиенту.`
      );
      
      // Отвечаем на callback
      await answerCallback(callbackId, 'Введите ваше сообщение');
    }
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Admin action error:', error);
    return res.status(500).json({ error: 'Failed to process action' });
  }
};

// Вспомогательные функции
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

async function answerCallback(callbackId, text) {
  const botToken = process.env.GARDEN_BOT_TOKEN;
  const telegramApiUrl = process.env.TELEGRAM_API_URL;
  
  if (!botToken || !telegramApiUrl) {
    return;
  }
  
  const url = `${telegramApiUrl}${botToken}/answerCallbackQuery`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text: text,
      show_alert: false
    })
  });
}