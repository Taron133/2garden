module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
};module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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