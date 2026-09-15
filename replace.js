const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css') || file.endsWith('.json') || file.endsWith('.md')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Arabic Replacements
  content = content.replace(/مؤسسة دهب للعطور/g, 'ميكاب ديمو');
  content = content.replace(/دهب للعطور/g, 'ميكاب ديمو');
  content = content.replace(/دهب POS/g, 'ميكاب ديمو POS');
  content = content.replace(/دهب/g, 'ميكاب ديمو');
  content = content.replace(/للعطور/g, 'للمكياج');
  content = content.replace(/العطور/g, 'المكياج');
  content = content.replace(/عطور/g, 'مكياج');
  content = content.replace(/عطر /g, 'مكياج ');
  
  // English Replacements
  content = content.replace(/Dahab Perfumes/gi, 'Makeup Demo');
  content = content.replace(/dahab-perfumes/gi, 'makeup-demo');
  content = content.replace(/dahab_cart/gi, 'makeup_cart');
  content = content.replace(/dahab_session/gi, 'makeup_session');
  content = content.replace(/dahab_pos/gi, 'makeup_pos');
  content = content.replace(/dahab_/gi, 'makeup_');
  content = content.replace(/dahab/gi, 'makeup');
  content = content.replace(/Perfumes/g, 'Makeup');
  content = content.replace(/perfumes/g, 'makeup');
  content = content.replace(/Perfume/g, 'Makeup');
  content = content.replace(/perfume/g, 'makeup');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
  }
});
