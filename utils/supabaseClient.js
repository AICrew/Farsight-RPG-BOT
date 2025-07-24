const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');
const config = require('../config.js');
const { loc } = require('./translator');

class SupabaseClient {
  constructor() {
    /*if (!config.supabase.url || !config.supabase.key) {
      logger.error(loc('log.error.supabase_config_missing'));
      throw new Error(loc('log.error.supabase_config_error'));
    }

    this.client = createClient(config.supabase.url, config.supabase.key, {
      db: { schema: 'public' }
    });*/

    if (!config.supabase.url || !config.supabase.secret) {
      logger.error(loc('log.error.supabase_config_missing'));
      throw new Error(loc('log.error.supabase_config_error'));
    }

    this.client = createClient(config.supabase.url, config.supabase.secret, {
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
