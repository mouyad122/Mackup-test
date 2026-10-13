'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireSuperAdmin } from '@/lib/dal';
import { z } from 'zod';

/**
 * Common helper to save a settings object to SiteSettings key.
 */
async function saveSiteSettings(key: string, value: any, adminId: string, actionName: string) {
  const session = await requireSuperAdmin();
  const stringValue = JSON.stringify(value);

  const before = await prisma.siteSettings.findUnique({ where: { key } });
  
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value: stringValue },
    create: { key, value: stringValue }
  });

  const headersList = await (await import('next/headers')).headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

  // Record audit log
  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: actionName,
      entityType: 'SiteSettings',
      entityId: key,
      ipAddress,
      details: JSON.stringify({ before: before?.value || null, after: stringValue })
    }
  });

  return { success: true };
}

/**
 * Common helper to get a settings object.
 */
async function getSiteSettings<T>(key: string, defaultValue: T, schema?: z.ZodSchema<T>): Promise<T> {
  const settings = await prisma.siteSettings.findUnique({ where: { key } });
  if (!settings) return defaultValue;
  try {
    const parsed = JSON.parse(settings.value);
    if (schema) {
      const result = schema.safeParse(parsed);
      if (result.success) return result.data;
      console.warn(`[SiteSettings] Invalid data for ${key}, using defaults.`);
      return defaultValue;
    }
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

// 1. Tax Settings
export async function getTaxSettings() {
  const settings = await prisma.globalPricingSettings.findUnique({ where: { id: '1' } });
  return {
    taxEnabled: settings?.taxEnabled ?? false,
    taxRate: settings?.taxRate ?? 0.0,
    pricesIncludeTax: settings?.pricesIncludeTax ?? true
  };
}

export async function updateTaxSettings(data: { taxEnabled: boolean; taxRate: number; pricesIncludeTax: boolean }, adminId: string) {
  try {
    const session = await requireSuperAdmin();
    const before = await prisma.globalPricingSettings.findUnique({ where: { id: '1' } });

    await prisma.globalPricingSettings.upsert({
      where: { id: '1' },
      update: {
        taxEnabled: data.taxEnabled,
        taxRate: data.taxRate,
        pricesIncludeTax: data.pricesIncludeTax
      },
      create: {
        id: '1',
        taxEnabled: data.taxEnabled,
        taxRate: data.taxRate,
        pricesIncludeTax: data.pricesIncludeTax
      }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: session.employeeId,
        action: 'TAX_SETTINGS_UPDATED',
        entityType: 'GlobalPricingSettings',
        entityId: '1',
        ipAddress,
        details: JSON.stringify({ before, after: data })
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل حفظ إعدادات الضريبة' };
  }
}

// 2. Shipping Settings
export async function getShippingZones() {
  return await prisma.shippingZone.findMany({
    orderBy: { nameAr: 'asc' }
  });
}

export async function updateShippingZone(data: { id?: string; nameAr: string; nameEn: string; fee: number; estimatedDeliveryTime: string; isEnabled: boolean }) {
  try {
    const session = await requireSuperAdmin();
    
    if (data.id) {
      const zone = await prisma.shippingZone.update({
        where: { id: data.id },
        data: {
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          fee: data.fee,
          estimatedDeliveryTime: data.estimatedDeliveryTime,
          isEnabled: data.isEnabled
        }
      });
      const headersList = await (await import('next/headers')).headers();
      const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

      await prisma.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'SHIPPING_ZONE_UPDATED',
          entityType: 'ShippingZone',
          entityId: zone.id,
          ipAddress,
          details: JSON.stringify(zone)
        }
      });
    } else {
      const zone = await prisma.shippingZone.create({
        data: {
          nameAr: data.nameAr,
          nameEn: data.nameEn,
          fee: data.fee,
          estimatedDeliveryTime: data.estimatedDeliveryTime,
          isEnabled: data.isEnabled
        }
      });
      const headersList = await (await import('next/headers')).headers();
      const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

      await prisma.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'SHIPPING_ZONE_CREATED',
          entityType: 'ShippingZone',
          entityId: zone.id,
          ipAddress,
          details: JSON.stringify(zone)
        }
      });
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل حفظ منطقة الشحن' };
  }
}

export async function deleteShippingZone(id: string) {
  try {
    const session = await requireSuperAdmin();
    await prisma.shippingZone.delete({ where: { id } });
    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: session.employeeId,
        action: 'SHIPPING_ZONE_DELETED',
        entityType: 'ShippingZone',
        entityId: id,
        ipAddress,
        details: null
      }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل حذف منطقة الشحن' };
  }
}

