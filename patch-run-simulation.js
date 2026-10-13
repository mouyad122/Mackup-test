const fs = require('fs');
let code = fs.readFileSync('scripts/run-simulation.js', 'utf-8');

code = code.replace(
  "const result = spawnSync('npx', ['tsx', 'scripts/test-concurrent-checkout.ts']",
  `const result1 = spawnSync('npx', ['tsx', 'scripts/test-concurrent-checkout.ts'], { env, stdio: 'inherit', cwd: process.cwd() });
if (result1.status !== 0) process.exit(result1.status);
const result = spawnSync('npx', ['tsx', 'scripts/simulate-business-day.ts']`
);

fs.writeFileSync('scripts/run-simulation.js', code);
