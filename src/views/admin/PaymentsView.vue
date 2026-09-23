<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { User, Payment, PaymentType, PaymentStatus, ApprovePaymentResponse } from '../../types';
import Badge from '../../components/ui/Badge.vue';
import Modal from '../../components/ui/Modal.vue';
import {
  CreditCard,
  Plus,
  Search,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  TrendingUp,
  Trash2,
  RefreshCw,
  X,
  Printer,
  Download,
  PieChart,
  FileText,
  Pen,
  Sparkles,
  Copy,
  Eye,
  Image as ImageIcon,
  ExternalLink,
} from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();

const payments = ref<Payment[]>([]);
const users = ref<User[]>([]);
const loading = ref(false);

const searchQuery = ref('');
const statusFilter = ref<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'RECEIPT'>('ALL');
const typeFilter = ref<string>('ALL');
const dateFrom = ref('');
const dateTo = ref('');
const showAnalytics = ref(true);

const currentPage = ref(1);
const itemsPerPage = ref(10);

// Modal states
const showCreateModal = ref(false);
const paymentSubmitting = ref(false);
const newPayment = ref({
  studentId: 0,
  amount: 850000,
  type: 'CASH',
  status: 'PAID',
  paidForDate: new Date().toISOString().slice(0, 10),
  comment: '',
});

// Edit Modal State
const showEditModal = ref(false);
const editSubmitting = ref(false);
const editingPayment = ref<{
  id: number;
  studentId: number;
  amount: number;
  type: PaymentType;
  status: PaymentStatus;
  paidForDate: string;
  comment: string;
}>({
  id: 0,
  studentId: 0,
  amount: 850000,
  type: 'CASH',
  status: 'PAID',
  paidForDate: '',
  comment: '',
});

const showDeleteModal = ref(false);
const deletingPayment = ref<Payment | null>(null);
const deleteSubmitting = ref(false);

// Receipt Modal
const showReceiptModal = ref(false);
const receiptPayment = ref<Payment | null>(null);

// Approval Credentials Modal
const showApprovalModal = ref(false);
const approvalResult = ref<ApprovePaymentResponse | null>(null);
const isApproving = ref(false);

// Screenshot Modal State
const showScreenshotModal = ref(false);
const screenshotPayment = ref<Payment | null>(null);

function openScreenshotModal(p: Payment) {
  screenshotPayment.value = p;
  showScreenshotModal.value = true;
}

function closeScreenshotModal() {
  showScreenshotModal.value = false;
  screenshotPayment.value = null;
}

function getFullReceiptUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:image')) return url;
  const backendBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const cleanBase = backendBase.replace(/\/api\/?$/, '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Interactive hover state for donut chart
const activeHoverMethod = ref<string | null>(null);

// Toast notification state
const toastMessage = ref('');
const showToastNotification = ref(false);
let toastTimer: any = null;

function showToast(msg: string) {
  toastMessage.value = msg;
  showToastNotification.value = true;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    showToastNotification.value = false;
  }, 3500);
}

// Period Filter for Top 4 Metric Cards: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL'
type StatPeriod = 'THIS_MONTH' | 'THIS_YEAR' | 'ALL';
const statPeriod = ref<StatPeriod>('ALL');

const now = new Date();
const curYear = now.getFullYear();
const curMonth = now.getMonth();

