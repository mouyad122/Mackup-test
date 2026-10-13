const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Rename file first
const oldFilePath = path.join(srcDir, 'components/RmanahProductFrame.tsx');
const newFilePath = path.join(srcDir, 'components/RawaqProductFrame.tsx');
if (fs.existsSync(oldFilePath)) {
  fs.renameSync(oldFilePath, newFilePath);
  console.log('Renamed RmanahProductFrame.tsx to RawaqProductFrame.tsx');
}

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

  // Replacements
  newContent = newContent.replace(/RmanahProductFrame/g, 'RawaqProductFrame');
  newContent = newContent.replace(/data-brand="rmanah"/g, 'data-brand="rawaq"');
  newContent = newContent.replace(/rmanah-/g, 'rawaq-');
  newContent = newContent.replace(/rmanah/g, 'rawaq');
  newContent = newContent.replace(/Rmanah/g, 'Rawaq');
  
  // Hardcoded Arabic name replacement
  newContent = newContent.replace(/رمانة/g, 'رَواق');

  // Specific logo extension change
  newContent = newContent.replace(/rawaq-logo\.png/g, 'rawaq-logo.svg');

  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent);
    console.log(`Updated: ${filepath}`);
  }
});

console.log('Refactoring complete.');
