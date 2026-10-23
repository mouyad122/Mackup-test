import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { rawaqProductTemplates } from '@/lib/product-template-defaults';
export { detectTemplateCode } from './product-template-detection';

export type TemplateWithFields = {
  id: string;
  code: string;
  nameAr: string;
  fields: {
    attributeDefinitionId: string;
    isRequired: boolean;
    useAsVariant: boolean;
    sortOrder: number;
    attributeDefinition: {
      nameAr: string;
      key: string;
      inputType: string;
      optionsJson: string | null;
    };
  }[];
};

/**
 * Generate a cryptographically unique SKU that is immutable and hidden from users and admins.
 */
export function generateUniqueSku(prefix = 'RWQ'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a unique variant SKU based on product SKU.
 */
export function generateVariantSku(productSku: string, index: number): string {
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${productSku}-${index + 1}-${random}`;
}

/**
 * Ensure all RAWAQ default product templates are installed in the database automatically.
 */
export async function ensureProductTemplatesInstalled() {
  const existing = await prisma.productTemplate.findMany({ select: { code: true } }).catch(() => []);
  const existingCodes = new Set(existing.map(t => t.code));
  const missingTemplates = rawaqProductTemplates.filter(t => !existingCodes.has(t.code));
  if (missingTemplates.length === 0) return;

  for (const template of missingTemplates) {
    const saved = await prisma.productTemplate.upsert({
      where: { code: template.code },
      update: { nameAr: template.nameAr, nameEn: template.nameEn, isActive: true },
      create: { code: template.code, nameAr: template.nameAr, nameEn: template.nameEn },
    });
    for (const [index, field] of template.fields.entries()) {
      const definition = await prisma.productAttributeDefinition.upsert({
        where: { key: field.key },
        update: {
          nameAr: field.nameAr,
          nameEn: field.nameEn || null,
          inputType: field.inputType,
          optionsJson: field.options ? JSON.stringify(field.options) : null,
          isActive: true,
        },
        create: {
          key: field.key,
          nameAr: field.nameAr,
          nameEn: field.nameEn || null,
          inputType: field.inputType,
          optionsJson: field.options ? JSON.stringify(field.options) : null,
        },
      });
      await prisma.productTemplateField.upsert({
        where: {
          templateId_attributeDefinitionId: {
            templateId: saved.id,
            attributeDefinitionId: definition.id,
          },
        },
        update: {
          isRequired: field.required ?? false,
          isFilterable: field.filterable ?? false,
          useAsVariant: field.useAsVariant ?? false,
          sortOrder: index,
        },
        create: {
          templateId: saved.id,
          attributeDefinitionId: definition.id,
          isRequired: field.required ?? false,
          isFilterable: field.filterable ?? false,
          useAsVariant: field.useAsVariant ?? false,
          sortOrder: index,
        },
      });
    }
  }
}
