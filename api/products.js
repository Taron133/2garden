module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  // В реальном приложении здесь будет запрос к базе данных
  const products = [
    { id: 1, name: "Смартфон X1", price: 25990, category: 'electronics', 
      image: "https://via.placeholder.com/300/92c952",
      description: "Современный смартфон с мощным процессором и отличной камерой." },
    { id: 2, name: "Наушники Pro", price: 5990, category: 'audio',
      image: "https://via.placeholder.com/300/771796",
      description: "Беспроводные наушники с шумоподавлением." },
    // Добавьте остальные товары...
  ];
  
  return res.status(200).json(products);
};module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  
  // В реальном приложении здесь будет запрос к базе данных
  const products = [
    { id: 1, name: "Смартфон X1", price: 25990, category: 'electronics', 
      image: "https://via.placeholder.com/300/92c952",
      description: "Современный смартфон с мощным процессором и отличной камерой." },
    { id: 2, name: "Наушники Pro", price: 5990, category: 'audio',
      image: "https://via.placeholder.com/300/771796",
      description: "Беспроводные наушники с шумоподавлением." },
    // Добавьте остальные товары...
  ];
  
  return res.status(200).json(products);
};