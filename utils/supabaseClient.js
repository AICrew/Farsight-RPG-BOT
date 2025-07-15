const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
const config = require('../config.js');

class SupabaseClient {
  constructor() {
    if (!config.supabase.url || !config.supabase.key) {
      logger.error('Configurazione Supabase mancante');
      throw new Error('Supabase non configurato');
    }

    this.client = createClient(config.supabase.url, config.supabase.key, {
      db: { schema: 'public' }
    });
  }

  get rpc() {
    return this.client.rpc.bind(this.client);
  }

  get from() {
    return this.client.from.bind(this.client);
  }
}

module.exports = new SupabaseClient();