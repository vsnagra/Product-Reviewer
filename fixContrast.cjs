const fs = require('fs');
const path = require('path');

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
    let changed = false;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // If the line defines a className with a dark background color but doesn't have text-white
      if (line.includes('className=') || line.includes('cn(') || /"(flex|grid|px-|py-|bg-)/.test(line)) {
        if (/(bg-blue|bg-green|bg-red|bg-purple|bg-teal|bg-yellow)-(500|600|700)/.test(line)) {
          if (!line.includes('text-white') && !line.includes('text-gray-')) {
            // inject text-white
            line = line.replace(/(bg-[a-z]+-[567]00)/, '$1 text-white');
            changed = true;
          } else if (line.includes('text-gray-900')) {
             // replace text-gray-900 with text-white on these buttons
             line = line.replace(/text-gray-900/g, 'text-white');
             changed = true;
          } else if (line.includes('text-gray-800')) {
             line = line.replace(/text-gray-800/g, 'text-white');
             changed = true;
          }
        }
      }
      lines[i] = line;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, lines.join('\n'));
      console.log('Fixed contrast in ' + filePath);
    }
  }
});
