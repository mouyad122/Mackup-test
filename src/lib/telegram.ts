import { filsToDisplay } from './money';

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
    return { success: false, error: 'No bot token' };
  }

  // 1. Resolve Target Chat ID
  let chatId = process.env.TELEGRAM_CHAT_ID;

  // If chatId is not set in env, query getUpdates to auto-discover the admin who messaged the bot
  if (!chatId) {
    try {
      const updatesRes = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=10`, {
        cache: 'no-store',
      });
      const updatesData = await updatesRes.json();
      if (updatesData.ok && Array.isArray(updatesData.result) && updatesData.result.length > 0) {
        // Find latest private chat or group
        for (let i = updatesData.result.length - 1; i >= 0; i--) {
          const entry = updatesData.result[i];
          const foundId = entry.message?.chat?.id || entry.channel_post?.chat?.id;
          if (foundId) {
            chatId = String(foundId);
            console.log(`[Telegram] Auto-detected admin Chat ID: ${chatId}`);
            break;
          }
        }
      }
    } catch (e) {
      console.warn('[Telegram] Could not auto-detect chat ID from getUpdates:', e);
    }
  }

  if (!chatId) {
    console.warn(
      '[Telegram] No TELEGRAM_CHAT_ID set and bot has no incoming updates yet. Please message @rawaq_jo_bot on Telegram.'
    );
    return { success: false, error: 'Chat ID not found' };
  }

  // 2. Format rich message
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rawaq.jo';
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
    });

    const resJson = await sendRes.json();
    if (!resJson.ok) {
      console.error('[Telegram] API error response:', resJson);
      return { success: false, error: resJson.description };
    }

    console.log(`[Telegram] Order alert sent successfully for ${payload.reference}`);
    return { success: true };
  } catch (err: any) {
    console.error('[Telegram] Failed to send order notification:', err);
    return { success: false, error: err.message };
  }
}
