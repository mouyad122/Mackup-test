/**
 * قاموس وثوابت محرك تنفيذ الطلبات الموزع (RAWAQ Multi-Vendor Fulfillment)
 */

export const FULFILLMENT_STRATEGY = {
  DIRECT_PICKUP: 'DIRECT_PICKUP',             // مورد واحد -> تسليم مباشر للزبونة
  DIRECT_MULTI_PICKUP: 'DIRECT_MULTI_PICKUP', // عدة موردين -> زيارة متتالية -> تسليم مباشر
  CROSS_DOCK: 'CROSS_DOCK',                   // تجميع في نقطة رَواق -> فرز وفحص -> تسليم
} as const;

export type FulfillmentStrategyType = keyof typeof FULFILLMENT_STRATEGY;

export const FULFILLMENT_STATUS = {
  UNFULFILLED: 'UNFULFILLED',                 // لم يبدأ التقسيم أو التجهيز
  SPLIT_PENDING: 'SPLIT_PENDING',             // بانتظار معالجة Outbox
  PROCESSING: 'PROCESSING',                   // الموردون يعملون على التجهيز
  PARTIALLY_READY: 'PARTIALLY_READY',         // بعض الموردين جاهزون
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',       // جميع الطرود جاهزة للاستلام
  IN_TRANSIT: 'IN_TRANSIT',                   // جاري جمع الطرود أو نقلها للمركز
  RECEIVED_AT_HUB: 'RECEIVED_AT_HUB',         // وصلت لنقطة التجميع المركزية
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',       // خرجت للتسليم النهائي للزبونة
  DELIVERED: 'DELIVERED',                     // سُلّمت بنجاح للزبونة
  FAILED_DELIVERY: 'FAILED_DELIVERY',         // تعذر التسليم للزبونة
  RETURNED_TO_ORIGIN: 'RETURNED_TO_ORIGIN',   // مرتجع بالكامل
} as const;

export type FulfillmentStatusType = keyof typeof FULFILLMENT_STATUS;

export const SUPPLIER_FULFILLMENT_STATUS = {
  DRAFT: 'DRAFT',                             // مسودة أمر تجهيز
  NOTIFIED: 'NOTIFIED',                       // أُتيح في رابط المورد
  IN_PREPARATION: 'IN_PREPARATION',           // المورد يعمل على الطلب
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',       // جاهز للاستلام (حدد الطرود)
  PICKED_UP: 'PICKED_UP',                     // تم الاستلام وتوثيقه بواسطة المندوب/الإدارة
  ISSUE_REPORTED: 'ISSUE_REPORTED',           // المورد أبلغ عن مشكلة أو نقص
  CANCELLED: 'CANCELLED',                     // ملغي
} as const;

export type SupplierFulfillmentStatusType = keyof typeof SUPPLIER_FULFILLMENT_STATUS;

export const PACKAGE_STATUS = {
  PACKED: 'PACKED',                           // مغلف
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',       // جاهز في موقع الاستلام
  PICKED_UP: 'PICKED_UP',                     // استلمه المندوب
  RECEIVED_AT_HUB: 'RECEIVED_AT_HUB',         // في نقطة التجميع
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',       // مع مندوب التسليم للزبونة
  DELIVERED: 'DELIVERED',                     // تم التسليم للزبونة
  RETURNED: 'RETURNED',                       // مرتجع
} as const;

export type PackageStatusType = keyof typeof PACKAGE_STATUS;

export interface StatusBadgeMeta {
  label: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  description: string;
}

export const FULFILLMENT_STATUS_MAP: Record<string, StatusBadgeMeta> = {
  UNFULFILLED: {
    label: 'غير مجهز',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-800',
    borderClass: 'border-zinc-300',
    description: 'الطلب بانتظار التأكيد وبدء التقسيم اللوجستي.',
  },
  SPLIT_PENDING: {
    label: 'قيد التقسيم الآلي',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    borderClass: 'border-amber-300',
    description: 'جاري إنشاء أوامر التجهيز للموردين في الخلفية.',
  },
  PROCESSING: {
    label: 'جاري التجهيز لدى الموردين',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    borderClass: 'border-blue-300',
    description: 'الموردون يعملون على فحص وتجهيز قطع الطلب.',
  },
  PARTIALLY_READY: {
    label: 'جاهز جزئياً',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    borderClass: 'border-indigo-300',
    description: 'بعض الموردين أنهوا تجهيز طرودهم وبانتظار بقية الموردين.',
  },
  READY_FOR_PICKUP: {
    label: 'جاهز لجدولة الاستلام',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    borderClass: 'border-purple-300',
    description: 'جميع الموردين أعلنوا جاهزية الطرود وبانتظار المندوب.',
  },
  IN_TRANSIT: {
    label: 'جاري جمع الطرود',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    borderClass: 'border-sky-300',
    description: 'المندوب في الطريق لجمع الطرود من مواقع الموردين.',
  },
  RECEIVED_AT_HUB: {
    label: 'في نقطة تجميع رَواق',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    borderClass: 'border-teal-300',
    description: 'وصلت جميع الطرود لنقطة التجميع وجاري الفحص والتغليف الموحد.',
  },
  OUT_FOR_DELIVERY: {
    label: 'خرج للتسليم النهائي',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    description: 'الشحنة المكتملة بحوزة مندوب التوصيل في طريقها للزبونة.',
  },
  DELIVERED: {
    label: 'تم التسليم للزبونة',
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-900',
    borderClass: 'border-green-500',
    description: 'تم تسليم كامل الطرود للزبونة بنجاح.',
  },
  FAILED_DELIVERY: {
    label: 'تعذر التسليم',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-900',
    borderClass: 'border-orange-400',
    description: 'تعذر تسليم الشحنة للزبونة وجاري المتابعة وإعادة الجدولة.',
  },
  RETURNED_TO_ORIGIN: {
    label: 'مرتجع للمصدر',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-900',
    borderClass: 'border-rose-400',
    description: 'تم إرجاع الطرود للمستودع المركزي أو الموردين.',
  },
};

export const SUPPLIER_STATUS_MAP: Record<string, StatusBadgeMeta> = {
  DRAFT: {
    label: 'مسودة',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-700',
    borderClass: 'border-zinc-300',
    description: 'أمر التجهيز قيد الإعداد الداخلي.',
  },
  NOTIFIED: {
    label: 'تم الإشعار',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-900',
    borderClass: 'border-blue-300',
    description: 'أُتيح الطلب في جلسة المورد وبانتظار البدء.',
  },
  IN_PREPARATION: {
    label: 'قيد التجهيز',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-900',
    borderClass: 'border-amber-400',
    description: 'المورد يعمل حالياً على تجهيز وتغليف المنتجات.',
  },
  READY_FOR_PICKUP: {
    label: 'جاهز للاستلام',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-900',
    borderClass: 'border-purple-400',
    description: 'أنهى المورد التغليف وحدد الطرود وبانتظار وصول المندوب.',
  },
  PICKED_UP: {
    label: 'تم الاستلام',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-900',
    borderClass: 'border-emerald-500',
    description: 'استلم المندوب الطرد وغادر موقع المورد بعد التحقق.',
  },
  ISSUE_REPORTED: {
    label: 'توجد مشكلة / نقص',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-900',
    borderClass: 'border-rose-500',
    description: 'أبلغ المورد عن عدم توفر كمية أو تلف صنف.',
  },
  CANCELLED: {
    label: 'ملغي',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-900',
    borderClass: 'border-red-400',
    description: 'تم إلغاء أمر التجهيز لهذا المورد.',
  },
};
