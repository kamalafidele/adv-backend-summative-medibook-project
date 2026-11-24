const i18n = require('../i18n');

// Makes text safe to put inside HTML
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPage(lang, texts, today) {
  // links to switch language
  let languageLinks = '';
  for (let i = 0; i < i18n.supportedLanguages.length; i++) {
    const code = i18n.supportedLanguages[i];
    const name = i18n.locales[code].languageName;
    if (code === lang) {
      languageLinks += '<strong>' + escapeHtml(name) + '</strong> ';
    } else {
      languageLinks += '<a href="/feedback?lang=' + code + '">' + escapeHtml(name) + '</a> ';
    }
  }

  // the 5 questions, each with a textarea
  let questionsHtml = '';
  for (let i = 0; i < texts.questions.length; i++) {
    const number = i + 1;
    questionsHtml += '<div class="question">' +
      '<label for="q' + number + '">' + number + '. ' + escapeHtml(texts.questions[i]) + '</label>' +
      '<textarea id="q' + number + '" name="q' + number + '" rows="4" required></textarea>' +
      '</div>';
  }

  return '<!DOCTYPE html>' +
    '<html lang="' + lang + '">' +
    '<head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>' + escapeHtml(texts.title) + '</title>' +
    '<style>' +
    'body { font-family: Arial, sans-serif; max-width: 700px; margin: 30px auto; padding: 0 15px; }' +
    '.question { margin: 20px 0; }' +
    'label { display: block; font-weight: bold; margin-bottom: 5px; }' +
    'textarea { width: 100%; box-sizing: border-box; padding: 8px; }' +
    '#thanks { display: none; color: green; font-weight: bold; }' +
    '</style>' +
    '</head>' +
    '<body>' +
    '<p>' + escapeHtml(texts.languageLabel) + ': ' + languageLinks + '</p>' +
    '<h1>' + escapeHtml(texts.heading) + '</h1>' +
    '<p>' + escapeHtml(texts.dateLabel) + ': ' + escapeHtml(today) + '</p>' +
    '<p>' + escapeHtml(texts.instructions) + '</p>' +
    '<form id="feedback-form">' +
    questionsHtml +
    '<button type="submit">' + escapeHtml(texts.submit) + '</button>' +
    '<p id="thanks">' + escapeHtml(texts.thanks) + '</p>' +
    '</form>' +
    '<script>' +
    'document.getElementById("feedback-form").addEventListener("submit", function (event) {' +
    '  event.preventDefault();' +
    '  document.getElementById("thanks").style.display = "block";' +
    '});' +
    '</script>' +
    '</body>' +
    '</html>';
}

// GET /feedback?lang=fr
function showFeedbackPage(req, res) {
  const result = i18n.getTexts(req.query.lang);
  const today = i18n.formatToday(result.texts);
  res.send(buildPage(result.lang, result.texts, today));
}

module.exports = { showFeedbackPage, buildPage };
