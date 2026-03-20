const fs = require('fs');
const content = fs.readFileSync('c:/Users/Finnaib/Desktop/finnerp(pc)/src/App.js', 'utf8');

const stack = [];
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let pos = 0;
    while(pos < line.length) {
        if (line[pos] === '{' || line[pos] === '(' || line[pos] === '[') {
            stack.push({ char: line[pos], line: i+1 });
        } else if (line[pos] === '}' || line[pos] === ')' || line[pos] === ']') {
            if (stack.length > 0) {
                const last = stack[stack.length-1].char;
                if ((line[pos] === '}' && last === '{') ||
                    (line[pos] === ')' && last === '(') ||
                    (line[pos] === ']' && last === '[')) {
                    stack.pop();
                } else {
                    console.log("Mismatched " + line[pos] + " at " + (i+1) + " (expected " + (last==='{'?'}' : last==='('?')' : ']') + " from " + stack[stack.length-1].line + ")");
                    stack.pop();
                }
            } else {
                console.log("Extra " + line[pos] + " at " + (i+1));
            }
        }
        else if (line.slice(pos, pos+1) === '<' && line[pos+1] !== ' ' && line[pos+1] !== '!') {
            let isClosing = line[pos+1] === '/';
            let tagStart = isClosing ? pos+2 : pos+1;
            let tagEnd = line.indexOf(' ', tagStart);
            let tagEnd2 = line.indexOf('>', tagStart);
            if (tagEnd === -1 || (tagEnd2 !== -1 && tagEnd2 < tagEnd)) tagEnd = tagEnd2;
            let tagName = line.slice(tagStart, tagEnd);
            if (tagName.endsWith('/')) tagName = tagName.slice(0, -1);
            
            if (isClosing) {
                if (stack.length > 0 && stack[stack.length-1].tagName === tagName) {
                    stack.pop();
                } else {
                    console.log("Extra </" + tagName + "> at " + (i+1) + " (expected " + (stack.length>0?stack[stack.length-1].tagName:'none') + " from line " + (stack.length>0?stack[stack.length-1].line:'none') + ")");
                }
            } else {
                let closingBracket = line.indexOf('>', pos);
                if (closingBracket !== -1 && line[closingBracket-1] !== '/') {
                    stack.push({ char: 'tag', tagName: tagName, line: i+1 });
                }
                pos = closingBracket === -1 ? pos+1 : closingBracket;
            }
        }
        pos++;
    }
}

console.log('Unclosed items:');
stack.forEach(s => console.log((s.tagName || s.char) + " from line " + s.line));
