/**
 * قاموس وسجل حالات الطلب باللغة العربية
 * مصمم ليكون مفهوماً بالكامل وبشرح تفصيلي لأي شخص غير تقني أو عميل
 */

export interface OrderStatusInfo {
  label: string;
  explanation: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

export const ORDER_STATUS_MAP: Record<string, OrderStatusInfo> = {
  AWAITING_WHATSAPP: {
    label: 'بانتظار تأكيد واتساب',
    explanation: 'تم تسجيل طلبك ونحن بانتظار التواصل والتأكيد معك عبر تطبيق واتساب لبدء التجهيز.',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderClass: 'border-amber-400'
  },
  PENDING: {
    label: 'طلب جديد',
    explanation: 'تم استلام طلبك بنجاح وهو قيد المراجعة والتدقيق الأولي لدى فريق خدمة عملاء رَواق.',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    borderClass: 'border-blue-400'
  },
  CONFIRMED: {
    label: 'تم تأكيد الطلب',
    explanation: 'تم تأكيد طلبك بنجاح وحجز المنتجات وإصدار الفاتورة الرسمية.',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderClass: 'border-emerald-500'
  },
  PREPARING: {
    label: 'قيد التجهيز والتغليف',
    explanation: 'يقوم فريق المستودع بفحص منتجاتك وتغليفها الفاخر بعناية لتجهيزها للشحن.',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-900',
    borderClass: 'border-indigo-500'
  },
  PREPARED: {
    label: 'جاهز للتسليم لشركة الشحن',
    explanation: 'اكتمل تجهيز وتغليف طلبك وهو جاهز ومفرز للتسليم الفوري لمندوب التوصيل.',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    borderClass: 'border-purple-500'
  },
  ASSIGNED: {
    label: 'تم تعيين مندوب التوصيل',
    explanation: 'تم إسناد الشحنة إلى مندوب التوصيل المعتمد وجدولة خط سير الاستلام.',
    badgeBg: 'bg-sky-100',
    badgeText: 'text-sky-900',
    borderClass: 'border-sky-500'
  },
  SHIPPED: {
    label: 'خرج مع التوصيل',
    explanation: 'الشحنة بحوزة شركة التوصيل الآن وفي طريقها إلى مركز التوزيع الإقليمي.',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-900',
    borderClass: 'border-cyan-500'
  },
  OUT_FOR_DELIVERY: {
    label: 'في الطريق إليك',
    explanation: 'الشحنة الآن بحوزة المندوب الميداني وسيقوم بالاتصال بك لتسليمها عند العنوان المحدد.',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-900',
    borderClass: 'border-teal-500'
  },
  DELIVERED: {
    label: 'تم التسليم بنجاح',
    explanation: 'تم تسليم الطلب لك بنجاح واستلام الدفعة. نأمل أن تنال منتجات رَواق إعجابك ورضاكِ!',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-900',
    borderClass: 'border-green-600'
  },
  FAILED_DELIVERY: {
    label: 'تعذر التسليم (مؤجل)',
    explanation: 'تعذر التسليم في المحاولة الأولى (العميل لم يجب أو تم طلب التأجيل). سيتم التواصل معك لإعادة المحاولة.',
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-900',
    borderClass: 'border-orange-500'
  },
  CANCELLED: {
    label: 'ملغي',
    explanation: 'تم إلغاء هذا الطلب وإعادة الأصناف إلى المخزن وفق الإجراءات المعتمدة.',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
    borderClass: 'border-red-500'
  },
  REFUNDED: {
    label: 'مسترد',
    explanation: 'تم استرداد قيمة الطلب ومعالجة المرتجع وفق سياسة الاستبدال والاسترجاع.',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    borderClass: 'border-rose-500'
  }
};

export function getOrderStatusInfo(status: string): OrderStatusInfo {
  return ORDER_STATUS_MAP[status] || {
    label: status,
    explanation: `حالة الطلب الحالية هي ${status}.`,
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-800',
    borderClass: 'border-zinc-400'
  };
}

/**
 * صياغة ملاحظة عربية واضحة ومفصلة تسجل في جدول سجل الحالات
 */
export function getArabicStatusHistoryNote(
  status: string,
  options?: {
    employeeName?: string;
    captainName?: string;
    extraNote?: string;
  }
): string {
  const actor = options?.employeeName ? ` (بواسطة: ${options.employeeName})` : '';
  
  switch (status) {
    case 'AWAITING_WHATSAPP':
      return 'تم تسجيل الطلب عبر المتجر وبانتظار تأكيد العميل عبر واتساب.';
    case 'PENDING':
      return 'تم إنشاء الطلب ووضعه قيد الانتظار والمراجعة.';
    case 'CONFIRMED':
      return `تم تأكيد الطلب وحجز المخزون وإصدار الفاتورة الرسمية بنجاح${actor}.`;
    case 'PREPARING':
      return `تم البدء في تجهيز وتغليف محتويات الطلب بعناية${actor}.`;
    case 'PREPARED':
      return `اكتمل تجهيز الطلب بالكامل وأصبح جاهزاً للتسليم لشركة التوصيل${actor}.`;
    case 'ASSIGNED':
      return options?.captainName 
        ? `تم تعيين مندوب التوصيل: ${options.captainName}.`
        : `تم إسناد الطلب لمندوب التوصيل${actor}.`;
    case 'SHIPPED':
      return `تم استلام الطلب من قِبل شركة التوصيل وبدء الشحن${actor}.`;
    case 'OUT_FOR_DELIVERY':
      return `الطلب مع المندوب الآن وفي طريقه للتسليم للعميل.`;
    case 'DELIVERED':
      return `تم تسليم الطلب للعميل بنجاح واكتمال المعاملة${actor}.`;
    case 'FAILED_DELIVERY':
      return options?.extraNote || 'تعذر تسليم الطلب في هذه المحاولة وسيتم إعادة الجدولة.';
    case 'CANCELLED':
      return options?.extraNote || `تم إلغاء الطلب ومعالجة المخزون المرتبط به${actor}.`;
    case 'REFUNDED':
      return options?.extraNote || `تم استرداد قيمة الطلب وإقفال السجل المالي${actor}.`;
    default:
      return options?.extraNote || `تم تحديث حالة الطلب إلى ${status}${actor}.`;
  }
}
