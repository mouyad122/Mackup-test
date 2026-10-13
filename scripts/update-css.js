const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../src/app/globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace brand namespace
css = css.replace(/\[data-brand="rmanah"\]/g, '[data-brand="rawaq"]');
css = css.replace(/\.rmanah-/g, '.rawaq-');

// Replace theme block
const themeBlockRegex = /@theme \{[\s\S]*?\}/;
const newThemeBlock = `@theme {
  /* ─── RAWAQ Color Palette ─── */
  --color-olive: #3F4B32;
  --color-warm-sand: #D9C6A8;
  --color-ivory: #F7F3EA;
  --color-blush-nude: #D6ACA1;
  --color-antique-gold: #B7935F;

  /* ─── Typography ─── */
  --font-heading: var(--font-noto-naskh);
  --font-body: var(--font-noto-naskh);
  --font-english: var(--font-cormorant);
}`;
css = css.replace(themeBlockRegex, newThemeBlock);

// Replace semantic palette block
const semanticPaletteRegex = /\[data-brand="rawaq"\]\s*\{[\s\S]*?color:\s*var\(--text-primary\);\s*\}/;
const newSemanticPalette = `[data-brand="rawaq"] {
  /* Primary brand surfaces */
  --brand-primary:       var(--color-olive);
  --brand-primary-hover: #2d3623;
  --brand-secondary:     var(--color-warm-sand);
  --brand-accent:        var(--color-antique-gold);
  --brand-accent-muted:  #a68250;

  /* Page surfaces */
  --surface-primary:   var(--color-ivory);
  --surface-secondary: #f0e8d5;
  --surface-warm:      var(--color-warm-sand);
  --surface-elevated:  #FFFFFF;

  /* Text */
  --text-primary:   #2B2B2B;
  --text-secondary: var(--color-olive);
  --text-quiet:     #96918b;

  /* Borders */
  --border-soft:    var(--color-warm-sand);
  --border-medium:  var(--color-antique-gold);
  --border-gold:    rgba(183, 147, 95, .42);

  /* Semantic */
  --status-success: #1F4D3A;
  --status-error:   #A61E22;

  color: var(--text-primary);
}`;
css = css.replace(semanticPaletteRegex, newSemanticPalette);

// Replace button colors and specific variables to match RAWAQ
css = css.replace(/var\(--color-charcoal-900\)/g, 'var(--color-olive)');
css = css.replace(/var\(--color-rose-600\)/g, 'var(--color-antique-gold)');
css = css.replace(/var\(--color-gold-500\)/g, 'var(--color-antique-gold)');
css = css.replace(/var\(--color-ivory-100\)/g, 'var(--color-ivory)');
css = css.replace(/#8B1E2D/g, 'var(--color-olive)');
css = css.replace(/#650A19/g, '#2d3623');
css = css.replace(/rgba\(201,162,77,\.68\)/g, 'rgba(183, 147, 95, 0.68)');

// Add Arch styles for storefront frames
css = css.replace(/\.rawaq-storefront \.rawaq-product-frame \{\s*display: block;/g, 
  '.rawaq-storefront .rawaq-product-frame {\n    display: block;\n    border-top-left-radius: 40px;\n    border-top-right-radius: 40px;');

css = css.replace(/\.rawaq-storefront \.rawaq-hero-frame \{\s*display: block;/g, 
  '.rawaq-storefront .rawaq-hero-frame {\n    display: block;\n    border-top-left-radius: 60px;\n    border-top-right-radius: 60px;');

// Update SVG paths
css = css.replace(/rmanah-tatreez-divider/g, 'rawaq-tatreez-divider');
css = css.replace(/rmanah-tatreez-strip/g, 'rawaq-tatreez-strip');

fs.writeFileSync(cssPath, css);
console.log('globals.css updated');
