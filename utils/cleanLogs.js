const fs = require('fs');
const path = require('path');
const Logger = require('./logger');

module.exports = function(maxDays = 30) {
  const logsDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logsDir)) return;

  const now = Date.now();
  const files = fs.readdirSync(logsDir);

  files.forEach(file => {
    const filePath = path.join(logsDir, file);
    const stats = fs.statSync(filePath);
    const ageDays = (now - stats.mtimeMs) / (86400000);

    if (ageDays > maxDays) {
      fs.unlinkSync(filePath);
      Logger.info(`Rimosso log vecchio: ${file} (${Math.floor(ageDays)} giorni)`);
    }
  });
};