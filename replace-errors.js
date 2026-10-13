const fs = require('fs');
const path = require('path');

const actionsDir = path.join(__dirname, 'src', 'actions');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const regex = /return\s+\{\s*(?:success:\s*false,\s*)?error:\s*error\.message\s*(?:\|\||\?)\s*([^;}]+)\s*\}/g;
      
      let modified = false;
      content = content.replace(regex, (match, fallback) => {
        modified = true;
        let isSuccessFalse = match.includes('success: false');
        let genericMsg = fallback.trim();
        if (genericMsg.startsWith(':')) {
           genericMsg = genericMsg.substring(1).trim();
        }
        if (isSuccessFalse) {
           return `return { success: false, error: ${genericMsg} }`;
        } else {
           return `return { error: ${genericMsg} }`;
        }
      });

      if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Modified', fullPath);
      }
    }
  }
}

processDir(actionsDir);
