'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { rawaqProductTemplates } from '@/lib/product-template-defaults';

export async function installRawaqProductTemplates() {
  const session = await requirePermission('manage:products');
  await prisma.$transaction(async tx => {
    for (const template of rawaqProductTemplates) {
      const saved = await tx.productTemplate.upsert({ where: { code: template.code }, update: { nameAr: template.nameAr, nameEn: template.nameEn, isActive: true }, create: { code: template.code, nameAr: template.nameAr, nameEn: template.nameEn } });
      for (const [index, field] of template.fields.entries()) {
        const definition = await tx.productAttributeDefinition.upsert({ where: { key: field.key }, update: { nameAr: field.nameAr, nameEn: field.nameEn || null, inputType: field.inputType, optionsJson: field.options ? JSON.stringify(field.options) : null, isActive: true }, create: { key: field.key, nameAr: field.nameAr, nameEn: field.nameEn || null, inputType: field.inputType, optionsJson: field.options ? JSON.stringify(field.options) : null } });
        await tx.productTemplateField.upsert({ where: { templateId_attributeDefinitionId: { templateId: saved.id, attributeDefinitionId: definition.id } }, update: { isRequired: field.required ?? false, isFilterable: field.filterable ?? false, useAsVariant: field.useAsVariant ?? false, sortOrder: index }, create: { templateId: saved.id, attributeDefinitionId: definition.id, isRequired: field.required ?? false, isFilterable: field.filterable ?? false, useAsVariant: field.useAsVariant ?? false, sortOrder: index } });
      }
    }
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'PRODUCT_TEMPLATES_INSTALLED', entityType: 'ProductTemplate', entityId: 'rawaq-defaults', details: JSON.stringify({ templates: rawaqProductTemplates.length }) } });
  });
  revalidatePath('/admin/product-templates'); revalidatePath('/admin/products/new');
}

export async function saveProductTemplateField(formData: FormData) {
  const session = await requirePermission('manage:products');
  const templateId = String(formData.get('templateId') || ''); const key = String(formData.get('key') || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'); const nameAr = String(formData.get('nameAr') || '').trim();
  if (!templateId || !key || !nameAr) throw new Error('اسم القالب ومفتاح الحقل واسمه العربي مطلوبة.');
  const inputType = String(formData.get('inputType') || 'TEXT'); const options = String(formData.get('options') || '').split('\n').map(x => x.trim()).filter(Boolean);
  const definition = await prisma.productAttributeDefinition.upsert({ where: { key }, update: { nameAr, nameEn: String(formData.get('nameEn') || '').trim() || null, inputType, optionsJson: options.length ? JSON.stringify(options) : null }, create: { key, nameAr, nameEn: String(formData.get('nameEn') || '').trim() || null, inputType, optionsJson: options.length ? JSON.stringify(options) : null } });
  await prisma.productTemplateField.upsert({ where: { templateId_attributeDefinitionId: { templateId, attributeDefinitionId: definition.id } }, update: { isRequired: formData.get('isRequired') === 'true', showOnProductPage: formData.get('showOnProductPage') === 'true', isFilterable: formData.get('isFilterable') === 'true', useAsVariant: formData.get('useAsVariant') === 'true', sortOrder: Number(formData.get('sortOrder') || 0) }, create: { templateId, attributeDefinitionId: definition.id, isRequired: formData.get('isRequired') === 'true', showOnProductPage: formData.get('showOnProductPage') === 'true', isFilterable: formData.get('isFilterable') === 'true', useAsVariant: formData.get('useAsVariant') === 'true', sortOrder: Number(formData.get('sortOrder') || 0) } });
  await prisma.auditLog.create({ data: { employeeId: session.employeeId, action: 'PRODUCT_TEMPLATE_FIELD_SAVED', entityType: 'ProductTemplate', entityId: templateId, details: JSON.stringify({ key, nameAr }) } });
  revalidatePath('/admin/product-templates'); revalidatePath('/admin/products/new');
}
