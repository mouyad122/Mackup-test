export interface MessageTemplateDef {
  key: string;
  name: string;
  description: string;
  category: 'CUSTOMER' | 'SHOP' | 'COURIER';
  defaultContent: string;
  variables: { name: string; label: string; example: string }[];
}

export const SYSTEM_MESSAGE_TEMPLATES: Record<string, MessageTemplateDef> = {
  ORDER_CONFIRMATION: {
    key: 'ORDER_CONFIRMATION',
    name: 'قالب تأكيد الطلب للزبونة (مع رابط الفاتورة)',
    description: 'الرسالة التي ترسل للزبونة عبر واتساب عند تأكيد الطلب وتتضمن رقم الطلب والإجمالي ورابط الفاتورة المباشر.',
    category: 'CUSTOMER',
    variables: [
      { name: 'customerName', label: 'اسم الزبونة', example: 'سارة أحمد' },
      { name: 'orderReference', label: 'رقم الطلب', example: 'ORD-20261113-101' },
      { name: 'totalAmount', label: 'إجمالي الطلب بالدينار', example: '25.000' },
      { name: 'invoiceUrl', label: 'رابط الفاتورة الإلكترونية', example: 'https://rawaq.jo/invoice/view/inv_tok_123' },
    ],
    defaultContent: `أهلاً فيكِ بعالم رَواق 🤍

شكراً لاختياركِ وثقتكِ فينا، يسعدنا نكون جزء من أناقتكِ. ✨

تم تأكيد طلبكِ بنجاح! 🌿

🛍️ **رقم الطلب:** #{{orderReference}}
💰 **الإجمالي:** {{totalAmount}} د.أ
💳 **الدفع:** عند الاستلام

🧾 **تفاصيل طلبكِ وفاتورتكِ:**
{{invoiceUrl}}

رح نبلغكِ أول ما يكون طلبكِ بطريقه إلكِ.

**رَواق | أناقة من روح الأصالة 🤎**`,
  },

  SHOP_PREP_LINK: {
    key: 'SHOP_PREP_LINK',
    name: 'قالب إرسال رابط التجهيز للمحل / المورد',
    description: 'الرسالة التي ترسل للمحل عبر واتساب وتتضمن رابط بوابة التجهيز السحرية لمراجعة المنتجات وتأكيد التغليف.',
    category: 'SHOP',
    variables: [
      { name: 'shopName', label: 'اسم المحل / المورد', example: 'بوتيك ياسمين الشام' },
      { name: 'ordersCount', label: 'عدد الطلبات للتجهيز', example: '3' },
      { name: 'prepLink', label: 'رابط بوابة التجهيز', example: 'https://rawaq.jo/supplier-portal/sec_token_xyz' },
      { name: 'expiresInHours', label: 'مدة صلاحية الرابط بالساعات', example: '72' },
    ],
    defaultContent: `مرحباً {{shopName}}،
لديك ({{ordersCount}}) طلبات تجهيز جديدة من منصة رَواق.

يرجى فتح الرابط التالي عبر هاتفك لمراجعة المنتجات وبدء التجهيز وتأكيد الجاهزية:
{{prepLink}}

⏱️ الرابط صالح لمدة {{expiresInHours}} ساعة بدون الحاجة لكلمة مرور.`,
  },

  SHOP_PROFILE_LINK: {
    key: 'SHOP_PROFILE_LINK',
    name: 'قالب كشف بيانات المحل وأسعار التكلفة',
    description: 'الرسالة التي ترسل للمحل للاطلاع على بياناته وسجل أصنافه وأسعار التكلفة والبيع وحالة الظهور بالمتجر.',
    category: 'SHOP',
    variables: [
      { name: 'shopName', label: 'اسم المحل / المسؤول', example: 'أبو أحمد - أزياء الشرق' },
      { name: 'profileUrl', label: 'رابط كشف بيانات المحل', example: 'https://rawaq.jo/supplier-profile/sup_123' },
    ],
    defaultContent: `مرحباً {{shopName}}،
إليك رابط كشف بيانات محلك والأصناف وأسعار التكلفة وسعر البيع في المتجر على منصة رَواق:
{{profileUrl}}`,
  },

  DELIVERY_OUT_FOR_DELIVERY: {
    key: 'DELIVERY_OUT_FOR_DELIVERY',
    name: 'قالب إشعار خروج الطلب للتوصيل مع المندوب',
    description: 'الرسالة المرسلة للعميلة عند استلام المندوب للطلب وبدء جولة التوصيل.',
    category: 'COURIER',
    variables: [
      { name: 'customerName', label: 'اسم العميلة', example: 'رنا خالد' },
      { name: 'orderReference', label: 'رقم الطلب', example: 'ORD-20261113-102' },
      { name: 'captainName', label: 'اسم المندوب / شركة التوصيل', example: 'محمد العبدللات' },
      { name: 'captainPhone', label: 'هاتف المندوب', example: '0791234567' },
      { name: 'totalAmount', label: 'المبلغ المطلوب تحصيله', example: '32.000' },
    ],
    defaultContent: `أهلاً {{customerName}} 🤍
طلبكِ رقم #{{orderReference}} أصبح الآن في طريقه إليكِ مع مندوب التوصيل ({{captainName}}).
المبلغ المطلوب عند الاستلام: {{totalAmount}} د.أ.
شكراً لاختياركِ رَواق ✨`,
  },
};

/**
 * تعويض المتغيرات في القالب بصورة آمنة (نقية وخالية من أي ارتباط بالخادم)
 */
export function compileTemplate(
  templateContent: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let output = templateContent;
  for (const [varName, val] of Object.entries(variables)) {
    const safeVal = val !== undefined && val !== null ? String(val) : '';
    const pattern = new RegExp(`{{\\s*${varName}\\s*}}`, 'g');
    output = output.replace(pattern, safeVal);
  }
  return output;
}
