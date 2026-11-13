import { prisma } from '@/lib/db';
export * from '@/lib/message-templates-shared';
import {
  MessageTemplateDef,
  SYSTEM_MESSAGE_TEMPLATES,
} from '@/lib/message-templates-shared';

const SITE_SETTINGS_PREFIX = 'msg_template_';

/**
 * جلب قالب رسالة محدد إما من الإعدادات المحفوظة أو من الافتراضي للنظام
 */
export async function getMessageTemplate(key: string): Promise<{ content: string; isCustom: boolean }> {
  try {
    const settingKey = `${SITE_SETTINGS_PREFIX}${key}`;
    const setting = await prisma.siteSettings.findUnique({
      where: { key: settingKey },
    });

    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      if (parsed.content && typeof parsed.content === 'string') {
        return { content: parsed.content, isCustom: true };
      }
    }
  } catch (err) {
    console.error(`Error loading message template ${key}:`, err);
  }

  const def = SYSTEM_MESSAGE_TEMPLATES[key];
  return {
    content: def ? def.defaultContent : '',
    isCustom: false,
  };
}

/**
 * جلب كافة قوالب الرسائل مع حالتها ومحتواها
 */
export async function getAllMessageTemplates(): Promise<
  Array<MessageTemplateDef & { currentContent: string; isCustom: boolean }>
> {
  const result: Array<MessageTemplateDef & { currentContent: string; isCustom: boolean }> = [];

  const savedSettings = await prisma.siteSettings.findMany({
    where: { key: { startsWith: SITE_SETTINGS_PREFIX } },
  });

  const savedMap = new Map<string, string>();
  for (const s of savedSettings) {
    try {
      const parsed = JSON.parse(s.value);
      if (parsed.content) {
        const rawKey = s.key.replace(SITE_SETTINGS_PREFIX, '');
        savedMap.set(rawKey, parsed.content);
      }
    } catch {}
  }

  for (const key of Object.keys(SYSTEM_MESSAGE_TEMPLATES)) {
    const def = SYSTEM_MESSAGE_TEMPLATES[key];
    const saved = savedMap.get(key);
    result.push({
      ...def,
      currentContent: saved || def.defaultContent,
      isCustom: Boolean(saved),
    });
  }

  return result;
}
