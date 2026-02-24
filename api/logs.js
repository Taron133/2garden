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

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  try {
    const { endpoint, method, error, timestamp, user } = req.body;
    
    // Логируем ошибку (в реальном приложении сохраняйте в БД)
    console.error(`[ERROR] ${timestamp} - User ${user} - ${method} ${endpoint}: ${error}`);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logging error:', error);
    return res.status(500).json({ error: 'Failed to log error' });
  }
};