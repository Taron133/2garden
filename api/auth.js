const crypto = require('crypto');
const { WEB_APP_SECRET } = process.env;

// Проверка подлинности данных инициализации Telegram
function validateInitData(req, res, next) {
  const initData = req.headers['telegram-init-data'] || req.body.initData;
  
  if (!initData) {
    logger.warn('Missing Telegram init data');
    return res.status(401).json({ error: 'Unauthorized: Missing init data' });
  }
  
  try {
    const isValid = verifyTelegramData(initData);
    
    if (!isValid) {
      logger.warn('Invalid Telegram init data', { initData });
      return res.status(401).json({ error: 'Unauthorized: Invalid init data' });
    }
    
    // Парсим данные пользователя
    const urlParams = new URLSearchParams(initData);
    req.user = {
      id: urlParams.get('user') ? JSON.parse(urlParams.get('user')).id : null,
      first_name: urlParams.get('user') ? JSON.parse(urlParams.get('user')).first_name : null,
      username: urlParams.get('user') ? JSON.parse(urlParams.get('user')).username : null
    };
    
    next();
  } catch (error) {
    logger.error('Error validating init data:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid init data format' });
  }
}

// Проверка хеша данных Telegram
function verifyTelegramData(initData) {
  // В реальном приложении используйте секретный ключ бота
  // Здесь для примера используем упрощенную проверку
  
  const secretKey = crypto.createHash('sha256').update(WEB_APP_SECRET || 'YOUR_BOT_TOKEN').digest();
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  
  urlParams.delete('hash');
  
  const dataCheckString = Array.from(urlParams.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  return hmac === hash;
}

module.exports = { validateInitData, verifyTelegramData };