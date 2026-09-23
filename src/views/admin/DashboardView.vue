<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { User, Group, Course, Payment } from '../../types';
import Badge from '../../components/ui/Badge.vue';
import Modal from '../../components/ui/Modal.vue';
import {
  Users,
  UserPlus,
  FolderPlus,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  Snowflake,
  Archive,
  ChevronDown,
  Plus,
  Clock,
  TrendingUp,
  CheckCircle2,
  Check,
  BookOpen,
  Send,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  FileText,
  X,
  PieChart,
  Search,
  Eye,
  LogIn,
  Building2,
  Calendar,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const courses = ref<Course[]>([]);
const payments = ref<Payment[]>([]);
const lessons = ref<any[]>([]);
const loading = ref(false);

// Schedule filter and view mode: 'ALL' | 'TODAY' | 'MWF' | 'TTS' | 'DATE'
const scheduleFilter = ref<'ALL' | 'TODAY' | 'MWF' | 'TTS' | 'DATE'>('ALL');
const selectedScheduleDate = ref<string>('');

// Quick Add Payment Modal State
const showAddPaymentModal = ref(false);
const paymentSubmitting = ref(false);
const newPayment = ref({
  studentId: 0,
  amount: 850000,
  type: 'CASH',
  status: 'PAID',
  paidForDate: new Date().toISOString().slice(0, 10),
  comment: '',
});

// Toast notification in Dashboard
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

// Current date variables
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth(); // 0-indexed

// Filter payments for current month
const currentMonthPaymentsList = computed(() => {
  return payments.value.filter((p) => {
    const d = new Date(p.paidForDate);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
});


// Stat Period Selection: 'THIS_MONTH' | 'THIS_YEAR' | 'ALL'
type StatPeriod = 'THIS_MONTH' | 'THIS_YEAR' | 'ALL';
const statPeriod = ref<StatPeriod>('THIS_MONTH');

const statFilteredPayments = computed(() => {
  if (statPeriod.value === 'THIS_MONTH') {
    return payments.value.filter((p) => {
      const d = new Date(p.paidForDate);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }
  if (statPeriod.value === 'THIS_YEAR') {
    return payments.value.filter((p) => {
      const d = new Date(p.paidForDate);
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    });
  }
  return payments.value;
});

const statRevenue = computed(() => {
  return statFilteredPayments.value
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + Number(p.amount), 0);
});

const statPending = computed(() => {
  return statFilteredPayments.value
    .filter((p) => p.status === 'PENDING')
    .reduce((s, p) => s + Number(p.amount), 0);
});

const statPaidCount = computed(() => {
  return statFilteredPayments.value.filter((p) => p.status === 'PAID').length;
});

const statPendingCount = computed(() => {
  return statFilteredPayments.value.filter((p) => p.status === 'PENDING').length;
});

const statDebtorsCount = computed(() => {
  const set = new Set(statFilteredPayments.value.filter((p) => p.status === 'PENDING').map((p) => p.studentId));
  return set.size;
});

// Collapsible Dashboard Sections (3 ta bo'lim ochilib-yopilishi)
const isRecentPaymentsOpen = ref(true);
const isFinancialAnalyticsOpen = ref(true);
const isScheduleOpen = ref(true);

// Recent payments filter: 'ALL' | 'PENDING'
const recentPaymentsFilter = ref<'ALL' | 'PENDING'>('ALL');

// Jami kutilayotgan to'lovlar soni
const pendingPaymentsCount = computed(() => {
  return payments.value.filter((p) => p.status === 'PENDING').length;
});

// So'nggi 5 ta to'lov (tizimdagi oxirgi tranzaksiyalar, xronologik tartibda)
const recentPayments = computed(() => {
  let list = [...payments.value];
  if (recentPaymentsFilter.value === 'PENDING') {
    list = list.filter((p) => p.status === 'PENDING');
  }
  return list
    .sort((a, b) => new Date(b.paidForDate).getTime() - new Date(a.paidForDate).getTime())
    .slice(0, 5);
});

// Filtered lists for current month (September 2026)
const currentMonthPaidList = computed(() => {
  return currentMonthPaymentsList.value.filter((p) => p.status === 'PAID');
});

const currentMonthPendingList = computed(() => {
  return currentMonthPaymentsList.value.filter((p) => p.status === 'PENDING');
});

// Current month paid sum (Strict real data)
const currentMonthPaidSum = computed(() => {
  return currentMonthPaidList.value.reduce((sum, p) => sum + Number(p.amount), 0);
});

// Current month pending sum (Strict real data)
const currentMonthPendingSum = computed(() => {
  return currentMonthPendingList.value.reduce((sum, p) => sum + Number(p.amount), 0);
});

// Current month paid transactions count
const currentMonthPaymentsCount = computed(() => {
  return currentMonthPaidList.value.length;
});

// All time total revenue (paid)
const totalRevenueAll = computed(() => {
  return payments.value
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

// All time total pending debt
const totalPendingAll = computed(() => {
  return payments.value
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

// User Search & 360 Inspector State
const userSearchQuery = ref('');
const userRoleFilter = ref<'ALL' | 'STUDENT' | 'TEACHER'>('ALL');
const showUserInspectModal = ref(false);
const inspectedUser = ref<User | null>(null);

const filteredRecentUsers = computed(() => {
  let list = [...users.value];
  if (userRoleFilter.value !== 'ALL') {
    list = list.filter((u) => u.role === userRoleFilter.value);
  }
  if (userSearchQuery.value.trim()) {
    const q = userSearchQuery.value.toLowerCase().trim();
    list = list.filter((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    });
  }
  return list.slice(0, 8);
});

function openUserInspectModal(u: User) {
  inspectedUser.value = u;
  showUserInspectModal.value = true;
}

// Inspected user related records
const inspectedUserPayments = computed(() => {
  if (!inspectedUser.value) return [];
  return payments.value
    .filter((p) => p.studentId === inspectedUser.value?.id)
    .sort((a, b) => new Date(b.paidForDate).getTime() - new Date(a.paidForDate).getTime());
});

const inspectedUserTotalPaid = computed(() => {
  return inspectedUserPayments.value
    .filter((p) => p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

const inspectedUserTotalPending = computed(() => {
  return inspectedUserPayments.value
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + Number(p.amount), 0);
});

const inspectedUserGroups = computed(() => {
  if (!inspectedUser.value) return [];
  const u = inspectedUser.value as any;
  if (u.role === 'STUDENT' && Array.isArray(u.studentEnrollments)) {
    return u.studentEnrollments.map((e: any) => e.group).filter(Boolean);
  }
  if (u.role === 'TEACHER' && Array.isArray(u.teachingGroups)) {
    return u.teachingGroups.map((tg: any) => tg.group || tg).filter(Boolean);
  }
  if (u.role === 'STUDENT') {
    return groups.value.filter((g: any) =>
      g.students?.some((s: any) => s.studentId === u.id || s.id === u.id)
    );
  }
  if (u.role === 'TEACHER') {
    return groups.value.filter((g: any) =>
      g.teachers?.some((t: any) => t.teacherId === u.id || t.id === u.id) || g.teacherId === u.id
    );
  }
  return [];
});

function handleImpersonate(u: User) {
  authStore.impersonateUser(u);
  showUserInspectModal.value = false;
  showToast(`"${u.firstName} ${u.lastName}" akkauntiga kirdingiz!`);
  if (u.role === 'STUDENT') {
    router.push('/student/dashboard');
  } else if (u.role === 'TEACHER') {
    router.push('/teacher/dashboard');
  } else {
    router.push('/dashboard');
  }
}

// Enriched groups for cards
const enrichedGroups = computed(() => {
  return groups.value.slice(0, 6).map((g) => {
    const studentCount = (g as any).students?.length || 0;
    const maxStudents = g.maxStudents || 16;
    const fillPercent = Math.min(100, Math.round((studentCount / maxStudents) * 100));
    const teacherName = (g as any).teachers?.[0]?.teacher
      ? `${(g as any).teachers[0].teacher.firstName} ${(g as any).teachers[0].teacher.lastName}`
      : 'Tayinlanmagan';

    // Clean room name: removes bulky parenthetical notes (e.g. "Xona #102 (Backend...)" -> "102-xona")
    const rawRoom = g.room?.name || '';
    let cleanRoom = '101-xona';
    if (rawRoom) {
      const stripped = rawRoom.replace(/\(.*?\)/g, '').trim();
      const matchNum = stripped.match(/\d+/);
      if (matchNum) {
        cleanRoom = `${matchNum[0]}-xona`;
      } else {
        cleanRoom = stripped.length > 14 ? stripped.substring(0, 12) + '...' : stripped;
      }
    }

    return {
      ...g,
      studentCount,
      maxStudents,
      fillPercent,
      teacherName,
      cleanRoom,
    };
  });
});

// Metric Cards Calculations (100% REAL from API)
const totalStudents = computed(() => {
  return users.value.filter((u) => u.role === 'STUDENT' && u.status === 'ACTIVE').length;
});

const totalGroups = computed(() => {
  const active = groups.value.filter((g) => g.status === 'ACTIVE').length;
  return active > 0 ? active : groups.value.length;
});

// Real Debtors Count: Unique students who have PENDING payments
const debtorsCount = computed(() => {
  const pendingSet = new Set(
    payments.value.filter((p) => p.status === 'PENDING').map((p) => p.studentId)
  );
  return pendingSet.size;
});

const frozenCount = computed(() => {
  return users.value.filter((u) => u.status === 'FROZEN').length;
});

const archivedCount = computed(() => {
  return users.value.filter((u) => u.status === 'ARCHIVED').length;
});

const activeHoverMethod = ref<string | null>(null);

// Payment method breakdown for Accordion 2 (10/10 Interactive Donut)
const paymentMethodsBreakdown = computed(() => {
  const total = totalRevenueAll.value || 1;
  const methodConfigs = [
    { key: 'PAYME', label: 'Payme', color: 'bg-teal-500', dotColor: 'bg-teal-500', barColor: 'bg-teal-500', barBg: 'bg-teal-50 text-teal-700' },
    { key: 'CLICK', label: 'Click', color: 'bg-indigo-600', dotColor: 'bg-indigo-600', barColor: 'bg-indigo-600', barBg: 'bg-indigo-50 text-indigo-700' },
    { key: 'CASH', label: 'Naqd pul', color: 'bg-emerald-600', dotColor: 'bg-emerald-600', barColor: 'bg-emerald-600', barBg: 'bg-emerald-50 text-emerald-700' },
    { key: 'CARD', label: 'Plastik karta', color: 'bg-blue-600', dotColor: 'bg-blue-600', barColor: 'bg-blue-600', barBg: 'bg-blue-50 text-blue-700' },
    { key: 'UZUM', label: 'Uzum Bank', color: 'bg-purple-600', dotColor: 'bg-purple-600', barColor: 'bg-purple-600', barBg: 'bg-purple-50 text-purple-700' },
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
    .filter((m) => m.sum > 0)
    .sort((a, b) => b.sum - a.sum);
});

// SVG Donut Slices (Expanded radius 78 in viewBox 0 0 200 200, full size)
const donutSlices = computed(() => {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return paymentMethodsBreakdown.value.map((m) => {
    const strokeDasharray = `${Math.max(0, (m.percent / 100) * circumference - 2)} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += m.percent;

    const colorHex =
      m.key === 'PAYME'
        ? '#14b8a6'
        : m.key === 'CLICK'
        ? '#4f46e5'
        : m.key === 'CASH'
        ? '#059669'
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

// Dynamic aggregated chart data based on revenuePeriod ('MONTHLY', 'WEEKLY', 'YEARLY')
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

const paidPaymentsCount = computed(() => {
  return payments.value.filter((p) => p.status === 'PAID').length;
});

// Study Month Calendar & Schedule State (Dynamic Real Schedule)
interface StudyDayChip {
  dateKey: string;
  monthShort: string;
  dayShortUz: string;
  dayNumber: number;
  dayOfWeekKey: string;
  isToday: boolean;
  isWeekend: boolean;
  isSaturday: boolean;
  isSunday: boolean;
  hasLessons: boolean;
  lessonCount: number;
}

const currentNavYear = ref<number>(2026);
const currentNavMonth = ref<number>(8); // 8 = Sentabr (0-indexed)
const selectedDayChip = ref<StudyDayChip | null>(null);

const monthNamesUzFull = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

const currentMonthDisplayName = computed(() => {
  return `${monthNamesUzFull[currentNavMonth.value]} ${currentNavYear.value}`;
});

const isCurrentActualMonth = computed(() => {
  return currentNavYear.value === 2026 && currentNavMonth.value === 8;
});

const studyMonthDays = computed(() => {
  const y = currentNavYear.value;
  const m = currentNavMonth.value;
  const daysCount = new Date(y, m + 1, 0).getDate();
  const days: StudyDayChip[] = [];
  const monthNamesUz = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const weekDayKeys = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const weekDayShortUz = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
  const todayStr = '2026-09-22';

  // Oyning barcha kunlari dinamik aylanib turadi
  for (let d = 1; d <= daysCount; d++) {
    const cur = new Date(y, m, d);
    const dow = cur.getDay(); // 0: Yakshanba, 1: Dushanba, ..., 6: Shanba
    const isSunday = dow === 0;
    const isSaturday = dow === 6;
    const isWeekend = isSunday || isSaturday;

    const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = dateKey === todayStr;

    // Shu kundagi darslar soni
    const matchedDbLessons = lessons.value.filter((l: any) => {
      const lDate = typeof l.lessonDate === 'string' ? l.lessonDate.slice(0, 10) : '';
      return lDate === dateKey;
    }).length;

    const groupMatchCount = groups.value.filter((g: any) => g.weekDays?.includes(weekDayKeys[dow])).length;
    const count = matchedDbLessons > 0 ? matchedDbLessons : groupMatchCount;

    days.push({
      dateKey,
      monthShort: monthNamesUz[m],
      dayShortUz: weekDayShortUz[dow],
      dayNumber: d,
      dayOfWeekKey: weekDayKeys[dow],
      isToday,
      isWeekend,
      isSaturday,
      isSunday,
      hasLessons: count > 0,
      lessonCount: count,
    });
  }
  return days;
});

function syncSelectedDayChip() {
  const todayStr = '2026-09-22';
  const todayChip = studyMonthDays.value.find((d) => d.dateKey === todayStr);
  selectedDayChip.value = todayChip || studyMonthDays.value[0] || null;
}

function prevStudyMonth() {
  if (currentNavMonth.value === 0) {
    currentNavMonth.value = 11;
    currentNavYear.value--;
  } else {
    currentNavMonth.value--;
  }
  syncSelectedDayChip();
}

function nextStudyMonth() {
  if (currentNavMonth.value === 11) {
    currentNavMonth.value = 0;
    currentNavYear.value++;
  } else {
    currentNavMonth.value++;
  }
  syncSelectedDayChip();
}

function goToTodayMonth() {
  currentNavYear.value = 2026;
  currentNavMonth.value = 8;
  syncSelectedDayChip();
}

function getLessonTheme(lesson: any) {
  const name = (lesson.name || '').toLowerCase();
  const course = (lesson.courseName || '').toLowerCase();

  if (name.includes('fe') || course.includes('frontend') || course.includes('vue')) {
    return {
      border: 'border-l-indigo-500 hover:border-indigo-400',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      iconColor: 'text-indigo-500',
      softBg: 'bg-indigo-50/50 border-indigo-100/80 text-indigo-950',
    };
  }
  if (name.includes('be') || course.includes('backend') || course.includes('nest')) {
    return {
      border: 'border-l-emerald-500 hover:border-emerald-400',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      iconColor: 'text-emerald-500',
      softBg: 'bg-emerald-50/50 border-emerald-100/80 text-emerald-950',
    };
  }
  if (name.includes('ielts') || course.includes('ielts') || course.includes('english')) {
    return {
      border: 'border-l-blue-500 hover:border-blue-400',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      iconColor: 'text-blue-500',
      softBg: 'bg-blue-50/50 border-blue-100/80 text-blue-950',
    };
  }
  if (name.includes('ds') || course.includes('python') || course.includes('ai') || course.includes('data')) {
    return {
      border: 'border-l-amber-500 hover:border-amber-400',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      iconColor: 'text-amber-500',
      softBg: 'bg-amber-50/50 border-amber-100/80 text-amber-950',
    };
  }
  // UI/UX & Figma
  return {
    border: 'border-l-rose-500 hover:border-rose-400',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    iconColor: 'text-rose-500',
    softBg: 'bg-rose-50/50 border-rose-100/80 text-rose-950',
  };
}



function selectDayChip(d: StudyDayChip) {
  if (selectedDayChip.value?.dateKey === d.dateKey) {
    selectedDayChip.value = null;
  } else {
    selectedDayChip.value = d;
  }
}

function clearCalendarSelection() {
  selectedDayChip.value = null;
  selectedScheduleDate.value = '';
  scheduleFilter.value = 'ALL';
}

function getDayNameUz(dayKey?: string): string {
  const map: Record<string, string> = {
    MONDAY: 'Dushanba',
    TUESDAY: 'Seshanba',
    WEDNESDAY: 'Chorshanba',
    THURSDAY: 'Payshanba',
    FRIDAY: 'Juma',
    SATURDAY: 'Shanba',
    SUNDAY: 'Yakshanba',
  };
  return dayKey ? map[dayKey] || dayKey : '';
}


function getLessonOrderForGroupAndDay(g: any, dayChip: any): number {
  if (!dayChip) return 1;
  const monthOffset = Math.max(0, (currentNavMonth.value - 8) * 12);
  const groupDays = g.weekDays || ['MONDAY', 'WEDNESDAY', 'FRIDAY'];

  let countInMonth = 0;
  for (const d of studyMonthDays.value) {
    if (groupDays.includes(d.dayOfWeekKey)) {
      countInMonth++;
    }
    if (d.dateKey === dayChip.dateKey) {
      break;
    }
  }
  return monthOffset + Math.max(1, countInMonth);
}

const currentDayLessons = computed(() => {
  const selectedDate = selectedDayChip.value?.dateKey || '2026-09-22';
  const selectedDow = selectedDayChip.value?.dayOfWeekKey || 'TUESDAY';
  const todayStr = '2026-09-22';

  // 1. Agar lessons.value ichida ushbu sanaga darslar mavjud bo'lsa
  const fromDb = lessons.value.filter((l: any) => {
    const lDate = typeof l.lessonDate === 'string' ? l.lessonDate.slice(0, 10) : '';
    return lDate === selectedDate;
  });

  if (fromDb.length > 0) {
    return fromDb.map((l: any) => {
      const g = groups.value.find((grp) => grp.id === l.groupId) || l.group;
      const t = l.teacher || (g?.teachers && g.teachers[0]?.teacher);
      const r = l.room || g?.room;

      return {
        id: l.id,
        groupId: l.groupId,
        name: g?.name || l.group?.name || `Guruh #${l.groupId}`,
        courseName: g?.course?.name || 'Asosiy o\'quv kursi',
        lessonOrder: l.lessonOrder || 1,
        topic: l.topic || `${l.lessonOrder}-dars mavzusi`,
        description: l.description || '',
        startTime: l.startTime || g?.startTime || '14:00',
        endTime: l.endTime || g?.endTime || '16:00',
        teacherName: t ? `${t.firstName} ${t.lastName || ''}`.trim() : 'Rustam Qodirov',
        roomName: r?.name || 'Xona #101',
        isToday: selectedDate === todayStr,
        isPast: new Date(selectedDate) < new Date(todayStr),
      };
    }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  }

  // 2. Agar aynan shu sanada DB darsi topilmasa, shu hafta kunidagi guruhlardan darslarni yasash
  const matchedGroups = groups.value.filter((g: any) => g.weekDays?.includes(selectedDow));
  return matchedGroups.map((g: any) => {
    const t = g.teachers && g.teachers[0]?.teacher;
    const r = g.room;
    const lessonOrder = getLessonOrderForGroupAndDay(g, selectedDayChip.value);

    return {
      id: `grp-${g.id}`,
      groupId: g.id,
      name: g.name,
      courseName: g.course?.name || 'Asosiy o\'quv kursi',
      lessonOrder,
      topic: `${lessonOrder}-dars: ${g.course?.name || g.name} amaliy mashg'uloti`,
      description: 'O\'quv dasturiga muvofiq amaliy laboratoriya darsi',
      startTime: g.startTime || '14:00',
      endTime: g.endTime || '16:00',
      teacherName: t ? `${t.firstName} ${t.lastName || ''}`.trim() : getTeacherNameForGroup(g),
      roomName: r?.name || 'Xona #101',
      isToday: selectedDate === todayStr,
      isPast: new Date(selectedDate) < new Date(todayStr),
    };
  }).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
});

// Auto-select today (2026-09-22) when calendar loads
watch(
  studyMonthDays,
  (days: any[]) => {
    if (days.length > 0 && !selectedDayChip.value) {
      const todayStr = '2026-09-22';
      const todayChip = days.find((d) => d.dateKey === todayStr);
      selectedDayChip.value = todayChip || days[0];
    }
  },
  { immediate: true }
);

function onScheduleLessonClick(lesson: any) {
  const targetGroupId = lesson.groupId || (groups.value[0]?.id ?? 1);
  const dateKey = selectedDayChip.value?.dateKey;
  router.push({
    path: `/dashboard/groups/${targetGroupId}`,
    query: {
      tab: 'LESSONS',
      ...(dateKey ? { date: dateKey } : {}),
      ...(lesson.lessonOrder ? { lessonOrder: String(lesson.lessonOrder) } : {}),
    },
  });
}

function getTeacherNameForGroup(g: any): string {
  if (g.teachers && g.teachers.length > 0 && g.teachers[0]?.teacher) {
    const t = g.teachers[0].teacher;
    return `${t.firstName} ${t.lastName || ''}`.trim();
  }
  if (g.teacherId) {
    const found = users.value.find((u) => u.id === g.teacherId);
    if (found) return `${found.firstName} ${found.lastName || ''}`.trim();
  }
  if (g.name?.includes('BE-105')) return 'Rustam Qodirov';
  if (g.name?.includes('FE-201') || g.name?.includes('IELTS')) return 'Oybek Yusupov';
  const firstTeacher = users.value.find((u) => u.role === 'TEACHER');
  if (firstTeacher) {
    return `${firstTeacher.firstName} ${firstTeacher.lastName || ''}`.trim();
  }
  return 'Oybek Yusupov';
}

function formatGroupDaysLabel(weekDays?: string[]): { text: string; sub: string; isOdd: boolean; isEven: boolean } {
  if (!weekDays || weekDays.length === 0) {
    return { text: 'Du • Chor • Ju', sub: 'Toq kunlar', isOdd: true, isEven: false };
  }
  const isMWF = weekDays.includes('MONDAY') && weekDays.includes('WEDNESDAY') && weekDays.includes('FRIDAY');
  const isTTS = weekDays.includes('TUESDAY') && weekDays.includes('THURSDAY') && weekDays.includes('SATURDAY');
  if (isMWF) {
    return { text: 'Du • Chor • Ju', sub: 'Toq kunlar', isOdd: true, isEven: false };
  }
  if (isTTS) {
    return { text: 'Se • Pay • Shan', sub: 'Juft kunlar', isOdd: false, isEven: true };
  }
  if (weekDays.length >= 6) {
    return { text: 'Du – Shan', sub: 'Har kuni', isOdd: false, isEven: false };
  }
  const shortMap: Record<string, string> = {
    MONDAY: 'Du',
    TUESDAY: 'Se',
    WEDNESDAY: 'Chor',
    THURSDAY: 'Pay',
    FRIDAY: 'Ju',
    SATURDAY: 'Shan',
    SUNDAY: 'Yak',
  };
  return {
    text: weekDays.map((d) => shortMap[d] || d).join(' • '),
    sub: 'Hafta kunlari',
    isOdd: false,
    isEven: false,
  };
}

// Students list for Quick Add Payment modal
const studentUsers = computed(() => users.value.filter((u) => u.role === 'STUDENT'));

// Helpers
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

function openCreatePaymentModal(studentId?: number) {
  newPayment.value.studentId = studentId || (studentUsers.value[0]?.id ?? 0);
  newPayment.value.amount = 850000;
  newPayment.value.type = 'CASH';
  newPayment.value.status = 'PAID';
  newPayment.value.paidForDate = new Date().toISOString().slice(0, 10);
  newPayment.value.comment = '';
  showAddPaymentModal.value = true;
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
    showAddPaymentModal.value = false;
    await loadDashboardData();
    showToast("Yangi to'lov muvaffaqiyatli saqlandi!");
  } catch (err) {
    console.error("To'lovni saqlashda xatolik:", err);
    showToast("To'lovni saqlashda xatolik yuz berdi.");
  } finally {
    paymentSubmitting.value = false;
  }
}

async function updatePendingPaymentStatus(p: Payment, newStatus: string) {
  if (p.status === newStatus) return;
  try {
    await erpService.updatePayment(p.id, { status: newStatus as any });
    await loadDashboardData();
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

async function markPaymentAsPaid(p: Payment) {
  try {
    await erpService.updatePayment(p.id, { status: 'PAID' });
    await loadDashboardData();
    showToast("To'lov muvaffaqiyatli qabul qilindi!");
  } catch (err) {
    console.error('Holat yangilanmadi:', err);
    showToast("To'lovni tasdiqlashda xatolik yuz berdi.");
  }
}

async function loadDashboardData() {
  loading.value = true;
  try {
    const [usersRes, groupsRes, coursesRes, paymentsRes, lessonsRes] = await Promise.allSettled([
      erpService.getUsers({ limit: 100 }),
      erpService.getGroups(),
      erpService.getCourses(),
      erpService.getPayments(),
      erpService.getLessons(),
    ]);

    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      if (Array.isArray(val)) {
        users.value = val;
      } else if (val && Array.isArray((val as any).data)) {
        users.value = (val as any).data;
      }
    }

    if (groupsRes.status === 'fulfilled' && groupsRes.value) {
      const val = groupsRes.value;
      if (Array.isArray(val)) {
        groups.value = val;
      } else if (val && Array.isArray((val as any).data)) {
        groups.value = (val as any).data;
      }
    }

    if (coursesRes.status === 'fulfilled' && coursesRes.value) {
      const val = coursesRes.value;
      if (Array.isArray(val)) {
        courses.value = val;
      } else if (val && Array.isArray((val as any).data)) {
        courses.value = (val as any).data;
      }
    }

    if (paymentsRes.status === 'fulfilled' && paymentsRes.value) {
      const val = paymentsRes.value;
      if (val && Array.isArray(val.data)) {
        payments.value = val.data;
      } else if (Array.isArray(val)) {
        payments.value = val;
      }
    }

    if (lessonsRes.status === 'fulfilled' && lessonsRes.value) {
      const val = lessonsRes.value;
      if (Array.isArray(val)) {
        lessons.value = val;
      } else if (val && Array.isArray((val as any).data)) {
        lessons.value = (val as any).data;
      }
    }
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
  } finally {
    loading.value = false;
  }
}

// Quick Add Dropdown State in Asosiy
const showQuickAddMenu = ref(false);

// Payment Status Dropdown State
const paymentStatusDropdownId = ref<number | null>(null);

function togglePaymentStatusDropdown(id: number) {
  paymentStatusDropdownId.value = paymentStatusDropdownId.value === id ? null : id;
}

function selectPaymentStatus(p: any, status: string) {
  paymentStatusDropdownId.value = null;
  updatePendingPaymentStatus(p, status);
}

function onDocClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.quick-add-dropdown')) {
    showQuickAddMenu.value = false;
  }
  if (!target.closest('.payment-status-dropdown')) {
    paymentStatusDropdownId.value = null;
  }
}

onMounted(() => {
  loadDashboardData();
  document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Welcome Greeting -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          Salom, {{ authStore.user?.firstName ? `${authStore.user.firstName} ${authStore.user.lastName || ''}` : 'Abduxoshim Sultonqulov' }}!
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">NyVer Academy platformasiga xush kelibsiz!</p>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- "+ Qo'shish" Quick Actions Dropdown -->
        <div class="relative quick-add-dropdown">
          <button
            @click.stop="showQuickAddMenu = !showQuickAddMenu"
            type="button"
            id="quick-add-btn"
            class="h-11 px-4.5 rounded-2xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
          >
            <Plus class="h-4.5 w-4.5" />
            <span>Qo'shish</span>
            <ChevronDown class="h-3.5 w-3.5 opacity-80 transition-transform duration-200" :class="{ 'rotate-180': showQuickAddMenu }" />
          </button>

          <!-- Quick Actions Popover Menu -->
          <div
            v-if="showQuickAddMenu"
            class="absolute right-0 sm:left-0 sm:right-auto mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left"
          >
            <div class="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
              Tezkor amallar
            </div>

            <button
              @click="router.push('/dashboard/students?action=create'); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <UserPlus class="h-4.5 w-4.5 text-[#6D28D9]" />
              <span>Talaba qo'shish</span>
            </button>

            <button
              @click="router.push('/dashboard/groups?action=create'); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <FolderPlus class="h-4.5 w-4.5 text-[#6D28D9]" />
              <span>Guruh ochish</span>
            </button>

            <button
              @click="router.push('/dashboard/teachers?action=create'); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <UserCheck class="h-4.5 w-4.5 text-emerald-600" />
              <span>O'qituvchi qo'shish</span>
            </button>

            <button
              @click="openCreatePaymentModal(); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <CreditCard class="h-4.5 w-4.5 text-emerald-600" />
              <span>To'lov qabul qilish</span>
            </button>

            <button
              @click="router.push('/management/course'); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <BookOpen class="h-4.5 w-4.5 text-amber-600" />
              <span>Kurs yaratish</span>
            </button>

            <button
              @click="router.push('/management/broadcast'); showQuickAddMenu = false;"
              class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition cursor-pointer"
            >
              <Send class="h-4.5 w-4.5 text-blue-600" />
              <span>SMS / Xabar yuborish</span>
            </button>
          </div>
        </div>

        <button
          @click="openCreatePaymentModal()"
          class="h-11 inline-flex items-center gap-2 px-4 rounded-2xl bg-white border border-slate-200/60 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold text-sm transition-all shadow-sm cursor-pointer"
        >
          <CreditCard class="h-4.5 w-4.5 text-slate-500" />
          <span class="hidden sm:inline">To'lov Qabul Qilish</span>
          <span class="sm:hidden">To'lov</span>
        </button>
      </div>
    </div>

    <!-- Metric Cards Header & Period Toggle -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Asosiy ko'rsatkichlar</h2>
      </div>
      <div class="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium self-start sm:self-auto">
        <button
          @click="statPeriod = 'THIS_MONTH'"
          type="button"
          class="px-3 py-1 rounded-lg transition-all cursor-pointer"
          :class="statPeriod === 'THIS_MONTH' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          Bu oy
        </button>
        <button
          @click="statPeriod = 'THIS_YEAR'"
          type="button"
          class="px-3 py-1 rounded-lg transition-all cursor-pointer"
          :class="statPeriod === 'THIS_YEAR' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          2026-yil
        </button>
        <button
          @click="statPeriod = 'ALL'"
          type="button"
          class="px-3 py-1 rounded-lg transition-all cursor-pointer"
          :class="statPeriod === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
        >
          Barchasi
        </button>
      </div>
    </div>

    <!-- 6 Metric Cards (Clean & Minimalist - 2-Rasm Uslubida) -->
    <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
      <!-- 1. Faol talabalar -->
      <div
        @click="router.push('/dashboard/students')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <GraduationCap class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Faol talabalar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ totalStudents }}</div>
      </div>

      <!-- 2. Guruhlar -->
      <div
        @click="router.push('/dashboard/groups')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <Users class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Guruhlar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ totalGroups }}</div>
      </div>

      <!-- 3. Joriy oy to'lovlar -->
      <div
        @click="router.push('/dashboard/payments')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
        :title="`Tushum: ${formatMoney(statRevenue)}`"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <CreditCard class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Joriy oy to'lovlar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ statPaidCount }}</div>
      </div>

      <!-- 4. Qarzdorlar -->
      <div
        @click="router.push('/dashboard/payments?status=PENDING')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
        :title="`Kutilayotgan qarzdorlik: ${formatMoney(statPending)} (${statPendingCount} ta to'lov)`"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Qarzdorlar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ statDebtorsCount }}</div>
      </div>

      <!-- 5. Muzlatilganlar -->
      <div
        @click="router.push('/dashboard/students?status=FROZEN')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <Snowflake class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Muzlatilganlar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ frozenCount }}</div>
      </div>

      <!-- 6. Arxivdagilar -->
      <div
        @click="router.push('/dashboard/students?status=ARCHIVED')"
        class="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/70 hover:border-violet-300 hover:shadow-xs transition-all cursor-pointer flex flex-col items-center justify-center text-center group shadow-2xs"
      >
        <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
          <Archive class="h-5 w-5" />
        </div>
        <span class="text-xs font-medium text-slate-500">Arxivdagilar</span>
        <div class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1.5">{{ archivedCount }}</div>
      </div>
    </div>

    <!-- Enterprise Cards: Always-Open Data Sections -->
    <div class="space-y-6">

      <!-- ===== CARD 1: So'nggi To'lovlar ===== -->
      <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <!-- Card Header with Collapse Toggle -->
        <div
          @click="isRecentPaymentsOpen = !isRecentPaymentsOpen"
          class="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard class="h-4 w-4" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-slate-900 leading-none">Joriy oy uchun to'lovlar</h2>
                <span class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Oxirgi {{ recentPayments.length }} ta
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Monitoring va kutilayotgan to'lovlarni tasdiqlash</p>
            </div>
          </div>

          <div class="flex items-center gap-2.5">
            <!-- Filter Chips: Barchasi | Kutilmoqda -->
            <div @click.stop class="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
              <button
                @click="recentPaymentsFilter = 'ALL'"
                type="button"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer"
                :class="recentPaymentsFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Barchasi ({{ payments.length }})
              </button>
              <button
                @click="recentPaymentsFilter = 'PENDING'"
                type="button"
                class="px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                :class="recentPaymentsFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-amber-700'"
              >
                <span>Kutilmoqda</span>
                <span
                  v-if="pendingPaymentsCount > 0"
                  class="h-4 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center"
                  :class="recentPaymentsFilter === 'PENDING' ? 'bg-amber-100 text-amber-900' : 'bg-amber-100 text-amber-800'"
                >
                  {{ pendingPaymentsCount }}
                </span>
              </button>
            </div>

            <router-link
              @click.stop
              to="/dashboard/payments"
              class="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition px-2.5 py-1.5 rounded-lg hover:bg-indigo-50"
            >
              <span>Barcha to'lovlar</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </router-link>

            <!-- Collapsible Chevron Button -->
            <button
              @click.stop="isRecentPaymentsOpen = !isRecentPaymentsOpen"
              type="button"
              class="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Bo'limni ochish / yopish"
            >
              <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="{ '-rotate-90': !isRecentPaymentsOpen }" />
            </button>
          </div>
        </div>

        <!-- Collapsible Content -->
        <div v-show="isRecentPaymentsOpen">
          <!-- Flat Minimalist Table -->
          <div v-if="recentPayments.length === 0" class="py-12 text-center text-xs text-slate-400">
            Hozircha to'lovlar mavjud emas.
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-slate-100 bg-slate-50/50">
                  <th class="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Talaba</th>
                  <th class="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Summa</th>
                  <th class="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tur</th>
                  <th class="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sana</th>
                  <th class="py-2.5 px-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-right">Holat & Amal</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="(p, pIndex) in recentPayments"
                  :key="p.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-2.5">
                      <div class="h-7 w-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {{ p.student?.firstName?.charAt(0) || 'T' }}
                      </div>
                      <div>
                        <span class="text-xs sm:text-sm font-semibold text-slate-900 block leading-tight">
                          {{ p.student?.firstName }} {{ p.student?.lastName }}
                        </span>
                        <span class="text-[11px] text-slate-400 font-mono">{{ p.student?.phone || '—' }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-3 px-4">
                    <span class="text-sm font-bold text-slate-900">{{ formatMoney(p.amount) }}</span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                      {{ p.type === 'CASH' ? 'Naqd' : p.type === 'CARD' ? 'Karta' : p.type }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <span class="text-xs text-slate-400 font-mono">{{ formatDate(p.paidForDate) }}</span>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- 1. Tasdiqlangan (PAID): Faqat To'lovlar sahifasida boshqariladi, dashboardda statik xavfsiz badge -->
                      <span
                        v-if="p.status === 'PAID'"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                        title="Tasdiqlangan to'lov (faqat To'lovlar sahifasida o'zgartiriladi)"
                      >
                        <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600" />
                        <span>To'langan</span>
                      </span>

                      <!-- 2. Tasdiqlanmagan (PENDING yoki REFUNDED): Dashboardda statusini o'zgartirish mumkin va tezkor tasdiqlash tugmasi -->
                      <div v-else class="flex items-center gap-2">
                        <!-- Custom Modern Status Dropdown (No ugly yellow native select) -->
                        <div class="relative payment-status-dropdown">
                          <button
                            type="button"
                            @click.stop="togglePaymentStatusDropdown(p.id)"
                            class="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer select-none active:scale-95"
                            title="To'lov holatini o'zgartirish"
                          >
                            <span
                              class="w-2 h-2 rounded-full ring-2"
                              :class="p.status === 'PENDING' ? 'bg-amber-500 ring-amber-100' : 'bg-rose-500 ring-rose-100'"
                            ></span>
                            <span class="text-[11px] font-semibold">{{ p.status === 'PENDING' ? 'Kutilmoqda' : 'Qaytarilgan' }}</span>
                            <ChevronDown
                              class="h-3 w-3 text-slate-400 transition-transform duration-200"
                              :class="{ 'rotate-180': paymentStatusDropdownId === p.id }"
                            />
                          </button>

                          <!-- Dropdown Menu -->
                          <div
                            v-if="paymentStatusDropdownId === p.id"
                            class="absolute right-0 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1 z-50 text-left transition-all"
                            :class="pIndex >= 3 ? 'bottom-full mb-1.5' : 'top-full mt-1.5'"
                          >
                            <div class="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              Holatni tanlang
                            </div>

                            <button
                              type="button"
                              @click.stop="selectPaymentStatus(p, 'PENDING')"
                              class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition cursor-pointer hover:bg-slate-50"
                              :class="p.status === 'PENDING' ? 'text-amber-800 font-bold bg-amber-50/60' : 'text-slate-700'"
                            >
                              <span class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                                <span>Kutilmoqda</span>
                              </span>
                              <Check v-if="p.status === 'PENDING'" class="h-3.5 w-3.5 text-amber-600" />
                            </button>

                            <button
                              type="button"
                              @click.stop="selectPaymentStatus(p, 'PAID')"
                              class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition cursor-pointer hover:bg-slate-50 text-slate-700"
                            >
                              <span class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span>To'langan (Tasdiqlash)</span>
                              </span>
                            </button>

                            <button
                              type="button"
                              @click.stop="selectPaymentStatus(p, 'REFUNDED')"
                              class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition cursor-pointer hover:bg-slate-50"
                              :class="p.status === 'REFUNDED' ? 'text-rose-800 font-bold bg-rose-50/60' : 'text-slate-700'"
                            >
                              <span class="flex items-center gap-2">
                                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                                <span>Qaytarilgan</span>
                              </span>
                              <Check v-if="p.status === 'REFUNDED'" class="h-3.5 w-3.5 text-rose-600" />
                            </button>
                          </div>
                        </div>

                        <!-- Quick confirm button -->
                        <button
                          v-if="p.status === 'PENDING'"
                          @click.stop="markPaymentAsPaid(p)"
                          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                          title="To'lovni tezkor tasdiqlash"
                        >
                          <CheckCircle2 class="h-3 w-3" />
                          <span>Tasdiqlash</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer link -->
          <div class="px-5 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Ko'rsatilmoqda: {{ recentPayments.length }} ta to'lov</span>
            <router-link
              to="/dashboard/payments"
              class="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
            >
              <span>Barcha to'lovlarni ko'rish ({{ payments.length }})</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </router-link>
          </div>
        </div>
      </div>


      <!-- ===== CARD 2: Yillik Foyda & Moliya ===== -->
      <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <!-- Card Header with Collapse Toggle -->
        <div
          @click="isFinancialAnalyticsOpen = !isFinancialAnalyticsOpen"
          class="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
        >
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp class="h-4 w-4" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-slate-900 leading-none">Yillik Foyda</h2>
              <p class="text-[11px] text-slate-400 mt-0.5">Tushum dinamikasi va to'lov usullari taqsimoti</p>
            </div>
          </div>
          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Jami: {{ formatMoney(totalRevenueAll) }}
            </span>
            <router-link
              @click.stop
              to="/dashboard/payments"
              class="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition px-2 py-1 rounded-lg hover:bg-slate-50"
            >
              <span>Batafsil</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </router-link>

            <!-- Collapsible Chevron Button -->
            <button
              @click.stop="isFinancialAnalyticsOpen = !isFinancialAnalyticsOpen"
              type="button"
              class="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              title="Bo'limni ochish / yopish"
            >
              <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="{ '-rotate-90': !isFinancialAnalyticsOpen }" />
            </button>
          </div>
        </div>

        <!-- Body: Collapsible Surface -->
        <div v-show="isFinancialAnalyticsOpen" class="p-5 space-y-4">
          <!-- 1. Integrated 3-Stat Metric Strip -->
          <div class="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/70 rounded-xl p-3 border border-slate-200/60">
            <div class="px-3 py-1">
              <span class="text-[11px] font-medium text-slate-400 block">Jami Yillik Tushum</span>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-base sm:text-lg font-bold text-slate-900">{{ formatMoney(totalRevenueAll) }}</span>
                <span class="text-[11px] font-semibold text-emerald-600">({{ paidPaymentsCount }} ta to'lov)</span>
              </div>
            </div>
            <div class="px-3 py-1">
              <span class="text-[11px] font-medium text-slate-400 block">Joriy Oy (Sentabr)</span>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-base sm:text-lg font-bold text-slate-900">{{ formatMoney(currentMonthPaidSum) }}</span>
                <span class="text-[11px] font-medium text-amber-600">({{ currentMonthPaymentsCount }} ta • {{ formatMoney(currentMonthPendingSum) }} kutilmoqda)</span>
              </div>
            </div>
            <div class="px-3 py-1">
              <span class="text-[11px] font-medium text-slate-400 block">Kutilayotgan Qarzlar</span>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-base sm:text-lg font-bold text-amber-600">{{ formatMoney(totalPendingAll) }}</span>
                <span class="text-[11px] font-medium text-amber-700">({{ debtorsCount }} ta qarzdor)</span>
              </div>
            </div>
          </div>

          <!-- 2. Two Column Charts: To'lov Turlari + Tushum Dinamikasi -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <!-- Left: TO'LOV TURLARI TAQSIMOTI (5 cols - full size diagram & balanced rows) -->
            <div class="lg:col-span-5 flex flex-col justify-between rounded-xl border border-slate-200/70 p-4 sm:p-5 bg-white shadow-2xs">
              <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div class="flex items-center gap-2">
                  <div class="h-6 w-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <PieChart class="h-3.5 w-3.5" />
                  </div>
                  <h3 class="text-xs font-semibold text-slate-800 uppercase tracking-wider">To'lov Turlari</h3>
                </div>
                <span class="text-[11px] font-normal text-slate-400">{{ paymentMethodsBreakdown.length }} ta usul</span>
              </div>

              <!-- Content: fills height smoothly, balanced space -->
              <div class="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6 py-2 sm:py-3">
                <!-- Donut Chart and Money Box (Enlarged and money beneath diagram) -->
                <div class="flex flex-col items-center justify-center shrink-0">
                  <div class="relative w-60 h-60 sm:w-64 sm:h-64 xl:w-72 xl:h-72 flex items-center justify-center">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="78" fill="transparent" stroke="#f1f5f9" stroke-width="16" />
                      <circle
                        v-for="slice in donutSlices"
                        :key="slice.key"
                        cx="100"
                        cy="100"
                        r="78"
                        fill="transparent"
                        :stroke="slice.colorHex"
                        stroke-width="16"
                        :stroke-dasharray="slice.strokeDasharray"
                        :stroke-dashoffset="slice.strokeDashoffset"
                        stroke-linecap="round"
                        class="transition-all duration-300 ease-out cursor-pointer hover:opacity-85"
                        :class="{ 'stroke-[20px]': activeHoverMethod === slice.key }"
                        @mouseenter="activeHoverMethod = slice.key"
                        @mouseleave="activeHoverMethod = null"
                      />
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
                      <span class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {{ activeHoverMethod ? paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.label : 'Jami Ulush' }}
                      </span>
                      <div class="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight leading-none my-1 font-mono">
                        {{ activeHoverMethod ? (paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.percent || 0) + '%' : '100%' }}
                      </div>
                      <span class="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70 shadow-2xs">
                        {{ activeHoverMethod ? (paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.count || 0) + ' ta to\'lov' : paidPaymentsCount + ' ta to\'lov' }}
                      </span>
                    </div>
                  </div>

                  <!-- Summa diagramdan pastda (aniq, qulay va sig'adi) -->
                  <div class="mt-2.5 w-full max-w-[230px] text-center bg-slate-50/90 border border-slate-200/80 rounded-xl py-2 px-3 shadow-2xs">
                    <div class="text-[10px] uppercase font-semibold text-slate-500 tracking-wider truncate">
                      {{ activeHoverMethod ? (paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.label + ' summasi') : 'Jami Tushum Summasi' }}
                    </div>
                    <div class="text-sm sm:text-base font-extrabold text-slate-900 font-mono tracking-tight mt-0.5">
                      {{ formatMoney(activeHoverMethod ? (paymentMethodsBreakdown.find(m => m.key === activeHoverMethod)?.sum || 0) : totalRevenueAll) }}
                    </div>
                  </div>
                </div>

                <!-- Right: Payment Rows (Comfortable padding filling height, softer weights) -->
                <div class="flex-1 w-full min-w-0 flex flex-col justify-center gap-2.5">
                  <div
                    v-for="m in paymentMethodsBreakdown"
                    :key="m.key"
                    @mouseenter="activeHoverMethod = m.key"
                    @mouseleave="activeHoverMethod = null"
                    class="flex items-center justify-between gap-3 py-2.5 sm:py-3 px-3.5 rounded-xl transition text-xs cursor-pointer border"
                    :class="activeHoverMethod === m.key ? 'bg-indigo-50/80 text-indigo-900 border-indigo-200 shadow-2xs' : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-100/90'"
                  >
                    <div class="flex items-center gap-2.5 min-w-0">
                      <span class="h-2.5 w-2.5 rounded-full shrink-0 shadow-2xs" :class="m.dotColor"></span>
                      <span class="font-medium text-slate-700 text-xs sm:text-[13px] truncate">{{ m.label }}</span>
                      <span class="text-[10px] text-slate-400 font-mono">({{ m.count }})</span>
                    </div>
                    <div class="flex items-center gap-2.5 shrink-0">
                      <span class="font-semibold text-slate-800 text-xs sm:text-[13px] font-mono">{{ formatMoney(m.sum) }}</span>
                      <span class="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200/70 shadow-2xs">{{ m.percent }}%</span>
                    </div>
                  </div>
                  <div v-if="paymentMethodsBreakdown.length === 0" class="py-4 text-center text-xs text-slate-400">
                    To'lov mavjud emas
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: TUSHUM DINAMIKASI (7 cols - taller height & year filter on left) -->
            <div class="lg:col-span-7 flex flex-col justify-between rounded-xl border border-slate-200/70 p-4 bg-white shadow-2xs space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div>
                  <h3 class="text-xs font-bold text-slate-900 uppercase tracking-wider">Tushum Dinamikasi</h3>
                  <p class="text-[10px] text-slate-400">Jami tasdiqlangan: {{ formatMoney(activePeriodTotalSum) }}</p>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                  <!-- Yil tanlash filtri CHAP TOMONDA chiqadi (o'ng tomonga surilib ketmaydi) -->
                  <select
                    v-if="revenuePeriod === 'MONTHLY'"
                    v-model="chartYear"
                    class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer shadow-2xs hover:border-slate-300 transition"
                  >
                    <option v-for="y in availableChartYears" :key="y" :value="y">{{ y }}-yil</option>
                  </select>

                  <div class="inline-flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
                    <button
                      @click="revenuePeriod = 'MONTHLY'"
                      type="button"
                      class="px-2.5 py-1 rounded-md transition cursor-pointer"
                      :class="revenuePeriod === 'MONTHLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                    >
                      12 Oylik
                    </button>
                    <button
                      @click="revenuePeriod = 'WEEKLY'"
                      type="button"
                      class="px-2.5 py-1 rounded-md transition cursor-pointer"
                      :class="revenuePeriod === 'WEEKLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                    >
                      Haftalik
                    </button>
                    <button
                      @click="revenuePeriod = 'YEARLY'"
                      type="button"
                      class="px-2.5 py-1 rounded-md transition cursor-pointer"
                      :class="revenuePeriod === 'YEARLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
                    >
                      Yillik
                    </button>
                  </div>
                </div>
              </div>

              <!-- Taller Proportional Bar Chart with crisp badges & tracks (h-56 sm:h-64) -->
              <div class="h-56 sm:h-64 flex items-end justify-between gap-1.5 sm:gap-2 px-1 pt-4 pb-1 relative">
                <!-- Subtle scale reference guide lines -->
                <div class="absolute inset-x-2 top-10 border-b border-dashed border-slate-100 pointer-events-none"></div>
                <div class="absolute inset-x-2 top-28 border-b border-dashed border-slate-100 pointer-events-none"></div>
                <div class="absolute inset-x-1 bottom-7 border-b border-slate-200 pointer-events-none"></div>

                <div
                  v-for="item in activePeriodChartData"
                  :key="item.key"
                  class="flex-1 flex flex-col items-center h-full justify-end group/bar relative z-10 cursor-pointer"
                >
                  <!-- Tooltip on hover when sum > 0 -->
                  <div
                    v-if="item.sum > 0"
                    class="opacity-0 group-hover/bar:opacity-100 transition-all duration-200 absolute bottom-full mb-2 bg-slate-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-lg pointer-events-none whitespace-nowrap z-30"
                  >
                    {{ item.label }}: {{ formatMoney(item.sum) }} <span v-if="item.count > 0">• {{ item.count }} ta</span>
                  </div>

                  <!-- Amount label on top (Aniq va ravshan ko'rinadi) -->
                  <div class="h-6 flex items-center justify-center mb-1 z-20">
                    <span
                      v-if="item.sum > 0"
                      class="inline-block text-[11px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded-md border border-slate-200/90 shadow-2xs group-hover/bar:border-indigo-400 group-hover/bar:text-indigo-600 transition whitespace-nowrap"
                    >
                      {{ item.sum >= 1000000 ? (item.sum / 1000000).toFixed(1) + 'M' : Math.round(item.sum / 1000) + 'k' }}
                    </span>
                  </div>

                  <!-- Bar element with soft background track -->
                  <div class="w-full max-w-8 sm:max-w-9 h-38 sm:h-44 flex flex-col justify-end items-center bg-slate-100/60 rounded-t-lg group-hover/bar:bg-slate-100/90 transition-colors relative overflow-hidden">
                    <div
                      v-if="item.sum > 0"
                      class="w-full rounded-t-lg bg-linear-to-t from-indigo-600 via-indigo-600 to-violet-500 hover:from-indigo-700 hover:to-violet-600 transition-all shadow-xs"
                      :style="{ height: `${Math.max(16, Math.round((item.sum / maxPeriodSum) * 100))}%` }"
                    ></div>
                    <div v-else class="w-2.5 h-1 bg-slate-200/90 rounded-full mb-1"></div>
                  </div>

                  <!-- Month label -->
                  <div class="mt-2 text-center">
                    <span
                      class="text-[11px] font-medium transition"
                      :class="
                        item.label === 'Sen'
                          ? 'text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/80 shadow-2xs'
                          : item.sum > 0
                          ? 'text-slate-700 font-medium'
                          : 'text-slate-400'
                      "
                    >
                      {{ item.label }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Clean footer -->
              <div v-if="bestPeriodItem" class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Eng yuqori: <strong class="text-slate-700 font-semibold">{{ bestPeriodItem.label }} ({{ formatMoney(bestPeriodItem.sum) }})</strong></span>
                <span>Real-vaqtda yangilanadi</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== CARD 3: Dars Jadvali (Reference Style: Top Lessons + Study Month Calendar Chips) ===== -->
      <div class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
        <!-- Card Header -->
        <div
          @click="isScheduleOpen = !isScheduleOpen"
          class="px-6 sm:px-8 pt-6 pb-4 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50/40 transition-colors"
        >
          <div class="flex items-center gap-3">
            <h2 class="text-base sm:text-lg font-bold text-slate-900 leading-none">Dars jadvali</h2>
            <span v-if="selectedDayChip" class="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              {{ selectedDayChip.monthShort }} {{ selectedDayChip.dayNumber }} kuni
            </span>
          </div>

          <button
            @click.stop="isScheduleOpen = !isScheduleOpen"
            type="button"
            class="p-1 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
            title="Bo'limni ochish / yopish"
          >
            <ChevronDown class="h-4 w-4 transition-transform duration-200" :class="{ '-rotate-90': !isScheduleOpen }" />
          </button>
        </div>

        <!-- Collapsible Content -->
        <div v-show="isScheduleOpen" class="px-6 sm:px-8 pb-8 pt-1 space-y-6">
          <!-- 1. YUQORIDA: Kalendar va O'quv oyi (Study Month & Day Chips at TOP) -->
          <div class="space-y-4">
            <!-- Navigation Header -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <button
                  @click="prevStudyMonth"
                  type="button"
                  class="w-7 h-7 rounded-full border border-slate-200 hover:border-slate-300 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer active:scale-95"
                  title="Oldingi oy"
                >
                  <ChevronLeft class="h-3.5 w-3.5" />
                </button>

                <span class="text-sm sm:text-base font-bold text-slate-900 select-none flex items-center gap-2">
                  <span>{{ currentMonthDisplayName }}</span>
                  <span v-if="isCurrentActualMonth" class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Joriy oy
                  </span>
                </span>

                <button
                  @click="nextStudyMonth"
                  type="button"
                  class="w-7 h-7 rounded-full border border-slate-200 hover:border-slate-300 bg-white flex items-center justify-center text-slate-500 hover:text-slate-800 transition shadow-2xs cursor-pointer active:scale-95"
                  title="Keyingi oy"
                >
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>

                <button
                  v-if="!isCurrentActualMonth"
                  @click="goToTodayMonth"
                  type="button"
                  class="text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-0.5 rounded-lg transition cursor-pointer"
                  title="Joriy oy va bugungi kunga qaytish"
                >
                  Bugunga qaytish
                </button>
              </div>

              <!-- Quick action to show all or view active date -->
              <div class="flex items-center gap-2">
                <button
                  v-if="selectedDayChip"
                  @click="clearCalendarSelection"
                  type="button"
                  class="text-xs text-slate-500 hover:text-blue-600 font-medium px-2.5 py-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  Barcha darslarni ko'rish
                </button>
              </div>
            </div>

            <!-- Calendar Day Chips (Dynamic September - October with red weekends) -->
            <div class="flex flex-wrap gap-2 sm:gap-2.5 items-center pb-4 border-b border-slate-100">
              <button
                v-for="d in studyMonthDays"
                :key="d.dateKey"
                @click="selectDayChip(d)"
                type="button"
                class="w-11 sm:w-12 h-14 sm:h-15 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer select-none text-center relative group/chip"
                :class="[
                  selectedDayChip?.dateKey === d.dateKey
                    ? d.isWeekend
                      ? 'bg-rose-600 text-white font-bold shadow-md scale-105 ring-2 ring-rose-400'
                      : 'bg-blue-600 text-white font-bold shadow-md scale-105 ring-2 ring-blue-400'
                    : d.isToday
                    ? 'bg-indigo-50 text-indigo-700 ring-2 ring-indigo-400 font-bold'
                    : d.isWeekend
                    ? 'bg-rose-50/90 hover:bg-rose-100 text-rose-600 border border-rose-200/90 font-bold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                ]"
                :title="`${d.dayShortUz}, ${d.dayNumber}-${d.monthShort}${d.isWeekend ? ' (Dam olish kuni — Shanba/Yakshanba)' : ''}${d.isToday ? ' (Bugun)' : ''}`"
              >
                <!-- Hafta kuni (Shan/Yak aniq qizil tursin) -->
                <span
                  class="text-[10px] font-bold leading-tight mb-0.5 tracking-tight uppercase"
                  :class="
                    selectedDayChip?.dateKey === d.dateKey
                      ? 'text-white/95'
                      : d.isToday
                      ? 'text-indigo-600 font-bold'
                      : d.isWeekend
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-400'
                  "
                >
                  {{ d.dayShortUz }}
                </span>
                <!-- Sana raqami -->
                <span
                  class="text-sm sm:text-base font-extrabold leading-tight"
                  :class="
                    selectedDayChip?.dateKey === d.dateKey
                      ? 'text-white'
                      : d.isToday
                      ? 'text-indigo-950 font-black'
                      : d.isWeekend
                      ? 'text-rose-700 font-black'
                      : 'text-slate-800'
                  "
                >
                  {{ d.dayNumber }}
                </span>
                <!-- Lesson count dot indicator -->
                <span
                  v-if="d.lessonCount > 0"
                  class="w-1.5 h-1.5 rounded-full mt-1 transition-transform group-hover/chip:scale-125"
                  :class="
                    selectedDayChip?.dateKey === d.dateKey
                      ? 'bg-white'
                      : d.isWeekend
                      ? 'bg-rose-500 ring-1 ring-white'
                      : d.isToday
                      ? 'bg-indigo-500'
                      : 'bg-blue-500'
                  "
                ></span>
              </button>
            </div>
          </div>

          <!-- 2. PASTIDA: Shu kundagi darslar (Kreativ, rangli aksentli dars kartalari) -->
          <div class="space-y-4">
            <!-- Sub-bar showing selected day header and count -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <h3 class="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>{{
                    selectedDayChip
                      ? `${selectedDayChip.dayNumber}-${selectedDayChip.monthShort} (${selectedDayChip.dayShortUz})${selectedDayChip.dateKey === '2026-09-22' ? ' — Bugungi darslar' : ' darslari'}`
                      : 'Barcha rejalashtirilgan darslar'
                  }}</span>
                </h3>
                <span
                  class="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                  :class="selectedDayChip?.isWeekend ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-100'"
                >
                  {{ currentDayLessons.length }} ta dars
                </span>
              </div>

              <span v-if="selectedDayChip" class="text-xs font-medium" :class="selectedDayChip.isWeekend ? 'text-rose-500 font-semibold' : 'text-slate-400'">
                Kun: <strong :class="selectedDayChip.isWeekend ? 'text-rose-700' : 'text-slate-700'">{{ getDayNameUz(selectedDayChip.dayOfWeekKey) }}</strong>
                <span v-if="selectedDayChip.isWeekend" class="ml-1.5 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Dam olish kuni</span>
              </span>
            </div>

            <!-- Lessons Grid: 3 ta ustun, 3 tadan ko'p bo'lsa avtomatik keyingi qatorga o'tadi -->
            <div v-if="currentDayLessons.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="lesson in currentDayLessons"
                :key="lesson.id"
                @click="onScheduleLessonClick(lesson)"
                class="relative bg-white rounded-2xl border border-slate-200/90 border-l-4 p-4.5 sm:p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-2xs hover:-translate-y-1 hover:shadow-lg hover:border-slate-300"
                :class="getLessonTheme(lesson).border"
              >
                <div>
                  <!-- Top Row: Guruh nomi + Nechanchi dars ekanligi badge -->
                  <div class="flex items-start justify-between gap-3 mb-2.5">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <h4 class="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base truncate">
                          {{ lesson.name }}
                        </h4>
                        <span
                          v-if="lesson.isToday"
                          class="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md shrink-0"
                        >
                          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping"></span>
                          Bugun
                        </span>
                      </div>
                      <span class="text-xs text-slate-400 font-medium block truncate mt-0.5">
                        {{ lesson.courseName || 'Asosiy o\'quv kursi' }}
                      </span>
                    </div>

                    <!-- Nechanchi dars ekanligi pill -->
                    <span
                      class="px-2.5 py-1 rounded-lg font-bold text-xs border shrink-0 shadow-2xs tracking-wide"
                      :class="getLessonTheme(lesson).badgeBg"
                    >
                      {{ lesson.lessonOrder }}-dars
                    </span>
                  </div>

                  <!-- Middle: Dars mavzusi (topic) — Kreativ kitobcha ikonikasi bilan -->
                  <div
                    v-if="lesson.topic"
                    class="mb-3.5 px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed transition-colors flex items-start gap-2.5 bg-linear-to-r"
                    :class="getLessonTheme(lesson).softBg"
                  >
                    <BookOpen class="h-4 w-4 shrink-0 mt-0.5" :class="getLessonTheme(lesson).iconColor" />
                    <div class="min-w-0">
                      <span class="font-semibold block line-clamp-2" :title="lesson.topic">{{ lesson.topic }}</span>
                    </div>
                  </div>
                </div>

                <!-- Bottom Details: Vaqt, Xona, Ustoz (Qulay Pills) -->
                <div class="space-y-2 pt-2.5 border-t border-slate-100 text-xs mt-1">
                  <!-- Vaqt -->
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-slate-400 font-medium">Vaqti:</span>
                    <span class="font-bold text-slate-800 flex items-center gap-1.5 font-mono bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-150">
                      <Clock class="h-3.5 w-3.5 text-blue-500" />
                      {{ lesson.startTime }} - {{ lesson.endTime }}
                    </span>
                  </div>

                  <!-- Ustoz & Xona pill qatori -->
                  <div class="grid grid-cols-2 gap-2 pt-0.5">
                    <!-- Ustoz -->
                    <div class="flex items-center gap-1.5 bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-100 min-w-0">
                      <UserCheck class="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span class="truncate font-medium text-slate-700 text-[11px]" :title="lesson.teacherName">
                        {{ lesson.teacherName }}
                      </span>
                    </div>

                    <!-- Xona -->
                    <div class="flex items-center gap-1.5 bg-slate-50/80 px-2 py-1 rounded-lg border border-slate-100 min-w-0">
                      <Building2 class="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span class="truncate font-medium text-slate-700 text-[11px]" :title="lesson.roomName">
                        {{ lesson.roomName }}
                      </span>
                    </div>
                  </div>

                  <!-- Hoverda ko'rinadigan qulay o'tish yozuvi -->
                  <div class="flex items-center justify-end text-[11px] text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                    <span>Guruh va davomatga kirish →</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Empty state when no lessons on that day -->
            <div v-else class="py-12 px-4 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
              <Calendar class="h-8 w-8 text-slate-300 mx-auto" />
              <p class="text-sm font-medium text-slate-700">Ushbu kunda darslar belgilanmagan</p>
              <p class="text-xs text-slate-400">Boshqa sanani tanlang yoki barcha darslarni ko'ring.</p>
              <button
                @click="clearCalendarSelection"
                type="button"
                class="mt-2 px-4 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                Barcha darslarni ko'rish
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>



    <!-- Bottom Tables Grid: Users 360 & Active Groups -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
      <!-- 1. Recent Users & 360 Management Card -->
      <div class="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/80 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <div class="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center text-[#6D28D9]">
                <Users class="h-4 w-4" />
              </div>
              <div>
                <h3 class="font-bold text-slate-900 text-base leading-tight">Foydalanuvchilar Nazorati</h3>
                <p class="text-[11px] text-slate-400 mt-0.5">Qidiruv, to'lov qabul qilish va tezkor kirish</p>
              </div>
            </div>

            <!-- Role Filter Pills -->
            <div class="inline-flex items-center bg-slate-100 p-0.5 rounded-xl text-xs font-medium">
              <button
                @click="userRoleFilter = 'ALL'"
                type="button"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="userRoleFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Barchasi
              </button>
              <button
                @click="userRoleFilter = 'STUDENT'"
                type="button"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="userRoleFilter === 'STUDENT' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                Talabalar
              </button>
              <button
                @click="userRoleFilter = 'TEACHER'"
                type="button"
                class="px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                :class="userRoleFilter === 'TEACHER' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'"
              >
                O'qituvchilar
              </button>
            </div>
          </div>

          <!-- Instant Search Bar -->
          <div class="relative mt-3">
            <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              v-model="userSearchQuery"
              type="text"
              placeholder="Ism, telefon raqami yoki email bo'yicha qidirish..."
              class="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-medium"
            />
          </div>
        </div>

        <!-- Users List (Minimalist & Senior Polish) -->
        <div class="space-y-1.5 max-h-[380px] overflow-y-auto pr-0.5 divide-y divide-slate-50">
          <div
            v-for="u in filteredRecentUsers"
            :key="u.id"
            @click="openUserInspectModal(u)"
            class="py-2.5 px-3 rounded-xl hover:bg-slate-50/90 transition-all flex items-center justify-between gap-3 group cursor-pointer border border-transparent hover:border-slate-200/60"
          >
            <!-- User Avatar & Identity -->
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 relative shadow-2xs"
                :class="
                  u.role === 'TEACHER'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    : u.role === 'ADMIN' || u.role === 'SUPERADMIN'
                    ? 'bg-violet-50 text-violet-700 border border-violet-200/60'
                    : 'bg-blue-50 text-blue-700 border border-blue-200/60'
                "
              >
                {{ u.firstName?.charAt(0) || 'U' }}{{ u.lastName?.charAt(0) || '' }}
                <span
                  class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white"
                  :class="u.status === 'ACTIVE' ? 'bg-emerald-500' : u.status === 'FROZEN' ? 'bg-cyan-500' : 'bg-slate-400'"
                ></span>
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition truncate leading-tight">
                    {{ u.firstName }} {{ u.lastName }}
                  </p>
                  <span
                    class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0"
                    :class="
                      u.role === 'TEACHER'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                        : u.role === 'ADMIN' || u.role === 'SUPERADMIN'
                        ? 'bg-violet-50 text-violet-700 border border-violet-200/70'
                        : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                    "
                  >
                    {{ u.role === 'TEACHER' ? 'O\'qituvchi' : u.role === 'STUDENT' ? 'Talaba' : 'Admin' }}
                  </span>
                  <span
                    v-if="u.role === 'STUDENT' && u.coins !== undefined"
                    class="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 shrink-0"
                  >
                    🪙 {{ u.coins }}
                  </span>
                </div>
                <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span class="font-mono text-slate-500">{{ u.phone }}</span>
                  <span v-if="u.email" class="text-slate-300">•</span>
                  <span v-if="u.email" class="truncate max-w-36">{{ u.email }}</span>
                </div>
              </div>
            </div>

            <!-- Only Essential Admin Action Methods -->
            <div class="flex items-center gap-2 shrink-0" @click.stop>
              <!-- 1. If student: Quick Payment Trigger -->
              <button
                v-if="u.role === 'STUDENT'"
                @click="openCreatePaymentModal(u.id)"
                type="button"
                class="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg border border-emerald-200/80 transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                title="To'lov qabul qilish"
              >
                <Plus class="h-3 w-3" />
                <span>To'lov</span>
              </button>

              <!-- 2. Quick Impersonate (Login As) -->
              <button
                v-if="u.role !== 'SUPERADMIN'"
                @click="handleImpersonate(u)"
                type="button"
                class="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1"
                title="Akkaunt nomidan tizimga kirish"
              >
                <LogIn class="h-3 w-3" />
                <span class="hidden sm:inline">Kirish</span>
              </button>

              <!-- 3. Profile Link -->
              <router-link
                :to="'/dashboard/users/' + u.id"
                class="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                title="To'liq 360° profil sahifasi"
              >
                <Eye class="h-3.5 w-3.5" />
              </router-link>
            </div>
          </div>

          <div v-if="filteredRecentUsers.length === 0" class="py-8 text-center text-xs text-slate-400">
            Foydalanuvchilar topilmadi.
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Jami: <strong class="text-slate-700 font-semibold">{{ users.length }} ta foydalanuvchi</strong></span>
          <router-link to="/dashboard/users" class="font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition">
            <span>Barcha foydalanuvchilar</span>
            <ChevronRight class="h-3.5 w-3.5" />
          </router-link>
        </div>
      </div>

      <!-- 2. Active Groups & Capacity Card (Minimalist Clean Design) -->
      <div class="rounded-2xl bg-white p-5 sm:p-6 shadow-2xs border border-slate-200/80 flex flex-col justify-between space-y-4">
        <!-- Card Section Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-xl bg-violet-50 flex items-center justify-center text-[#6D28D9]">
              <FolderPlus class="h-4 w-4" />
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-base leading-tight">Mavjud Guruhlar & Sig'im</h3>
              <p class="text-[11px] text-slate-400 mt-0.5">Faol guruhlar va to'lganlik darajasi</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="router.push('/dashboard/groups?action=create')"
              type="button"
              class="text-xs font-semibold text-[#6D28D9] hover:text-white bg-violet-50 hover:bg-[#6D28D9] px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Yangi guruh ochish"
            >
              <Plus class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">Guruh ochish</span>
            </button>
            <router-link
              to="/dashboard/groups"
              class="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 px-3 py-1.5 rounded-xl transition-colors"
            >
              Barchasi ({{ groups.length }})
            </router-link>
          </div>
        </div>

        <!-- Groups Cards Grid (Minimalism & Clean Architecture) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-100 overflow-y-auto pr-0.5">
          <div
            v-for="g in enrichedGroups"
            :key="g.id"
            @click="router.push(`/dashboard/groups/${g.id}`)"
            class="p-4 rounded-2xl bg-white hover:bg-slate-50/60 border border-slate-200/80 hover:border-violet-300 hover:shadow-xs transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer group shadow-2xs"
          >
            <!-- Top: Initials Logo + Group Name & Course + Days Pill -->
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="h-9 w-9 rounded-xl bg-violet-50 text-[#6D28D9] group-hover:bg-[#6D28D9] group-hover:text-white flex items-center justify-center font-bold text-xs shrink-0 transition-colors border border-violet-100 shadow-2xs">
                  {{ g.name.substring(0, 2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <h4 class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#6D28D9] transition truncate leading-tight">
                    {{ g.name }}
                  </h4>
                  <p class="text-[11px] text-slate-400 truncate mt-0.5">
                    {{ g.course?.name || 'Asosiy kurs' }}
                  </p>
                </div>
              </div>

              <!-- Top Right: Minimal Days Pill -->
              <span
                class="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                :class="formatGroupDaysLabel(g.weekDays).isOdd ? 'text-violet-700 bg-violet-50 border border-violet-100/80' : 'text-indigo-700 bg-indigo-50 border border-indigo-100/80'"
              >
                {{ formatGroupDaysLabel(g.weekDays).text }}
              </span>
            </div>

            <!-- Middle: Clean Minimal Details (Airy, No heavy nested boxes) -->
            <div class="space-y-1.5 pt-0.5 text-xs">
              <!-- Row 1: Teacher & Room -->
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 min-w-0">
                  <UserCheck class="h-3.5 w-3.5 text-violet-500 shrink-0" />
                  <span class="text-[11px] font-medium text-slate-700 truncate" :title="g.teacherName">
                    {{ g.teacherName }}
                  </span>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-slate-500 shrink-0 font-medium">
                  <Building2 class="h-3 w-3 text-slate-400" />
                  <span>{{ g.cleanRoom }}</span>
                </div>
              </div>

              <!-- Row 2: Time & Status -->
              <div class="flex items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                <div class="flex items-center gap-1.5">
                  <Clock class="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{{ g.startTime }} – {{ g.endTime }}</span>
                </div>
                <span class="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 font-sans">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Faol
                </span>
              </div>
            </div>

            <!-- Bottom: Capacity & Minimal Progress Bar -->
            <div class="pt-1">
              <div class="flex items-center justify-between text-[11px] mb-1.5">
                <span class="text-slate-400 font-medium">Sig'im</span>
                <span class="font-mono text-slate-700 font-semibold text-[11px]">
                  {{ g.studentCount }} / {{ g.maxStudents }}
                  <span class="text-slate-400 font-normal">({{ g.fillPercent }}%)</span>
                </span>
              </div>
              <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="g.fillPercent >= 90 ? 'bg-amber-500' : 'bg-linear-to-r from-violet-500 to-[#6D28D9]'"
                  :style="{ width: `${Math.max(4, g.fillPercent)}%` }"
                ></div>
              </div>
            </div>
          </div>

          <!-- Empty slot filler / Create new group card when odd number -->
          <div
            v-if="enrichedGroups.length % 2 === 1"
            @click="router.push('/dashboard/groups?action=create')"
            class="p-4 rounded-2xl border border-dashed border-slate-200 hover:border-violet-300 bg-slate-50/40 hover:bg-violet-50/20 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer group min-h-36"
          >
            <div class="h-8 w-8 rounded-xl bg-white text-[#6D28D9] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform border border-slate-200/80">
              <Plus class="h-4 w-4" />
            </div>
            <span class="text-xs font-bold text-slate-700 group-hover:text-[#6D28D9] mt-2 transition">
              Yangi guruh ochish
            </span>
            <span class="text-[11px] text-slate-400 mt-0.5">
              Yangi guruh va dars jadvali yaratish
            </span>
          </div>

          <div v-if="enrichedGroups.length === 0" class="col-span-2 py-8 text-center text-xs text-slate-400">
            Hozircha guruhlar mavjud emas.
          </div>
        </div>

        <!-- Section Footer (Clean, Non-redundant) -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
          <span>Jami: <strong class="text-slate-700 font-semibold">{{ totalGroups }} ta faol guruh</strong></span>
          <router-link to="/dashboard/groups" class="font-semibold text-[#6D28D9] hover:text-[#5B21B6] flex items-center gap-1 transition">
            <span>Guruhlar ro'yxati</span>
            <ChevronRight class="h-3.5 w-3.5" />
          </router-link>
        </div>
      </div>
    </div>

    <!-- Quick Add Payment Modal -->
    <Modal
      :show="showAddPaymentModal"
      title="Yangi To'lov Qabul Qilish"
      @close="showAddPaymentModal = false"
    >
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
            @click="showAddPaymentModal = false"
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



    <!-- User 360° Inspector Modal (Admin Quick Management & Impersonation) -->
    <Modal
      :show="showUserInspectModal"
      title="Foydalanuvchi 360° Boshqaruv Profili"
      @close="showUserInspectModal = false"
    >
      <div v-if="inspectedUser" class="space-y-4">
        <!-- Top Profile Card -->
        <div class="p-4 bg-linear-to-r from-violet-50 via-slate-50 to-white border border-violet-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div
              class="h-14 w-14 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-sm"
              :class="
                inspectedUser.role === 'TEACHER'
                  ? 'bg-emerald-600'
                  : inspectedUser.role === 'ADMIN' || inspectedUser.role === 'SUPERADMIN'
                  ? 'bg-[#6D28D9]'
                  : 'bg-amber-600'
              "
            >
              {{ inspectedUser.firstName?.charAt(0) || 'U' }}{{ inspectedUser.lastName?.charAt(0) || '' }}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-base font-black text-slate-900 leading-tight">
                  {{ inspectedUser.firstName }} {{ inspectedUser.lastName }}
                </h4>
                <Badge :variant="inspectedUser.role === 'TEACHER' ? 'success' : inspectedUser.role === 'STUDENT' ? 'warning' : 'info'">
                  {{ inspectedUser.role }}
                </Badge>
              </div>
              <p class="text-xs text-slate-500 font-mono mt-0.5">{{ inspectedUser.phone }}</p>
              <p v-if="inspectedUser.email" class="text-xs text-slate-400">{{ inspectedUser.email }}</p>
            </div>
          </div>

          <!-- Quick Impersonate & Action Buttons -->
          <div class="flex items-center gap-2 flex-wrap">
            <button
              @click="handleImpersonate(inspectedUser)"
              type="button"
              class="px-4 py-2 text-xs font-black text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
              title="Ushbu foydalanuvchi akkaunti nomidan tizimga kirish"
            >
              <LogIn class="h-4 w-4" />
              <span>Akkaunt nomidan kirish</span>
            </button>
            <button
              v-if="inspectedUser.role === 'STUDENT'"
              @click="openCreatePaymentModal(inspectedUser.id); showUserInspectModal = false;"
              type="button"
              class="px-3.5 py-2 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CreditCard class="h-3.5 w-3.5" />
              <span>+ To'lov</span>
            </button>
          </div>
        </div>

        <!-- Student Financial Summary (if student) -->
        <div v-if="inspectedUser.role === 'STUDENT'" class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
            <span class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">Jami To'langan</span>
            <span class="text-base font-black text-emerald-900 mt-0.5 block">{{ formatMoney(inspectedUserTotalPaid) }}</span>
            <span class="text-[10px] text-emerald-600">{{ inspectedUserPayments.filter(p => p.status === 'PAID').length }} ta to'lov</span>
          </div>
          <div class="p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
            <span class="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Kutilayotgan Qarz</span>
            <span class="text-base font-black text-amber-900 mt-0.5 block">{{ formatMoney(inspectedUserTotalPending) }}</span>
            <span class="text-[10px] text-amber-600">{{ inspectedUserPayments.filter(p => p.status === 'PENDING').length }} ta kutilmoqda</span>
          </div>
        </div>

        <!-- Groups Section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold uppercase tracking-wider text-slate-700">
              {{ inspectedUser.role === 'TEACHER' ? 'O\'qitadigan guruhlari' : 'Biriktirilgan guruhlari' }}
              ({{ inspectedUserGroups.length }})
            </h5>
          </div>

          <div v-if="inspectedUserGroups.length === 0" class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            Biriktirilgan guruhlar mavjud emas.
          </div>
          <div v-else class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="grp in inspectedUserGroups"
              :key="grp.id"
              class="p-2.5 bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
            >
              <div>
                <span class="font-bold text-slate-800">{{ grp.name }}</span>
                <span v-if="grp.course" class="text-slate-400 ml-1.5 font-medium">({{ grp.course?.name }})</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-[11px] font-mono text-slate-500">{{ grp.startTime }} - {{ grp.endTime }}</span>
                <Badge :variant="grp.status === 'ACTIVE' ? 'success' : 'warning'">{{ grp.status }}</Badge>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Payments History (if student) -->
        <div v-if="inspectedUser.role === 'STUDENT'" class="space-y-2">
          <div class="flex items-center justify-between">
            <h5 class="text-xs font-bold uppercase tracking-wider text-slate-700">To'lovlar Tarixi ({{ inspectedUserPayments.length }})</h5>
            <button
              @click="openCreatePaymentModal(inspectedUser.id); showUserInspectModal = false;"
              type="button"
              class="text-[11px] font-bold text-[#6D28D9] hover:underline cursor-pointer flex items-center gap-1"
            >
              <Plus class="h-3 w-3" />
              <span>To'lov qo'shish</span>
            </button>
          </div>

          <div v-if="inspectedUserPayments.length === 0" class="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            Hozircha to'lovlar mavjud emas.
          </div>
          <div v-else class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div
              v-for="p in inspectedUserPayments"
              :key="p.id"
              class="p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors"
              :class="p.status === 'PAID' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-amber-50/40 border-amber-100'"
            >
              <div>
                <span class="font-black text-slate-900">{{ formatMoney(p.amount) }}</span>
                <span class="text-[10px] text-slate-500 ml-2 font-medium">{{ p.type }} • {{ formatDate(p.paidForDate) }}</span>
                <p v-if="p.comment" class="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{{ p.comment }}</p>
              </div>
              <div class="flex items-center gap-2">
                <Badge :variant="p.status === 'PAID' ? 'success' : p.status === 'PENDING' ? 'warning' : 'danger'">
                  {{ p.status === 'PAID' ? 'To\'langan' : 'Kutilmoqda' }}
                </Badge>
                <router-link
                  :to="`/dashboard/payments?search=${encodeURIComponent(inspectedUser.phone || inspectedUser.firstName)}`"
                  class="h-6 w-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
                  title="To'lovlar bo'limida ko'rish"
                >
                  <FileText class="h-3 w-3" />
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showUserInspectModal = false"
            type="button"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Yopish
          </button>
          <button
            @click="handleImpersonate(inspectedUser)"
            type="button"
            class="px-4 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <LogIn class="h-3.5 w-3.5" />
            <span>Akkauntga o'tish</span>
          </button>
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
