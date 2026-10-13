const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stats = fs.statSync(filepath);
    if (stats.isDirectory()) {
      walkSync(filepath, callback);
    } else if (stats.isFile()) {
      callback(filepath);
    }
  });
}

walkSync(srcDir, (filepath) => {
  if (!filepath.endsWith('.tsx') && !filepath.endsWith('.ts') && !filepath.endsWith('.css')) return;

  let content = fs.readFileSync(filepath, 'utf8');
  let newContent = content;

  // A. Replace RMANAH
  newContent = newContent.replace(/RMANAH/g, 'RAWAQ');

  // B. Color Consistency
  newContent = newContent.replace(/#8B1E2D/gi, '#3F4B32'); // Burgundy -> Deep Olive
  newContent = newContent.replace(/#1F4D3A/gi, '#3F4B32'); // Old Green -> Deep Olive
  newContent = newContent.replace(/#C9A24D/gi, '#B7935F'); // Old Gold -> Antique Gold
  newContent = newContent.replace(/#D8C6AA/gi, '#D9C6A8'); // Old Warm Sand -> New Warm Sand
  newContent = newContent.replace(/#F8F2E8/gi, '#F7F3EA'); // Old Ivory -> Soft Ivory
  newContent = newContent.replace(/#F5EBDD/gi, '#F7F3EA'); // Secondary background
  
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent);
    console.log(`Updated: ${filepath}`);
  }
});

console.log('Phase 0B textual replacement complete.');
