const { createSupabaseClient } = require('../supabase');
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data, Content-Type');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
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
      // Логируем попытку неавторизованного доступа
      const accessSupabase = createSupabaseClient();
      await accessSupabase
        .from('admin_access_attempts')
        .insert({
          telegram_id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          attempt_time: new Date().toISOString(),
          endpoint: req.url,
          method: req.method,
          details: {
            ip: req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
          }
        });
      
      return res.status(403).json({ error: 'Forbidden: Not an admin' });
    }
    
    // Обработка GET запроса (получение всех товаров)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to fetch products' });
      }
      
      return res.status(200).json(data);
    }
    
    // Обработка POST запроса (создание нового товара)
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
      const { data, error: insertError } = await supabase
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
      
      if (insertError) {
        console.error('Supabase insert error:', insertError);
        return res.status(500).json({ error: 'Failed to save product' });
      }
      
      // Логируем успешное добавление товара
      await supabase
        .from('admin_activity')
        .insert({
          telegram_id: user.id,
          action: 'create',
          target_type: 'product',
          target_id: data.id,
          details: {
            name: data.name,
            price: data.price
          }
        });
      
      return res.status(201).json({ 
        success: true,
        product: data,
        message: 'Товар успешно добавлен'
      });
    }
    
    // Обработка PUT запроса (обновление товара)
    if (req.method === 'PUT') {
      const productId = req.url.split('/').pop();
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
      
      // Обновляем товар в Supabase
      const { data, error: updateError } = await supabase
        .from('products')
        .update({
          name,
          price,
          category,
          image,
          description,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Supabase update error:', updateError);
        return res.status(500).json({ error: 'Failed to update product' });
      }
      
      // Логируем успешное обновление товара
      await supabase
        .from('admin_activity')
        .insert({
          telegram_id: user.id,
          action: 'update',
          target_type: 'product',
          target_id: data.id,
          details: {
            name: data.name,
            price: data.price,
            changes: {
              name: req.body.name !== data.name ? { old: req.body.name, new: data.name } : undefined,
              price: req.body.price !== data.price ? { old: req.body.price, new: data.price } : undefined,
              // Добавьте другие поля при необходимости
            }
          }
        });
      
      return res.status(200).json({ 
        success: true,
        product: data,
        message: 'Товар успешно обновлен'
      });
    }
    
    // Обработка DELETE запроса (удаление товара)
    if (req.method === 'DELETE') {
      const productId = req.url.split('/').pop();
      
      // Получаем информацию о товаре перед удалением для логирования
      const {  product, error: fetchError } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('id', productId)
        .single();
      
      if (fetchError || !product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      // Удаляем товар из Supabase
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (deleteError) {
        console.error('Supabase delete error:', deleteError);
        return res.status(500).json({ error: 'Failed to delete product' });
      }
      
      // Логируем успешное удаление товара
      await supabase
        .from('admin_activity')
        .insert({
          telegram_id: user.id,
          action: 'delete',
          target_type: 'product',
          target_id: productId,
          details: {
            name: product.name,
            price: product.price
          }
        });
      
      return res.status(200).json({ 
        success: true,
        message: 'Товар успешно удален'
      });
    }
    
    // Неподдерживаемый метод
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (error) {
    console.error('Admin product error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
};