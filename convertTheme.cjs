const fs = require('fs');
const path = require('path');

const replacements = [
  [/bg-gray-950/g, 'bg-gray-50'],
  [/bg-gray-900/g, 'bg-white'],
  [/bg-gray-800/g, 'bg-gray-100'],
  [/bg-gray-700/g, 'bg-gray-200'],
  [/bg-gray-600/g, 'bg-gray-300'],
  [/text-gray-100/g, 'text-gray-900'],
  [/text-gray-200/g, 'text-gray-800'],
  [/text-gray-300/g, 'text-gray-700'],
  [/text-gray-400/g, 'text-gray-600'],
  [/border-gray-800/g, 'border-gray-200'],
  [/border-gray-700/g, 'border-gray-300'],
  [/border-gray-600/g, 'border-gray-400'],
  [/hover:bg-gray-800/g, 'hover:bg-gray-100'],
  [/hover:bg-gray-700/g, 'hover:bg-gray-200'],
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('src/components', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    let lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // apply general replacements
      replacements.forEach(([regex, replacement]) => {
        line = line.replace(regex, replacement);
      });
      
      // text-white logic
      if (line.includes('text-white')) {
        const hasColorBg = /(bg-blue|bg-green|bg-red|bg-purple|bg-teal|bg-yellow|bg-black)/.test(line);
        if (!hasColorBg) {
          line = line.replace(/text-white/g, 'text-gray-900');
        }
      }
      lines[i] = line;
    }
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log('Updated ' + filePath);
  }
});
