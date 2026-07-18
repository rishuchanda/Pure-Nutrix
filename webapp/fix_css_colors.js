const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css') && !fullPath.includes('index.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace backgrounds
      content = content.replace(/background(-color)?:\s*#ffffff;/g, 'background$1: var(--color-bg-secondary);');
      content = content.replace(/background(-color)?:\s*#f9fafb;/g, 'background$1: var(--color-bg-secondary);');
      content = content.replace(/background:\s*#ffffff;/g, 'background: var(--color-bg-secondary);');
      
      // Replace text colors
      content = content.replace(/color:\s*#111111;/g, 'color: var(--color-text-primary);');
      content = content.replace(/color:\s*#000;/g, 'color: var(--color-text-primary);');
      content = content.replace(/color:\s*#52525b;/g, 'color: var(--color-text-secondary);');
      content = content.replace(/color:\s*#71717a;/g, 'color: var(--color-text-secondary);');
      
      // Borders
      content = content.replace(/border-color:\s*#e4e4e7;/g, 'border-color: var(--glass-border);');
      content = content.replace(/border:\s*1px solid #e4e4e7;/g, 'border: 1px solid var(--glass-border);');
      content = content.replace(/border-color:\s*#d1d5db;/g, 'border-color: var(--glass-border);');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log("CSS colors updated.");
