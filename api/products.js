module.exports = async (req, res) => {
  // Обработка preflight запросов (CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data');
    res.status(200).end();
    return;
  }

  // Установка CORS заголовков
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Telegram-Init-Data');

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  // В реальном приложении здесь будет запрос к базе данных
  const products = [
    { 
      id: 1, 
      name: "Смартфон X1", 
      price: 25990, 
      category: 'electronics',
      image: "https://via.placeholder.com/300/92c952",
      description: "Современный смартфон с мощным процессором и отличной камерой."
    },
    { 
      id: 2, 
      name: "Наушники Pro", 
      price: 5990, 
      category: 'audio',
      image: "https://via.placeholder.com/300/771796",
      description: "Беспроводные наушники с шумоподавлением."
    },
    { 
      id: 3, 
      name: "Смарт-часы", 
      price: 12990, 
      category: 'electronics',
      image: "https://via.placeholder.com/300/24f355",
      description: "Умные часы с функцией отслеживания здоровья."
    },
    { 
      id: 4, 
      name: "Планшет Light", 
      price: 18990, 
      category: 'electronics',
      image: "https://via.placeholder.com/300/d32776",
      description: "Легкий и компактный планшет для работы и развлечений."
    },
    { 
      id: 5, 
      name: "Портативная колонка", 
      price: 3490, 
      category: 'audio',
      image: "https://via.placeholder.com/300/f66b97",
      description: "Компактная колонка с отличным звуком."
    },
    { 
      id: 6, 
      name: "Умная лампа", 
      price: 2790, 
      category: 'smart_home',
      image: "https://via.placeholder.com/300/56a8c2",
      description: "Светильник с регулируемой яркостью."
    }
  ];
  
  return res.status(200).json(products);
};