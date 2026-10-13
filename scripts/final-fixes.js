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

  // Replace dark grey backgrounds with Deep Olive
  newContent = newContent.replace(/bg-\[#242424\]/g, 'bg-[#3F4B32]');
  // Replace dark grey borders with Deep Olive
  newContent = newContent.replace(/border-\[#242424\]/g, 'border-[#3F4B32]');
  // Replace direct CSS backgrounds
  newContent = newContent.replace(/background:\s*#242424/g, 'background: #3F4B32');
  
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent);
    console.log(`Updated backgrounds in: ${filepath}`);
  }
});

// Specifically update HeroCarousel.tsx for heights
const heroPath = path.join(srcDir, 'components/HeroCarousel.tsx');
let heroContent = fs.readFileSync(heroPath, 'utf8');

heroContent = heroContent.replace(/min-h-\[480px\]/g, 'min-h-[580px]');
heroContent = heroContent.replace(/md:min-h-\[560px\]/g, 'md:min-h-[640px]');
heroContent = heroContent.replace(/min-h-\[320px\]/g, 'min-h-[420px]');

fs.writeFileSync(heroPath, heroContent);
console.log('Updated HeroCarousel.tsx minimum heights');
