const fs = require('fs');
const path = require('path');
const { WebhookClient } = require('discord.js');
const config = require('../config');
const { loc } = require('./translator');

// Setup cartella logs
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const getFormattedDate = () => new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

class Logger {
  constructor() {
    this.webhook = config.logWebhook ? new WebhookClient({ url: config.logWebhook }) : null;
    this.logLevel = config.env === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  }

  _writeToFile(message) {
    const logFile = path.join(logsDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, message + '\n');
  }

  log(level, message, metadata = {}) {
    const timestamp = getFormattedDate();
    const levelStr = ['DEBUG', 'INFO', 'WARN', 'ERROR'][level];
    const logMessage = `[${timestamp}] [${levelStr}] ${message} ${JSON.stringify(metadata)}`;

    // Console output
    if (level >= this.logLevel) {
      const colors = { DEBUG: '\x1b[36m', INFO: '\x1b[32m', WARN: '\x1b[33m', ERROR: '\x1b[31m' };
      console.log(`${colors[levelStr]}${logMessage}\x1b[0m`);
    }

    // File log
    this._writeToFile(logMessage);

    // Webhook per errori
    if (level === LogLevel.ERROR && this.webhook) {
      this.webhook.send({
        content: `**${loc('log.error.logger_error')}** ${loc('log.error.in_environment', { env: config.env.toUpperCase() })}:\n\`\`\`${message}\n${JSON.stringify(metadata)}\`\`\``
      }).catch(console.error);
    }
  }
}

const loggerInstance = new Logger();

module.exports = {
  debug: (msg, meta) => loggerInstance.log(LogLevel.DEBUG, msg, meta),
  info: (msg, meta) => loggerInstance.log(LogLevel.INFO, msg, meta),
  warn: (msg, meta) => loggerInstance.log(LogLevel.WARN, msg, meta),
  error: (msg, meta) => loggerInstance.log(LogLevel.ERROR, msg, meta)
};
