const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// Replace costTotalSnapshot with tax: 0, total: 50000
code = code.replace(/costTotalSnapshot:\s*20000,/g, 'tax: 0, total: 50000,');

fs.writeFileSync('scripts/simulate-business-day.ts', code);
