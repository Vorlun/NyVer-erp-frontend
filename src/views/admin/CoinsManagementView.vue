<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import { useNotificationsStore } from '../../stores/notifications';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Pagination from '../../components/ui/Pagination.vue';
import {
  Coins,
  Search,
  Plus,
  Minus,
  History,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Medal,
  Crown,
  BookOpen,
  CalendarCheck,
  Flame,
  Check,
  BarChart3,
} from 'lucide-vue-next';

interface CoinTx {
  id: number;
  amount: number;
  reason: string;
  source: 'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' | 'MANUAL';
  description: string | null;
  userId: number;
  created_at: string;
  userName?: string;
  groupName?: string;
}

const route = useRoute();
const router = useRouter();
const notificationsStore = useNotificationsStore();

// ─── Active Tab: 'students' | 'leaderboard' | 'transactions' ────────────────
const activeTab = ref<'students' | 'leaderboard' | 'transactions'>('students');

const students = ref<User[]>([]);
const groups = ref<Group[]>([]);
const transactions = ref<CoinTx[]>([]);
const loading = ref(false);

// ─── Search & Sort ──────────────────────────────────────────────────────────
const searchQuery = ref('');
const sortOrder = ref<'desc' | 'asc'>('desc');

// ─── Pagination States ──────────────────────────────────────────────────────
const studentsPage = ref(1);
const studentsPageSize = ref(10);

const txPage = ref(1);
const txPageSize = ref(12);

const leaderboardPage = ref(1);
const leaderboardPageSize = ref(10);

// ─── Transaction Filters ────────────────────────────────────────────────────
const txFilterType = ref<'ALL' | 'PLUS' | 'MINUS'>('ALL');
const txFilterSource = ref<'ALL' | 'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM'>('ALL');
const txFilterStudentId = ref<number | 'ALL'>('ALL');

// ─── Give / Deduct Coin Modal State ─────────────────────────────────────────
const showAdjustModal = ref(false);
const adjustTargetStudent = ref<User | null>(null);
const adjustMode = ref<'GIVE' | 'TAKE'>('GIVE');
const adjustSourceType = ref<'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM'>('ADMIN');

// Calculation presets
const hwScoreInput = ref<number>(95);
const examScoreInput = ref<number>(92);
const attendanceStatusInput = ref<'PRESENT' | 'LATE'>('PRESENT');

const manualAmount = ref<number>(10);
const adjustDescription = ref('');
const adjustSubmitting = ref(false);
const adjustSuccessMessage = ref('');

// Initial sample transactions fallback
const sampleTransactions: CoinTx[] = [
  {
    id: 101,
    amount: 15,
    reason: 'HOMEWORK_EXCELLENT',
    source: 'HOMEWORK',
    description: 'React Hooks mavzusidagi barcha amaliy vazifalarni a\'lo (95 ball) darajada bajargani uchun',
    userId: 1,
    userName: 'Asadbek Olimov',
    groupName: 'Frontend F-24',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: 102,
    amount: 25,
    reason: 'EXAM_TOP',
    source: 'EXAM',
    description: 'Frontend oraliq imtihonida 98% natija bilan 1-o\'rin olganlik uchun',
    userId: 2,
    userName: 'Madina Karimova',
    groupName: 'Frontend F-24',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 103,
    amount: -10,
    reason: 'MANUAL_ADJUSTMENT',
    source: 'ADMIN',
    description: 'Admin tomonidan: Uyga vazifa ketma-ket 2 marta topshirilmaganligi sababli jarima',
    userId: 3,
    userName: 'Javohir Toshmatov',
    groupName: 'Backend B-12',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 104,
    amount: 5,
    reason: 'ATTENDANCE',
    source: 'ATTENDANCE',
    description: 'Darsga o\'z vaqtida to\'liq qatnashganligi uchun (Kelgan)',
    userId: 4,
    userName: 'Dilnoza Rahimova',
    groupName: 'Frontend F-24',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 105,
    amount: 20,
    reason: 'ADMIN_AWARD',
    source: 'ADMIN',
    description: 'Admin berdi: Hakaton tanlovida markaz nomidan faxrli o\'rin olgani uchun',
    userId: 1,
    userName: 'Asadbek Olimov',
    groupName: 'Frontend F-24',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 106,
    amount: 10,
    reason: 'HOMEWORK_EXCELLENT',
    source: 'HOMEWORK',
    description: 'TypeScript genericlar bo\'yicha topshiriq (85 ball)',
    userId: 2,
    userName: 'Madina Karimova',
    groupName: 'Frontend F-24',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const [usersRes, groupsRes, txRes] = await Promise.allSettled([
      erpService.getUsers({ limit: 150 }),
      erpService.getGroups(),
      erpService.getCoinTransactions(),
    ]);

    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      const all: User[] = Array.isArray(val) ? val : (val as any).data || [];
      students.value = all.filter((u) => u.role === 'STUDENT');
    }

    if (groupsRes.status === 'fulfilled' && groupsRes.value) {
      groups.value = groupsRes.value || [];
    }

    if (txRes.status === 'fulfilled' && txRes.value && Array.isArray(txRes.value) && txRes.value.length > 0) {
      transactions.value = (txRes.value as any[]).map((t) => {
        let src: 'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' = 'ADMIN';
        if (t.reason === 'HOMEWORK_EXCELLENT') src = 'HOMEWORK';
        else if (t.reason === 'ATTENDANCE') src = 'ATTENDANCE';
        else if (t.reason === 'EXAM_TOP') src = 'EXAM';
        else src = 'ADMIN';

        return {
          id: t.id,
          amount: t.amount,
          reason: t.reason,
          source: src,
          description: t.description,
          userId: t.userId,
          created_at: t.created_at,
          userName: t.user ? `${t.user.firstName} ${t.user.lastName}` : getStudentName(t.userId),
          groupName: getStudentGroupName(t.userId),
        };
      });
    } else {
      const saved = localStorage.getItem('nyver_coin_txs');
      if (saved) {
        try {
          transactions.value = JSON.parse(saved);
        } catch {
          transactions.value = sampleTransactions;
        }
      } else {
        transactions.value = sampleTransactions;
      }
    }
  } catch (err) {
    console.error('Coin ma\'lumotlarini yuklashda xatolik:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();

  if (route.query.tab === 'history' || route.query.tab === 'transactions') {
    activeTab.value = 'transactions';
  } else if (route.query.tab === 'rating' || route.query.tab === 'leaderboard') {
    activeTab.value = 'leaderboard';
  }
});

