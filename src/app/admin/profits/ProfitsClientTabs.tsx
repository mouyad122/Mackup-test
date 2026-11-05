'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';
import {
  TrendingUp,
  DollarSign,
  Users,
  PieChart,
  ShieldCheck,
  Calendar,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  Lock,
  ChevronLeft,
  X,
  Building2,
  Wallet,
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Filter,
} from 'lucide-react';
import {
  disburseSalaryPaymentAction,
  disbursePartnerPayoutAction,
  createPeriodCloseDraftAction,
  approvePeriodCloseAction,
  updateEmployeePayAgreementAction,
  updatePartnerShareRulesAction,
} from '@/actions/profits';
import type {
  ProfitsKPIs,
  EmployeePayrollCard,
  PartnerSummaryCard,
} from '@/lib/profits/profits-service';

import {
  type ProfitTabKey,
  TAB_SLUG_MAP,
  resolveProfitTab,
} from '@/lib/profits/tabs';

interface Props {
  initialTab?: string;
  initialFrom?: string;
  initialTo?: string;
  initialKpis: ProfitsKPIs;
  initialEmployees: EmployeePayrollCard[];
  initialPartners: PartnerSummaryCard[];
  initialLedger: any[];
}

export default function ProfitsClientTabs({
  initialTab,
  initialFrom,
  initialTo,
  initialKpis,
  initialEmployees,
  initialPartners,
  initialLedger,
}: Props) {
  const router = useRouter();
  const [paramKey, setParamKey] = useState<'tab' | 'x'>('tab');
  const [activeTab, setActiveTab] = useState<ProfitTabKey>(() => resolveProfitTab(initialTab));
  const [isPending, startTransition] = useTransition();

  // Date filters state
  const [fromDate, setFromDate] = useState<string>(initialFrom || '');
  const [toDate, setToDate] = useState<string>(initialTo || '');
  const [activePreset, setActivePreset] = useState<string>(() => {
    if (!initialFrom && !initialTo) return 'all';
    return 'custom';
  });

  const switchTab = (tab: ProfitTabKey) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const slug = TAB_SLUG_MAP[tab] || 'overview';
      // Sync whichever parameter was present in URL (supports ?x= and ?tab=)
      if (url.searchParams.has('x') || paramKey === 'x') {
        url.searchParams.set('x', slug);
      } else {
        url.searchParams.set('tab', slug);
      }
      window.history.replaceState(null, '', url.toString());
    }
  };

  const applyDateFilter = (newFrom?: string, newTo?: string) => {
    const f = newFrom !== undefined ? newFrom : fromDate;
    const t = newTo !== undefined ? newTo : toDate;

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (f) {
        url.searchParams.set('from', f);
      } else {
        url.searchParams.delete('from');
      }

      if (t) {
        url.searchParams.set('to', t);
      } else {
        url.searchParams.delete('to');
      }

      const slug = TAB_SLUG_MAP[activeTab] || 'overview';
      if (url.searchParams.has('x') || paramKey === 'x') {
        url.searchParams.set('x', slug);
      } else {
        url.searchParams.set('tab', slug);
      }

      startTransition(() => {
        router.push(url.pathname + url.search);
      });
    }
  };

  const handlePresetSelect = (preset: 'today' | 'week' | 'month' | 'last30' | 'all') => {
    setActivePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let f = '';
    let t = '';

    if (preset === 'today') {
      const todayStr = toYMD(now);
      f = todayStr;
      t = todayStr;
    } else if (preset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      f = toYMD(w);
      t = toYMD(now);
    } else if (preset === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      f = toYMD(m);
      t = toYMD(now);
    } else if (preset === 'last30') {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      f = toYMD(d30);
      t = toYMD(now);
    } else if (preset === 'all') {
      f = '';
      t = '';
    }

    setFromDate(f);
    setToDate(t);
    applyDateFilter(f, t);
  };

  // Sync on initial mount & back/forward browser navigation
  useEffect(() => {
    const syncFromUrl = () => {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        if (url.searchParams.has('x')) {
          setParamKey('x');
        }
        const queryVal =
          url.searchParams.get('tab') ||
          url.searchParams.get('x') ||
          url.searchParams.get('v') ||
          url.searchParams.get('view');
        if (queryVal) {
          setActiveTab(resolveProfitTab(queryVal));
        }

        const urlFrom = url.searchParams.get('from') || '';
        const urlTo = url.searchParams.get('to') || '';
        setFromDate(urlFrom);
        setToDate(urlTo);
        if (!urlFrom && !urlTo) {
          setActivePreset('all');
        } else {
          setActivePreset('custom');
        }
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // State data
  const [kpis, setKpis] = useState<ProfitsKPIs>(initialKpis);
  const [employees, setEmployees] = useState<EmployeePayrollCard[]>(initialEmployees);
  const [partners, setPartners] = useState<PartnerSummaryCard[]>(initialPartners);
  const [ledger, setLedger] = useState<any[]>(initialLedger);

  // Synchronize state data when incoming server props change
  useEffect(() => {
    setKpis(initialKpis);
    setEmployees(initialEmployees);
    setPartners(initialPartners);
    setLedger(initialLedger);
  }, [initialKpis, initialEmployees, initialPartners, initialLedger]);

  useEffect(() => {
    if (initialFrom !== undefined) setFromDate(initialFrom || '');
    if (initialTo !== undefined) setToDate(initialTo || '');
    if (!initialFrom && !initialTo) {
      setActivePreset('all');
    }
  }, [initialFrom, initialTo]);

  // Modals state
  const [salaryModal, setSalaryModal] = useState<{
    isOpen: boolean;
    periodId: string;
    employeeName: string;
    amountFils: number;
    reference: string;
  } | null>(null);

  const [partnerPayoutModal, setPartnerPayoutModal] = useState<{
    isOpen: boolean;
    ruleId: string;
    partnerName: string;
    remainingDueFils: number;
  } | null>(null);

  const [closeWizardModal, setCloseWizardModal] = useState<boolean>(false);

  // Edit Agreement Modal State
  const [editAgreementModal, setEditAgreementModal] = useState<{
    isOpen: boolean;
    employeeId: string;
    employeeName: string;
    baseRateJod: string;
    contractType: string;
    weeklyAgreedHours: number;
    notes: string;
  } | null>(null);

  // Edit Partner Rules Modal State
  const [editPartnerRulesModal, setEditPartnerRulesModal] = useState<boolean>(false);
  const [editableRules, setEditableRules] = useState<
    Array<{
      id?: string;
      partnerName: string;
      sharePercentage: number;
      partnerEmployeeId: string;
      bankDetails: string;
      notes: string;
      isActive?: boolean;
    }>
  >([]);

  // Form inputs
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CLIK'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [partnerPayoutType, setPartnerPayoutType] = useState<
    'PROFIT_DISTRIBUTION' | 'DRAWING_ON_ACCOUNT' | 'ADMINISTRATIVE_WAGE'
  >('PROFIT_DISTRIBUTION');
  const [partnerAmountInput, setPartnerAmountInput] = useState('');

  // Close wizard inputs
  const [closeFromDate, setCloseFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [closeToDate, setCloseToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [closeNotes, setCloseNotes] = useState('');

  // ==========================================
  // Handlers
  // ==========================================

  const handleDisburseSalary = async () => {
    if (!salaryModal) return;
    startTransition(async () => {
      const res = await disburseSalaryPaymentAction(salaryModal.periodId, {
        amountFils: salaryModal.amountFils,
        paymentMethod,
        paymentReference,
        notes: payoutNotes,
      });

      if (res.success) {
        alert('تم صرف وسداد الراتب بنجاح وتوثيق القيد المالي.');
        setSalaryModal(null);
        setPaymentReference('');
        setPayoutNotes('');
        window.location.reload();
      } else {
        alert(res.error || 'تعذر صرف الراتب.');
      }
    });
  };

  const handleDisbursePartner = async () => {
    if (!partnerPayoutModal) return;
    const amountFils = Math.round(parseFloat(partnerAmountInput || '0') * 1000);
    if (amountFils <= 0) {
      alert('يرجى إدخال مبلغ صحيح أكبر من صفر.');
      return;
    }
    if (amountFils > partnerPayoutModal.remainingDueFils) {
      alert(
        `المبلغ المطلوب (${(amountFils / 1000).toFixed(3)} د.أ) يتجاوز الرصيد المستحق للشريك (${(partnerPayoutModal.remainingDueFils / 1000).toFixed(3)} د.أ). لا يُسمح قانونياً أو مالياً بسحب مبالغ تتجاوز الحصة المقررة.`
      );
      return;
    }

    startTransition(async () => {
      const res = await disbursePartnerPayoutAction(partnerPayoutModal.ruleId, {
        amountFils,
        payoutType: partnerPayoutType,
        paymentMethod,
        paymentReference,
        notes: payoutNotes,
      });

      if (res.success) {
        alert('تم تسجيل وصرف دفعة الشريك بنجاح وتحديث الحسابات.');
        setPartnerPayoutModal(null);
        setPartnerAmountInput('');
        setPaymentReference('');
        setPayoutNotes('');
        window.location.reload();
      } else {
        alert(res.error || 'تعذر صرف دفعة الشريك.');
      }
    });
  };

  const handleCreatePeriodClose = async () => {
    startTransition(async () => {
      const res = await createPeriodCloseDraftAction(closeFromDate, closeToDate, closeNotes);
      if (res.success) {
        alert('تم إنشاء مسودة إغلاق الفترة المالية بنجاح. يرجى مصادقة الشريكين لاعتماد التوزيع.');
        setCloseWizardModal(false);
        window.location.reload();
      } else {
        alert(res.error || 'تعذر إنشاء مسودة الإغلاق.');
      }
    });
  };

  const handleApproveClose = async (closeId: string, partnerNumber: 1 | 2) => {
    startTransition(async () => {
      const res = await approvePeriodCloseAction(closeId, partnerNumber);
      if (res.success) {
        alert(`تم تسجيل موافقة الشريك ${partnerNumber === 1 ? 'الأول' : 'الثاني'} بنجاح.`);
        window.location.reload();
      } else {
        alert(res.error || 'تعذر اعتماد الإغلاق.');
      }
    });
  };

  const handleSaveAgreement = async () => {
    if (!editAgreementModal) return;
    const baseRateFils = Math.round(parseFloat(editAgreementModal.baseRateJod || '0') * 1000);
    if (baseRateFils <= 0) {
      alert('يرجى إدخال راتب أسبوعي صحيح أكبر من صفر.');
      return;
    }

    startTransition(async () => {
      const res = await updateEmployeePayAgreementAction(editAgreementModal.employeeId, {
        baseRateFils,
        contractType: editAgreementModal.contractType,
        weeklyAgreedHours: Number(editAgreementModal.weeklyAgreedHours) || 20,
        notes: editAgreementModal.notes,
      });

      if (res.success) {
        alert('تم تحديث اتفاقية الراتب الأسبوعي للموظف بنجاح.');
        setEditAgreementModal(null);
        window.location.reload();
      } else {
        alert(res.error || 'تعذر تحديث الاتفاقية.');
      }
    });
  };

  const handleSavePartnerRules = async () => {
    const activeOnes = editableRules.filter((r) => r.isActive !== false);
    const total = activeOnes.reduce((sum, r) => sum + (Number(r.sharePercentage) || 0), 0);
    if (total !== 100) {
      alert(`مجموع نسب الشركاء يجب أن يساوي 100% تماماً. المجموع الحالي: ${total}%`);
      return;
    }

    startTransition(async () => {
      const res = await updatePartnerShareRulesAction(
        editableRules.map((r) => ({
          ...r,
          partnerEmployeeId: r.partnerEmployeeId ? r.partnerEmployeeId : null,
          sharePercentage: Number(r.sharePercentage),
        }))
      );

      if (res.success) {
        alert('تم تحديث واعتماد نسب الشركاء والروابط بنجاح.');
        setEditPartnerRulesModal(false);
        window.location.reload();
      } else {
        alert(res.error || 'تعذر تحديث نسب الشركاء.');
      }
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Header & Primary Action Button */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#3F4832]/10 text-[#3F4832] flex items-center justify-center font-bold">
              <PieChart className="w-4 h-4" />
            </span>
            <h1 className="text-lg sm:text-xl font-black text-stone-900">
              رَواق | الأرباح وتوزيع المستحقات
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            مركز حساب أرباح رَواق الصافية، صرف رواتب الموظفين الأسبوعية، وحوكمة توزيعات الشركاء 50/50
          </p>
        </div>

        <button
          onClick={() => setCloseWizardModal(true)}
          className="w-full sm:w-auto px-5 py-3 sm:py-2.5 rounded-2xl bg-[#3F4832] hover:bg-[#2f3625] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm min-h-[42px]"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>مراجعة وإغلاق الفترة وتوزيع الأرباح</span>
        </button>
      </div>

      {/* Date Filter & Time Periods Control Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#3F4832]/10 text-[#3F4832] flex items-center justify-center font-bold shrink-0">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-black text-stone-900">
                تحديد الفترة الزمنية واحتساب الأرباح
              </h2>
              <p className="text-[11px] text-stone-500">
                فلترة واحتساب تلقائي دقيق لهوامش المنصة، أجور التوصيل، مصاريف التشغيل، رواتب الموظفين، وحصص الشركاء
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0 text-xs font-bold w-full lg:w-auto">
            <button
              onClick={() => handlePresetSelect('all')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap shrink-0 min-h-[34px] ${
                activePreset === 'all'
                  ? 'bg-[#3F4832] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              كل الفترات
            </button>
            <button
              onClick={() => handlePresetSelect('today')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap shrink-0 min-h-[34px] ${
                activePreset === 'today'
                  ? 'bg-[#3F4832] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => handlePresetSelect('week')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap shrink-0 min-h-[34px] ${
                activePreset === 'week'
                  ? 'bg-[#3F4832] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              هذا الأسبوع
            </button>
            <button
              onClick={() => handlePresetSelect('month')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap shrink-0 min-h-[34px] ${
                activePreset === 'month'
                  ? 'bg-[#3F4832] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePresetSelect('last30')}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap shrink-0 min-h-[34px] ${
                activePreset === 'last30'
                  ? 'bg-[#3F4832] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              آخر 30 يوماً
            </button>
          </div>
        </div>

        {/* Inputs (From / To) + Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 pt-3 border-t border-stone-100">
          <div className="flex-1 flex flex-col xs:flex-row xs:items-center gap-1.5 sm:gap-2">
            <label className="text-xs font-bold text-stone-600 whitespace-nowrap">من تاريخ:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#3F4832]"
            />
          </div>

          <div className="flex-1 flex flex-col xs:flex-row xs:items-center gap-1.5 sm:gap-2">
            <label className="text-xs font-bold text-stone-600 whitespace-nowrap">إلى تاريخ:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset('custom');
              }}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#3F4832]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1 sm:pt-0">
            <button
              onClick={() => applyDateFilter(fromDate, toDate)}
              disabled={isPending}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl bg-[#3F4832] hover:bg-[#2f3625] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 min-h-[42px] sm:min-h-0"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{isPending ? 'جاري التحديث...' : 'تطبيق الفلترة'}</span>
            </button>

            {(fromDate || toDate) && (
              <button
                onClick={() => handlePresetSelect('all')}
                disabled={isPending}
                className="px-3 py-2.5 sm:py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold transition flex items-center justify-center gap-1 min-h-[42px] sm:min-h-0"
                title="إلغاء الفلترة والرجوع لكافة الفترات"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة تعيين</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Indicator Badge */}
        {(fromDate || toDate) && (
          <div className="flex items-center gap-2 text-xs text-[#3F4832] bg-[#3F4832]/5 border border-[#3F4832]/10 rounded-xl px-3 py-1.5">
            <span className="font-bold">الفترة المعروضة حالياً:</span>
            <span>
              {fromDate ? `من ${fromDate}` : 'من البداية'} {toDate ? `إلى ${toDate}` : 'حتى الآن'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Top 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: هامش ربح المنصة */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">هامش ربح المنصة</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900 font-mono" dir="ltr">
            {filsToDisplay(kpis.platformGrossMarginFils)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            بعد خصم استحقاقات المحلات من مبيعات الطلبات المسلّمة
          </p>
        </div>

        {/* KPI 2: صافي الربح التقديري */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500">صافي الربح التقديري</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 font-mono" dir="ltr">
            {filsToDisplay(kpis.estimatedNetProfitFils)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            بعد خصم أجور التوصيل والمصاريف ورواتب الموظفين
          </p>
        </div>

        {/* KPI 3: رواتب مستحقة للسداد */}
        <div
          onClick={() => switchTab('PAYROLL')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-amber-400 hover:shadow-md transition group"
          title="انقر للانتقال إلى قسم رواتب الموظفين"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 group-hover:text-amber-800 transition">رواتب مستحقة للسداد</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:scale-105 transition">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900 font-mono" dir="ltr">
            {filsToDisplay(kpis.dueSalariesFils)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            التزام أسبوعي مستقل واجب الصرف • انقر للعرض
          </p>
        </div>

        {/* KPI 4: أرباح مقترحة للتوزيع */}
        <div
          onClick={() => switchTab('PARTNERS')}
          className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-5 shadow-xs relative overflow-hidden cursor-pointer hover:border-purple-400 hover:shadow-md transition group"
          title="انقر للانتقال إلى قسم توزيعات الشركاء"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-stone-500 group-hover:text-purple-800 transition">أرباح مقترحة للتوزيع</span>
            <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:scale-105 transition">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900 font-mono" dir="ltr">
            {filsToDisplay(kpis.proposedDistributionFils)}
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            بعد حجز احتياطي 20% ومقيدة بالسيولة • انقر للعرض
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-none touch-pan-x">
        <button
          onClick={() => switchTab('OVERVIEW')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
            activeTab === 'OVERVIEW'
              ? 'bg-[#3F4832] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 bg-white sm:bg-transparent border border-stone-200 sm:border-transparent'
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>نظرة عامة والسيولة</span>
        </button>

        <button
          onClick={() => switchTab('PAYROLL')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
            activeTab === 'PAYROLL'
              ? 'bg-[#3F4832] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 bg-white sm:bg-transparent border border-stone-200 sm:border-transparent'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>رواتب الموظفين (أسبوعياً)</span>
          {kpis.dueSalariesFils > 0 && (
            <span className="bg-amber-400 text-stone-900 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
              مستحق
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab('CLOSE')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
            activeTab === 'CLOSE'
              ? 'bg-[#3F4832] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 bg-white sm:bg-transparent border border-stone-200 sm:border-transparent'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>إغلاق الفترة والاعتماد الثنائي</span>
        </button>

        <button
          onClick={() => switchTab('PARTNERS')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
            activeTab === 'PARTNERS'
              ? 'bg-[#3F4832] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 bg-white sm:bg-transparent border border-stone-200 sm:border-transparent'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>توزيع أرباح الشركاء (50% / 50%)</span>
        </button>

        <button
          onClick={() => switchTab('LEDGER')}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1.5 shrink-0 whitespace-nowrap min-h-[38px] ${
            activeTab === 'LEDGER'
              ? 'bg-[#3F4832] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100 bg-white sm:bg-transparent border border-stone-200 sm:border-transparent'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>السحوبات والسجل التدقيقي</span>
        </button>
      </div>

      {/* 4. Tab Contents */}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Financial Breakdown Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#3F4832]" />
              <span>مخطط شلال الأرباح والتدفق المحاسبي</span>
            </h3>

            <div className="space-y-2.5 sm:space-y-3 text-xs">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-stone-50">
                <span className="font-bold text-stone-700">1. إجمالي إيرادات المبيعات المسلمة</span>
                <span className="font-mono font-bold text-stone-900 whitespace-nowrap shrink-0" dir="ltr">
                  +{filsToDisplay(kpis.grossRevenueFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-rose-50/50 text-rose-800">
                <span>− التزامات الموردين والمحلات (ثمن المنتجات)</span>
                <span className="font-mono font-bold whitespace-nowrap shrink-0" dir="ltr">
                  -{filsToDisplay(kpis.supplierObligationsFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-emerald-50 text-emerald-900 font-extrabold border border-emerald-100">
                <span>= هامش نشاط المنصة (Gross Margin)</span>
                <span className="font-mono font-black whitespace-nowrap shrink-0" dir="ltr">
                  {filsToDisplay(kpis.platformGrossMarginFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-stone-50 text-stone-600">
                <span>− أجور شركة التوصيل والخدمات اللوجستية</span>
                <span className="font-mono whitespace-nowrap shrink-0" dir="ltr">
                  -{filsToDisplay(kpis.courierCostsFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-stone-50 text-stone-600">
                <span>− المصاريف التشغيلية (تسويق، برمجيات، ضيافة)</span>
                <span className="font-mono whitespace-nowrap shrink-0" dir="ltr">
                  -{filsToDisplay(kpis.operatingExpensesFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-amber-50 text-amber-900">
                <span>− رواتب الموظفين التعاقدية (مثبتة كالتزام ومصروف)</span>
                <span className="font-mono font-bold whitespace-nowrap shrink-0" dir="ltr">
                  -{filsToDisplay(kpis.accruedSalariesFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3.5 rounded-2xl bg-blue-50 text-blue-950 font-black border border-blue-200">
                <span>= صافي الربح التشغيلي المحاسبي</span>
                <span className="font-mono font-black text-sm whitespace-nowrap shrink-0" dir="ltr">
                  {filsToDisplay(kpis.estimatedNetProfitFils)}
                </span>
              </div>

              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 p-3 rounded-2xl bg-purple-50 text-purple-900 font-bold border border-purple-200">
                <span>− الاحتياطي التشغيلي الداخلي للمنصة (20%)</span>
                <span className="font-mono whitespace-nowrap shrink-0" dir="ltr">
                  -{filsToDisplay(kpis.internalReserveFils)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-stone-900 to-[#3F4832] text-white font-extrabold">
                <div>
                  <span className="block text-sm">الأرباح النهائية المقترحة للتوزيع</span>
                  <span className="text-[10px] text-stone-300 font-normal">
                    مقيدة بالسيولة الحرة • 50% لكل شريك
                  </span>
                </div>
                <span className="font-mono text-lg sm:text-base font-black text-amber-300 whitespace-nowrap" dir="ltr">
                  {filsToDisplay(kpis.proposedDistributionFils)}
                </span>
              </div>
            </div>
          </div>

          {/* Safe Cashflow Guard */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>صمام أمان السيولة النقدية (Cash Buffer)</span>
            </h3>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs">
              <div className="flex justify-between items-center gap-2">
                <span className="text-stone-500">السيولة النقدية الحرة:</span>
                <span className="font-mono font-bold text-stone-900 whitespace-nowrap" dir="ltr">
                  {filsToDisplay(kpis.safeLiquidCashFils)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-stone-500">الرواتب المستحقة المجنبة:</span>
                <span className="font-mono font-bold text-amber-700 whitespace-nowrap" dir="ltr">
                  {filsToDisplay(kpis.dueSalariesFils)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-stone-500">حصة الشريك الأول (50%):</span>
                <span className="font-mono font-bold text-stone-900 whitespace-nowrap" dir="ltr">
                  {filsToDisplay(kpis.partner1ShareFils)}
                </span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-stone-500">حصة الشريك الثاني (50%):</span>
                <span className="font-mono font-bold text-stone-900 whitespace-nowrap" dir="ltr">
                  {filsToDisplay(kpis.partner2ShareFils)}
                </span>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed space-y-1">
              <span className="font-bold block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>قاعدة الأمان المالي لرَواق:</span>
              </span>
              <span>
                لا يُسمح بسحب أي مبالغ تتجاوز السيولة الحرة حتى لو كانت الأرباح الدفترية أعلى، تجنباً لتعطيل سداد الموردين أو شركة التوصيل.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EMPLOYEE PAYROLL */}
      {activeTab === 'PAYROLL' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
            <h3 className="font-extrabold text-sm text-stone-900">
              رواتب العاملين ومستحقاتهم الأسبوعية
            </h3>
            <span className="text-[11px] sm:text-xs text-stone-500">
              دورة الصرف أسبوعية مستقلة عن أرباح المنصة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => {
              const isPaid = emp.currentPeriod.status === 'PAID';

              return (
                <div
                  key={emp.employeeId}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-extrabold text-stone-900 text-sm">{emp.name}</h4>
                        {emp.partnerSharePercentage != null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-600" />
                            <span>شريك بالمنصة ({emp.partnerSharePercentage}%)</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-400 mt-0.5">
                        {emp.roleName} • {emp.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                      <button
                        onClick={() =>
                          setEditAgreementModal({
                            isOpen: true,
                            employeeId: emp.employeeId,
                            employeeName: emp.name,
                            baseRateJod: (emp.baseRateFils / 1000).toFixed(3),
                            contractType: emp.contractType || 'PART_TIME',
                            weeklyAgreedHours: emp.weeklyAgreedHours || 20,
                            notes: emp.notes || '',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition flex items-center gap-1 min-h-[36px]"
                        title="تعديل الاتفاقية والراتب الأسبوعي"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>تعديل الاتفاقية</span>
                      </button>

                      <span
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl min-h-[36px] flex items-center ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isPaid ? '✓ تم سداد هذا الأسبوع' : '⏳ مستحق للسداد'}
                      </span>
                    </div>
                  </div>

                  {/* Contract details */}
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs bg-stone-50 p-3 rounded-2xl">
                    <div>
                      <span className="text-[10px] text-stone-400 block">نوع الأجر</span>
                      <span className="font-bold text-stone-800">
                        أسبوعي تعاقدي ({filsToDisplay(emp.baseRateFils)})
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400 block">نظام العمل</span>
                      <span className="font-bold text-stone-800">
                        دوام جزئي ({emp.weeklyAgreedHours} ساعة/أسبوع)
                      </span>
                    </div>
                  </div>

                  {/* Current Week Period Box */}
                  <div className="border border-stone-200 rounded-2xl p-3.5 sm:p-4 text-xs space-y-2">
                    <div className="flex justify-between items-center text-stone-500">
                      <span>فترة الاستحقاق الحالية:</span>
                      <span className="font-mono font-bold text-stone-800">
                        {emp.currentPeriod.reference}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-stone-600 font-bold">المبلغ المستحق لهذا الأسبوع:</span>
                      <span className="font-mono font-black text-stone-900 text-sm whitespace-nowrap" dir="ltr">
                        {filsToDisplay(emp.currentPeriod.netPayableFils)}
                      </span>
                    </div>

                    {isPaid && emp.currentPeriod.paymentReference && (
                      <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-xl">
                        مرجع الدفعة: {emp.currentPeriod.paymentReference}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  {!isPaid ? (
                    <button
                      onClick={() =>
                        setSalaryModal({
                          isOpen: true,
                          periodId: emp.currentPeriod.id,
                          employeeName: emp.name,
                          amountFils: emp.currentPeriod.netPayableFils,
                          reference: emp.currentPeriod.reference,
                        })
                      }
                      className="w-full py-3 sm:py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>صرف راتب هذا الأسبوع ({filsToDisplay(emp.currentPeriod.netPayableFils)})</span>
                    </button>
                  ) : (
                    <div className="text-center text-xs text-stone-400 font-bold py-2">
                      تم استيفاء مستحقات الأسبوع الجاري بالكامل
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PERIOD CLOSE & DUAL APPROVAL */}
      {activeTab === 'CLOSE' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                إغلاق الفترة المالية ومسار الاعتماد الثنائي (Dual Approval)
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">
                تأكيد مطابقات الموردين، شركات التوصيل، رواتب الموظفين، واعتماد توزيع الأرباح بالتساوي
              </p>
            </div>

            <button
              onClick={() => setCloseWizardModal(true)}
              className="px-4 py-2.5 sm:py-2 rounded-xl bg-[#3F4832] text-white font-bold text-xs hover:bg-[#2d3424] transition flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[42px] sm:min-h-0"
            >
              <Calendar className="w-4 h-4" />
              <span>إنشاء مسودة إغلاق جديدة</span>
            </button>
          </div>

          {/* Dual Approval Explainer Banner */}
          <div className="bg-gradient-to-r from-purple-50 via-stone-50 to-blue-50 border border-purple-200 rounded-2xl p-4 sm:p-5 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-purple-900">
              <Lock className="w-4 h-4 text-purple-700" />
              <span>مبدأ الحوكمة الثنائية لأصحاب رَواق (50% / 50%):</span>
            </div>
            <p className="text-stone-600 leading-relaxed">
              لا يمكن تحويل أي أرباح أو اعتماد توزيعها إلا بتوقيع الشريك الأول والشريك الثاني معاً في لوحة التحكم. لا يستطيع الشريك الذي أنشأ الدفعة اعتمادها لنفسه وحده.
            </p>
          </div>

          {/* Periods List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-stone-700">سجل إغلاقات الفترات المالية:</h4>
            {ledger.filter((l) => l.category === 'PERIOD_CLOSE').length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl">
                لا توجد فترات مغلقة بعد. استخدم زر &quot;إنشاء مسودة إغلاق جديدة&quot; للبدء.
              </div>
            ) : (
              ledger
                .filter((l) => l.category === 'PERIOD_CLOSE')
                .map((close) => (
                  <div
                    key={close.id}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900">
                          {close.reference}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            close.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {close.status === 'APPROVED' ? 'معتمد للتوزيع' : 'بانتظار الاعتماد الثنائي'}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[11px] mt-1">{close.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleApproveClose(close.id, 1)}
                        className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs sm:text-[11px] transition text-center min-h-[38px] sm:min-h-0"
                      >
                        توقيع الشريك الأول
                      </button>
                      <button
                        onClick={() => handleApproveClose(close.id, 2)}
                        className="flex-1 sm:flex-initial px-3 py-2 sm:py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs sm:text-[11px] transition text-center min-h-[38px] sm:min-h-0"
                      >
                        توقيع الشريك الثاني
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PARTNER DISTRIBUTIONS */}
      {activeTab === 'PARTNERS' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm text-stone-900">
                حسابات الشركاء وتوزيعات الأرباح المعتمدة
              </h3>
              <p className="text-xs text-stone-500">
                حوكمة نسب الملكية وتوزيعات الأرباح والسحوبات والرواتب الإدارية
              </p>
            </div>

            <button
              onClick={() => {
                setEditableRules(
                  partners.map((p) => ({
                    id: p.ruleId,
                    partnerName: p.partnerName,
                    sharePercentage: p.sharePercentage,
                    partnerEmployeeId: p.partnerEmployeeId || '',
                    bankDetails: p.bankDetails || '',
                    notes: p.notes || '',
                    isActive: true,
                  }))
                );
                setEditPartnerRulesModal(true);
              }}
              className="px-4 py-2.5 sm:py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto min-h-[42px] sm:min-h-0"
            >
              <Settings className="w-4 h-4" />
              <span>إدارة وتعديل نسب الشركاء والربط</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {partners.map((partner) => (
              <div
                key={partner.ruleId}
                className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-stone-900 text-sm">
                          {partner.partnerName}
                        </h4>
                        {partner.linkedEmployeeName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                            👤 موظف وشريك ({partner.linkedEmployeeName})
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400">
                        نسبة الملكية والاستحقاق: {partner.sharePercentage}%
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold bg-purple-50 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-xl self-start sm:self-auto">
                    حصة: {partner.sharePercentage}%
                  </span>
                </div>

                {/* Partner Balances Breakdown */}
                <div className="bg-stone-50 p-3.5 sm:p-4 rounded-2xl space-y-2.5 text-xs">
                  <div className="flex justify-between items-center bg-purple-50/70 p-2.5 rounded-xl border border-purple-100 gap-2">
                    <span className="font-bold text-purple-900">
                      حصة أرباح الفترة الجارية ({partner.sharePercentage}%):
                    </span>
                    <span className="font-mono font-black text-purple-950 text-sm whitespace-nowrap shrink-0" dir="ltr">
                      {filsToDisplay(partner.currentPeriodShareFils)}
                    </span>
                  </div>

                  {partner.totalApprovedDistributionsFils > 0 && (
                    <div className="flex justify-between items-center text-stone-600 gap-2">
                      <span>أرباح معتمدة من إغلاقات سابقة:</span>
                      <span className="font-mono font-bold text-stone-900 whitespace-nowrap shrink-0" dir="ltr">
                        {filsToDisplay(partner.totalApprovedDistributionsFils)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-rose-700 gap-2">
                    <span>المسحوبات المصروفة فعلياً:</span>
                    <span className="font-mono font-bold whitespace-nowrap shrink-0" dir="ltr">
                      -{filsToDisplay(partner.totalPaidDistributionsFils)}
                    </span>
                  </div>

                  {partner.totalDrawingsOnAccountFils > 0 && (
                    <div className="flex justify-between text-amber-700 gap-2">
                      <span>سحوبات على الحساب (سلف):</span>
                      <span className="font-mono font-bold whitespace-nowrap shrink-0" dir="ltr">
                        -{filsToDisplay(partner.totalDrawingsOnAccountFils)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline gap-2">
                    <div>
                      <span className="font-extrabold text-stone-900 block">
                        الرصيد الصافي المستحق للصرف:
                      </span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        المتبقي من الحصة بعد خصم المسحوبات
                      </span>
                    </div>
                    <span className="font-black font-mono text-emerald-700 text-sm whitespace-nowrap shrink-0" dir="ltr">
                      {filsToDisplay(partner.remainingDueFils)}
                    </span>
                  </div>
                </div>

                {/* Disburse Button with Zero Overdraft Guard */}
                {partner.remainingDueFils > 0 ? (
                  <button
                    onClick={() => {
                      setPartnerPayoutModal({
                        isOpen: true,
                        ruleId: partner.ruleId,
                        partnerName: partner.partnerName,
                        remainingDueFils: partner.remainingDueFils,
                      });
                      setPartnerAmountInput((partner.remainingDueFils / 1000).toFixed(3));
                    }}
                    className="w-full py-3 sm:py-2.5 rounded-xl bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>تسجيل تحويل / صرف للشريك ({filsToDisplay(partner.remainingDueFils)})</span>
                  </button>
                ) : (
                  <div className="w-full py-3 sm:py-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-500 font-bold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed min-h-[44px]">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم استيفاء كامل الحصة المستحقة (لا يوجد متبقٍ للصرف)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LEDGER & AUDIT HISTORY */}
      {activeTab === 'LEDGER' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 border-b border-stone-100 pb-3">
            <h3 className="font-extrabold text-sm text-stone-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#3F4832]" />
              <span>السجل التاريخي لعمليات الرواتب والسحوبات وإغلاق الفترات</span>
            </h3>
            <span className="text-[11px] sm:text-xs text-stone-400 font-mono">
              المصدر المالي الموحد • بالفلس
            </span>
          </div>

          {/* Mobile View: Transaction Cards */}
          <div className="block sm:hidden space-y-3">
            {ledger.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl">
                لا توجد قيود مسجلة في هذه الفترة
              </div>
            ) : (
              ledger.map((event) => (
                <div key={event.id} className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-stone-900 text-xs">
                      {event.reference}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        event.status === 'PAID' || event.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {event.status === 'PAID'
                        ? 'مسدد'
                        : event.status === 'APPROVED'
                        ? 'معتمد'
                        : 'مسودة'}
                    </span>
                  </div>

                  <div>
                    <span className="font-bold text-stone-900 block">{event.title}</span>
                    <span className="text-[11px] text-stone-500">{event.subtitle}</span>
                  </div>

                  <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="font-mono font-black text-stone-900 text-sm" dir="ltr">
                      {filsToDisplay(event.amountFils)}
                    </span>
                    <div className="text-end">
                      <span className="text-[10px] text-stone-400 font-mono block">
                        {new Date(event.date).toLocaleDateString('ar-JO')}
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {event.admin || 'النظام'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop/Tablet View: Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-100">
                <tr>
                  <th className="p-3">المرجع والتاريخ</th>
                  <th className="p-3">التصنيف والبيان</th>
                  <th className="p-3 text-left">المبلغ</th>
                  <th className="p-3 text-center">الحالة</th>
                  <th className="p-3">بمعرفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ledger.map((event) => (
                  <tr key={event.id} className="hover:bg-stone-50/50 transition">
                    <td className="p-3">
                      <span className="font-mono font-bold block text-stone-900">
                        {event.reference}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(event.date).toLocaleString('ar-JO')}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="font-bold text-stone-900 block">{event.title}</span>
                      <span className="text-[11px] text-stone-500">{event.subtitle}</span>
                    </td>

                    <td className="p-3 text-left font-mono font-bold text-stone-900" dir="ltr">
                      {filsToDisplay(event.amountFils)}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          event.status === 'PAID' || event.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {event.status === 'PAID'
                          ? 'مسدد'
                          : event.status === 'APPROVED'
                          ? 'معتمد'
                          : 'مسودة'}
                      </span>
                    </td>

                    <td className="p-3 text-[11px] text-stone-600 font-mono truncate max-w-[120px]">
                      {event.admin || 'النظام'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS */}
      {/* ======================================================== */}

      {/* 1. Modal: Disburse Salary Payment */}
      {salaryModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-stone-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  صرف وسداد راتب الأسبوع
                </h3>
              </div>
              <button
                onClick={() => setSalaryModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl space-y-1">
                <div className="text-stone-500">الموظف: <strong className="text-stone-900">{salaryModal.employeeName}</strong></div>
                <div className="text-stone-500">فترة الاستحقاق: <span className="font-mono font-bold text-stone-900">{salaryModal.reference}</span></div>
                <div className="text-stone-500">المبلغ المستحق: <strong className="font-mono text-emerald-700 font-black">{filsToDisplay(salaryModal.amountFils)}</strong></div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">طريقة السداد:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                >
                  <option value="CASH">نقداً من الخزينة (Cash)</option>
                  <option value="CLIK">حوالة كليك (CliQ)</option>
                  <option value="BANK_TRANSFER">تحويل بنكي رسمي</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">رقم الإيصال / الحوالة:</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="مثال: سند قبض رقم 104 أو رمز حوالة CliQ"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">ملاحظات إدارية:</label>
                <textarea
                  rows={2}
                  value={payoutNotes}
                  onChange={(e) => setPayoutNotes(e.target.value)}
                  placeholder="ملاحظات حول سداد الراتب..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => setSalaryModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs min-h-[42px] sm:min-h-0"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDisburseSalary}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs min-h-[42px] sm:min-h-0"
                >
                  {isPending ? 'جاري الصرف...' : 'تأكيد صرف الراتب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Disburse Partner Payout */}
      {partnerPayoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-stone-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-700" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  صرف وتحويل لصالح {partnerPayoutModal.partnerName}
                </h3>
              </div>
              <button
                onClick={() => setPartnerPayoutModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl space-y-1">
                <div className="text-stone-500">
                  الرصيد المعتمد المتبقي للصرف: <strong className="font-mono text-emerald-700 font-black">{filsToDisplay(partnerPayoutModal.remainingDueFils)}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">تصنيف الحركة المحاسبي:</label>
                <select
                  value={partnerPayoutType}
                  onChange={(e) => setPartnerPayoutType(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                >
                  <option value="PROFIT_DISTRIBUTION">توزيع أرباح (من الأرباح المعتمدة)</option>
                  <option value="DRAWING_ON_ACCOUNT">سحب على الحساب (سلفة / جاري الشريك)</option>
                  <option value="ADMINISTRATIVE_WAGE">أجر إداري مقابل إدارة تشغيلية</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-stone-700 block">المبلغ بالدينار الأردني (د.أ):</label>
                  <button
                    type="button"
                    onClick={() =>
                      setPartnerAmountInput((partnerPayoutModal.remainingDueFils / 1000).toFixed(3))
                    }
                    className="text-[11px] text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                  >
                    صرف كامل المستحق ({filsToDisplay(partnerPayoutModal.remainingDueFils)})
                  </button>
                </div>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={(partnerPayoutModal.remainingDueFils / 1000).toFixed(3)}
                  value={partnerAmountInput}
                  onChange={(e) => setPartnerAmountInput(e.target.value)}
                  placeholder="مثال: 50.000"
                  className={`w-full bg-stone-50 border rounded-xl px-3 py-2.5 text-sm text-stone-900 font-mono font-bold focus:outline-none transition min-h-[42px] ${
                    Math.round(parseFloat(partnerAmountInput || '0') * 1000) >
                    partnerPayoutModal.remainingDueFils
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                      : 'border-stone-300'
                  }`}
                />
                {Math.round(parseFloat(partnerAmountInput || '0') * 1000) >
                  partnerPayoutModal.remainingDueFils && (
                  <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      المبلغ المدخل يتجاوز الرصيد المستحق ({filsToDisplay(partnerPayoutModal.remainingDueFils)})! يمنع النظام السحب الزائد نهائياً.
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">طريقة التحويل:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                >
                  <option value="BANK_TRANSFER">تحويل بنكي / IBAN</option>
                  <option value="CLIK">حوالة كليك (CliQ)</option>
                  <option value="CASH">نقداً من الصندوق</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">رقم الحوالة أو السند:</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="رقم مرجع التحويل البنكي..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                />
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => setPartnerPayoutModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs min-h-[42px] sm:min-h-0"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDisbursePartner}
                  disabled={
                    isPending ||
                    Math.round(parseFloat(partnerAmountInput || '0') * 1000) <= 0 ||
                    Math.round(parseFloat(partnerAmountInput || '0') * 1000) >
                      partnerPayoutModal.remainingDueFils
                  }
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center gap-2 text-xs min-h-[42px] sm:min-h-0"
                >
                  {isPending ? 'جاري التحويل...' : 'تأكيد صرف دفعة الشريك'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal: Period Close Wizard */}
      {closeWizardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-stone-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  معالج إغلاق الفترة المالية وتوزيع الأرباح
                </h3>
              </div>
              <button
                onClick={() => setCloseWizardModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-stone-500 leading-relaxed">
                يقوم هذا المعالج بحساب صافي الربح للفترة المحددة، وحجز الاحتياطي التشغيلي (20%)، والتأكد من توافر السيولة الحرة قبل تمكين التوزيع بالتساوي بين الشريكين.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">من تاريخ:</label>
                  <input
                    type="date"
                    value={closeFromDate}
                    onChange={(e) => setCloseFromDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">إلى تاريخ:</label>
                  <input
                    type="date"
                    value={closeToDate}
                    onChange={(e) => setCloseToDate(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">ملاحظات الإغلاق:</label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="ملاحظات حول إغلاق هذه الفترة المالية..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-[11px] text-amber-900">
                <strong>تنبيه:</strong> سيتم إنشاء مسودة إغلاق تتطلب توقيع الشريكين معاً (Dual Approval) قبل تحويل أي مبالغ.
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => setCloseWizardModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs min-h-[42px] sm:min-h-0"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCreatePeriodClose}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold transition flex items-center justify-center gap-2 text-xs min-h-[42px] sm:min-h-0"
                >
                  {isPending ? 'جاري المعالجة...' : 'إنشاء مسودة الإغلاق المالي'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Edit Employee Pay Agreement */}
      {editAgreementModal && editAgreementModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-stone-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-stone-700" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  تعديل اتفاقية وراتب الموظف
                </h3>
              </div>
              <button
                onClick={() => setEditAgreementModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 p-3 rounded-2xl">
                <div className="text-stone-500">
                  الموظف: <strong className="text-stone-900">{editAgreementModal.employeeName}</strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">الراتب الأسبوعي بالدينار الأردني (د.أ):</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  value={editAgreementModal.baseRateJod}
                  onChange={(e) =>
                    setEditAgreementModal({ ...editAgreementModal, baseRateJod: e.target.value })
                  }
                  placeholder="مثال: 50.000"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 font-mono font-bold focus:outline-none min-h-[42px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">نظام العقد:</label>
                  <select
                    value={editAgreementModal.contractType}
                    onChange={(e) =>
                      setEditAgreementModal({ ...editAgreementModal, contractType: e.target.value })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                  >
                    <option value="PART_TIME">دوام جزئي (Part-Time)</option>
                    <option value="FULL_TIME">دوام كامل (Full-Time)</option>
                    <option value="HOURLY">مرن / بالساعة (Hourly)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-stone-700 block">ساعات العمل أسبوعياً:</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={editAgreementModal.weeklyAgreedHours}
                    onChange={(e) =>
                      setEditAgreementModal({
                        ...editAgreementModal,
                        weeklyAgreedHours: Number(e.target.value),
                      })
                    }
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 font-mono focus:outline-none min-h-[42px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700 block">ملاحظات وشروط الاتفاقية:</label>
                <textarea
                  rows={2}
                  value={editAgreementModal.notes}
                  onChange={(e) =>
                    setEditAgreementModal({ ...editAgreementModal, notes: e.target.value })
                  }
                  placeholder="مثال: مهام الدعم الفني وإدارة التوصيل..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl text-[11px] text-blue-900 space-y-1 leading-relaxed">
                <div className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  <span>تحديث فوري:</span>
                </div>
                <span>
                  سيتم تطبيق الراتب والاتفاقية الجديدة فوراً، وتحديث مستحقات الأسبوع الحالي المفتوح تلقائياً.
                </span>
              </div>

              <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  onClick={() => setEditAgreementModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs min-h-[42px] sm:min-h-0"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveAgreement}
                  disabled={isPending}
                  className="w-full sm:flex-1 py-2.5 rounded-xl bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold transition flex items-center justify-center gap-2 text-xs min-h-[42px] sm:min-h-0"
                >
                  {isPending ? 'جاري الحفظ...' : 'حفظ الاتفاقية وتحديث الراتب'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modal: Edit Partner Rules & Employee Link */}
      {editPartnerRulesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-stone-200 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-700 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900">
                    إدارة الشركاء ونسب توزيع الأرباح والربط بالموظفين
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    تعديل نسب الحصص، إضافة شركاء، وربط الشريك بصفته موظفاً يتقاضى راتباً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditPartnerRulesModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total percentage validation banner */}
            {(() => {
              const activeRules = editableRules.filter((r) => r.isActive !== false);
              const totalPercentage = activeRules.reduce(
                (sum, r) => sum + (Number(r.sharePercentage) || 0),
                0
              );
              const is100 = totalPercentage === 100;

              return (
                <div
                  className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between font-bold ${
                    is100
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {is100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>
                      {is100
                        ? 'مجموع الحصص مكتمل وقانوني (100% تماماً)'
                        : `مجموع الحصص الحالي (${totalPercentage}%) - يجب أن يساوي 100% تماماً ليمكن الحفظ!`}
                    </span>
                  </div>
                  <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-white/70">
                    {totalPercentage}%
                  </span>
                </div>
              );
            })()}

            {/* Partner list */}
            <div className="space-y-3">
              {editableRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-stone-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-mono">
                        {idx + 1}
                      </span>
                      <span>الشريك #{idx + 1}</span>
                    </span>

                    {editableRules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditableRules(editableRules.filter((_, i) => i !== idx));
                        }}
                        className="text-stone-400 hover:text-rose-600 transition p-1"
                        title="حذف الشريك"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">اسم الشريك:</label>
                      <input
                        type="text"
                        value={rule.partnerName}
                        onChange={(e) => {
                          const updated = [...editableRules];
                          updated[idx].partnerName = e.target.value;
                          setEditableRules(updated);
                        }}
                        placeholder="الاسم الكامل للشريك"
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">نسبة الملكية (%):</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={rule.sharePercentage}
                        onChange={(e) => {
                          const updated = [...editableRules];
                          updated[idx].sharePercentage = Number(e.target.value);
                          setEditableRules(updated);
                        }}
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 font-mono font-bold focus:outline-none min-h-[42px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>هل الشريك موظف في المنصة؟ (ربط بحساب موظف):</span>
                    </label>
                    <select
                      value={rule.partnerEmployeeId || ''}
                      onChange={(e) => {
                        const updated = [...editableRules];
                        updated[idx].partnerEmployeeId = e.target.value;
                        setEditableRules(updated);
                      }}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                    >
                      <option value="">-- شريك فقط (ليس موظفاً براتب) --</option>
                      {employees.map((emp) => (
                        <option key={emp.employeeId} value={emp.employeeId}>
                          {emp.name} ({emp.roleName}) - راتب أسبوعي: {filsToDisplay(emp.baseRateFils)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-stone-400">
                      عند ربط الشريك بموظف، سيعتبر مستحقاً لراتب تشغيلي أسبوعي كمصروف مستقل، بالإضافة لحصته من توزيعات الأرباح.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">الحساب البنكي / CliQ:</label>
                      <input
                        type="text"
                        value={rule.bankDetails || ''}
                        onChange={(e) => {
                          const updated = [...editableRules];
                          updated[idx].bankDetails = e.target.value;
                          setEditableRules(updated);
                        }}
                        placeholder="IBAN أو كليك لتحويل الأرباح"
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">ملاحظات إضافية:</label>
                      <input
                        type="text"
                        value={rule.notes || ''}
                        onChange={(e) => {
                          const updated = [...editableRules];
                          updated[idx].notes = e.target.value;
                          setEditableRules(updated);
                        }}
                        placeholder="أي بنود أو شروط خاصة..."
                        className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2.5 text-sm text-stone-900 focus:outline-none min-h-[42px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add partner button */}
            <button
              type="button"
              onClick={() => {
                setEditableRules([
                  ...editableRules,
                  {
                    partnerName: `شريك جديد ${editableRules.length + 1}`,
                    sharePercentage: 0,
                    partnerEmployeeId: '',
                    bankDetails: '',
                    notes: '',
                    isActive: true,
                  },
                ]);
              }}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-stone-300 hover:border-purple-400 text-stone-600 hover:text-purple-700 font-bold text-xs transition flex items-center justify-center gap-1.5 min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة شريك جديد</span>
            </button>

            {/* Modal actions */}
            <div className="pt-3 border-t border-stone-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
              <button
                onClick={() => setEditPartnerRulesModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition text-xs min-h-[42px] sm:min-h-0"
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePartnerRules}
                disabled={
                  isPending ||
                  editableRules
                    .filter((r) => r.isActive !== false)
                    .reduce((sum, r) => sum + (Number(r.sharePercentage) || 0), 0) !== 100
                }
                className="w-full sm:flex-1 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold transition flex items-center justify-center gap-2 text-xs min-h-[42px] sm:min-h-0"
              >
                {isPending ? 'جاري الحفظ والاعتماد...' : 'حفظ واعتماد نسب الشركاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