// 3. POS Settings
export interface POSSettings {
  requireShiftToSell: boolean;
  defaultIdleLockSeconds: number;
  allowManagerOverride: boolean;
  posIdleEnabled: boolean;
  posIdleTimeoutMinutes: number;
  posIdleShowClock: boolean;
  posIdleShowDate: boolean;
  posIdleRequirePin: boolean;
  posIdleMessageAr: string;
  posIdleMessageEn: string;
  posSessionLifetimeHours: number;
}
const posSettingsSchema = z.object({
  requireShiftToSell: z.boolean().catch(true),
  defaultIdleLockSeconds: z.number().catch(240),
  allowManagerOverride: z.boolean().catch(true),
  posIdleEnabled: z.boolean().catch(true),
  posIdleTimeoutMinutes: z.number().catch(4),
  posIdleShowClock: z.boolean().catch(true),
  posIdleShowDate: z.boolean().catch(true),
  posIdleRequirePin: z.boolean().catch(false),
  posIdleMessageAr: z.string().catch('شاشة خمول مؤقتة - يرجى الضغط للمتابعة'),
  posIdleMessageEn: z.string().catch('Idle screen - Please press to continue'),
  posSessionLifetimeHours: z.number().catch(15)
});
export async function getPOSSettings(): Promise<POSSettings> {
  return await getSiteSettings<POSSettings>('pos_settings', {
    requireShiftToSell: true,
    defaultIdleLockSeconds: 240,
    allowManagerOverride: true,
    posIdleEnabled: true,
    posIdleTimeoutMinutes: 4,
    posIdleShowClock: true,
    posIdleShowDate: true,
    posIdleRequirePin: false,
    posIdleMessageAr: 'شاشة خمول مؤقتة - يرجى الضغط للمتابعة',
    posIdleMessageEn: 'Idle screen - Please press to continue',
    posSessionLifetimeHours: 15
  }, posSettingsSchema);
}
export async function updatePOSSettings(data: POSSettings, adminId: string) {
  const session = await requireSuperAdmin();

  if (data.posIdleTimeoutMinutes < 1 || data.posIdleTimeoutMinutes > 60) {
    throw new Error('مهلة الخمول يجب أن تكون بين دقيقة و 60 دقيقة');
  }
  if (data.posSessionLifetimeHours < 1 || data.posSessionLifetimeHours > 24) {
    throw new Error('عمر الجلسة يجب أن يكون بين ساعة و 24 ساعة');
  }

  const key = 'pos_settings';
  const stringValue = JSON.stringify(data);
  const before = await prisma.siteSettings.findUnique({ where: { key } });
  
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value: stringValue },
    create: { key, value: stringValue }
  });

  const headersList = await (await import('next/headers')).headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'POS_SETTINGS_UPDATED',
      entityType: 'SiteSettings',
      entityId: key,
      ipAddress,
      details: JSON.stringify({ before: before?.value ? JSON.parse(before.value) : null, after: data })
    }
  });

  return { success: true };
}

// 4. Security Settings
export interface SecuritySettings {
  passwordMinLength: number;
  requireMFA: boolean;
  maxLoginAttempts: number;
}
const securitySettingsSchema = z.object({
  passwordMinLength: z.number().catch(15),
  requireMFA: z.boolean().catch(true),
  maxLoginAttempts: z.number().catch(5)
});
export async function getSecuritySettings(): Promise<SecuritySettings> {
  await requireSuperAdmin();
  return await getSiteSettings<SecuritySettings>('security_settings', {
    passwordMinLength: 15,
    requireMFA: true,
    maxLoginAttempts: 5
  }, securitySettingsSchema);
}
export async function updateSecuritySettings(data: SecuritySettings, adminId: string) {
  return await saveSiteSettings('security_settings', data, adminId, 'SECURITY_SETTINGS_UPDATED');
}

// 5. Backups Settings
export interface BackupSettings {
  autoBackup: boolean;
  frequency: string;
}
export async function getBackupSettings(): Promise<BackupSettings> {
  await requireSuperAdmin();
  return await getSiteSettings<BackupSettings>('backup_settings', { autoBackup: true, frequency: 'daily' });
}
export async function updateBackupSettings(data: BackupSettings, adminId: string) {
  return await saveSiteSettings('backup_settings', data, adminId, 'BACKUP_SETTINGS_UPDATED');
}

