const locales = {
  en: require('../../locales/en.json'),
  fr: require('../../locales/fr.json'),
};
const supportedLanguages = ['en', 'fr'];

// Returns 'en' or 'fr'. Anything unsupported (or missing) falls back to English.
function resolveLanguage(requested) {
  if (typeof requested !== 'string') {
    return 'en';
  }
  const lang = requested.trim().toLowerCase();
  if (supportedLanguages.includes(lang)) {
    return lang;
  }
  return 'en';
}

function getTexts(requested) {
  const lang = resolveLanguage(requested);
  return { lang: lang, texts: locales[lang] };
}


function formatToday(texts, date) {
  if (date === undefined) {
    date = new Date();
  }
  return new Intl.DateTimeFormat(texts.locale, { dateStyle: 'full' }).format(date);
}

module.exports = { supportedLanguages, locales, resolveLanguage, getTexts, formatToday };
