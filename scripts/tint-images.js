const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ==========================================
// Dynamic Image Tinting Utility for Makeup
// ==========================================

// Ensure output directory exists
const outputDir = path.join(__dirname, '../public/images/variants');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Converts a HEX color to an RGB object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Generates a tinted image based on a greyscale base image and a target hex color.
 * 
 * @param {string} baseImagePath - Path to the greyscale transparent base image
 * @param {string} targetHexColor - The hex color to apply (e.g., "#FF0000")
 * @param {string} outputFileName - Output filename (e.g., "lipstick-swatch-red.png")
 */
async function generateTintedImage(baseImagePath, targetHexColor, outputFileName) {
  try {
    const rgb = hexToRgb(targetHexColor);
    if (!rgb) throw new Error(`Invalid hex color: ${targetHexColor}`);

    const outputPath = path.join(outputDir, outputFileName);

    // 1. We create a solid color block of the target size
    // 2. We use the original image's alpha channel (transparency)
    // 3. We apply a 'multiply' blend of the color over the greyscale base
    
    // Get metadata to know the dimensions
    const metadata = await sharp(baseImagePath).metadata();

    // Create a solid color image
    const colorLayer = await sharp({
      create: {
        width: metadata.width,
        height: metadata.height,
        channels: 4,
        background: { r: rgb.r, g: rgb.g, b: rgb.b, alpha: 1 }
      }
    }).png().toBuffer();

    // Composite: we take the greyscale base, overlay the color using multiply, 
    // and then apply the base image's alpha channel to mask it.
    await sharp(baseImagePath)
      .composite([
        {
          input: colorLayer,
          blend: 'multiply'
        },
        {
          input: baseImagePath,
          blend: 'dest-in' // Keeps the alpha channel of the base image
        }
      ])
      .png()
      .toFile(outputPath);

    console.log(`✅ Generated: ${outputFileName} (Color: ${targetHexColor})`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Failed to process ${outputFileName}:`, error.message);
  }
}

// ==========================================
// Example Usage
// ==========================================
async function runExample() {
  console.log("🎨 Starting image tinting process...");

  // You will need to provide actual greyscale base images for this to work
  // Example: 'base-swatch.png' and 'base-model.png' in the scripts folder
  const baseSwatch = path.join(__dirname, 'base-swatch.png');
  const baseModel = path.join(__dirname, 'base-model.png');

  // Skip execution if base images don't exist yet
  if (!fs.existsSync(baseSwatch)) {
    console.log("⚠️ Example skipped: Please place a greyscale transparent 'base-swatch.png' in the scripts directory.");
    return;
  }

  const variants = [
    { name: 'ruby_red', hex: '#E0115F' },
    { name: 'nude_pink', hex: '#DDB6AB' },
    { name: 'deep_plum', hex: '#4A1C40' }
  ];

  for (const variant of variants) {
    await generateTintedImage(baseSwatch, variant.hex, `swatch-${variant.name}.png`);
    if (fs.existsSync(baseModel)) {
      await generateTintedImage(baseModel, variant.hex, `model-${variant.name}.png`);
    }
  }
  
  console.log("🎉 All images processed!");
}

// If run directly
if (require.main === module) {
  runExample();
}

module.exports = { generateTintedImage };
