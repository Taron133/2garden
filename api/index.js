const express = require('express');
const bodyParser = require('body-parser');
const { validateInitData, verifyTelegramData } = require('./auth');
const logger = require('./logger');
const { sendOrderNotification } = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(logger.requestLogger);

// Пример данных товаров (в реальном приложении это будет БД)
const products = [
  { 
    id: 1, 
    name: "Смартфон X1", 
    price: 25990, 
    image: "https://via.placeholder.com/300/92c952",
    description: "Современный смартфон с мощным процессором и отличной камерой. Подходит для игр и повседневного использования.",
    category: "Электроника",
    stock: 15
  },
  { 
    id: 2, 
    name: "Наушники Pro", 
    price: 5990, 
    image: "https://via.placeholder.com/300/771796",
    description: "Беспроводные наушники с шумоподавлением и длительным временем работы от аккумулятора.",
    category: "Электроника",
    stock: 25
  },
  { 
    id: 3, 
    name: "Смарт-часы", 
    price: 12990, 
    image: "https://via.placeholder.com/300/24f355",
    description: "Умные часы с функцией отслеживания здоровья, погоды и уведомлениями со смартфона.",
    category: "Электроника",
    stock: 8
  },
  { 
    id: 4, 
    name: "Планшет Light", 
    price: 18990, 
    image: "https://via.placeholder.com/300/d32776",
    description: "Легкий и компактный планшет для работы и развлечений с высококачественным дисплеем.",
    category: "Электроника",
    stock: 12
  },
  { 
    id: 5, 
    name: "Портативная колонка", 
    price: 3490, 
    image: "https://via.placeholder.com/300/f66b97",
    description: "Компактная колонка с отличным звуком и возможностью подключения по Bluetooth.",
    category: "Электроника",
    stock: 30
  },
  { 
    id: 6, 
    name: "Умная лампа", 
    price: 2790, 
    image: "https://via.placeholder.com/300/56a8c2",
    description: "Светильник с регулируемой яркостью и цветовой температурой, управляемый через приложение.",
    category: "Умный дом",
    stock: 20
  },
  { 
    id: 7, 
    name: "Робот-пылесос", 
    price: 24990, 
    image: "https://via.placeholder.com/300/b0f7b4",
    description: "Автономный робот-пылесос с функцией влажной уборки и планированием маршрута.",
    category: "Умный дом",
    stock: 5
  },
  { 
    id: 8, 
    name: "Умный термостат", 
    price: 8990, 
    image: "https://via.placeholder.com/300/c9cce3",
    description: "Термостат с автоматическим управлением температурой и интеграцией с голосовыми помощниками.",
    category: "Умный дом",
    stock: 10
  }
];

// Получение категорий
app.get('/api/categories', (req, res) => {
  try {
    const categories = [...new Set(products.map(p => p.category))];
    logger.log(`Fetched categories: ${categories.join(', ')}`);
    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение товаров с фильтрацией и поиском
app.get('/api/products', (req, res) => {
  try {
    let filteredProducts = [...products];
    
    // Фильтрация по категории
    if (req.query.category && req.query.category !== 'all') {
      filteredProducts = filteredProducts.filter(p => p.category === req.query.category);
    }
    
    // Поиск по названию
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTerm) || 
        p.description.toLowerCase().includes(searchTerm)
      );
    }
    
    logger.log(`Fetched ${filteredProducts.length} products with filters:`, {
      category: req.query.category,
      search: req.query.search
    });
    
    res.json(filteredProducts);
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Создание заказа
app.post('/api/orders', validateInitData, (req, res) => {
  try {
    const { orderData } = req.body;
    
    // Валидация данных заказа
    if (!orderData || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      logger.warn('Invalid order data received', { orderData });
      return res.status(400).json({ error: 'Invalid order data' });
    }
    
    // Проверка наличия товаров и цен
    for (const item of orderData.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        logger.warn(`Product not found: ${item.productId}`);
        return res.status(400).json({ error: `Product with ID ${item.productId} not found` });
      }
      
      if (product.price !== item.price) {
        logger.warn(`Price mismatch for product ${item.productId}: expected ${product.price}, got ${item.price}`);
        return res.status(400).json({ 
          error: `Price mismatch for product ${item.productId}`,
          expected: product.price,
          received: item.price
        });
      }
      
      if (item.quantity > product.stock) {
        logger.warn(`Insufficient stock for product ${item.productId}: requested ${item.quantity}, available ${product.stock}`);
        return res.status(400).json({ 
          error: `Insufficient stock for product ${item.productId}`,
          available: product.stock,
          requested: item.quantity
        });
      }
    }
    
    // Здесь можно сохранить заказ в БД
    const orderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    logger.info(`Order created successfully: ${orderId}`, {
      userId: req.user.id,
      totalAmount: orderData.totalAmount,
      items: orderData.items
    });
    
    // Отправка уведомления администратору
    sendOrderNotification(orderId, orderData, req.user)
      .then(() => logger.info(`Notification sent for order ${orderId}`))
      .catch(error => logger.error(`Failed to send notification for order ${orderId}:`, error));
    
    res.json({ 
      orderId,
      message: 'Order created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Available endpoints:');
  console.log(`- GET /api/categories`);
  console.log(`- GET /api/products?category=...&search=...`);
  console.log(`- POST /api/orders (requires Telegram auth)`);
});