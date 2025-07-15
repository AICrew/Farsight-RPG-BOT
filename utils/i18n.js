const i18next = require('i18next');
const FsBackend = require('i18next-fs-backend');
const path = require('path');

i18next
  .use(FsBackend)
  .init({
    backend: {
      loadPath: path.join(__dirname, '../locales/{{lng}}.json'),
    },
    lng: 'it',
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    keySeparator: false,       // ci aiuta con JSON flat
    nsSeparator: false,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
  });

module.exports = i18next;
