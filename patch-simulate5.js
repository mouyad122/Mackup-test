const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');

// Remove totalAmount from Sale creation
code = code.replace(/totalAmount:\s*50000,/g, '');

fs.writeFileSync('scripts/simulate-business-day.ts', code);