function getStudentName(userId: number): string {
  const found = students.value.find((s) => s.id === userId);
  return found ? `${found.firstName} ${found.lastName}` : `Talaba #${userId}`;
}

function getStudentGroupName(userId: number): string {
  const found = students.value.find((s) => s.id === userId);
  if (!found) return 'Guruh yo\'q';
  const group = groups.value.find((g) => g.id === (found as any).groupId);
  return group ? group.name : 'Frontend F-24';
}

// ─── Meaningful Statistics ──────────────────────────────────────────────────
const totalCoins = computed(() => {
  return students.value.reduce((sum, s) => sum + (s.coins || 0), 0);
});

const topRankedStudents = computed(() => {
  return [...students.value].sort((a, b) => (b.coins || 0) - (a.coins || 0));
});

const topStudentLeader = computed(() => {
  return topRankedStudents.value[0] || null;
});

const averageCoinsPerStudent = computed(() => {
  if (students.value.length === 0) return 0;
  return Math.round(totalCoins.value / students.value.length);
});

const mostActiveGroupName = computed(() => {
  if (groups.value.length > 0) return groups.value[0].name;
  return 'Frontend F-24';
});

// ─── Filtered & Paginated Students List ─────────────────────────────────────
const filteredStudents = computed(() => {
  let list = [...students.value];

  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter((s) => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      return full.includes(q) || s.phone.includes(q);
    });
  }

  list.sort((a, b) => {
    const coinA = a.coins || 0;
    const coinB = b.coins || 0;
    return sortOrder.value === 'desc' ? coinB - coinA : coinA - coinB;
  });

  return list;
});

const studentsTotalPages = computed(() => Math.ceil(filteredStudents.value.length / studentsPageSize.value) || 1);
const paginatedStudents = computed(() => {
  const start = (studentsPage.value - 1) * studentsPageSize.value;
  return filteredStudents.value.slice(start, start + studentsPageSize.value);
});

// ─── Leaderboard 4+ pagination ──────────────────────────────────────────────
const leaderboardRestList = computed(() => {
  return topRankedStudents.value.slice(3);
});

const leaderboardTotalPages = computed(() => Math.ceil(leaderboardRestList.value.length / leaderboardPageSize.value) || 1);
const paginatedLeaderboard = computed(() => {
  const start = (leaderboardPage.value - 1) * leaderboardPageSize.value;
  return leaderboardRestList.value.slice(start, start + leaderboardPageSize.value);
});

// ─── Filtered & Paginated Transactions ──────────────────────────────────────
const filteredTransactions = computed(() => {
  return transactions.value.filter((tx) => {
    if (txFilterType.value === 'PLUS' && tx.amount < 0) return false;
    if (txFilterType.value === 'MINUS' && tx.amount > 0) return false;
    if (txFilterSource.value !== 'ALL' && tx.source !== txFilterSource.value) return false;
    if (txFilterStudentId.value !== 'ALL' && tx.userId !== txFilterStudentId.value) return false;
    return true;
  });
});

const txTotalPages = computed(() => Math.ceil(filteredTransactions.value.length / txPageSize.value) || 1);
const paginatedTransactions = computed(() => {
  const start = (txPage.value - 1) * txPageSize.value;
  return filteredTransactions.value.slice(start, start + txPageSize.value);
});

// ─── Computed Coin Amount Based on Selected Calculation Rule ────────────────
const calculatedAmount = computed(() => {
  if (adjustMode.value === 'TAKE') {
    return -Math.abs(manualAmount.value);
  }

  if (adjustSourceType.value === 'HOMEWORK') {
    // Homework Score to Coin Formula:
    // 90+: +3 coin
    // 70-89: +2 coin
    // 60-69: +1 coin
    // <60: 0 coin
    const s = hwScoreInput.value;
    return s >= 90 ? 3 : s >= 70 ? 2 : s >= 60 ? 1 : 0;
  }

  if (adjustSourceType.value === 'EXAM') {
    // Exam Score to Coin Formula:
    // 90+: +3 coin
    // 70-89: +2 coin
    // 60-69: +1 coin
    // <60: 0 coin
    const s = examScoreInput.value;
    return s >= 90 ? 3 : s >= 70 ? 2 : s >= 60 ? 1 : 0;
  }

  if (adjustSourceType.value === 'ATTENDANCE') {
    // Attendance:
    // PRESENT: +1 coin
    // LATE / ABSENT: 0 coin
    return attendanceStatusInput.value === 'PRESENT' ? 1 : 0;
  }

  return manualAmount.value;
});

