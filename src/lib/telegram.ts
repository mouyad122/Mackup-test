import { filsToDisplay } from './money';
import { prisma } from './db';

interface OrderItemForTelegram {
  name: string;
  size?: string;
  quantity: number;
  total: number;
}

interface OrderNotificationPayload {
  reference: string;
  customerName: string;
  customerPhone: string;
  zoneName?: string | null;
  address?: string | null;
  totalAmount: number;
  shippingCost: number;
  discountAmount?: number;
  items: OrderItemForTelegram[];
}

export async function sendTelegramNewOrderNotification(payload: OrderNotificationPayload) {
  const botToken =
    process.env.TELEGRAM_BOT_TOKEN ||
    '9044594537:AAGKliMv6jmCM-E6a0x__gNdW1I_wmSvhzo';

  if (!botToken) {
    console.warn('[Telegram] No TELEGRAM_BOT_TOKEN configured');
    return { success: false, error: 'لم يتم ضبط TELEGRAM_BOT_TOKEN' };
  }

  // 1. Resolve Target Chat ID (Prefer env, with auto-fallback to getUpdates)
  let chatId = process.env.TELEGRAM_CHAT_ID;

  if (!chatId) {
    try {
      const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=10`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000),
      });
      const updatesData = await updatesRes.json();
      if (updatesData.ok && Array.isArray(updatesData.result) && updatesData.result.length > 0) {
        for (let i = updatesData.result.length - 1; i >= 0; i--) {
          const entry = updatesData.result[i];
          const foundId = entry.message?.chat?.id || entry.channel_post?.chat?.id;
          if (foundId) {
            chatId = String(foundId);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[Telegram] Could not auto-detect chat ID from getUpdates:', e);
    }
  }

  if (!chatId) {
    console.warn('[Telegram] Chat ID not found. Ensure admin pressed /start with @rawaq_jo_bot');
    return { success: false, error: 'لم يتم العثور على Chat ID للإدارة. يرجى إرسال /start للبوت' };
  }

  // 2. Format rich notification message
  let text = `🛍️ *طلب جديد في متجر رَواق!*\n\n`;
  text += `📋 *رقم الطلب:* \`${payload.reference}\`\n`;
  text += `👤 *العميل:* ${payload.customerName}\n`;
  text += `📞 *الهاتف:* \`${payload.customerPhone}\`\n`;
  if (payload.zoneName) {
    text += `📍 *المنطقة:* ${payload.zoneName}\n`;
  }
  if (payload.address) {
    text += `🏠 *العنوان:* ${payload.address.replace(/^العنوان:\s*/, '')}\n`;
  }

  text += `\n🛒 *المنتجات:*\n`;
  for (const it of payload.items) {
    const sizeStr = it.size && it.size !== 'افتراضي' ? ` (${it.size})` : '';
    text += `• ${it.name}${sizeStr} × ${it.quantity} = ${filsToDisplay(it.total, 'ar')}\n`;
  }

  if (payload.discountAmount && payload.discountAmount > 0) {
    text += `\n🏷️ *الخصم:* ${filsToDisplay(payload.discountAmount, 'ar')}\n`;
  }

  text += `🚚 *التوصيل:* ${payload.shippingCost === 0 ? 'مجاني' : filsToDisplay(payload.shippingCost, 'ar')}\n`;
  text += `💰 *المجموع النهائي:* *${filsToDisplay(payload.totalAmount, 'ar')}*\n\n`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mackup-test-weld.vercel.app';
  text += `🔗 [فتح الطلب في لوحة التحكم](${siteUrl}/admin/orders?orderId=${payload.reference})`;

  try {
    const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(4500),
    });

    const resJson = await sendRes.json();
    if (!resJson.ok) {
      console.error('[Telegram] API error response:', resJson);
      return { success: false, error: resJson.description || 'فشل إرسال رسالة التيليجرام' };
    }

    console.log(`[Telegram] Order alert sent successfully for ${payload.reference}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Telegram] Failed to send order notification:', err);
    return { success: false, error: err.message || 'انتهت مهلة الاتصال بالتيليجرام' };
  }
}

/**
 * وظيفة إعادة محاولة إرسال إشعار التيليجرام لطلب محدد من لوحة الإدارة
 */
export async function retryOrderTelegramNotification(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    const payload: OrderNotificationPayload = {
      reference: order.reference,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      zoneName: order.shippingZoneNameSnapshot,
      address: order.notes,
      totalAmount: order.totalAmount,
      shippingCost: order.shippingCost,
      discountAmount: order.discountAmount,
      items: order.items.map((it) => ({
        name: it.name,
        size: it.size,
        quantity: it.quantity,
        total: it.total,
      })),
    };

    const result = await sendTelegramNewOrderNotification(payload);

    if (result.success) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          telegramStatus: 'SENT',
          telegramSentAt: new Date(),
          telegramError: null,
        },
      });
      return { success: true, message: 'تم إرسال إشعار التيليجرام بنجاح! ✓' };
    } else {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          telegramStatus: 'FAILED',
          telegramError: result.error || 'فشل غير معروف',
        },
      });
      return { success: false, error: result.error || 'تعذر الإرسال إلى تيليجرام' };
    }
  } catch (err: any) {
    console.error('[Telegram Retry] Error:', err);
    return { success: false, error: err.message || 'حدث خطأ غير متوقع' };
  }
}
