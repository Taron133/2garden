const axios = require('axios');
const { BOT_TOKEN, ADMIN_CHAT_ID } = process.env;

// Отправка уведомления администратору через Bot API
async function sendOrderNotification(orderId, orderData, user) {
  if (!BOT_TOKEN || !ADMIN_CHAT_ID) {
    console.warn('Telegram Bot API credentials are not set. Skipping notification.');
    return;
  }
  
  const orderMessage = `
🔔 Новый заказ!
ID: ${orderId}
Пользователь: ${user.first_name} ${user.username ? `(@${user.username})` : ''}
ID пользователя: ${user.id}

Сумма: ${orderData.totalAmount} руб.

Товары:
${orderData.items.map(item => `- ${item.name} × ${item.quantity} = ${item.total} руб.`).join('\n')}

Дата: ${new Date().toLocaleString()}
  `;
  
  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: ADMIN_CHAT_ID,
      text: orderMessage,
      parse_mode: 'HTML'
    });
  } catch (error) {
    console.error('Failed to send Telegram notification:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = { sendOrderNotification };