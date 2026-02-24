const supabase = require('./supabase');

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
  
  const { message } = req.body;
  
  if (!message || !message.from || !message.text) {
    return res.status(200).json({ success: true }); // Не обрабатываем
  }
  
  const adminChatId = message.from.id;
  const text = message.text;
  
  // Проверяем, является ли отправитель администратором
  if (String(adminChatId) !== process.env.ADMIN_TELEGRAM_ID) {
    return res.status(200).json({ success: true }); // Не обрабатываем сообщения от не-администраторов
  }
  
  try {
    // Проверяем, есть ли активный контекст для этого администратора
    const { data: context, error } = await supabase
      .from('order_context')
      .select('*')
      .eq('admin_id', adminChatId)
      .maybeSingle();
    
    if (error || !context || context.context !== 'reply') {
      return res.status(200).json({ success: true }); // Нет активного контекста
    }
    
    // Получаем заказ
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', context.order_id)
      .single();
    
    if (orderError || !order) {
      // Удаляем контекст
      await supabase
        .from('order_context')
        .delete()
        .eq('admin_id', adminChatId);
      
      await sendTelegramMessage(
        adminChatId,
        '❌ Произошла ошибка. Заказ не найден. Контекст сброшен.'
      );
      
      return res.status(200).json({ success: true });
    }
    
    // Сохраняем сообщение в базу
    await supabase
      .from('order_messages')
      .insert({
        order_id: context.order_id,
        sender_type: 'admin',
        message: text
      });
    
    // Отправляем сообщение клиенту
    const clientMessage = `💬 Сообщение от администратора по заказу #${context.order_id}:\n\n${text}`;
    
    await sendTelegramMessage(
      order.telegram_user_id,
      clientMessage
    );
    
    // Удаляем контекст
    await supabase
      .from('order_context')
      .delete()
      .eq('admin_id', adminChatId);
    
    // Подтверждаем отправку
    await sendTelegramMessage(
      adminChatId,
      `✅ Сообщение отправлено клиенту по заказу #${context.order_id}.\n\nКонтекст сброшен.`
    );
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Failed to process message' });
  }
};

// Вспомогательная функция для отправки сообщений
async function sendTelegramMessage(chatId, text) {
  const botToken = process.env.BOT_TOKEN;
  const telegramApiUrl = process.env.TELEGRAM_API_URL;
  
  if (!botToken || !telegramApiUrl) {
    return;
  }
  
  const url = `${telegramApiUrl}${botToken}/sendMessage`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
}