// 6. Inventory Settings
export interface InventorySettings {
  lowStockThreshold: number;
}
export async function getInventorySettings(): Promise<InventorySettings> {
  return await getSiteSettings<InventorySettings>('inventory_settings', { lowStockThreshold: 1.0 });
}
export async function updateInventorySettings(data: InventorySettings, adminId: string) {
  return await saveSiteSettings('inventory_settings', data, adminId, 'INVENTORY_SETTINGS_UPDATED');
}
export async function triggerBackupDownload() {
  const session = await requireSuperAdmin();
  const categories = await prisma.category.findMany();
  const products = await prisma.product.findMany();
  const variants = await prisma.productVariant.findMany();

  const backupData = {
    timestamp: new Date().toISOString(),
    categories,
    products,
    variants
  };

  const headersList = await (await import('next/headers')).headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'DATABASE_BACKUP_EXPORTED',
      entityType: 'SystemBackup',
      entityId: 'export',
      ipAddress,
      details: JSON.stringify({ itemsCount: products.length })
    }
  });

  return JSON.stringify(backupData, null, 2);
}

// 6. Notifications Settings
export interface NotificationsSettings {
  whatsappNotifications: boolean;
  whatsappNumber: string;
  emailAlerts: boolean;
}
const notificationsSettingsSchema = z.object({
  whatsappNotifications: z.boolean().catch(false),
  whatsappNumber: z.string().catch(''),
  emailAlerts: z.boolean().catch(false)
});
export async function getNotificationsSettings(): Promise<NotificationsSettings> {
  await requireSuperAdmin();
  return await getSiteSettings<NotificationsSettings>('notifications_settings', {
    whatsappNotifications: false,
    whatsappNumber: '',
    emailAlerts: false
  }, notificationsSettingsSchema);
}
export async function updateNotificationsSettings(data: NotificationsSettings, adminId: string) {
  return await saveSiteSettings('notifications_settings', data, adminId, 'NOTIFICATIONS_SETTINGS_UPDATED');
}

// 7. Integrations Settings
export interface IntegrationsSettings {
  supabaseStorageUrl: string;
  whatsappGatewayApiKey: string;
}
const integrationsSettingsSchema = z.object({
  supabaseStorageUrl: z.string().catch(''),
  whatsappGatewayApiKey: z.string().catch('')
});
export async function getIntegrationsSettings(): Promise<IntegrationsSettings> {
  await requireSuperAdmin();
  return await getSiteSettings<IntegrationsSettings>('integrations_settings', {
    supabaseStorageUrl: '',
    whatsappGatewayApiKey: ''
  }, integrationsSettingsSchema);
}
export async function updateIntegrationsSettings(data: IntegrationsSettings, adminId: string) {
  return await saveSiteSettings('integrations_settings', data, adminId, 'INTEGRATIONS_SETTINGS_UPDATED');
}

// 8. SEO Settings
export interface SEOSettings {
  metaTitleAr: string;
  metaTitleEn: string;
  metaDescriptionAr: string;
  metaDescriptionEn: string;
}
const seoSettingsSchema = z.object({
  metaTitleAr: z.string().catch('فيلورا بيوتي'),
  metaTitleEn: z.string().catch('Velora Beauty'),
  metaDescriptionAr: z.string().catch('متجر مكياج فيلورا بيوتي الفاخرة مكياج فرنسية بجودة عالية وأسعار منافسة'),
  metaDescriptionEn: z.string().catch('Luxury Velora Beauty online store')
});
export async function getSEOSettings(): Promise<SEOSettings> {
  return await getSiteSettings<SEOSettings>('seo_settings', {
    metaTitleAr: 'فيلورا بيوتي',
    metaTitleEn: 'Velora Beauty',
    metaDescriptionAr: 'متجر مكياج فيلورا بيوتي الفاخرة مكياج فرنسية بجودة عالية وأسعار منافسة',
    metaDescriptionEn: 'Luxury Velora Beauty online store'
  }, seoSettingsSchema);
}
export async function updateSEOSettings(data: SEOSettings, adminId: string) {
  return await saveSiteSettings('seo_settings', data, adminId, 'SEO_SETTINGS_UPDATED');
}

// 9. Localization Settings
export interface LocalizationSettings {
  defaultLocale: string;
  supportedLocales: string[];
}
const localizationSettingsSchema = z.object({
  defaultLocale: z.string().catch('ar'),
  supportedLocales: z.array(z.string()).catch(['ar', 'en'])
});
export async function getLocalizationSettings(): Promise<LocalizationSettings> {
  return await getSiteSettings<LocalizationSettings>('localization_settings', {
    defaultLocale: 'ar',
    supportedLocales: ['ar', 'en']
  }, localizationSettingsSchema);
}
export async function updateLocalizationSettings(data: LocalizationSettings, adminId: string) {
  return await saveSiteSettings('localization_settings', data, adminId, 'LOCALIZATION_SETTINGS_UPDATED');
}
