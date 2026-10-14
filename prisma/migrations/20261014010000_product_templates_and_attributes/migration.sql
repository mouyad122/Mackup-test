-- Configurable product templates. This migration is intentionally reviewable and is not applied automatically.
ALTER TABLE "Product" ADD COLUMN "productTemplateId" TEXT;

CREATE TABLE "ProductTemplate" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeDefinition" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "inputType" TEXT NOT NULL DEFAULT 'TEXT',
  "optionsJson" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductAttributeDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductTemplateField" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "attributeDefinitionId" TEXT NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "showOnProductPage" BOOLEAN NOT NULL DEFAULT true,
  "isFilterable" BOOLEAN NOT NULL DEFAULT false,
  "useAsVariant" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductTemplateField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeValue" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "attributeDefinitionId" TEXT NOT NULL,
  "valueJson" TEXT NOT NULL,
  CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductVariantAttributeValue" (
  "id" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "attributeDefinitionId" TEXT NOT NULL,
  "valueJson" TEXT NOT NULL,
  CONSTRAINT "ProductVariantAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductTemplate_code_key" ON "ProductTemplate"("code");
CREATE UNIQUE INDEX "ProductAttributeDefinition_key_key" ON "ProductAttributeDefinition"("key");
CREATE UNIQUE INDEX "ProductTemplateField_templateId_attributeDefinitionId_key" ON "ProductTemplateField"("templateId", "attributeDefinitionId");
CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeDefinitionId_key" ON "ProductAttributeValue"("productId", "attributeDefinitionId");
CREATE UNIQUE INDEX "ProductVariantAttributeValue_variantId_attributeDefinitionId_key" ON "ProductVariantAttributeValue"("variantId", "attributeDefinitionId");
CREATE INDEX "Product_productTemplateId_idx" ON "Product"("productTemplateId");
CREATE INDEX "ProductTemplateField_templateId_sortOrder_idx" ON "ProductTemplateField"("templateId", "sortOrder");
CREATE INDEX "ProductAttributeValue_attributeDefinitionId_idx" ON "ProductAttributeValue"("attributeDefinitionId");
CREATE INDEX "ProductVariantAttributeValue_attributeDefinitionId_idx" ON "ProductVariantAttributeValue"("attributeDefinitionId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_productTemplateId_fkey" FOREIGN KEY ("productTemplateId") REFERENCES "ProductTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateField" ADD CONSTRAINT "ProductTemplateField_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProductTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductTemplateField" ADD CONSTRAINT "ProductTemplateField_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "ProductAttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "ProductAttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariantAttributeValue" ADD CONSTRAINT "ProductVariantAttributeValue_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductVariantAttributeValue" ADD CONSTRAINT "ProductVariantAttributeValue_attributeDefinitionId_fkey" FOREIGN KEY ("attributeDefinitionId") REFERENCES "ProductAttributeDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
