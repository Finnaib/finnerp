const fs = require('fs');
const path = require('path');

const filePath = 'src/i18n/translations.js';
const content = fs.readFileSync(filePath, 'utf8');

// Pattern to match language sections
// Example: "en": { ... }
const langRegex = /"(\w+)": \{/;
const parts = content.split(langRegex);

// parts[0] is the start of the file: export const translations = {
// parts[1] is "en"
// parts[2] is the body of "en"
// parts[3] is "hi"
// ...

const newParts = [parts[0]];

for (let i = 1; i < parts.length; i += 2) {
    const lang = parts[i];
    const body = parts[i+1];
    
    const lines = body.split('\n');
    const seenKeys = new Set();
    const cleanedLines = [];
    
    for (let line of lines) {
        const keyMatch = line.match(/^\s+"([^"]+)":/);
        if (keyMatch) {
            const key = keyMatch[1];
            if (seenKeys.has(key)) {
                console.log(`Removing duplicate key "${key}" in "${lang}"`);
                continue; // Skip this line
            }
            seenKeys.add(key);
        }
        cleanedLines.push(line);
    }
    
    newParts.push(`"${lang}": {`);
    newParts.push(cleanedLines.join('\n'));
}

fs.writeFileSync(filePath, newParts.join(''), 'utf8');
console.log('Deduplication complete.');
