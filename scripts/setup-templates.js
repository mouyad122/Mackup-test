const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '../public/images/templates');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Map the generated paths (from my previous step) to standard names
const templates = [
  {
    src: '/home/moayad/.gemini/antigravity-ide/brain/d722240d-7cbd-4fe7-9386-288ce62a62f1/base_swatch_1789470421811.jpg',
    dest: 'base-swatch.png' // using .png extension so it matches the config, Next.js Image component handles the format automatically anyway, but best to rename properly.
  },
  {
    src: '/home/moayad/.gemini/antigravity-ide/brain/d722240d-7cbd-4fe7-9386-288ce62a62f1/base_model_1789470440778.jpg',
    dest: 'base-lips.png'
  }
];

templates.forEach(t => {
  if (fs.existsSync(t.src)) {
    fs.copyFileSync(t.src, path.join(targetDir, t.dest));
    console.log(`✅ Copied ${t.dest}`);
  } else {
    console.log(`❌ Missing source: ${t.src}`);
  }
});
