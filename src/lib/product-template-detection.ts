/**
 * Pure client-safe detection of template codes based on Category and Product name.
 * Free of Node.js modules or database connections.
 */
export function detectTemplateCode(categoryNameOrSlug = '', productName = ''): string | null {
  const cat = categoryNameOrSlug.toLowerCase().trim();
  const name = productName.toLowerCase().trim();

  // 1. Direct Category Matches
  if (cat.includes('عباي') || cat.includes('abaya')) return 'ABAYA';
  if (cat.includes('تراث') || cat.includes('heritage') || cat.includes('أثواب')) return 'JORDANIAN_DRESS';
  if (cat.includes('فستان') || cat.includes('فساتين') || cat.includes('dress')) return 'DRESS';
  if (cat.includes('طقم') || cat.includes('أطقم') || cat.includes('set')) return 'WOMENS_SET';

  // 2. Product Name Keyword Matching (works for Makeup, Skincare, or General)
  if (name.includes('ملمع') || name.includes('قلوس') || name.includes('gloss')) return 'LIP_GLOSS';
  if (name.includes('محدد') || (name.includes('liner') && name.includes('شفاه'))) return 'LIP_LINER';
  if (name.includes('تنت') || name.includes('tint')) return 'LIP_TINT';
  if (name.includes('شفاه') || name.includes('روج') || name.includes('حمرة') || name.includes('lipstick')) return 'LIPSTICK';
  if (name.includes('عناية الشفاه') || name.includes('مرطب شفاه') || name.includes('lip care')) return 'LIP_CARE';
  if (name.includes('فاونديشن') || name.includes('كريم أساس') || name.includes('foundation')) return 'FOUNDATION';
  if (name.includes('كونسيلر') || name.includes('خافي عيوب') || name.includes('concealer')) return 'CONCEALER';
  if (name.includes('بلاشر') || name.includes('أحمر خدود') || name.includes('خدود') || name.includes('blush')) return 'BLUSH';
  if (name.includes('بودرة') || name.includes('powder')) return 'POWDER';
  if (name.includes('هايلايت') || name.includes('إضاءة') || name.includes('highlighter')) return 'HIGHLIGHTER';
  if (name.includes('برايمر') || name.includes('primer')) return 'PRIMER';
  if (name.includes('ماسكارا') || name.includes('مسكارة') || name.includes('mascara')) return 'MASCARA';
  if (name.includes('آيلاينر') || name.includes('ايلاينر') || name.includes('كحل') || name.includes('eyeliner')) return 'EYELINER';
  if (name.includes('ظلال') || name.includes('ايشادو') || name.includes('eyeshadow')) return 'EYESHADOW';
  if (name.includes('حواجب') || name.includes('brow')) return 'BROW_PENCIL';
  if (name.includes('رموش') || name.includes('lashes')) return 'FALSE_LASHES';
  if (name.includes('سيروم') || name.includes('مصل') || name.includes('serum')) return 'SERUM';
  if (name.includes('غسول') || name.includes('منظف') || name.includes('cleanser')) return 'CLEANSER';
  if (name.includes('مرطب') || name.includes('moisturizer')) return 'MOISTURIZER';
  if (name.includes('واقي') || name.includes('شمس') || name.includes('sunscreen') || name.includes('spf')) return 'SUNSCREEN';
  if (name.includes('ماسك') || name.includes('قناع') || name.includes('mask')) return 'FACE_MASK';
  if (name.includes('مقشر') || name.includes('تقشير') || name.includes('exfoliant') || name.includes('scrub')) return 'EXFOLIANT';
  if (name.includes('عين') || name.includes('eye cream')) return 'EYE_CREAM';
  if (name.includes('عباي') || name.includes('abaya')) return 'ABAYA';
  if (name.includes('ثوب') || name.includes('تطريز')) return 'JORDANIAN_DRESS';
  if (name.includes('فستان') || name.includes('dress')) return 'DRESS';

  // 3. Fallbacks based on category context
  if (cat.includes('مكياج') || cat.includes('makeup')) return 'LIPSTICK';
  if (cat.includes('عناية') || cat.includes('skincare')) return 'SERUM';

  return null;
}
