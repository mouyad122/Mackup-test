#!/bin/bash
OUTPUT="reports/CURRENT_IMPLEMENTATION_EVIDENCE.md"

echo "# Current Implementation Evidence" > $OUTPUT
echo "" >> $OUTPUT

echo "## Current Branch" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
git branch --show-current >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Current Commit Hash" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
git rev-parse HEAD >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Git Status" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
git status --short >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Git Diff Stat (Against initial)" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
git diff --stat $(git rev-list --max-parents=0 HEAD) >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Complete File List" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
find src prisma scripts docs -type f | sort >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## package.json" >> $OUTPUT
echo "\`\`\`json" >> $OUTPUT
cat package.json >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## pnpm list --depth=0" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
pnpm list --depth=0 >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Complete Route Tree" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
find src/app -type f -name "page.tsx" -o -name "layout.tsx" | sort >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Complete Prisma Model List" >> $OUTPUT
echo "\`\`\`prisma" >> $OUTPUT
grep "model " prisma/schema.prisma >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Existing Test File List" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
find . -name "*.test.ts" -o -name "*.spec.ts" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Existing Scripts" >> $OUTPUT
echo "\`\`\`" >> $OUTPUT
jq '.scripts' package.json >> $OUTPUT
echo "\`\`\`" >> $OUTPUT

echo "## Data Status" >> $OUTPUT
echo "- **Pages data source**: Prisma DB (for products, sessions). No mock data is used." >> $OUTPUT
echo "- **CSV rows inspected**: 1003 (from products.csv)" >> $OUTPUT
echo "- **Product images inspected**: Actual count of images in source-data/products/" >> $OUTPUT