// Payments filtered by selected period for top cards
const periodFilteredPayments = computed(() => {
  if (statPeriod.value === 'THIS_MONTH') {
    return payments.value.filter((p) => {
      const d = new Date(p.paidForDate);
      return !isNaN(d.getTime()) && d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
  }
  if (statPeriod.value === 'THIS_YEAR') {
    return payments.value.filter((p) => {
      const d = new Date(p.paidForDate);
      return !isNaN(d.getTime()) && d.getFullYear() === curYear;
    });
  }
  return payments.value;
});

const statTotalRevenue = computed(() =>
  periodFilteredPayments.value.filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0)
);
const statTotalPending = computed(() =>
  periodFilteredPayments.value.filter((p) => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0)
);
const statPaidCount = computed(() => periodFilteredPayments.value.filter((p) => p.status === 'PAID').length);
const statPendingCount = computed(() => periodFilteredPayments.value.filter((p) => p.status === 'PENDING').length);
const statTotalCount = computed(() => periodFilteredPayments.value.length);
const statDebtorsCount = computed(() => {
  const set = new Set(periodFilteredPayments.value.filter((p) => p.status === 'PENDING').map((p) => p.studentId));
  return set.size;
});
const statAverageCheck = computed(() => {
  return statPaidCount.value > 0 ? Math.round(statTotalRevenue.value / statPaidCount.value) : 0;
});

// All-time computeds (for general reporting and analytics)
const totalRevenue = computed(() =>
  payments.value.filter((p) => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0)
);
const paidCount = computed(() => payments.value.filter((p) => p.status === 'PAID').length);
const pendingCount = computed(() => payments.value.filter((p) => p.status === 'PENDING').length);
const receiptCount = computed(() => payments.value.filter((p) => !!p.receiptUrl).length);
const studentUsers = computed(() => users.value.filter((u) => u.role === 'STUDENT'));

// Payment method breakdown (from screenshot 2)
const paymentMethodsBreakdown = computed(() => {
  const total = totalRevenue.value || 1;
  const methodConfigs = [
    { key: 'PAYME', label: 'Payme', dotColor: 'bg-cyan-500', barColor: 'bg-cyan-500', tagColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { key: 'CLICK', label: 'Click', dotColor: 'bg-[#6D28D9]', barColor: 'bg-[#6D28D9]', tagColor: 'bg-violet-50 text-[#6D28D9] border-violet-200' },
    { key: 'CASH', label: 'Naqd pul', dotColor: 'bg-emerald-500', barColor: 'bg-emerald-500', tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { key: 'CARD', label: 'Plastik karta', dotColor: 'bg-blue-600', barColor: 'bg-blue-600', tagColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { key: 'UZUM', label: 'Uzum Bank', dotColor: 'bg-purple-600', barColor: 'bg-purple-600', tagColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { key: 'BANK_TRANSFER', label: 'Bank o\'tkazmasi', dotColor: 'bg-indigo-500', barColor: 'bg-indigo-500', tagColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ];

  return methodConfigs
    .map((m) => {
      const sum = payments.value
        .filter((p) => p.type === m.key && p.status === 'PAID')
        .reduce((s, p) => s + Number(p.amount), 0);
      const count = payments.value.filter((p) => p.type === m.key && p.status === 'PAID').length;
      const percent = Math.round((sum / total) * 100);
      return { ...m, sum, count, percent };
    })
    .filter((m) => m.count > 0 || m.sum > 0);
});

// Donut chart slices computation (Compact radius 58)
const donutSlices = computed(() => {
  const radius = 75;
  const circumference = 2 * Math.PI * radius; // ~471.2389
  let accumulatedPercent = 0;

  return paymentMethodsBreakdown.value.map((m) => {
    const strokeDasharray = `${(m.percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += m.percent;

    const colorHex =
      m.key === 'PAYME'
        ? '#06b6d4'
        : m.key === 'CLICK'
        ? '#7c3aed'
        : m.key === 'CASH'
        ? '#10b981'
        : m.key === 'CARD'
        ? '#2563eb'
        : m.key === 'UZUM'
        ? '#9333ea'
        : '#4f46e5';

    return {
      ...m,
      circumference,
      strokeDasharray,
      strokeDashoffset,
      colorHex,
    };
  });
});

// Dynamic Revenue Chart Filtering (12 Oylik | Haftalik | Yillik)
type RevenuePeriod = 'MONTHLY' | 'WEEKLY' | 'YEARLY';
const revenuePeriod = ref<RevenuePeriod>('MONTHLY');
const chartYear = ref<number>(2026);

// Available years for dropdown
const availableChartYears = computed(() => {
  const years = new Set<number>();
  years.add(2026);
  payments.value.forEach((p) => {
    const d = new Date(p.paidForDate);
    if (!isNaN(d.getTime())) years.add(d.getFullYear());
  });
  return Array.from(years).sort((a, b) => b - a);
});

// Dynamic aggregated chart data based on revenuePeriod
const activePeriodChartData = computed(() => {
  const paidPayments = payments.value.filter((p) => p.status === 'PAID');

  if (revenuePeriod.value === 'MONTHLY') {
    // 12 Calendar Months for selected year
    const monthNames = [
      'Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun',
      'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek',
    ];
    const buckets = monthNames.map((name, index) => ({
      key: `m-${index}`,
      label: name,
      subLabel: `${chartYear.value}`,
      sum: 0,
      count: 0,
    }));

    paidPayments.forEach((p) => {
      const d = new Date(p.paidForDate);
      if (isNaN(d.getTime())) return;
      if (d.getFullYear() === chartYear.value) {
        const m = d.getMonth();
        if (buckets[m]) {
          buckets[m].sum += Number(p.amount);
          buckets[m].count += 1;
        }
      }
    });
    return buckets;
  }

  if (revenuePeriod.value === 'WEEKLY') {
    // Days of the week (Dushanba -> Yakshanba)
    const dayNames = ['Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan', 'Yak'];
    const buckets = dayNames.map((name, index) => ({
      key: `d-${index}`,
      label: name,
      subLabel: 'Hafta kuni',
      sum: 0,
      count: 0,
    }));

    paidPayments.forEach((p) => {
      const d = new Date(p.paidForDate);
      if (isNaN(d.getTime())) return;
      const dayIdx = (d.getDay() + 6) % 7;
      if (buckets[dayIdx]) {
        buckets[dayIdx].sum += Number(p.amount);
        buckets[dayIdx].count += 1;
      }
    });
    return buckets;
  }

  // YEARLY
  const yearsMap: Record<number, { sum: number; count: number }> = {
    2024: { sum: 0, count: 0 },
    2025: { sum: 0, count: 0 },
    2026: { sum: 0, count: 0 },
    2027: { sum: 0, count: 0 },
  };

  paidPayments.forEach((p) => {
    const d = new Date(p.paidForDate);
    if (isNaN(d.getTime())) return;
    const y = d.getFullYear();
    if (!yearsMap[y]) {
      yearsMap[y] = { sum: 0, count: 0 };
    }
    yearsMap[y].sum += Number(p.amount);
    yearsMap[y].count += 1;
  });

  return Object.entries(yearsMap)
    .map(([year, info]) => ({
      key: `y-${year}`,
      label: `${year}-yil`,
      subLabel: 'Yillik',
      sum: info.sum,
      count: info.count,
    }))
    .sort((a, b) => parseInt(a.label) - parseInt(b.label));
});

const maxPeriodSum = computed(() => {
  const sums = activePeriodChartData.value.map((item) => item.sum);
  const max = Math.max(...sums, 0);
  return max > 0 ? max : 1000000;
});

const bestPeriodItem = computed(() => {
  const valid = activePeriodChartData.value.filter((item) => item.sum > 0);
  if (valid.length === 0) return null;
  return [...valid].sort((a, b) => b.sum - a.sum)[0];
});

const activePeriodTotalSum = computed(() => {
  return activePeriodChartData.value.reduce((acc, item) => acc + item.sum, 0);
});

// Filtering
const filteredPayments = computed(() => {
  let list = [...payments.value];
  if (statusFilter.value === 'RECEIPT') {
    list = list.filter((p) => !!p.receiptUrl);
  } else if (statusFilter.value !== 'ALL') {
    list = list.filter((p) => p.status === statusFilter.value);
  }
  if (typeFilter.value !== 'ALL') list = list.filter(p => p.type === typeFilter.value);
  if (dateFrom.value) list = list.filter(p => new Date(p.paidForDate) >= new Date(dateFrom.value));
  if (dateTo.value) list = list.filter(p => new Date(p.paidForDate) <= new Date(dateTo.value));
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(p => {
      const name = `${p.student?.firstName || ''} ${p.student?.lastName || ''}`.toLowerCase();
      const phone = (p.student?.phone || '').toLowerCase();
      const comment = (p.comment || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || comment.includes(q);
    });
  }
  // Sort descending by date
  return list.sort((a, b) => new Date(b.paidForDate).getTime() - new Date(a.paidForDate).getTime());
});

const totalPages = computed(() => Math.ceil(filteredPayments.value.length / itemsPerPage.value) || 1);
const paginatedPayments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredPayments.value.slice(start, start + itemsPerPage.value);
});

// Formatters (Fixing the 2026 M09 08 glitch permanently)
function formatMoney(amount: number | string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

function formatDate(dateStr: string | Date): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function getPaymentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    CASH: 'Naqd pul',
    PAYME: 'Payme',
    CLICK: 'Click',
    UZUM: 'Uzum Bank',
    CARD: 'Plastik karta',
    BANK_TRANSFER: "Bank o'tkazmasi",
  };
  return map[type] || type;
}

function getPaymentTypeBadgeClass(type: string): string {
  const map: Record<string, string> = {
    PAYME: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    CLICK: 'bg-violet-50 text-[#6D28D9] border-violet-200',
    CASH: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    UZUM: 'bg-purple-50 text-purple-700 border-purple-200',
    CARD: 'bg-blue-50 text-blue-700 border-blue-200',
    BANK_TRANSFER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return map[type] || 'bg-slate-100 text-slate-700 border-slate-200';
}

async function loadData() {
  loading.value = true;
  try {
    const [paymentsRes, usersRes] = await Promise.allSettled([
      erpService.getPayments(),
      erpService.getUsers({ limit: 200 }),
    ]);
    if (paymentsRes.status === 'fulfilled' && paymentsRes.value) {
      const val = paymentsRes.value;
      payments.value = Array.isArray((val as any).data) ? (val as any).data : (Array.isArray(val) ? val as any : []);
    }
    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      users.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error('Payments load error:', err);
  } finally {
    loading.value = false;
  }
}

function openCreateModal(studentId?: number) {
  newPayment.value = {
    studentId: studentId || (studentUsers.value[0]?.id ?? 0),
    amount: 850000,
    type: 'CASH',
    status: 'PAID',
    paidForDate: new Date().toISOString().slice(0, 10),
    comment: '',
  };
  showCreateModal.value = true;
}

async function handleCreatePayment() {
  if (!newPayment.value.studentId || newPayment.value.amount <= 0) return;
  paymentSubmitting.value = true;
  try {
    await erpService.createPayment({
      studentId: newPayment.value.studentId,
      amount: Number(newPayment.value.amount),
      type: newPayment.value.type,
      status: newPayment.value.status,
      paidForDate: new Date(newPayment.value.paidForDate).toISOString(),
      comment: newPayment.value.comment || undefined,
    });
    showCreateModal.value = false;
    await loadData();
    showToast("Yangi to'lov muvaffaqiyatli qabul qilindi!");
  } catch (err) {
    console.error("To'lov saqlashda xatolik:", err);
    showToast("To'lov saqlashda xatolik yuz berdi.");
  } finally {
    paymentSubmitting.value = false;
  }
}

function openEditModal(p: Payment) {
  editingPayment.value = {
    id: p.id,
    studentId: p.studentId,
    amount: Number(p.amount),
    type: p.type as PaymentType,
    status: p.status as PaymentStatus,
    paidForDate: p.paidForDate
      ? new Date(p.paidForDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    comment: p.comment || '',
  };
  showEditModal.value = true;
}

async function handleUpdatePayment() {
  if (!editingPayment.value.id || editingPayment.value.amount <= 0) return;
  editSubmitting.value = true;
  try {
    await erpService.updatePayment(editingPayment.value.id, {
      studentId: editingPayment.value.studentId,
      amount: Number(editingPayment.value.amount),
      type: editingPayment.value.type,
      status: editingPayment.value.status,
      paidForDate: new Date(editingPayment.value.paidForDate).toISOString(),
      comment: editingPayment.value.comment || undefined,
    });
    showEditModal.value = false;
    await loadData();
    showToast("To'lov ma'lumotlari muvaffaqiyatli yangilandi!");
  } catch (err) {
    console.error("To'lovni tahrirlashda xatolik:", err);
    showToast("To'lovni saqlashda xatolik yuz berdi.");
  } finally {
    editSubmitting.value = false;
  }
}

async function updatePaymentStatus(p: Payment, newStatus: string) {
  if (p.status === newStatus) return;
  try {
    await erpService.updatePayment(p.id, { status: newStatus as any });
    await loadData();
    const statusLabel =
      newStatus === 'PAID'
        ? "To'langan"
        : newStatus === 'PENDING'
        ? 'Kutilmoqda'
        : 'Qaytarilgan';
    showToast(`To'lov holati "${statusLabel}"ga o'zgartirildi!`);
  } catch (err) {
    console.error("Holat o'zgartirishda xatolik:", err);
    showToast("Holatni o'zgartirishda xatolik yuz berdi.");
  }
}

function confirmDelete(p: Payment) {
  deletingPayment.value = p;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (!deletingPayment.value) return;
  deleteSubmitting.value = true;
  try {
    await erpService.deletePayment(deletingPayment.value.id);
    showDeleteModal.value = false;
    deletingPayment.value = null;
    await loadData();
    showToast("To'lov tizimdan o'chirildi!");
  } catch (err) {
    console.error("O'chirishda xatolik:", err);
    showToast("O'chirishda xatolik yuz berdi.");
  } finally {
    deleteSubmitting.value = false;
  }
}

async function markAsPaid(p: Payment) {
  isApproving.value = true;
  try {
    const res = await erpService.approvePayment(p.id);
    approvalResult.value = res;
    showApprovalModal.value = true;
    await loadData();
    showToast("To'lov muvaffaqiyatli tasdiqlandi!");
  } catch (err: any) {
    console.error('Holat yangilanmadi:', err);
    showToast(err?.response?.data?.message || "Holat yangilanishida xatolik yuz berdi.");
  } finally {
    isApproving.value = false;
  }
}

function copyStudentCredentials() {
  if (!approvalResult.value) return;
  const res = approvalResult.value;
  const text = `NyVer O'quv Markazi — Shaxsiy Kabinet Ma'lumotlari:\nFoydalanuvchi: ${res.studentName}\nKurs: ${res.courseName}\nLogin: ${res.login}\nParol: ${res.tempPassword || "O'rnatilgan mavjud parol"}\nKirish: ${window.location.origin}/login`;
  navigator.clipboard.writeText(text);
  showToast("Login va parol xotiraga nusxalandi!");
}

function openReceipt(p: Payment) {
  receiptPayment.value = p;
  showReceiptModal.value = true;
}

function copyReceiptText() {
  if (!receiptPayment.value) return;
  const p = receiptPayment.value;
  const text = `NyVerEdu Chek #${String(p.id).padStart(6, '0')}\nTalaba: ${p.student?.firstName} ${p.student?.lastName}\nSumma: ${formatMoney(p.amount)}\nTo'lov turi: ${getPaymentTypeLabel(p.type)}\nSana: ${formatDate(p.paidForDate)}\nHolat: ${p.status === 'PAID' ? "To'langan" : "Kutilmoqda"}`;
  navigator.clipboard.writeText(text);
  showToast("Chek ma'lumotlari xotiraga nusxalandi!");
}

function printReceipt() {
  window.print();
}

function exportToCSV() {
  const headers = ['ID', 'Talaba', 'Telefon', 'Summa', 'To\'lov turi', 'Holat', 'Sana', 'Izoh'];
  const rows = filteredPayments.value.map(p => [
    p.id,
    `"${p.student?.firstName || ''} ${p.student?.lastName || ''}"`,
    `"${p.student?.phone || ''}"`,
    p.amount,
    getPaymentTypeLabel(p.type),
    p.status === 'PAID' ? 'To\'langan' : p.status === 'PENDING' ? 'Kutilmoqda' : 'Qaytarilgan',
    formatDate(p.paidForDate),
    `"${p.comment || ''}"`,
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `tolovlar_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function resetFilters() {
  searchQuery.value = '';
  statusFilter.value = 'ALL';
  typeFilter.value = 'ALL';
  dateFrom.value = '';
  dateTo.value = '';
  currentPage.value = 1;
}

onMounted(async () => {
  await loadData();
  if (route.query.action === 'create') {
    openCreateModal();
    router.replace({ path: route.path });
  }
  if (route.query.status) {
    statusFilter.value = (route.query.status as string).toUpperCase() as any;
    router.replace({ path: route.path });
  }
});
</script>

<template>
  <div class="space-y-5 pb-10">
    <!-- Top Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="h-10 w-10 rounded-2xl bg-[#6D28D9]/10 text-[#6D28D9] flex items-center justify-center">
            <CreditCard class="h-5 w-5" />
          </div>
          <div>
            <h1 class="text-2xl font-black tracking-tight text-slate-900">To'lovlar Markazi</h1>
            <p class="text-xs sm:text-sm text-slate-500">Moliya tahlili, to'lovlar hisobi va qarzdorlar monitoringi</p>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap">
        <button
          @click="showAnalytics = !showAnalytics"
          type="button"
          class="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <PieChart class="h-4 w-4 text-[#6D28D9]" />
          <span>{{ showAnalytics ? 'Tahlilni yashirish' : 'Moliya tahlili' }}</span>
        </button>

        <button
          @click="exportToCSV"
          type="button"
          class="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Excel/CSV eksport"
        >
          <Download class="h-4 w-4 text-emerald-600" />
          <span>Eksport</span>
        </button>

        <button
          @click="loadData"
          type="button"
          class="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Yangilash"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          @click="openCreateModal()"
          type="button"
          class="h-10 px-4 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi to'lov</span>
        </button>
      </div>
    </div>

    <!-- Davr Filtr Boshqaruvi (Oylik / Yillik / Barcha davr) -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
      <div class="flex items-center gap-2">
        <Clock class="h-4 w-4 text-[#6D28D9]" />
        <span class="text-xs font-bold text-slate-800">Moliya Davri:</span>
        <span class="text-[11px] font-semibold text-slate-500">
          {{ statPeriod === 'THIS_MONTH' ? 'Joriy oy (Sentabr 2026 ko\'rsatkichlari)' : statPeriod === 'THIS_YEAR' ? '2026-yil to\'lovlari' : 'Barcha davrlar hisobi' }}
        </span>
      </div>

      <!-- Segmented Buttons -->
      <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
        <button
          @click="statPeriod = 'THIS_MONTH'"
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          :class="statPeriod === 'THIS_MONTH' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>Bu oy (Sentabr)</span>
          <span v-if="statPeriod === 'THIS_MONTH'" class="h-1.5 w-1.5 rounded-full bg-[#6D28D9]"></span>
        </button>

        <button
          @click="statPeriod = 'THIS_YEAR'"
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          :class="statPeriod === 'THIS_YEAR' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>Bu yil (2026)</span>
          <span v-if="statPeriod === 'THIS_YEAR'" class="h-1.5 w-1.5 rounded-full bg-[#6D28D9]"></span>
        </button>

        <button
          @click="statPeriod = 'ALL'"
          type="button"
          class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          :class="statPeriod === 'ALL' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
        >
          <span>Barcha davr</span>
          <span v-if="statPeriod === 'ALL'" class="h-1.5 w-1.5 rounded-full bg-[#6D28D9]"></span>
        </button>
      </div>
    </div>

    <!-- 4 Key Stat Cards (Connected to Selected Period) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      <div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_12px_#0000000a] flex items-center gap-3.5">
        <div class="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Wallet class="h-5 w-5 text-emerald-600" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Jami Tushum</div>
          <div class="text-base font-black text-slate-900 truncate">{{ formatMoney(statTotalRevenue) }}</div>
          <div class="text-[11px] text-emerald-600 font-medium mt-0.5">{{ statPaidCount }} ta muvaffaqiyatli</div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_12px_#0000000a] flex items-center gap-3.5">
        <div class="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
          <AlertTriangle class="h-5 w-5 text-amber-600" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">Kutilayotgan Qarzlar</div>
          <div class="text-base font-black text-amber-600 truncate">{{ formatMoney(statTotalPending) }}</div>
          <div class="text-[11px] text-slate-400 font-medium mt-0.5">{{ statDebtorsCount }} ta qarzdor talaba ({{ statPendingCount }} to'lov)</div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_12px_#0000000a] flex items-center gap-3.5">
        <div class="h-11 w-11 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <Receipt class="h-5 w-5 text-[#6D28D9]" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">To'lovlar Soni</div>
          <div class="text-base font-black text-slate-900">{{ statTotalCount }} ta</div>
          <div class="text-[11px] text-slate-400 font-medium mt-0.5">{{ statPendingCount }} ta kutilmoqda</div>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-100 p-4 shadow-[0_2px_12px_#0000000a] flex items-center gap-3.5">
        <div class="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <TrendingUp class="h-5 w-5 text-blue-600" />
        </div>
        <div class="min-w-0">
          <div class="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">O'rtacha Chek</div>
          <div class="text-base font-black text-slate-900 truncate">
            {{ formatMoney(statAverageCheck) }}
          </div>
          <div class="text-[11px] text-blue-600 font-medium mt-0.5">Bir martalik to'lov</div>
        </div>
      </div>
    </div>

    <!-- MOLIYAVIY TAHLIL & GRAFIKLAR: Payment Methods + Monthly Breakdown -->
    <div v-if="showAnalytics" class="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_#0000000a] overflow-hidden transition-all duration-300">
      <!-- Section Header -->
      <div class="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-2xl bg-gradient-to-tr from-[#6D28D9] to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <PieChart class="h-4 w-4" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-sm font-black text-slate-900 leading-none">Moliya & To'lov Turlari Tahlili</h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-[#6D28D9]">Grafik Tahlil</span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">To'lov turlarining foiz ulushi va oylar kesimidagi tushum dinamikasi</p>
          </div>
        </div>
        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            Jami tasdiqlangan: <b class="text-emerald-600 font-black">{{ formatMoney(totalRevenue) }}</b>
          </span>
        </div>
      </div>

      <div class="p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
        <!-- 1. TO'LOV TURLARI TAQSIMOTI (Donut & Breakdown) - 5 cols -->
        <div class="lg:col-span-5 flex flex-col justify-start space-y-3">
          <div class="flex items-center justify-between border-b border-slate-100 pb-2">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-[#6D28D9]"></span>
              <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">To'lov Turlari Taqsimoti</h3>
            </div>
            <span class="text-[11px] font-bold text-slate-400">{{ paymentMethodsBreakdown.length }} ta to'lov turi</span>
          </div>

          <!-- Donut Graphic + Stats (Optimized & Compact, No void) -->
          <div class="flex flex-col sm:flex-row items-center gap-5 pt-1">
            <!-- SVG Donut Chart (Radius 75, Enlarged so numbers fit comfortably) -->
            <div class="flex flex-col items-center shrink-0">
              <div class="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                <svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  <!-- Background track -->
                  <circle
                    cx="100"
                    cy="100"
                    r="75"
                    fill="transparent"
                    stroke="#f1f5f9"
                    stroke-width="20"
                  />
                  <!-- Slices -->
                  <circle
                    v-for="slice in donutSlices"
                    :key="slice.key"
                    cx="100"
                    cy="100"
                    r="75"
                    fill="transparent"
                    :stroke="slice.colorHex"
                    stroke-width="20"
                    :stroke-dasharray="slice.strokeDasharray"
                    :stroke-dashoffset="slice.strokeDashoffset"
                    stroke-linecap="round"
                    class="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                    :class="{ 'stroke-[24px] opacity-100': activeHoverMethod === slice.key }"
                    @mouseenter="activeHoverMethod = slice.key"
                    @mouseleave="activeHoverMethod = null"
                  />
                </svg>

                <!-- Center Text inside Donut (Spacious, No Clipping) -->
                <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-32">
                    {{ activeHoverMethod ? paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.label : 'Jami Tushum' }}
                  </span>
                  <span class="text-base sm:text-lg font-black text-slate-900 leading-tight my-1 font-mono">
                    {{ activeHoverMethod ? formatMoney(paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.sum || 0) : formatMoney(totalRevenue) }}
                  </span>
                  <span class="text-[10px] font-extrabold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200/80 shadow-2xs">
                    {{ activeHoverMethod ? (paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.percent || 0) + '% ulush' : paidCount + ' ta to\'lov' }}
                  </span>
                </div>
              </div>

              <!-- Extra Bottom Stat Label (As requested: pastda ham aniq ko'rinsin) -->
              <div class="mt-2 text-center">
                <span class="text-[11px] font-medium text-slate-400">Umumiy tushum: </span>
                <span class="text-xs font-black text-emerald-700 font-mono bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {{ formatMoney(totalRevenue) }}
                </span>
              </div>
            </div>

            <!-- Sleek Full-Width Vertical Legend (Eliminates All Empty Space) -->
            <div class="flex-1 w-full flex flex-col justify-center space-y-2">
              <div
                v-for="m in paymentMethodsBreakdown"
                :key="m.key"
                @mouseenter="activeHoverMethod = m.key"
                @mouseleave="activeHoverMethod = null"
                class="p-2.5 rounded-xl transition-all border cursor-pointer"
                :class="activeHoverMethod === m.key ? 'bg-violet-50/90 border-violet-300 shadow-xs' : 'bg-slate-50/60 hover:bg-slate-50 border-slate-100'"
              >
                <div class="flex items-center justify-between text-xs">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="h-2.5 w-2.5 rounded-full shrink-0" :class="m.dotColor"></span>
                    <span class="font-bold text-slate-800 text-xs truncate">{{ m.label }}</span>
                    <span class="text-[10px] text-slate-400">({{ m.count }} ta)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="font-black text-slate-900 text-xs">{{ formatMoney(m.sum) }}</span>
                    <span class="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-900 shadow-2xs">
                      {{ m.percent }}%
                    </span>
                  </div>
                </div>
                <!-- Progress bar -->
                <div class="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden mt-1.5">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="m.barColor"
                    :style="{ width: `${m.percent}%` }"
                  ></div>
                </div>
              </div>
              <div v-if="paymentMethodsBreakdown.length === 0" class="py-4 text-center text-xs text-slate-400">
                To'lov ma'lumotlari mavjud emas.
              </div>
            </div>
          </div>
        </div>

        <!-- 2. TUSHUM DINAMIKASI (100% Height Bar Chart - Compact & Symmetrical) - 7 cols -->
        <div class="lg:col-span-7 flex flex-col justify-between space-y-2.5 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-5 pt-4 lg:pt-0">
          <!-- Period Header & Filters -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
              <div>
                <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Tushum Dinamikasi</h3>
                <p class="text-[10px] text-slate-400 font-medium">Jami: {{ formatMoney(activePeriodTotalSum) }}</p>
              </div>
            </div>

            <!-- Filter Controls: 12 Oylik | Haftalik | Yillik -->
            <div class="flex items-center gap-2">
              <div class="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  @click="revenuePeriod = 'MONTHLY'"
                  type="button"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="revenuePeriod === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                >
                  12 Oylik
                </button>
                <button
                  @click="revenuePeriod = 'WEEKLY'"
                  type="button"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="revenuePeriod === 'WEEKLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                >
                  Haftalik
                </button>
                <button
                  @click="revenuePeriod = 'YEARLY'"
                  type="button"
                  class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
                  :class="revenuePeriod === 'YEARLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                >
                  Yillik
                </button>
              </div>

              <!-- Year selector for 12-Month view -->
              <select
                v-if="revenuePeriod === 'MONTHLY'"
                v-model="chartYear"
                class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer"
              >
                <option v-for="y in availableChartYears" :key="y" :value="y">{{ y }}-yil</option>
              </select>

              <div
                v-if="bestPeriodItem"
                class="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60"
              >
                <Sparkles class="h-3 w-3" />
                <span>Eng yuqori: {{ bestPeriodItem.label }} ({{ formatMoney(bestPeriodItem.sum) }})</span>
              </div>
            </div>
          </div>

          <!-- Bar Chart Visual (Balanced & Filled Layout) -->
          <div class="pt-0.5">
            <div class="h-52 flex items-end justify-between gap-1 sm:gap-2 px-3 pt-6 pb-2.5 bg-linear-to-b from-slate-50/60 via-slate-50/30 to-white border border-slate-100 rounded-2xl relative">
              <!-- Y-axis guide lines -->
              <div class="absolute inset-x-3 top-4 border-b border-dashed border-slate-200/80 pointer-events-none flex justify-end">
                <span class="text-[9px] font-bold text-slate-400 bg-white/90 px-1 -mt-2">{{ formatMoney(maxPeriodSum) }}</span>
              </div>
              <div class="absolute inset-x-3 top-1/2 border-b border-dashed border-slate-200/60 pointer-events-none flex justify-end">
                <span class="text-[9px] font-bold text-slate-400 bg-white/90 px-1 -mt-2">{{ formatMoney(Math.round(maxPeriodSum / 2)) }}</span>
              </div>
              <div class="absolute inset-x-3 bottom-8 border-b border-slate-200/40 pointer-events-none"></div>

              <!-- Columns for each period item -->
              <div
                v-for="item in activePeriodChartData"
                :key="item.key"
                class="flex-1 flex flex-col items-center h-full justify-end group/bar relative z-10 cursor-pointer"
              >
                <!-- Tooltip on hover -->
                <div class="opacity-0 group-hover/bar:opacity-100 transition-all duration-200 absolute -top-9 bg-slate-900 text-white text-[10px] font-bold py-1.5 px-2.5 rounded-xl shadow-xl pointer-events-none whitespace-nowrap z-20">
                  {{ item.label }} ({{ item.subLabel }}): {{ formatMoney(item.sum) }} • {{ item.count }} ta to'lov
                </div>

                <!-- Floating amount badge -->
                <span
                  class="text-[9px] font-black mb-1 transition-transform group-hover/bar:-translate-y-0.5 text-center"
                  :class="item.sum > 0 ? 'text-slate-900 font-extrabold' : 'text-transparent'"
                >
                  {{ item.sum > 0 ? (item.sum >= 1000000 ? (item.sum / 1000000).toFixed(1) + 'M' : Math.round(item.sum / 1000) + 'k') : '.' }}
                </span>

                <!-- Background slot track with bar element -->
                <div
                  class="w-full max-w-8 sm:max-w-10 h-32 rounded-xl flex flex-col justify-end p-0.5 transition-colors"
                  :class="item.sum > 0 ? 'bg-violet-50/70 hover:bg-violet-100/60' : 'bg-slate-100/50 hover:bg-slate-100/80'"
                >
                  <div
                    v-if="item.sum > 0"
                    class="w-full rounded-lg transition-all duration-500 group-hover/bar:brightness-110 shadow-xs"
                    :class="item.sum === bestPeriodItem?.sum ? 'bg-linear-to-t from-emerald-600 via-emerald-500 to-teal-400' : 'bg-linear-to-t from-[#6D28D9] via-violet-500 to-indigo-400'"
                    :style="{ height: `${Math.max(18, Math.round((item.sum / maxPeriodSum) * 100))}%` }"
                  ></div>
                  <div v-else class="w-full h-1 bg-slate-200/80 rounded-full"></div>
                </div>

                <!-- Period Label with active month highlight -->
                <div class="mt-2 text-center">
                  <div
                    class="text-[10px] font-bold leading-none truncate max-w-10 sm:max-w-12 px-1 py-0.5 rounded-md"
                    :class="item.label === 'Sen' ? 'bg-[#6D28D9] text-white' : item.sum > 0 ? 'text-slate-900 font-black' : 'text-slate-500'"
                  >
                    {{ item.label }}
                  </div>
                  <div class="text-[8px] sm:text-[9px] font-medium text-slate-400 mt-0.5 truncate max-w-10 sm:max-w-12">{{ item.subLabel }}</div>
                </div>
              </div>

              <div v-if="activePeriodChartData.length === 0" class="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Ma'lumotlar mavjud emas.
              </div>
            </div>
          </div>

          <!-- Bottom Period Highlights -->
          <div class="grid grid-cols-3 gap-2.5 mt-2 pt-2 border-t border-slate-100 text-center">
            <div class="p-1.5 rounded-xl bg-slate-50/70 border border-slate-100">
              <div class="text-[10px] text-slate-400 font-medium">Faol Davrlar</div>
              <div class="text-xs font-black text-slate-800 mt-0.5">{{ activePeriodChartData.filter(i => i.sum > 0).length }} ta</div>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-50/70 border border-slate-100">
              <div class="text-[10px] text-slate-400 font-medium">O'rtacha Tushum</div>
              <div class="text-xs font-black text-slate-800 mt-0.5">
                {{ formatMoney(Math.round(activePeriodTotalSum / (activePeriodChartData.filter(i => i.sum > 0).length || 1))) }}
              </div>
            </div>
            <div class="p-1.5 rounded-xl bg-slate-50/70 border border-slate-100">
              <div class="text-[10px] text-slate-400 font-medium">Jami Tranzaksiya</div>
              <div class="text-xs font-black text-[#6D28D9] mt-0.5">{{ paidCount }} ta</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_#0000000a] p-4 space-y-3">
      <div class="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between flex-wrap">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[240px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Talaba ismi, telefoni yoki izoh bo'yicha qidiruv..."
            class="w-full h-10 pl-9 pr-4 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] transition-all"
            @input="currentPage = 1"
          />
        </div>

        <!-- Status Filter Tabs (Segmented Control) -->
        <div class="inline-flex items-center bg-slate-100/80 p-1 rounded-xl gap-1 shrink-0 flex-wrap">
          <button
            v-for="s in [
              { val: 'ALL', label: 'Barchasi', count: payments.length },
              { val: 'PAID', label: 'To\'langan', count: paidCount },
              { val: 'PENDING', label: 'Kutilayotgan', count: pendingCount },
              { val: 'RECEIPT', label: 'Onlayn Cheklar', count: receiptCount }
            ]"
            :key="s.val"
            @click="statusFilter = s.val as any; currentPage = 1"
            type="button"
            class="px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap"
            :class="statusFilter === s.val
              ? s.val === 'PAID' ? 'bg-emerald-600 text-white shadow-xs'
              : s.val === 'PENDING' ? 'bg-amber-500 text-white shadow-xs'
              : s.val === 'RECEIPT' ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'"
          >
            {{ s.label }} ({{ s.count }})
          </button>
        </div>

        <!-- Payment Type Select -->
        <select
          v-model="typeFilter"
          class="h-10 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 cursor-pointer shrink-0"
          @change="currentPage = 1"
        >
          <option value="ALL">Barcha to'lov turlari</option>
          <option value="CASH">Naqd pul</option>
          <option value="PAYME">Payme</option>
          <option value="CLICK">Click</option>
          <option value="UZUM">Uzum Bank</option>
          <option value="CARD">Plastik karta</option>
          <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
        </select>

        <!-- Date Range -->
        <div class="flex items-center gap-1.5 shrink-0">
          <input
            v-model="dateFrom"
            type="date"
            class="h-10 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            title="Boshlanish sanasi"
            @change="currentPage = 1"
          />
          <span class="text-xs text-slate-400">—</span>
          <input
            v-model="dateTo"
            type="date"
            class="h-10 px-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            title="Tugash sanasi"
            @change="currentPage = 1"
          />
        </div>

        <!-- Reset button -->
        <button
          v-if="searchQuery || statusFilter !== 'ALL' || typeFilter !== 'ALL' || dateFrom || dateTo"
          @click="resetFilters"
          type="button"
          class="h-10 px-3 rounded-xl border border-rose-200 text-rose-600 bg-rose-50/50 hover:bg-rose-50 flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer shrink-0"
        >
          <X class="h-3.5 w-3.5" />
          <span>Tozalash</span>
        </button>
      </div>

      <!-- Quick info summary -->
      <div class="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
        <div>
          Ko'rsatilmoqda: <span class="font-bold text-slate-800">{{ filteredPayments.length }}</span> ta to'lov
          <span v-if="filteredPayments.length !== payments.length"> (jami {{ payments.length }} tadan saralandi)</span>
        </div>
        <div v-if="filteredPayments.length > 0" class="text-xs font-semibold text-slate-700">
          Saralangan tushum: <span class="text-emerald-700 font-extrabold">{{ formatMoney(filteredPayments.filter(p => p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0)) }}</span>
        </div>
      </div>
    </div>

    <!-- Payments Table -->
    <div class="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_#0000000a] overflow-hidden">
      <div v-if="loading" class="p-16 text-center">
        <div class="inline-flex items-center gap-2.5 text-sm font-semibold text-slate-500">
          <RefreshCw class="h-5 w-5 animate-spin text-[#6D28D9]" />
          <span>Ma'lumotlar yuklanmoqda...</span>
        </div>
      </div>

      <div v-else-if="filteredPayments.length === 0" class="py-16 text-center">
        <div class="h-16 w-16 rounded-2xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mx-auto mb-3">
          <CreditCard class="h-8 w-8" />
        </div>
        <h3 class="text-base font-bold text-slate-800">To'lovlar topilmadi</h3>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Qidiruv so'rovi yoki filtr bo'yicha hech narsa chiqmadi. Filtrni tozalab ko'ring yoki yangi to'lov qo'shing.
        </p>
        <button
          @click="openCreateModal()"
          class="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#6D28D9] text-white text-xs font-bold rounded-xl cursor-pointer hover:bg-[#5B21B6] transition-colors shadow-sm"
        >
          <Plus class="h-4 w-4" />
          Yangi to'lov qabul qilish
        </button>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/70">
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-12">#</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider min-w-[200px]">Talaba</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Summa</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">To'lov Turi</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Holat</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sana</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Izoh</th>
              <th class="py-3.5 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right min-w-[150px]">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100/80">
            <tr
              v-for="(p, i) in paginatedPayments"
              :key="p.id"
              class="hover:bg-slate-50/70 transition-colors group"
            >
              <!-- Index -->
              <td class="py-3.5 px-4 text-xs text-slate-400 font-mono">
                {{ (currentPage - 1) * itemsPerPage + i + 1 }}
              </td>

              <!-- Student -->
              <td class="py-3.5 px-4">
                <router-link
                  :to="'/dashboard/users/' + p.studentId"
                  class="flex items-center gap-3 group/user hover:opacity-90 transition-opacity"
                  title="Talabaning 360° profiliga o'tish"
                >
                  <div class="h-9 w-9 rounded-xl bg-violet-100 group-hover/user:bg-[#6D28D9] group-hover/user:text-white text-[#6D28D9] font-black text-xs flex items-center justify-center shrink-0 shadow-xs transition-colors">
                    {{ p.student?.firstName?.charAt(0) || 'T' }}
                  </div>
                  <div class="min-w-0">
                    <div class="text-sm font-bold text-slate-900 group-hover/user:text-[#6D28D9] transition-colors leading-tight flex items-center gap-1.5">
                      <span>{{ p.student?.firstName }} {{ p.student?.lastName }}</span>
                      <Eye class="h-3.5 w-3.5 opacity-0 group-hover/user:opacity-100 text-[#6D28D9] transition-opacity shrink-0" />
                    </div>
                    <div class="text-[11px] text-slate-400 font-medium">{{ p.student?.phone || 'Telefon kiritilmagan' }}</div>
                  </div>
                </router-link>
              </td>

              <!-- Amount -->
              <td class="py-3.5 px-4 font-mono">
                <span
                  class="text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-lg inline-block"
                  :class="
                    p.status === 'PAID'
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                      : p.status === 'PENDING'
                      ? 'text-amber-700 bg-amber-50 border border-amber-200/80'
                      : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                  "
                >
                  {{ formatMoney(p.amount) }}
                </span>
              </td>

              <!-- Type -->
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border"
                  :class="getPaymentTypeBadgeClass(p.type)"
                >
                  {{ getPaymentTypeLabel(p.type) }}
                </span>
              </td>

              <!-- Status (Interactive Inline Selector for Admin) -->
              <td class="py-3.5 px-4">
                <select
                  :value="p.status"
                  @change="updatePaymentStatus(p, ($event.target as HTMLSelectElement).value)"
                  class="text-[11px] font-bold py-1 px-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 cursor-pointer transition-all shadow-2xs"
                  :class="
                    p.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                      : p.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70'
                      : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/70'
                  "
                  title="To'lov holatini tezkor o'zgartirish"
                >
                  <option value="PAID">To'langan</option>
                  <option value="PENDING">Kutilmoqda</option>
                  <option value="REFUNDED">Qaytarilgan</option>
                </select>
              </td>

              <!-- Date (Reliable DD.MM.YYYY format) -->
              <td class="py-3.5 px-4">
                <span class="text-xs font-semibold text-slate-600">{{ formatDate(p.paidForDate) }}</span>
              </td>

              <!-- Comment & Screenshot Badge -->
              <td class="py-3.5 px-4 max-w-[200px]">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button
                    v-if="p.receiptUrl"
                    @click="openScreenshotModal(p)"
                    type="button"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-extrabold cursor-pointer transition shadow-2xs"
                    title="Chek skrinshotini ko'rish"
                  >
                    <ImageIcon class="w-3 h-3 text-indigo-600" />
                    <span>Skrinshot</span>
                  </button>
                  <span class="text-xs text-slate-400 truncate block" :title="p.comment || ''">
                    {{ p.comment || '—' }}
                  </span>
                </div>
              </td>

              <!-- Actions (Always clearly accessible) -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <!-- Quick Confirm (if pending) -->
                  <button
                    v-if="p.status === 'PENDING'"
                    @click="markAsPaid(p)"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
                    title="To'lovni tasdiqlash va qabul qilish"
                  >
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    <span>Qabul</span>
                  </button>

                  <!-- Screenshot View Button (if receipt uploaded) -->
                  <button
                    v-if="p.receiptUrl"
                    @click="openScreenshotModal(p)"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="Foydalanuvchi yuborgan to'lov cheki skrinshotini ko'rish"
                  >
                    <ImageIcon class="h-3.5 w-3.5 text-indigo-600" />
                    <span>Chek rasmi</span>
                  </button>

                  <!-- Edit Button -->
                  <button
                    @click="openEditModal(p)"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-50 text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] border border-slate-200 hover:border-violet-200 rounded-xl transition-all cursor-pointer shadow-2xs"
                    title="To'lovni tahrirlash"
                  >
                    <Pen class="h-3.5 w-3.5 text-[#6D28D9]" />
                    <span>Tahrirlash</span>
                  </button>

                  <!-- Receipt View Button -->
                  <button
                    @click="openReceipt(p)"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                    title="To'lov kvitansiyasini ko'rish va chop etish"
                  >
                    <FileText class="h-3.5 w-3.5 text-slate-500" />
                    <span>Chek</span>
                  </button>

                  <!-- Delete Button -->
                  <button
                    @click="confirmDelete(p)"
                    type="button"
                    class="inline-flex items-center justify-center h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination (10/10 UI/UX with page size selector) -->
      <div v-if="filteredPayments.length > 0" class="px-5 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div class="flex items-center gap-3">
          <div class="text-xs text-slate-500 font-medium">
            {{ (currentPage - 1) * itemsPerPage + 1 }}–{{ Math.min(currentPage * itemsPerPage, filteredPayments.length) }} / {{ filteredPayments.length }} ta to'lov
          </div>
          <div class="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Sahifada:</span>
            <select
              v-model="itemsPerPage"
              @change="currentPage = 1"
              class="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 cursor-pointer transition-colors shadow-2xs"
            >
              <option :value="10">10 ta</option>
              <option :value="25">25 ta</option>
              <option :value="50">50 ta</option>
            </select>
          </div>
        </div>

        <div v-if="totalPages > 1" class="flex items-center gap-1.5">
          <button
            :disabled="currentPage === 1"
            @click="currentPage--"
            class="h-8 px-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            Oldingi
          </button>
          <button
            v-for="page in Math.min(totalPages, 8)"
            :key="page"
            @click="currentPage = page"
            type="button"
            class="h-8 w-8 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            :class="currentPage === page ? 'bg-[#6D28D9] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'"
          >
            {{ page }}
          </button>
          <button
            :disabled="currentPage === totalPages"
            @click="currentPage++"
            class="h-8 px-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
          >
            Keyingi
          </button>
        </div>
      </div>
    </div>

    <!-- Official Payment Receipt Modal (10/10 ERP Feature) -->
    <Modal :show="showReceiptModal" title="To'lov Kvitansiyasi (Chek)" @close="showReceiptModal = false">
      <div v-if="receiptPayment" class="space-y-4">
        <!-- Printable receipt paper -->
        <div class="p-6 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden space-y-4">
          <!-- Top watermark/stamp if paid -->
          <div
            v-if="receiptPayment.status === 'PAID'"
            class="absolute -right-4 -bottom-4 rotate-[-15deg] border-2 border-emerald-500 text-emerald-600 font-black text-xs px-4 py-1.5 rounded-lg opacity-30 select-none tracking-widest uppercase"
          >
            TASDIQLANGAN
          </div>

          <!-- Academy Header -->
          <div class="flex items-center justify-between border-b border-slate-200 pb-3">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 rounded-lg bg-[#6D28D9] text-white flex items-center justify-center font-black text-xs">
                Ny
              </div>
              <div>
                <h4 class="text-sm font-black text-slate-900 leading-none">NyVerEdu O'quv Markazi</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Rasmiy to'lov kvitansiyasi</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-[10px] text-slate-400 block font-mono">CHEK #{{ String(receiptPayment.id).padStart(6, '0') }}</span>
              <span class="text-xs font-bold text-slate-700">{{ formatDate(receiptPayment.paidForDate) }}</span>
            </div>
          </div>

          <!-- Receipt Details -->
          <div class="space-y-2.5 text-xs">
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Talaba:</span>
              <span class="font-bold text-slate-900">{{ receiptPayment.student?.firstName }} {{ receiptPayment.student?.lastName }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Telefon:</span>
              <span class="font-medium text-slate-700">{{ receiptPayment.student?.phone || '—' }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">To'lov turi:</span>
              <span class="font-bold text-slate-800">{{ getPaymentTypeLabel(receiptPayment.type) }}</span>
            </div>
            <div class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Holat:</span>
              <Badge :variant="receiptPayment.status === 'PAID' ? 'success' : receiptPayment.status === 'PENDING' ? 'warning' : 'danger'">
                {{ receiptPayment.status === 'PAID' ? 'To\'langan' : 'Kutilmoqda' }}
              </Badge>
            </div>
            <div v-if="receiptPayment.comment" class="flex justify-between py-1 border-b border-slate-100">
              <span class="text-slate-500">Izoh:</span>
              <span class="font-medium text-slate-700">{{ receiptPayment.comment }}</span>
            </div>
            <div class="flex justify-between py-2 pt-3">
              <span class="text-sm font-bold text-slate-700">Jami To'lov:</span>
              <span class="text-lg font-black text-emerald-700">{{ formatMoney(receiptPayment.amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Receipt Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-2">
          <button
            @click="copyReceiptText()"
            type="button"
            class="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Copy class="h-3.5 w-3.5" />
            <span>Nusxa olish</span>
          </button>
          <button
            @click="showReceiptModal = false"
            type="button"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Yopish
          </button>
          <button
            @click="printReceipt"
            type="button"
            class="px-4 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Printer class="h-4 w-4" />
            <span>Chop etish (Print)</span>
          </button>
        </div>
      </div>
    </Modal>

    <!-- Create Payment Modal -->
    <Modal :show="showCreateModal" title="Yangi To'lov Qabul Qilish" @close="showCreateModal = false">
      <form @submit.prevent="handleCreatePayment" class="space-y-4">
        <!-- Student -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Talabani tanlang *</label>
          <select
            v-model="newPayment.studentId"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800"
          >
            <option :value="0" disabled>Talabani tanlang...</option>
            <option v-for="s in studentUsers" :key="s.id" :value="s.id">
              {{ s.firstName }} {{ s.lastName }} ({{ s.phone }})
            </option>
          </select>
        </div>

        <!-- Amount with Quick Buttons & Formatted Preview -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-700">Summa (so'm) *</label>
            <span v-if="newPayment.amount" class="text-xs font-black text-[#6D28D9] bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
              {{ formatMoney(newPayment.amount) }}
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="newPayment.amount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="Masalan: 600000"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-semibold text-slate-900 pr-16"
            />
            <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              UZS
            </span>
          </div>
          <!-- Quick presets -->
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <span class="text-[11px] text-slate-400 font-semibold">Tezkor:</span>
            <button
              v-for="preset in [600000, 750000, 850000, 900000, 1200000, 1500000]"
              :key="preset"
              type="button"
              @click="newPayment.amount = preset"
              class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-[#6D28D9] text-slate-700 transition-colors cursor-pointer"
            >
              {{ (preset / 1000).toLocaleString() }}k
            </button>
            <button
              type="button"
              @click="newPayment.amount = 0"
              class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
            >
              Tozalash
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">To'lov turi *</label>
            <select
              v-model="newPayment.type"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="CASH">Naqd pul</option>
              <option value="PAYME">Payme</option>
              <option value="CLICK">Click</option>
              <option value="UZUM">Uzum Bank</option>
              <option value="CARD">Plastik karta</option>
              <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Holat *</label>
            <select
              v-model="newPayment.status"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="PAID">To'langan (Tasdiqlangan)</option>
              <option value="PENDING">Kutilmoqda (Qarzdorlik)</option>
              <option value="REFUNDED">Qaytarilgan</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">To'lov sanasi *</label>
          <input
            v-model="newPayment.paidForDate"
            type="date"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Izoh (ixtiyoriy)</label>
          <input
            v-model="newPayment.comment"
            type="text"
            placeholder="Masalan: Sentabr oyi to'lovi (IELTS kursi)"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="paymentSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {{ paymentSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Delete Modal -->
    <Modal :show="showDeleteModal" title="To'lovni o'chirish" @close="showDeleteModal = false">
      <div class="space-y-4">
        <div class="p-4 bg-rose-50 border border-rose-100 rounded-xl">
          <p class="text-sm font-semibold text-rose-800">Ushbu to'lovni o'chirishni tasdiqlaysizmi?</p>
          <div v-if="deletingPayment" class="mt-2 text-xs text-rose-700 space-y-1">
            <div>Talaba: <span class="font-bold">{{ deletingPayment.student?.firstName }} {{ deletingPayment.student?.lastName }}</span></div>
            <div>Summa: <span class="font-bold">{{ formatMoney(deletingPayment.amount) }}</span></div>
            <div>Sana: <span class="font-bold">{{ formatDate(deletingPayment.paidForDate) }}</span></div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2.5">
          <button
            @click="showDeleteModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            @click="handleDelete"
            type="button"
            :disabled="deleteSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ deleteSubmitting ? "O'chirilmoqda..." : "O'chirish" }}
          </button>
        </div>
      </div>
    </Modal>

    <!-- Edit Payment Modal (Admin Manipulation) -->
    <Modal :show="showEditModal" title="To'lov Ma'lumotlarini Tahrirlash" @close="showEditModal = false">
      <form @submit.prevent="handleUpdatePayment" class="space-y-4">
        <!-- Student selection -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Talaba *</label>
          <select
            v-model="editingPayment.studentId"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800"
          >
            <option v-for="s in studentUsers" :key="s.id" :value="s.id">
              {{ s.firstName }} {{ s.lastName }} ({{ s.phone }})
            </option>
          </select>
        </div>

        <!-- Amount with Quick Buttons & Formatted Preview -->
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-700">Summa (so'm) *</label>
            <span v-if="editingPayment.amount" class="text-xs font-black text-[#6D28D9] bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">
              {{ formatMoney(editingPayment.amount) }}
            </span>
          </div>
          <div class="relative">
            <input
              v-model.number="editingPayment.amount"
              type="number"
              min="0"
              step="any"
              required
              placeholder="Masalan: 600000"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-semibold text-slate-900 pr-16"
            />
            <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
              UZS
            </span>
          </div>
          <!-- Quick presets -->
          <div class="flex items-center gap-1.5 mt-2 flex-wrap">
            <span class="text-[11px] text-slate-400 font-semibold">Tezkor:</span>
            <button
              v-for="preset in [600000, 750000, 850000, 900000, 1200000, 1500000]"
              :key="preset"
              type="button"
              @click="editingPayment.amount = preset"
              class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-violet-100 hover:text-[#6D28D9] text-slate-700 transition-colors cursor-pointer"
            >
              {{ (preset / 1000).toLocaleString() }}k
            </button>
            <button
              type="button"
              @click="editingPayment.amount = 0"
              class="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
            >
              Tozalash
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Payment Type -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">To'lov turi *</label>
            <select
              v-model="editingPayment.type"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="CASH">Naqd pul</option>
              <option value="PAYME">Payme</option>
              <option value="CLICK">Click</option>
              <option value="UZUM">Uzum Bank</option>
              <option value="CARD">Plastik karta</option>
              <option value="BANK_TRANSFER">Bank o'tkazmasi</option>
            </select>
          </div>

          <!-- Status -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Holati *</label>
            <select
              v-model="editingPayment.status"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="PAID">To'langan (Tasdiqlangan)</option>
              <option value="PENDING">Kutilmoqda (Qarzdorlik)</option>
              <option value="REFUNDED">Qaytarilgan</option>
            </select>
          </div>
        </div>

        <!-- Paid For Date -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Qaysi sana / oy uchun *</label>
          <input
            v-model="editingPayment.paidForDate"
            type="date"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <!-- Comment -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Izoh (ixtiyoriy)</label>
          <input
            v-model="editingPayment.comment"
            type="text"
            placeholder="Masalan: Sentabr oyi to'lovi (IELTS kursi)"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="editSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {{ editSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Payment Approved & Student Credentials Modal -->
    <Modal :show="showApprovalModal" title="To'lov Tasdiqlandi va Talaba Ro'yxatdan O'tkazildi" @close="showApprovalModal = false">
      <div v-if="approvalResult" class="space-y-4">
        <div class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3">
          <CheckCircle2 class="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h4 class="text-sm font-bold text-emerald-950">To'lov muvaffaqiyatli tasdiqlandi!</h4>
            <p class="text-xs text-emerald-700 mt-0.5">
              Talaba <b>{{ approvalResult.studentName }}</b> kursga biriktirildi.
              <span v-if="approvalResult.groupName"> Guruh: <b>{{ approvalResult.groupName }}</b></span>
            </p>
          </div>
        </div>

        <!-- Credentials Card -->
        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Talaba Kirish Ma'lumotlari</span>
            <span v-if="approvalResult.emailSent" class="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
              Emailga xat yuborildi ✓
            </span>
          </div>

          <div class="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Login:</span>
              <span class="font-mono font-bold text-slate-900 select-all">{{ approvalResult.login }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Vaqtinchalik Parol:</span>
              <span class="font-mono font-bold text-indigo-600 text-sm select-all bg-indigo-50 px-2 py-0.5 rounded-md">
                {{ approvalResult.tempPassword || "O'rnatilgan mavjud parol" }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500">Kurs:</span>
              <span class="font-semibold text-slate-800">{{ approvalResult.courseName }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3 pt-2">
          <button
            @click="copyStudentCredentials"
            type="button"
            class="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition cursor-pointer active:scale-95"
          >
            <Copy class="w-4 h-4 text-slate-600" />
            <span>Login & Parolni nusxalash</span>
          </button>

          <button
            @click="showApprovalModal = false"
            type="button"
            class="px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>

    <!-- User Uploaded Payment Screenshot Modal -->
    <Modal :show="showScreenshotModal" title="To'lov Cheki Skrinshoti" @close="closeScreenshotModal">
      <div v-if="screenshotPayment" class="space-y-4">
        <!-- Student & Payment Info Summary -->
        <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span class="text-[10px] text-slate-400 block font-bold uppercase">Talaba:</span>
            <span class="font-bold text-slate-900">
              {{ screenshotPayment.student?.firstName }} {{ screenshotPayment.student?.lastName }}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-bold uppercase">Telefon:</span>
            <span class="font-bold text-slate-900 font-mono">
              {{ screenshotPayment.student?.phone || '—' }}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-bold uppercase">To'lov Turi:</span>
            <span class="font-bold text-indigo-600">
              {{ getPaymentTypeLabel(screenshotPayment.type) }}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-400 block font-bold uppercase">Summa:</span>
            <span class="font-extrabold text-emerald-700 text-sm">
              {{ formatMoney(screenshotPayment.amount) }}
            </span>
          </div>
        </div>

        <div v-if="screenshotPayment.comment" class="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900">
          <span class="font-bold">Izoh:</span> {{ screenshotPayment.comment }}
        </div>

        <!-- The Image Box -->
        <div class="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5 max-h-[420px] flex items-center justify-center p-2">
          <img
            :src="getFullReceiptUrl(screenshotPayment.receiptUrl)"
            alt="To'lov cheki skrinshoti"
            class="max-h-[390px] w-full object-contain rounded-xl shadow-xs"
          />
        </div>

        <!-- Action Links & Buttons -->
        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <a
            :href="getFullReceiptUrl(screenshotPayment.receiptUrl)"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
          >
            <ExternalLink class="w-3.5 h-3.5" />
            <span>Asl o'lchamda ochish</span>
          </a>

          <div class="flex items-center gap-2">
            <button
              v-if="screenshotPayment.status === 'PENDING'"
              @click="closeScreenshotModal(); markAsPaid(screenshotPayment)"
              type="button"
              class="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
            >
              <CheckCircle2 class="w-4 h-4" />
              <span>To'lovni tasdiqlash (Qabul)</span>
            </button>
            <button
              @click="closeScreenshotModal"
              type="button"
              class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Floating Success Toast Notification -->
    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showToastNotification"
        class="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800 text-xs font-bold"
      >
        <CheckCircle2 class="h-4 w-4 text-emerald-400 shrink-0" />
        <span>{{ toastMessage }}</span>
        <button @click="showToastNotification = false" class="ml-2 text-slate-400 hover:text-white cursor-pointer">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </transition>
  </div>
</template>
