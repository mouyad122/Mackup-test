import { describe, it, expect } from 'vitest';
import { detectTemplateCode } from './product-template-detection';

describe('detectTemplateCode', () => {
  it('detects perfumes and fragrances by category or name', () => {
    expect(detectTemplateCode('عطور', '')).toBe('PERFUME');
    expect(detectTemplateCode('', 'عطر رَواق الملكي عود')).toBe('PERFUME');
    expect(detectTemplateCode('', 'مسك الطهارة الأبيض')).toBe('PERFUME');
    expect(detectTemplateCode('fragrances', 'Rose EDP')).toBe('PERFUME');
  });

  it('detects gifts and sets by category or name', () => {
    expect(detectTemplateCode('هدايا وبكجات', '')).toBe('GIFTS');
    expect(detectTemplateCode('', 'بكج هدايا التخرج الفاخر')).toBe('GIFTS');
    expect(detectTemplateCode('gifts', 'VIP Gift Box')).toBe('GIFTS');
  });

  it('detects accessories by category or name', () => {
    expect(detectTemplateCode('إكسسوارات', '')).toBe('ACCESSORIES');
    expect(detectTemplateCode('', 'سوار فضة 925 مرصع')).toBe('ACCESSORIES');
    expect(detectTemplateCode('', 'خاتم مطلي بالذهب')).toBe('ACCESSORIES');
  });

  it('detects fashion items (Abayas, Dresses, Heritage dresses)', () => {
    expect(detectTemplateCode('عبايات', '')).toBe('ABAYA');
    expect(detectTemplateCode('أثواب تراثية', '')).toBe('JORDANIAN_DRESS');
    expect(detectTemplateCode('', 'ثوب أردني مطرز يدوي')).toBe('JORDANIAN_DRESS');
    expect(detectTemplateCode('فساتين', '')).toBe('DRESS');
  });

  it('detects makeup and skincare products', () => {
    expect(detectTemplateCode('', 'أحمر شفاه مخملي')).toBe('LIPSTICK');
    expect(detectTemplateCode('', 'سيروم حمض الهيالورونيك')).toBe('SERUM');
    expect(detectTemplateCode('', 'واقي شمس فيزيائي SPF 50')).toBe('SUNSCREEN');
    expect(detectTemplateCode('', 'كريم أساس مطفي فاونديشن')).toBe('FOUNDATION');
  });

  it('returns null when no match is detected', () => {
    expect(detectTemplateCode('عام', 'منتج غير مصنف')).toBeNull();
  });
});