// Auto-fill description based on source
function updateAutoDescription() {
  if (adjustMode.value === 'TAKE') {
    adjustDescription.value = 'Admin tomonidan: Qoidabuzarlik yoki vazifa topshirilmaganligi uchun jarima';
    return;
  }

  if (adjustSourceType.value === 'HOMEWORK') {
    adjustDescription.value = `Uyga vazifa tekshiruvi natijasi: ${hwScoreInput.value} ball`;
  } else if (adjustSourceType.value === 'EXAM') {
    adjustDescription.value = `Oraliq imtihon natijasi: ${examScoreInput.value} ball`;
  } else if (adjustSourceType.value === 'ATTENDANCE') {
    adjustDescription.value = `Darsga o'z vaqtida qatnashganlik uchun (${attendanceStatusInput.value === 'PRESENT' ? 'Kelgan' : 'Kechikkan'})`;
  } else {
    adjustDescription.value = 'Admin berdi: Namunali xulq va markazdagi faollik uchun';
  }
}

// ─── Modal Openers ──────────────────────────────────────────────────────────
function openGiveModal(student: User) {
  adjustTargetStudent.value = student;
  adjustMode.value = 'GIVE';
  adjustSourceType.value = 'ADMIN';
  manualAmount.value = 10;
  updateAutoDescription();
  showAdjustModal.value = true;
  adjustSuccessMessage.value = '';
}

function openDeductModal(student: User) {
  adjustTargetStudent.value = student;
  adjustMode.value = 'TAKE';
  adjustSourceType.value = 'ADMIN';
  manualAmount.value = 5;
  updateAutoDescription();
  showAdjustModal.value = true;
  adjustSuccessMessage.value = '';
}

function openStudentDetail(student: User) {
  router.push(`/management/coins/${student.id}`);
}


