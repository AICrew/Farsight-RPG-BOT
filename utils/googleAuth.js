const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../google-creds.json');
const { loc } = require('./translator');
const Logger = require('./logger');

module.exports = {
  async getDocFromLink(fullLink) {
    const sheetId = fullLink.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!sheetId) throw new Error(loc('log.error.google_auth_invalid_link'));

    Logger.info(loc('log.success.google_auth_sheet_id', { sheetId }));

    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    Logger.info(loc('log.success.google_auth_jwt_created', { email: creds.client_email }));

    const doc = new GoogleSpreadsheet(sheetId, auth);

    Logger.info(loc('log.success.google_auth_loading_doc'));
    await doc.loadInfo();
    Logger.info(loc('log.success.google_auth_doc_loaded'));

    return doc;
  }
};
