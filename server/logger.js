const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Создаем папку для логов, если её нет
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Файл для логов
const logFile = path.join(logDir, `app-${format(new Date(), 'yyyy-MM-dd')}.log`);

const log = (message, level = 'info') => {
  const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  
  // Записываем в файл
  fs.appendFile(logFile, logMessage, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
  
  // Показываем в консоли
  if (level === 'error') {
    console.error(logMessage.trim());
  } else if (level === 'warn') {
    console.warn(logMessage.trim());
  } else {
    console.log(logMessage.trim());
  }
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logMessage = `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      log(logMessage, 'error');
    } else if (res.statusCode >= 400) {
      log(logMessage, 'warn');
    } else {
      log(logMessage, 'info');
    }
  });
  
  next();
};

module.exports = {
  log: (message) => log(message, 'info'),
  warn: (message) => log(message, 'warn'),
  error: (message) => log(message, 'error'),
  requestLogger
};