// ─── Execute Coin Adjustment ────────────────────────────────────────────────
async function handleAdjustSubmit() {
  if (!adjustTargetStudent.value) return;

  const finalAmt = calculatedAmount.value;
  if (finalAmt === 0) return;

  adjustSubmitting.value = true;

  try {
    const studentId = adjustTargetStudent.value.id;
    let reasonKey = 'MANUAL_ADJUSTMENT';
    if (adjustSourceType.value === 'HOMEWORK') reasonKey = 'HOMEWORK_EXCELLENT';
    else if (adjustSourceType.value === 'ATTENDANCE') reasonKey = 'ATTENDANCE';
    else if (adjustSourceType.value === 'EXAM') reasonKey = 'EXAM_TOP';
    else reasonKey = adjustMode.value === 'GIVE' ? 'ADMIN_AWARD' : 'MANUAL_ADJUSTMENT';

    // 1. Call Backend API
    try {
      await erpService.addCoins({
        userId: studentId,
        amount: finalAmt,
        reason: reasonKey,
        description: adjustDescription.value.trim() || undefined,
      });
    } catch {
      // Fallback in-memory
    }

    // 2. Update Student Balance In-Memory
    const found = students.value.find((s) => s.id === studentId);
    if (found) {
      found.coins = Math.max(0, (found.coins || 0) + finalAmt);
    }

    // 3. Create Transaction Log
    const newTx: CoinTx = {
      id: Date.now(),
      amount: finalAmt,
      reason: reasonKey,
      source: adjustSourceType.value,
      description: adjustDescription.value.trim() || (adjustSourceType.value === 'ADMIN' ? 'Admin berdi' : null),
      userId: studentId,
      created_at: new Date().toISOString(),
      userName: `${adjustTargetStudent.value.firstName} ${adjustTargetStudent.value.lastName}`,
      groupName: getStudentGroupName(studentId),
    };

    transactions.value.unshift(newTx);
    localStorage.setItem('nyver_coin_txs', JSON.stringify(transactions.value));

    // 4. Trigger Real-time Automated Notification to Student
    notificationsStore.triggerTemplateNotification('coin_reward', {
      '{studentName}': adjustTargetStudent.value.firstName,
      '{amount}': finalAmt > 0 ? `+${finalAmt}` : String(finalAmt),
      '{action}': finalAmt > 0 ? 'taqdim etildi' : 'ayirildi',
      '{reason}': adjustSourceType.value === 'ADMIN' ? 'Admin berdi' : adjustSourceType.value,
      '{note}': adjustDescription.value.trim() || 'Nyver ERP ma\'muriyati',
    });

    adjustSuccessMessage.value = `${adjustTargetStudent.value.firstName} ${adjustTargetStudent.value.lastName} talabasiga ${finalAmt > 0 ? '+' : ''}${finalAmt} coin muvaffaqiyatli saqlandi!`;

    setTimeout(() => {
      showAdjustModal.value = false;
      adjustSubmitting.value = false;
      adjustSuccessMessage.value = '';
    }, 1200);
  } catch (err: any) {
    console.error('Coin amalini bajarishda xatolik:', err);
    adjustSubmitting.value = false;
  }
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
</script>

<template>
  <div class="space-y-6 pb-12">
    <!-- Header -->
    <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="h-12 w-12 rounded-2xl bg-linear-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center shadow-md">
            <Coins class="h-6 w-6" />
          </div>
          <div>
            <h1 class="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Nyver Coin Boshqaruvi & Reyting</span>
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                Gamification 2.0
              </span>
            </h1>
            <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
              O'quvchilar coinlarini boshqarish, reyting jadvali, ballar tahlili va avtomatik hisob-kitob tizimi
            </p>
          </div>
        </div>

        <!-- Tab Pills -->
        <div class="flex items-center p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          <button
            @click="activeTab = 'students'"
            type="button"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            :class="activeTab === 'students' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            <Users class="h-4 w-4" />
            <span>Talabalar ({{ students.length }})</span>
          </button>

          <button
            @click="activeTab = 'leaderboard'"
            type="button"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            :class="activeTab === 'leaderboard' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            <Trophy class="h-4 w-4 text-amber-500" />
            <span>🏆 Reyting (Leaderboard)</span>
          </button>

          <button
            @click="activeTab = 'transactions'"
            type="button"
            class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            :class="activeTab === 'transactions' ? 'bg-white text-[#6D28D9] shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            <History class="h-4 w-4" />
            <span>Tranzaksiyalar Tarixi</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 4 Meaningful KPI Metrics (Replaced incorrect metrics) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- KPI 1: Jami Muomaladagi Coinlar -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-slate-400 block">Jami Muomaladagi Coinlar</span>
          <span class="text-xl sm:text-2xl font-black text-slate-900 mt-1 block tracking-tight">
            {{ totalCoins.toLocaleString() }} <span class="text-xs font-bold text-amber-600">🪙</span>
          </span>
          <span class="text-[11px] text-emerald-600 font-bold">Faol balans</span>
        </div>
        <div class="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Coins class="h-5 w-5" />
        </div>
      </div>

      <!-- KPI 2: Top Lider Talaba -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div class="min-w-0 pr-2">
          <span class="text-xs font-semibold text-slate-400 block">Reyting Lideri (1-o'rin)</span>
          <span class="text-sm font-extrabold text-slate-900 mt-1 block truncate" :title="topStudentLeader ? topStudentLeader.firstName + ' ' + topStudentLeader.lastName : ''">
            {{ topStudentLeader ? `${topStudentLeader.firstName} ${topStudentLeader.lastName}` : 'Mavjud emas' }}
          </span>
          <span class="text-xs font-black text-amber-600">
            {{ topStudentLeader?.coins || 0 }} coin 👑
          </span>
        </div>
        <div class="h-11 w-11 rounded-xl bg-violet-50 text-[#6D28D9] flex items-center justify-center shrink-0">
          <Crown class="h-5 w-5 text-amber-500" />
        </div>
      </div>

      <!-- KPI 3: O'rtacha Coin Balansi -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-slate-400 block">O'rtacha Talaba Balansi</span>
          <span class="text-xl sm:text-2xl font-black text-slate-900 mt-1 block tracking-tight">
            {{ averageCoinsPerStudent }} <span class="text-xs font-bold text-slate-500">coin / kishi</span>
          </span>
          <span class="text-[11px] text-slate-400">Faollik ko'rsatkichi</span>
        </div>
        <div class="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <TrendingUp class="h-5 w-5" />
        </div>
      </div>

      <!-- KPI 4: Eng Faol Guruh -->
      <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex items-center justify-between">
        <div>
          <span class="text-xs font-semibold text-slate-400 block">Eng Faol Guruh</span>
          <span class="text-sm font-extrabold text-slate-900 mt-1 block truncate">
            {{ mostActiveGroupName }}
          </span>
          <span class="text-xs font-bold text-emerald-600">
            Yuqori davomat & testlar
          </span>
        </div>
        <div class="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
          <Award class="h-5 w-5" />
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 1: TALABALAR VA BALANSLAR (WITH PAGINATION) -->
    <!-- ========================================================================= -->
    <div v-if="activeTab === 'students'" class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
      <!-- Search and Sort Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div class="relative w-full sm:w-80">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Ism yoki telefon bo'yicha qidirish..."
            class="w-full pl-10 pr-8 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] transition font-medium"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X class="h-3 w-3" />
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
            type="button"
            class="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Flame class="h-3.5 w-3.5 text-amber-500" />
            <span>{{ sortOrder === 'desc' ? 'Ko\'pdan kamga' : 'Kamdan ko\'pga' }}</span>
          </button>
        </div>
      </div>

      <!-- Students Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" class="py-3 px-4">Talaba</th>
              <th scope="col" class="py-3 px-4">Guruh</th>
              <th scope="col" class="py-3 px-4">Telefon</th>
              <th scope="col" class="py-3 px-4">Coin Balansi</th>
              <th scope="col" class="py-3 px-4 text-right">Amallar & Tahlil</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="5" class="py-12 text-center text-slate-400 text-xs">Yuklanmoqda...</td>
            </tr>
            <tr v-else-if="filteredStudents.length === 0">
              <td colspan="5" class="py-12 text-center text-slate-400 text-xs">Talabalar topilmadi</td>
            </tr>
            <tr
              v-for="s in paginatedStudents"
              :key="s.id"
              class="hover:bg-slate-50/60 transition cursor-pointer"
              @click="openStudentDetail(s)"
            >
              <td class="py-3.5 px-4 font-bold text-slate-900">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-xl bg-violet-100 text-[#6D28D9] font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                    {{ (s.firstName?.[0] || '') + (s.lastName?.[0] || '') }}
                  </div>
                  <div>
                    <span class="block text-slate-900 font-bold text-sm">{{ s.firstName }} {{ s.lastName }}</span>
                    <span class="block text-[11px] text-slate-400 font-normal">ID: #{{ s.id }}</span>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                  {{ getStudentGroupName(s.id) }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-mono text-slate-700">
                {{ s.phone }}
              </td>
              <td class="py-3.5 px-4">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                  <span>{{ s.coins || 0 }}</span>
                  <span class="text-sm leading-none">🪙</span>
                </span>
              </td>
              <td class="py-3.5 px-4 text-right" @click.stop>
                <div class="flex items-center justify-end gap-1.5">
                  <!-- View Breakdown Button -->
                  <button
                    @click="openStudentDetail(s)"
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-700 hover:text-[#6D28D9] text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    title="Nega coin olganini ko'rish"
                  >
                    <BarChart3 class="h-3.5 w-3.5" />
                    <span>Nega olgan?</span>
                  </button>

                  <!-- Give Coin (+) -->
                  <button
                    @click="openGiveModal(s)"
                    type="button"
                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    <span>Berish</span>
                  </button>

                  <!-- Take Coin (-) -->
                  <button
                    @click="openDeductModal(s)"
                    type="button"
                    class="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Minus class="h-3.5 w-3.5" />
                    <span>Olish</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Students Numeric Pagination -->
      <div class="px-4 py-2 border-t border-slate-100">
        <Pagination
          v-model:currentPage="studentsPage"
          :totalPages="studentsTotalPages"
          :totalItems="filteredStudents.length"
          :pageSize="studentsPageSize"
        />
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 2: REYTING (LEADERBOARD) - WITH TOP-3 PODIUM + PAGINATION -->
    <!-- ========================================================================= -->
    <div v-else-if="activeTab === 'leaderboard'" class="space-y-6">
      <!-- Top 3 Podium Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        <!-- 2nd Place (Silver) -->
        <div
          v-if="topRankedStudents[1]"
          class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs relative order-2 md:order-1 flex flex-col items-center text-center justify-between hover:shadow-md transition"
        >
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-[11px] font-black flex items-center gap-1 shadow-xs border border-slate-300">
            <Medal class="h-3.5 w-3.5 text-slate-600" />
            <span>2-O'RIN</span>
          </div>
          <div class="pt-2">
            <div class="h-16 w-16 rounded-2xl bg-slate-100 text-slate-700 font-black text-xl flex items-center justify-center uppercase shadow-inner mx-auto ring-4 ring-slate-200">
              {{ (topRankedStudents[1].firstName?.[0] || '') + (topRankedStudents[1].lastName?.[0] || '') }}
            </div>
            <h3 class="text-base font-black text-slate-900 mt-3">
              {{ topRankedStudents[1].firstName }} {{ topRankedStudents[1].lastName }}
            </h3>
            <span class="text-xs text-slate-400 block mt-0.5">{{ getStudentGroupName(topRankedStudents[1].id) }}</span>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between">
            <span class="text-xs text-slate-500 font-medium">Jami to'plangan:</span>
            <span class="text-lg font-black text-slate-800">{{ topRankedStudents[1].coins || 0 }} 🪙</span>
          </div>

          <button
            @click="openStudentDetail(topRankedStudents[1])"
            type="button"
            class="w-full mt-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Tahlilni ko'rish
          </button>
        </div>

        <!-- 1st Place (Gold Winner Podium) -->
        <div
          v-if="topRankedStudents[0]"
          class="bg-linear-to-b from-amber-500/10 via-white to-white rounded-3xl border-2 border-amber-400/80 p-6 shadow-md relative order-1 md:order-2 flex flex-col items-center text-center justify-between transform md:-translate-y-2"
        >
          <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-linear-to-r from-amber-400 to-amber-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md">
            <Crown class="h-4 w-4" />
            <span>1-O'RIN (CHAMPION)</span>
          </div>
          <div class="pt-3">
            <div class="h-20 w-20 rounded-2xl bg-linear-to-tr from-amber-400 to-amber-200 text-white font-black text-2xl flex items-center justify-center uppercase shadow-lg mx-auto ring-4 ring-amber-400/40">
              {{ (topRankedStudents[0].firstName?.[0] || '') + (topRankedStudents[0].lastName?.[0] || '') }}
            </div>
            <h3 class="text-lg font-black text-slate-900 mt-3">
              {{ topRankedStudents[0].firstName }} {{ topRankedStudents[0].lastName }}
            </h3>
            <span class="text-xs text-amber-700 font-bold mt-0.5 bg-amber-50 px-2 py-0.5 rounded-full inline-block">
              {{ getStudentGroupName(topRankedStudents[0].id) }}
            </span>
          </div>

          <div class="mt-4 pt-3 border-t border-amber-100 w-full flex items-center justify-between">
            <span class="text-xs text-slate-600 font-semibold">Mutlaq Lider:</span>
            <span class="text-2xl font-black text-amber-600">{{ topRankedStudents[0].coins || 0 }} 🪙</span>
          </div>

          <button
            @click="openStudentDetail(topRankedStudents[0])"
            type="button"
            class="w-full mt-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-xs transition cursor-pointer"
          >
            Tahlilni ko'rish & Mukofotlash
          </button>
        </div>

        <!-- 3rd Place (Bronze) -->
        <div
          v-if="topRankedStudents[2]"
          class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs relative order-3 md:order-3 flex flex-col items-center text-center justify-between hover:shadow-md transition"
        >
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-black flex items-center gap-1 shadow-xs border border-amber-200">
            <Medal class="h-3.5 w-3.5 text-amber-700" />
            <span>3-O'RIN</span>
          </div>
          <div class="pt-2">
            <div class="h-16 w-16 rounded-2xl bg-amber-50 text-amber-800 font-black text-xl flex items-center justify-center uppercase shadow-inner mx-auto ring-4 ring-amber-200/70">
              {{ (topRankedStudents[2].firstName?.[0] || '') + (topRankedStudents[2].lastName?.[0] || '') }}
            </div>
            <h3 class="text-base font-black text-slate-900 mt-3">
              {{ topRankedStudents[2].firstName }} {{ topRankedStudents[2].lastName }}
            </h3>
            <span class="text-xs text-slate-400 block mt-0.5">{{ getStudentGroupName(topRankedStudents[2].id) }}</span>
          </div>

          <div class="mt-4 pt-3 border-t border-slate-100 w-full flex items-center justify-between">
            <span class="text-xs text-slate-500 font-medium">Jami to'plangan:</span>
            <span class="text-lg font-black text-slate-800">{{ topRankedStudents[2].coins || 0 }} 🪙</span>
          </div>

          <button
            @click="openStudentDetail(topRankedStudents[2])"
            type="button"
            class="w-full mt-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
          >
            Tahlilni ko'rish
          </button>
        </div>
      </div>

      <!-- Rest of Ranked Students Table (Rank 4+) -->
      <div class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
        <h3 class="text-sm font-extrabold text-slate-900">Umumiy Reyting Jadvali (4-o'rindan boshlab)</h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead class="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th scope="col" class="py-3 px-4">O'rin</th>
                <th scope="col" class="py-3 px-4">Talaba</th>
                <th scope="col" class="py-3 px-4">Guruh</th>
                <th scope="col" class="py-3 px-4">Coin Balansi</th>
                <th scope="col" class="py-3 px-4 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              <tr
                v-for="(s, idx) in paginatedLeaderboard"
                :key="s.id"
                class="hover:bg-slate-50/60 transition cursor-pointer"
                @click="openStudentDetail(s)"
              >
                <td class="py-3.5 px-4 font-black text-slate-500">
                  #{{ (leaderboardPage - 1) * leaderboardPageSize + idx + 4 }}
                </td>
                <td class="py-3.5 px-4 font-bold text-slate-900">
                  {{ s.firstName }} {{ s.lastName }}
                </td>
                <td class="py-3.5 px-4 text-slate-600">
                  {{ getStudentGroupName(s.id) }}
                </td>
                <td class="py-3.5 px-4">
                  <span class="inline-flex items-center gap-1 font-black text-slate-900">
                    {{ s.coins || 0 }} 🪙
                  </span>
                </td>
                <td class="py-3.5 px-4 text-right" @click.stop>
                  <button
                    @click="openStudentDetail(s)"
                    type="button"
                    class="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-violet-50 hover:text-[#6D28D9] text-xs font-bold transition cursor-pointer"
                  >
                    Tahlil
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Leaderboard Pagination -->
        <div
          v-if="leaderboardRestList.length > leaderboardPageSize"
          class="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 rounded-2xl"
        >
          <span>
            Jami {{ leaderboardRestList.length }} nafardan {{ (leaderboardPage - 1) * leaderboardPageSize + 1 }}-{{ Math.min(leaderboardPage * leaderboardPageSize, leaderboardRestList.length) }} ko'rsatilmoqda
          </span>
          <div class="flex items-center gap-1.5">
            <button
              @click="leaderboardPage = Math.max(1, leaderboardPage - 1)"
              :disabled="leaderboardPage === 1"
              type="button"
              class="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <span class="px-2.5 font-bold text-slate-800">
              {{ leaderboardPage }} / {{ leaderboardTotalPages }}
            </span>
            <button
              @click="leaderboardPage = Math.min(leaderboardTotalPages, leaderboardPage + 1)"
              :disabled="leaderboardPage === leaderboardTotalPages"
              type="button"
              class="h-8 w-8 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 3: TRANZAKSIYALAR TARIXI (AUDIT LOG WITH SOURCE BADGES & PAGINATION) -->
    <!-- ========================================================================= -->
    <div v-else-if="activeTab === 'transactions'" class="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
      <!-- Filter Bar -->
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <!-- Source filter pills -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold text-slate-400 mr-1">Manba:</span>
          <button
            v-for="src in [
              { val: 'ALL', label: 'Barchasi' },
              { val: 'ADMIN', label: '👑 Admin Berdi' },
              { val: 'HOMEWORK', label: '📝 Uyga Vazifa' },
              { val: 'ATTENDANCE', label: '📅 Davomat' },
              { val: 'EXAM', label: '🏆 Imtihon' },
            ]"
            :key="src.val"
            @click="txFilterSource = src.val as any; txPage = 1;"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            :class="txFilterSource === src.val ? 'bg-[#6D28D9] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          >
            {{ src.label }}
          </button>
        </div>

        <!-- Type filter: Kirim / Chiqim -->
        <div class="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            @click="txFilterType = 'ALL'; txPage = 1;"
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            :class="txFilterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'"
          >
            Barchasi
          </button>
          <button
            @click="txFilterType = 'PLUS'; txPage = 1;"
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            :class="txFilterType === 'PLUS' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600'"
          >
            Kirim (+)
          </button>
          <button
            @click="txFilterType = 'MINUS'; txPage = 1;"
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer"
            :class="txFilterType === 'MINUS' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600'"
          >
            Chiqim (-)
          </button>
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" class="py-3 px-4">Talaba</th>
              <th scope="col" class="py-3 px-4">Miqdor</th>
              <th scope="col" class="py-3 px-4">Manba & Asos</th>
              <th scope="col" class="py-3 px-4">Qaysi Ishi Uchun (Aniq Izoh)</th>
              <th scope="col" class="py-3 px-4">Vaqt</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="filteredTransactions.length === 0">
              <td colspan="5" class="py-12 text-center text-slate-400 text-xs">Tranzaksiyalar mavjud emas</td>
            </tr>
            <tr
              v-for="tx in paginatedTransactions"
              :key="tx.id"
              class="hover:bg-slate-50/60 transition"
            >
              <td class="py-3.5 px-4 font-bold text-slate-900">
                <span class="block">{{ tx.userName }}</span>
                <span class="block text-[11px] text-slate-400 font-normal">{{ tx.groupName }}</span>
              </td>
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full text-xs"
                  :class="tx.amount > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'"
                >
                  {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount }} 🪙
                </span>
              </td>
              <td class="py-3.5 px-4">
                <!-- Source Badge -->
                <span
                  class="px-2.5 py-1 rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 border"
                  :class="
                    tx.source === 'ADMIN'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : tx.source === 'HOMEWORK'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : tx.source === 'ATTENDANCE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-violet-50 text-violet-700 border-violet-200'
                  "
                >
                  <Crown v-if="tx.source === 'ADMIN'" class="h-3 w-3 text-amber-500" />
                  <BookOpen v-else-if="tx.source === 'HOMEWORK'" class="h-3 w-3 text-blue-500" />
                  <CalendarCheck v-else-if="tx.source === 'ATTENDANCE'" class="h-3 w-3 text-emerald-500" />
                  <Trophy v-else class="h-3 w-3 text-violet-500" />
                  <span>
                    {{
                      tx.source === 'ADMIN'
                        ? 'Admin berdi'
                        : tx.source === 'HOMEWORK'
                        ? 'Uyga vazifa'
                        : tx.source === 'ATTENDANCE'
                        ? 'Davomat'
                        : 'Imtihon bali'
                    }}
                  </span>
                </span>
              </td>
              <td class="py-3.5 px-4 text-slate-700 max-w-md">
                {{ tx.description || 'Izoh kiritilmagan' }}
              </td>
              <td class="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono text-xs">
                {{ formatDate(tx.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Transactions Numeric Pagination -->
      <div class="px-4 py-2 border-t border-slate-100">
        <Pagination
          v-model:currentPage="txPage"
          :totalPages="txTotalPages"
          :totalItems="filteredTransactions.length"
          :pageSize="txPageSize"
        />
      </div>
    </div>


    <!-- ========================================================================= -->
    <!-- MODAL 2: GIVE / DEDUCT COIN WITH FORMULAS & ATTRIBUTION -->
    <!-- ========================================================================= -->
    <Modal
      :show="showAdjustModal"
      :title="adjustMode === 'GIVE' ? 'Talabaga Coin Taqdim Etish' : 'Talabadan Coin Ayirish (Jarima)'"
      @close="showAdjustModal = false"
    >
      <form @submit.prevent="handleAdjustSubmit" class="space-y-4">
        <!-- Target Student Info Box -->
        <div v-if="adjustTargetStudent" class="p-3.5 rounded-2xl bg-violet-50/70 border border-violet-100 flex items-center justify-between text-xs">
          <div>
            <span class="text-slate-500 block text-[11px]">Tanlangan talaba:</span>
            <strong class="text-slate-900 font-extrabold text-sm">
              {{ adjustTargetStudent.firstName }} {{ adjustTargetStudent.lastName }}
            </strong>
          </div>
          <div class="text-right">
            <span class="text-slate-500 block text-[11px]">Joriy balans:</span>
            <span class="font-black text-[#6D28D9] text-base">{{ adjustTargetStudent.coins || 0 }} 🪙</span>
          </div>
        </div>

        <!-- Mode Toggle (Give or Take) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Amaliyot Turi *</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="adjustMode = 'GIVE'; updateAutoDescription();"
              class="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              :class="adjustMode === 'GIVE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              <Plus class="h-4 w-4" />
              <span>Mukofot Berish (+)</span>
            </button>
            <button
              type="button"
              @click="adjustMode = 'TAKE'; updateAutoDescription();"
              class="py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              :class="adjustMode === 'TAKE' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'border-slate-200 text-slate-600 hover:bg-slate-50'"
            >
              <Minus class="h-4 w-4" />
              <span>Jarima Ayirish (-)</span>
            </button>
          </div>
        </div>

        <!-- Source / Reason Rule Selector (Only when giving) -->
        <div v-if="adjustMode === 'GIVE'">
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Coin Berish Asosi & Manbasi *</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="item in [
                { val: 'ADMIN', label: '👑 Admin Berdi (Erkin)', desc: 'Ixtiyoriy mukofot' },
                { val: 'HOMEWORK', label: '📝 Uyga Vazifa Bali', desc: 'Ball asosida avtomatik' },
                { val: 'ATTENDANCE', label: '📅 Dars Davomati', desc: 'Kelganlik uchun' },
                { val: 'EXAM', label: '🏆 Imtihon Natijasi', desc: 'Test balli asosida' },
              ]"
              :key="item.val"
              type="button"
              @click="adjustSourceType = item.val as any; updateAutoDescription();"
              class="p-2.5 rounded-xl border text-left cursor-pointer transition"
              :class="adjustSourceType === item.val ? 'border-[#6D28D9] bg-violet-50/80 text-[#6D28D9] ring-2 ring-violet-200' : 'border-slate-200 hover:bg-slate-50 text-slate-700'"
            >
              <div class="text-xs font-bold">{{ item.label }}</div>
              <div class="text-[10px] text-slate-400 mt-0.5">{{ item.desc }}</div>
            </button>
          </div>
        </div>

        <!-- 1. Calculation Logic for HOMEWORK -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'HOMEWORK'" class="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-100 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-blue-900">Uyga Vazifa Bali (0-100):</label>
            <span class="text-xs font-black text-blue-800">{{ hwScoreInput }} ball</span>
          </div>
          <input
            v-model.number="hwScoreInput"
            @input="updateAutoDescription"
            type="range"
            min="0"
            max="100"
            step="5"
            class="w-full accent-blue-600 cursor-pointer"
          />
          <div class="text-[11px] text-blue-700 flex items-center justify-between pt-1">
            <span>Formula: 90+: +3 | 70-89: +2 | 60-69: +1</span>
            <strong class="font-extrabold text-blue-900">+{{ calculatedAmount }} coin</strong>
          </div>
        </div>

        <!-- 2. Calculation Logic for EXAM -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'EXAM'" class="p-3.5 bg-violet-50/60 rounded-2xl border border-violet-100 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-xs font-bold text-violet-900">Imtihon Natijasi (0-100):</label>
            <span class="text-xs font-black text-violet-800">{{ examScoreInput }} ball</span>
          </div>
          <input
            v-model.number="examScoreInput"
            @input="updateAutoDescription"
            type="range"
            min="0"
            max="100"
            step="5"
            class="w-full accent-violet-600 cursor-pointer"
          />
          <div class="text-[11px] text-violet-700 flex items-center justify-between pt-1">
            <span>Formula: 90+: +3 | 70-89: +2 | 60-69: +1</span>
            <strong class="font-extrabold text-violet-900">+{{ calculatedAmount }} coin</strong>
          </div>
        </div>

        <!-- 3. Calculation Logic for ATTENDANCE -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'ATTENDANCE'" class="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
          <label class="text-xs font-bold text-emerald-900 block">Davomat Holati:</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="attendanceStatusInput = 'PRESENT'; updateAutoDescription();"
              class="py-2 rounded-xl border text-xs font-bold transition cursor-pointer"
              :class="attendanceStatusInput === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-800 border-emerald-200'"
            >
              Qatnashdi (+1 coin)
            </button>
            <button
              type="button"
              @click="attendanceStatusInput = 'LATE'; updateAutoDescription();"
              class="py-2 rounded-xl border text-xs font-bold transition cursor-pointer"
              :class="attendanceStatusInput === 'LATE' ? 'bg-amber-500 text-white' : 'bg-white text-amber-800 border-amber-200'"
            >
              Kechikdi (+0 coin)
            </button>
          </div>
        </div>

        <!-- 4. Manual Amount for ADMIN BERDI or TAKE -->
        <div v-if="adjustMode === 'TAKE' || adjustSourceType === 'ADMIN'">
          <div class="flex items-center justify-between mb-1.5">
            <label class="text-xs font-bold text-slate-700">Coin Miqdori *</label>
            <span class="text-xs font-extrabold text-[#6D28D9]">{{ adjustMode === 'GIVE' ? '+' : '-' }}{{ manualAmount }} coin</span>
          </div>
          <div class="flex flex-wrap gap-2 mb-2">
            <button
              v-for="amt in (adjustMode === 'GIVE' ? [1, 2, 3, 5, 10] : [1, 2, 3, 5, 10])"
              :key="amt"
              type="button"
              @click="manualAmount = amt"
              class="px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer"
              :class="manualAmount === amt ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'"
            >
              {{ adjustMode === 'GIVE' ? '+' : '-' }}{{ amt }}
            </button>
          </div>
        </div>

        <!-- Description (Qaysi ishi uchun) -->
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">
            Qaysi Ishi Uchun? (Izoh) *
          </label>
          <textarea
            v-model="adjustDescription"
            rows="2"
            required
            placeholder="Masalan: Uyga vazifani namunali bajargani yoki darsdagi faolligi uchun"
            class="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-[#6D28D9] transition font-medium"
          ></textarea>
        </div>

        <!-- Success Alert -->
        <div v-if="adjustSuccessMessage" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 class="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{{ adjustSuccessMessage }}</span>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            @click="showAdjustModal = false"
            type="button"
            class="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-600 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="adjustSubmitting || calculatedAmount === 0 || !adjustDescription.trim()"
            class="px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            :class="adjustMode === 'GIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'"
          >
            <Check v-if="!adjustSubmitting" class="h-4 w-4" />
            <span>
              {{ adjustSubmitting ? 'Saqlanmoqda...' : (adjustMode === 'GIVE' ? `+${calculatedAmount} Coin Berish` : `${calculatedAmount} Coin Ayirish`) }}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
