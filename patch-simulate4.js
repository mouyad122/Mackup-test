const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// 1. Remove productId from InventoryMovement
code = code.replace(/prisma\.inventoryMovement\.create\(\{[\s\S]*?data:\s*\{[\s\S]*?productId:\s*product\.id,([\s\S]*?)\}\s*\}\);/, (match, group1) => match.replace(/productId:\s*product\.id,/, ''));

// 2. Remove productId from SaleItem
code = code.replace(/items:\s*\{\s*create:\s*\{[\s\S]*?variantId:\s*variant\.id,[\s\S]*?productId:\s*product\.id,([\s\S]*?)\}\s*\}/, (match) => match.replace(/productId:\s*product\.id,/, ''));

// 3. Add customerDeliveryFee to DeliveryAssignment
code = code.replace(/captainEarning:\s*3000,/g, 'captainEarning: 3000,\n      customerDeliveryFee: 5000,');

fs.writeFileSync('scripts/simulate-business-day.ts', code);
