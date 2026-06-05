const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const basicReplacements = [
  [/\btext-2xl\b/g, 'text-app-heading'],
  [/\btext-xl\b/g, 'text-app-heading'],
  [/\btext-lg\b/g, 'text-app-label'],
  [/\btext-base\b/g, 'text-app-body'],
  [/\btext-xs\b/g, 'text-app-small'],
  [/\bfont-sans\b/g, 'font-app'],
  [/\bfont-serif\b/g, 'font-app'],
];

function convertFile(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let lines = content.split('\n');
    let changed = false;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let orig = line;

      // Handle text-sm based on context
      if (line.includes('text-sm')) {
        if (line.includes('<label') || line.includes('font-medium')) {
          line = line.replace(/\btext-sm\b/g, 'text-app-label');
        } else {
          line = line.replace(/\btext-sm\b/g, 'text-app-body');
        }
      }

      basicReplacements.forEach(([regex, repl]) => {
        line = line.replace(regex, repl);
      });

      if (line !== orig) {
        changed = true;
      }
      lines[i] = line;
    }

    if (changed) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log('Migrated typography in ' + filePath);
    }
  }
}

walkDir('src', convertFile);
