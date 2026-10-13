const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// 1. Remove discountAmount from Sale
code = code.replace(/discountAmount:\s*0,/g, '');

// 2. Put productId back into items: { create: { ... } } for both Sale and Order
// Instead of complex regex, let's just insert it after variantId or sku
code = code.replace(/sku:\s*variant\.sku,/g, 'sku: variant.sku,\n          productId: product.id,');

// 3. Remove completedAt from DeliveryAssignment
code = code.replace(/completedAt:\s*new\s*Date\(\),/g, '');

fs.writeFileSync('scripts/simulate-business-day.ts', code);
