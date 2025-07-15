const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('../google-creds.json');

module.exports = {
  async getDocFromLink(fullLink) {
    const sheetId = fullLink.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
    if (!sheetId) throw new Error('Formato link non valido');

    console.log('[googleAuth] Sheet ID:', sheetId);

    const auth = new JWT({
      email: creds.client_email,
      key: creds.private_key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    console.log('[googleAuth] JWT creato con email:', creds.client_email);

    const doc = new GoogleSpreadsheet(sheetId, auth);

    console.log('[googleAuth] Tentativo di caricare info del documento...');
    await doc.loadInfo();
    console.log('[googleAuth] Documento caricato con successo');

    return doc;
  }
};