const fs = require('fs');
// Mocking export/import for node
const fileContent = fs.readFileSync('./src/i18n/translations.js', 'utf8');
const translationsMatch = fileContent.match(/export const translations = ({[\s\S]*});/);
if (!translationsMatch) {
    console.error("Could not find translations object");
    process.exit(1);
}
// Strip export and evaluate as JS
let translationsStr = translationsMatch[1];
// Minimal cleanup to make it valid JS if needed, though usually it is
const translations = eval('(' + translationsStr + ')');

const enKeys = Object.keys(translations.en);
const languages = ['ar', 'hi'];

const missing = {};

languages.forEach(lang => {
    missing[lang] = enKeys.filter(key => !translations[lang] || !translations[lang].hasOwnProperty(key));
});

console.log(JSON.stringify(missing, null, 2));
