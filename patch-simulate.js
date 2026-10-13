const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// 1. Remove status from POS payment
code = code.replace(/status:\s*'CAPTURED',\s*saleId:\s*sale\.id,/g, 'saleId: sale.id,');

// 2. Remove Captain vehicleType
code = code.replace(/vehicleType:\s*'CAR',\s*/g, '');

// 3. Remove orderId payment block entirely (lines 188-195 approx)
code = code.replace(/await prisma\.payment\.create\(\{\s*data:\s*\{\s*amount:\s*55000,\s*method:\s*'CREDIT_CARD',\s*status:\s*'CAPTURED',\s*orderId:\s*order\.id,\s*\}\s*\}\);\s*/g, '');

// 4. captainEarnings -> captainEarning
code = code.replace(/captainEarnings:\s*3000/g, 'captainEarning: 3000');

// 5. Expense date -> expenseDate, remove paymentMethod
code = code.replace(/paymentMethod:\s*'CASH',\s*date:\s*new\s*Date\(\),/g, 'expenseDate: new Date(),');

// 6. SupplierSettlement method -> paymentMethod
code = code.replace(/method:\s*'BANK_TRANSFER'/g, 'paymentMethod: \'BANK_TRANSFER\'');

// 7. SupplierInvoice paidAmount -> amountPaid
code = code.replace(/paidAmount:\s*50000/g, 'amountPaid: 50000');

// 8. DeleteMany Payment with orderId
code = code.replace(/await prisma\.payment\.deleteMany\(\{ where: \{ orderId: order\.id \} \}\);\s*/g, '');

fs.writeFileSync('scripts/simulate-business-day.ts', code);
