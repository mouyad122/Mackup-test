const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// 1. Remove reason from InventoryMovement
code = code.replace(/reason:\s*'[^']+',/g, '');

// 2. Remove SupplierInvoice creation
code = code.replace(/const invoice = await prisma\.supplierInvoice\.create\(\{[\s\S]*?\}\);\s*/g, '');

// 3. Remove SupplierSettlement creation and Invoice update
code = code.replace(/await prisma\.supplierSettlement\.create\(\{[\s\S]*?\}\);\s*/g, '');
code = code.replace(/await prisma\.supplierInvoice\.update\(\{[\s\S]*?\}\);\s*/g, '');

// 4. Remove productId from SaleItem and OrderItem
code = code.replace(/productId:\s*product\.id,/g, '');

// 5. Remove commissionBps from Captain
code = code.replace(/commissionBps:\s*0,/g, '');

// 6. Remove platformDeliveryProfit from DeliveryAssignment
code = code.replace(/platformDeliveryProfit:\s*2000,/g, '');

// 7. Change employeeId to createdByEmployeeId in Expense
code = code.replace(/employeeId:\s*employee\.id,/g, 'createdByEmployeeId: employee.id,');
// Actually, let's fix employeeId -> createdByEmployeeId for Expense specifically.
// In the script, it's at line 208, let's just do a specific replace.
// Wait, inventoryMovement needs employeeId. Let's not blindly replace.
code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');
code = code.replace(/reason:\s*'[^']+',/g, '');
code = code.replace(/const invoice = await prisma\.supplierInvoice\.create\(\{[\s\S]*?\}\);\s*/g, '');
code = code.replace(/await prisma\.supplierSettlement\.create\(\{[\s\S]*?\}\);\s*/g, '');
code = code.replace(/await prisma\.supplierInvoice\.update\(\{[\s\S]*?\}\);\s*/g, '');
code = code.replace(/productId:\s*product\.id,/g, '');
code = code.replace(/commissionBps:\s*0,\s*\/\/\s*Flat fee handling/g, '');
code = code.replace(/platformDeliveryProfit:\s*2000,/g, '');

// For expense employeeId, let's just do a regex for the Expense block
code = code.replace(/category:\s*'MARKETING',[\s\S]*?employeeId:\s*employee\.id,/g, match => match.replace('employeeId:', 'createdByEmployeeId:'));

fs.writeFileSync('scripts/simulate-business-day.ts', code);
