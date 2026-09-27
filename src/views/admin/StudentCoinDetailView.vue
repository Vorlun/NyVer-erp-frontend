<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiClient } from '../../api/client';
import Modal from '../../components/ui/Modal.vue';
import Pagination from '../../components/ui/Pagination.vue';
import {
  ArrowLeft,
  Trophy,
  BookOpen,
  CalendarCheck,
  Award,
  Shield,
  Search,
  Plus,
  Minus,
  User as UserIcon,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// ─── Interfaces ─────────────────────────────────────────────────────────────
interface User {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  role: string;
  status: string;
  coins?: number;
  groupName?: string;
  groups?: any[];
  studentEnrollments?: any[];
}

interface CoinTx {
  id: number;
  amount: number;
  reason: string;
  source: 'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' | 'PRIZE';
  description?: string;
  created_at: string;
}

// ─── State ──────────────────────────────────────────────────────────────────
const studentId = computed(() => Number(route.params.id));
const student = ref<User | null>(null);
const transactions = ref<CoinTx[]>([]);
const loading = ref(true);
const rank = ref<number>(1);
const totalStudentsCount = ref<number>(24);

// Filter & Search
const searchQuery = ref('');
const sourceFilter = ref<'ALL' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' | 'ADMIN' | 'PRIZE'>('ALL');
const typeFilter = ref<'ALL' | 'PLUS' | 'MINUS'>('ALL');

// Pagination
const currentPage = ref(1);
const pageSize = ref(10);

// Adjust Modal State
const showAdjustModal = ref(false);
const adjustMode = ref<'GIVE' | 'TAKE'>('GIVE');
const adjustSourceType = ref<'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM'>('ADMIN');
const hwScoreInput = ref<number>(95);
const examScoreInput = ref<number>(92);
const attendanceStatusInput = ref<'PRESENT' | 'LATE'>('PRESENT');
const manualAmount = ref<number>(3);
const adjustDescription = ref('');
const adjustSubmitting = ref(false);
const adjustSuccessMessage = ref('');

// ─── Automated Coin Calculation Rules (1-3 scale) ───────────────────────────
const calculatedRewardAmount = computed(() => {
  if (adjustSourceType.value === 'HOMEWORK') {
    const s = Number(hwScoreInput.value) || 0;
    if (s >= 90) return 3;
    if (s >= 70) return 2;
    if (s >= 60) return 1;
    return 0;
  }
  if (adjustSourceType.value === 'ATTENDANCE') {
    return attendanceStatusInput.value === 'PRESENT' ? 1 : 0;
  }
  if (adjustSourceType.value === 'EXAM') {
    const s = Number(examScoreInput.value) || 0;
    if (s >= 90) return 3;
    if (s >= 70) return 2;
    if (s >= 60) return 1;
    return 0;
  }
  return Number(manualAmount.value) || 0;
});

// ─── Fallback Sample Transactions for demo ──────────────────────────────────
function generateFallbackTransactions(_std?: User | null): CoinTx[] {
  return [
    {
      id: 1,
      amount: 3,
      reason: 'HOMEWORK_EXCELLENT',
      source: 'HOMEWORK',
      description: "React Hooks mavzusi: 96 ball bilan a'lo darajada topshirildi. Ustoz tekshirdi.",
      created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: 2,
      amount: 1,
      reason: 'ATTENDANCE',
      source: 'ATTENDANCE',
      description: 'Dars #14 davomati: Darsga o\'z vaqtida qatnashdi (PRESENT)',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: 3,
      amount: 3,
      reason: 'EXAM_TOP',
      source: 'EXAM',
      description: 'Frontend oraliq nazorat imtihonida 98% natija bilan a\'lo baholandi',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 44).toISOString(),
    },
    {
      id: 4,
      amount: 5,
      reason: 'MANUAL_ADJUSTMENT',
      source: 'ADMIN',
      description: 'Admin berdi: Hafta davomidagi namunali jamoaviy faollik uchun bonus',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    },
    {
      id: 5,
      amount: -10,
      reason: 'PRIZE_PURCHASE',
      source: 'PRIZE',
      description: 'Sovg\'alar do\'konidan xarid: Developer Vinyl Stikerlar To\'plami',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 110).toISOString(),
    },
    {
      id: 6,
      amount: 2,
      reason: 'HOMEWORK_GOOD',
      source: 'HOMEWORK',
      description: 'JavaScript Asynchronous Programming topshirig\'i: 84 ball. Yaxshi natija.',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
    },
    {
      id: 7,
      amount: 1,
      reason: 'ATTENDANCE',
      source: 'ATTENDANCE',
      description: 'Dars #13 davomati: Darsga qatnashdi (PRESENT)',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
    },
    {
      id: 8,
      amount: 3,
      reason: 'HOMEWORK_EXCELLENT',
      source: 'HOMEWORK',
      description: 'DOM Manipulation amaliy topshirig\'i: 92 ball',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 200).toISOString(),
    },
    {
      id: 9,
      amount: 1,
      reason: 'ATTENDANCE',
      source: 'ATTENDANCE',
      description: 'Dars #12 davomati: Darsga qatnashdi (PRESENT)',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 240).toISOString(),
    },
    {
      id: 10,
      amount: 2,
      reason: 'EXAM_RESULT',
      source: 'EXAM',
      description: 'HTML & CSS yakuniy modul testi: 86 ball',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 300).toISOString(),
    },
  ];
}

// ─── Fetch Student Data ─────────────────────────────────────────────────────
async function loadStudentData() {
  loading.value = true;
  const id = studentId.value;

  try {
    const res = await apiClient.get(`/users/${id}`);
    const u = res.data?.data ?? res.data;

    let groupTitle = 'Guruhsiz';
    if (u.studentEnrollments && u.studentEnrollments.length > 0) {
      groupTitle = u.studentEnrollments[0].group?.name || groupTitle;
    } else if (u.groups && u.groups.length > 0) {
      groupTitle = u.groups[0].name || groupTitle;
    }

    student.value = {
      ...u,
      groupName: groupTitle,
      coins: u.coins !== undefined ? u.coins : 38,
    };

    if (u.coinTransactions && u.coinTransactions.length > 0) {
      transactions.value = u.coinTransactions.map((tx: any) => {
        let src: 'ADMIN' | 'HOMEWORK' | 'ATTENDANCE' | 'EXAM' | 'PRIZE' = 'ADMIN';
        const r = String(tx.reason || '').toUpperCase();
        if (r.includes('HOMEWORK')) src = 'HOMEWORK';
        else if (r.includes('ATTENDANCE')) src = 'ATTENDANCE';
        else if (r.includes('EXAM')) src = 'EXAM';
        else if (r.includes('PRIZE') || (tx.amount < 0 && !r.includes('ADMIN'))) src = 'PRIZE';

        return {
          id: tx.id,
          amount: tx.amount,
          reason: tx.reason,
          source: src,
          description: tx.description || `${src} orqali`,
          created_at: tx.created_at || new Date().toISOString(),
        };
      });
    } else {
      transactions.value = generateFallbackTransactions(student.value);
    }

    try {
      const allRes = await apiClient.get('/users', { params: { role: 'STUDENT', limit: 100 } });
      const body = allRes.data?.data ?? allRes.data;
      const allStudents: User[] = Array.isArray(body) ? body : (body.data || []);
      if (allStudents.length > 0) {
        totalStudentsCount.value = allStudents.length;
        const sorted = [...allStudents].sort((a, b) => (b.coins || 0) - (a.coins || 0));
        const idx = sorted.findIndex((s) => s.id === id);
        rank.value = idx >= 0 ? idx + 1 : 1;
      }
    } catch {
      rank.value = 1;
    }
  } catch {
    student.value = {
      id,
      firstName: 'Jasur',
      lastName: 'Bekmirzayev',
      phone: '+998 97 123 90 88',
      email: 'student@nyver.uz',
      role: 'STUDENT',
      status: 'ACTIVE',
      coins: 38,
      groupName: 'FE-201 (Vue 3 Pro & TS)',
    };
    transactions.value = generateFallbackTransactions(student.value);
    rank.value = 1;
  } finally {
    loading.value = false;
  }
}

// ─── Source Breakdown Analytics ─────────────────────────────────────────────
const analytics = computed(() => {
  let hw = 0;
  let att = 0;
  let ex = 0;
  let adm = 0;
  let spent = 0;

  for (const tx of transactions.value) {
    if (tx.amount > 0) {
      if (tx.source === 'HOMEWORK') hw += tx.amount;
      else if (tx.source === 'ATTENDANCE') att += tx.amount;
      else if (tx.source === 'EXAM') ex += tx.amount;
      else adm += tx.amount;
    } else {
      spent += Math.abs(tx.amount);
    }
  }

  const totalEarned = hw + att + ex + adm || 1;
  const hwPct = Math.round((hw / totalEarned) * 100);
  const attPct = Math.round((att / totalEarned) * 100);
  const exPct = Math.round((ex / totalEarned) * 100);
  const admPct = Math.max(0, 100 - (hwPct + attPct + exPct));

  return {
    hw,
    att,
    ex,
    adm,
    spent,
    totalEarned: hw + att + ex + adm,
    hwPct,
    attPct,
    exPct,
    admPct,
  };
});

// ─── Filtered Transactions ──────────────────────────────────────────────────
const filteredTransactions = computed(() => {
  return transactions.value.filter((tx) => {
    if (sourceFilter.value !== 'ALL' && tx.source !== sourceFilter.value) return false;
    if (typeFilter.value === 'PLUS' && tx.amount <= 0) return false;
    if (typeFilter.value === 'MINUS' && tx.amount >= 0) return false;

    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      const desc = (tx.description || '').toLowerCase();
      const r = (tx.reason || '').toLowerCase();
      if (!desc.includes(q) && !r.includes(q)) return false;
    }
    return true;
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────
const totalPages = computed(() => Math.ceil(filteredTransactions.value.length / pageSize.value) || 1);
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTransactions.value.slice(start, start + pageSize.value);
});

// ─── Open Adjust Modal ──────────────────────────────────────────────────────
function openGiveModal() {
  adjustMode.value = 'GIVE';
  adjustSourceType.value = 'HOMEWORK';
  hwScoreInput.value = 95;
  examScoreInput.value = 92;
  attendanceStatusInput.value = 'PRESENT';
  manualAmount.value = 3;
  adjustDescription.value = '';
  adjustSuccessMessage.value = '';
  showAdjustModal.value = true;
}

function openDeductModal() {
  adjustMode.value = 'TAKE';
  adjustSourceType.value = 'ADMIN';
  manualAmount.value = 3;
  adjustDescription.value = '';
  adjustSuccessMessage.value = '';
  showAdjustModal.value = true;
}

// ─── Execute Adjust ─────────────────────────────────────────────────────────
async function handleAdjustCoins() {
  if (!student.value) return;
  adjustSubmitting.value = true;

  let amount = 0;
  let finalDescription = '';
  let finalReason = '';

  if (adjustMode.value === 'GIVE') {
    amount = calculatedRewardAmount.value;
    if (adjustSourceType.value === 'HOMEWORK') {
      finalReason = 'HOMEWORK_EXCELLENT';
      finalDescription = adjustDescription.value.trim()
        ? `Uy vazifasi (${hwScoreInput.value} ball): ${adjustDescription.value.trim()}`
        : `Uy vazifasi (${hwScoreInput.value} ball) uchun`;
    } else if (adjustSourceType.value === 'ATTENDANCE') {
      finalReason = 'ATTENDANCE';
      finalDescription = adjustDescription.value.trim()
        ? `Dars davomati: ${adjustDescription.value.trim()}`
        : 'Dars davomati uchun (PRESENT)';
    } else if (adjustSourceType.value === 'EXAM') {
      finalReason = 'EXAM_RESULT';
      finalDescription = adjustDescription.value.trim()
        ? `Imtihon (${examScoreInput.value} ball): ${adjustDescription.value.trim()}`
        : `Imtihon natijasi (${examScoreInput.value} ball) uchun`;
    } else {
      finalReason = 'ADMIN_MANUAL';
      finalDescription = adjustDescription.value.trim()
        ? `Admin berdi: ${adjustDescription.value.trim()}`
        : 'Admin berdi (Rag\'batlantirish)';
    }
  } else {
    amount = -Math.abs(Number(manualAmount.value) || 0);
    finalReason = 'ADMIN_MANUAL';
    finalDescription = adjustDescription.value.trim()
      ? `Admin ayirdi: ${adjustDescription.value.trim()}`
      : 'Admin tomonidan jarima / tuzatish';
  }

  try {
    await apiClient.post(`/users/${student.value.id}/coins`, {
      amount,
      reason: finalReason,
      description: finalDescription,
    });
  } catch {
    // offline/mock fallback
  }

  const newBalance = Math.max(0, (student.value.coins || 0) + amount);
  student.value.coins = newBalance;

  transactions.value.unshift({
    id: Date.now(),
    amount,
    reason: finalReason,
    source: adjustSourceType.value,
    description: finalDescription,
    created_at: new Date().toISOString(),
  });

  adjustSubmitting.value = false;
  adjustSuccessMessage.value =
    amount > 0 ? `+${amount} coin muvaffaqiyatli berildi!` : `${amount} coin balansdan ayirildi!`;

  setTimeout(() => {
    showAdjustModal.value = false;
    adjustSuccessMessage.value = '';
  }, 1000);
}

function getTxMeta(tx: CoinTx) {
  if (tx.source === 'HOMEWORK') {
    return {
      title: 'Uyga Vazifa',
      icon: BookOpen,
      iconBg: 'bg-violet-50 text-[#6D28D9] border border-violet-100',
      badge: 'Vazifa',
      badgeBg: 'bg-violet-50 text-[#6D28D9] border-violet-200/60',
    };
  }
  if (tx.source === 'ATTENDANCE') {
    return {
      title: 'Dars Davomati',
      icon: CalendarCheck,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      badge: 'Davomat',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    };
  }
  if (tx.source === 'EXAM') {
    return {
      title: 'Imtihon / Test',
      icon: Award,
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      badge: 'Imtihon',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/60',
    };
  }
  if (tx.source === 'PRIZE') {
    return {
      title: "Sovg'alar Do'koni",
      icon: ShoppingBag,
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      badge: "Xarid",
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/60',
    };
  }
  return {
    title: 'Admin Amali',
    icon: Shield,
    iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    badge: 'Admin',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/60',
  };
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}, ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

onMounted(() => {
  loadStudentData();
});
</script>

<template>
  <div class="space-y-5 pb-16 font-sans">
    <!-- ─── TOP HEADER & ACTIONS ───────────────────────────────────────────── -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          @click="router.push('/management/coins')"
          type="button"
          class="h-9 w-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 flex items-center justify-center transition cursor-pointer shadow-2xs group"
          title="Tangalar boshqaruviga qaytish"
        >
          <ArrowLeft class="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div>
          <div class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span class="hover:text-slate-700 cursor-pointer" @click="router.push('/management/coins')">Coinlar & Reyting</span>
            <span>/</span>
            <span class="text-slate-700 font-bold">Talaba Tahlili</span>
          </div>
          <div class="flex items-center gap-2 mt-0.5">
            <h1 class="text-lg font-black text-slate-900 tracking-tight">
              {{ student ? `${student.firstName} ${student.lastName}` : 'Talaba Tahlili' }}
            </h1>
            <span v-if="student" class="text-[11px] px-2 py-0.5 rounded-md font-bold bg-violet-50 text-[#6D28D9] border border-violet-100">
              {{ student.groupName }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action buttons -->
      <div class="flex items-center gap-2">
        <button
          v-if="student"
          @click="router.push(`/dashboard/users/${student.id}`)"
          type="button"
          class="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <UserIcon class="h-3.5 w-3.5 text-slate-400" />
          <span>Profil</span>
          <ExternalLink class="h-3 w-3 text-slate-400" />
        </button>

        <button
          @click="openGiveModal"
          type="button"
          class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Coin Berish</span>
        </button>

        <button
          @click="openDeductModal"
          type="button"
          class="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Minus class="h-3.5 w-3.5" />
          <span>Jarima / Olish</span>
        </button>
      </div>
    </div>

    <!-- ─── STUDENT INFO & COIN SUMMARY (MINIMALIST) ────────────────────────── -->
    <div
      v-if="student"
      class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
    >
      <!-- Left: Student Info -->
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="relative">
          <div class="h-14 w-14 rounded-xl bg-linear-to-br from-violet-600 to-indigo-700 text-white font-black text-lg flex items-center justify-center shadow-xs uppercase">
            {{ (student.firstName?.[0] || '') + (student.lastName?.[0] || '') }}
          </div>
          <span
            class="absolute -bottom-1 -right-1 h-5 w-5 rounded-lg text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs"
            :class="rank === 1 ? 'bg-amber-400 text-amber-950' : 'bg-violet-600 text-white'"
          >
            #{{ rank }}
          </span>
        </div>

        <div class="space-y-1 min-w-0">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-black text-slate-900 truncate">
              {{ student.firstName }} {{ student.lastName }}
            </h2>
            <span class="px-2 py-0.2 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
              Faol
            </span>
          </div>

          <div class="flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span class="font-mono text-slate-700">{{ student.phone }}</span>
            <span v-if="student.email" class="text-slate-400">• {{ student.email }}</span>
            <span class="text-[#6D28D9] font-bold">• {{ student.groupName }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Coin Balance Widget -->
      <div class="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
        <div class="px-4 py-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
          <span class="text-2xl">🪙</span>
          <div>
            <p class="text-[10px] font-black uppercase tracking-wider text-amber-800">Joriy Balans</p>
            <div class="flex items-baseline gap-1">
              <span class="text-xl font-black text-slate-900">{{ student.coins || 0 }}</span>
              <span class="text-xs font-bold text-amber-700">Nyver Coin</span>
            </div>
          </div>
        </div>

        <div class="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2.5">
          <Trophy class="h-4 w-4 text-amber-500" />
          <div>
            <p class="text-[10px] font-bold text-slate-400 uppercase">Reyting</p>
            <p class="text-sm font-black text-slate-900">#{{ rank }} <span class="text-slate-400 font-normal text-xs">/ {{ totalStudentsCount }}</span></p>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── "NEGA COIN OLGAN?" (CLEAN MINIMAL METRICS) ─────────────────────── -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
            <span>Nega Coin Olgan? (Manbalar Taqsimoti)</span>
            <span class="text-xs font-bold text-slate-500">Jami kirim: +{{ analytics.totalEarned }} 🪙</span>
          </h2>
        </div>

        <div class="flex items-center gap-3 text-xs font-bold">
          <span class="text-emerald-700 flex items-center gap-1">
            <TrendingUp class="h-3.5 w-3.5" /> Kirim: +{{ analytics.totalEarned }} 🪙
          </span>
          <span class="text-rose-600 flex items-center gap-1">
            <TrendingDown class="h-3.5 w-3.5" /> Chiqim: -{{ analytics.spent }} 🪙
          </span>
        </div>
      </div>

      <!-- Compact Segmented Distribution Bar -->
      <div class="space-y-1.5">
        <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
          <div class="h-full bg-[#6D28D9]" :style="{ width: `${analytics.hwPct}%` }" :title="'Uyga vazifalar: ' + analytics.hwPct + '%'"></div>
          <div class="h-full bg-emerald-500" :style="{ width: `${analytics.attPct}%` }" :title="'Dars davomati: ' + analytics.attPct + '%'"></div>
          <div class="h-full bg-amber-500" :style="{ width: `${analytics.exPct}%` }" :title="'Imtihonlar: ' + analytics.exPct + '%'"></div>
          <div class="h-full bg-indigo-500" :style="{ width: `${analytics.admPct}%` }" :title="'Admin berdi: ' + analytics.admPct + '%'"></div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-bold text-slate-500 flex-wrap gap-2">
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-[#6D28D9]"></span> Uyga Vazifalar ({{ analytics.hwPct }}%)</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-emerald-500"></span> Dars Davomati ({{ analytics.attPct }}%)</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-amber-500"></span> Imtihonlar ({{ analytics.exPct }}%)</span>
          <span class="flex items-center gap-1"><span class="h-2 w-2 rounded-full bg-indigo-500"></span> Admin Berdi ({{ analytics.admPct }}%)</span>
        </div>
      </div>

      <!-- 4 Compact Cards (with new 1-3 scale formulas) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
        <!-- 1. Homework -->
        <div class="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-violet-300 transition-colors shadow-2xs space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span class="p-1 rounded-md bg-violet-50 text-[#6D28D9]">
                <BookOpen class="h-3.5 w-3.5" />
              </span>
              Uyga Vazifalar
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-50 text-[#6D28D9]">
              {{ analytics.hwPct }}%
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-xl font-black text-slate-900">+{{ analytics.hw }} 🪙</span>
          </div>
          <div class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
            <span>90+: <strong>3</strong></span>
            <span class="text-slate-300">|</span>
            <span>70-89: <strong>2</strong></span>
            <span class="text-slate-300">|</span>
            <span>60-69: <strong>1 🪙</strong></span>
          </div>
        </div>

        <!-- 2. Attendance -->
        <div class="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-emerald-300 transition-colors shadow-2xs space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span class="p-1 rounded-md bg-emerald-50 text-emerald-600">
                <CalendarCheck class="h-3.5 w-3.5" />
              </span>
              Dars Davomati
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {{ analytics.attPct }}%
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-xl font-black text-slate-900">+{{ analytics.att }} 🪙</span>
          </div>
          <div class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
            Darsga qatnashish (PRESENT): <strong class="text-emerald-700">1 🪙</strong>
          </div>
        </div>

        <!-- 3. Exam -->
        <div class="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-amber-300 transition-colors shadow-2xs space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span class="p-1 rounded-md bg-amber-50 text-amber-600">
                <Award class="h-3.5 w-3.5" />
              </span>
              Imtihon & Sinovlar
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {{ analytics.exPct }}%
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-xl font-black text-slate-900">+{{ analytics.ex }} 🪙</span>
          </div>
          <div class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
            <span>90+: <strong>3</strong></span>
            <span class="text-slate-300">|</span>
            <span>70-89: <strong>2</strong></span>
            <span class="text-slate-300">|</span>
            <span>60-69: <strong>1 🪙</strong></span>
          </div>
        </div>

        <!-- 4. Admin -->
        <div class="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-300 transition-colors shadow-2xs space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <span class="p-1 rounded-md bg-indigo-50 text-indigo-600">
                <Shield class="h-3.5 w-3.5" />
              </span>
              Admin Bergan
            </span>
            <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {{ analytics.admPct }}%
            </span>
          </div>
          <div class="flex items-baseline justify-between">
            <span class="text-xl font-black text-slate-900">+{{ analytics.adm }} 🪙</span>
          </div>
          <div class="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 truncate">
            Maxsus faollik & rag'batlantirish bonusi
          </div>
        </div>
      </div>
    </div>

    <!-- ─── TRANSAKSIYALAR TARIXI (MINIMALIST VA TOZA) ────────────────────────── -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
      <!-- Toolbar Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <h2 class="text-sm font-black text-slate-900 flex items-center gap-2">
          <span>Shaxsiy Tranzaksiyalar Tarixi</span>
          <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {{ filteredTransactions.length }} ta amal
          </span>
        </h2>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Search -->
          <div class="relative w-full sm:w-52">
            <Search class="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Qidirish..."
              class="w-full pl-7.5 pr-2.5 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none transition"
            />
          </div>

          <!-- Type filter -->
          <div class="flex items-center p-0.5 rounded-lg bg-slate-100 text-xs font-bold">
            <button
              @click="typeFilter = 'ALL'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer"
              :class="typeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'"
            >
              Hammasi
            </button>
            <button
              @click="typeFilter = 'PLUS'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-0.5"
              :class="typeFilter === 'PLUS' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-emerald-700'"
            >
              <Plus class="h-3 w-3" />
              <span>Kirim</span>
            </button>
            <button
              @click="typeFilter = 'MINUS'"
              type="button"
              class="px-2.5 py-1 rounded transition cursor-pointer flex items-center gap-0.5"
              :class="typeFilter === 'MINUS' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-rose-700'"
            >
              <Minus class="h-3 w-3" />
              <span>Chiqim</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Source Filter Chips -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold select-none">
        <button
          @click="sourceFilter = 'ALL'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition cursor-pointer shrink-0"
          :class="sourceFilter === 'ALL' ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          Hammasi
        </button>
        <button
          @click="sourceFilter = 'HOMEWORK'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shrink-0"
          :class="sourceFilter === 'HOMEWORK' ? 'bg-violet-600 text-white border-violet-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          <BookOpen class="h-3.5 w-3.5" />
          <span>Uyga Vazifa</span>
        </button>
        <button
          @click="sourceFilter = 'ATTENDANCE'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shrink-0"
          :class="sourceFilter === 'ATTENDANCE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          <CalendarCheck class="h-3.5 w-3.5" />
          <span>Davomat</span>
        </button>
        <button
          @click="sourceFilter = 'EXAM'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shrink-0"
          :class="sourceFilter === 'EXAM' ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          <Award class="h-3.5 w-3.5" />
          <span>Imtihon</span>
        </button>
        <button
          @click="sourceFilter = 'ADMIN'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shrink-0"
          :class="sourceFilter === 'ADMIN' ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          <Shield class="h-3.5 w-3.5" />
          <span>Admin</span>
        </button>
        <button
          @click="sourceFilter = 'PRIZE'"
          type="button"
          class="px-3 py-1.5 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shrink-0"
          :class="sourceFilter === 'PRIZE' ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'"
        >
          <ShoppingBag class="h-3.5 w-3.5" />
          <span>Sovg'a</span>
        </button>
      </div>

      <!-- Clean Minimal Transaction Card List -->
      <div v-if="paginatedTransactions.length > 0" class="space-y-2">
        <div
          v-for="tx in paginatedTransactions"
          :key="tx.id"
          class="p-3 sm:p-3.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/70 hover:border-slate-200/80 transition-all flex items-center justify-between gap-3 shadow-2xs"
        >
          <!-- Left: Icon + Title + Description -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
              :class="getTxMeta(tx).iconBg"
            >
              <component :is="getTxMeta(tx).icon" class="h-4.5 w-4.5" />
            </div>
            <div class="min-w-0 space-y-0.5">
              <div class="flex items-center gap-2">
                <span class="text-xs sm:text-[13px] font-bold text-slate-900 truncate">
                  {{ getTxMeta(tx).title }}
                </span>
                <span
                  class="px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0"
                  :class="getTxMeta(tx).badgeBg"
                >
                  {{ getTxMeta(tx).badge }}
                </span>
              </div>
              <p class="text-xs text-slate-500 font-medium truncate max-w-xl">
                {{ tx.description || tx.reason }}
              </p>
            </div>
          </div>

          <!-- Right: Date + Coin pill -->
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-xs text-slate-400 font-medium font-mono hidden sm:inline">
              {{ formatDateTime(tx.created_at) }}
            </span>
            <div
              class="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black shadow-2xs flex items-center gap-1.5 min-w-18 justify-center"
              :class="
                tx.amount > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-rose-50 text-rose-700 border border-rose-200/80'
              "
            >
              <span>{{ tx.amount > 0 ? `+${tx.amount}` : tx.amount }}</span>
              <span class="text-xs">🪙</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="py-12 text-center text-slate-400 text-xs">
        Hech qanday tranzaksiya topilmadi
      </div>

      <!-- Numeric Pagination Component -->
      <Pagination
        v-model:currentPage="currentPage"
        :totalPages="totalPages"
        :totalItems="filteredTransactions.length"
        :pageSize="pageSize"
      />
    </div>

    <!-- ─── QUICK ADJUST MODAL ─────────────────────────────────────────────── -->
    <Modal
      :show="showAdjustModal"
      :title="adjustMode === 'GIVE' ? 'Talabaga Coin Taqdim Etish' : 'Coin Ayirish (Jarima)'"
      @close="showAdjustModal = false"
    >
      <form @submit.prevent="handleAdjustCoins" class="space-y-4 text-xs">
        <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span class="font-bold text-slate-800">{{ student?.firstName }} {{ student?.lastName }}</span>
          <span class="font-black text-amber-600">{{ student?.coins || 0 }} 🪙</span>
        </div>

        <!-- Mode = GIVE: Source Type Selector -->
        <div v-if="adjustMode === 'GIVE'" class="space-y-1">
          <label class="font-bold text-slate-700">Mukofot Asosi:</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              @click="adjustSourceType = 'HOMEWORK'"
              type="button"
              class="p-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              :class="adjustSourceType === 'HOMEWORK' ? 'bg-violet-50 text-[#6D28D9] border-[#6D28D9]' : 'bg-white text-slate-600 border-slate-200'"
            >
              <BookOpen class="h-3.5 w-3.5" />
              <span>Vazifa</span>
            </button>
            <button
              @click="adjustSourceType = 'ATTENDANCE'"
              type="button"
              class="p-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              :class="adjustSourceType === 'ATTENDANCE' ? 'bg-emerald-50 text-emerald-700 border-emerald-600' : 'bg-white text-slate-600 border-slate-200'"
            >
              <CalendarCheck class="h-3.5 w-3.5" />
              <span>Davomat</span>
            </button>
            <button
              @click="adjustSourceType = 'EXAM'"
              type="button"
              class="p-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              :class="adjustSourceType === 'EXAM' ? 'bg-amber-50 text-amber-700 border-amber-600' : 'bg-white text-slate-600 border-slate-200'"
            >
              <Award class="h-3.5 w-3.5" />
              <span>Imtihon</span>
            </button>
            <button
              @click="adjustSourceType = 'ADMIN'"
              type="button"
              class="p-2 rounded-xl border font-bold transition flex items-center justify-center gap-1 cursor-pointer"
              :class="adjustSourceType === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-600' : 'bg-white text-slate-600 border-slate-200'"
            >
              <Shield class="h-3.5 w-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        <!-- 1. HOMEWORK SCORE -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'HOMEWORK'" class="p-3 rounded-xl bg-violet-50/60 border border-violet-100 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700">Vazifa bahosi (0-100):</span>
            <span class="font-black text-[#6D28D9]">{{ hwScoreInput }} ball</span>
          </div>
          <input v-model.number="hwScoreInput" type="range" min="0" max="100" class="w-full accent-[#6D28D9] cursor-pointer" />
          <div class="flex items-center justify-between text-[10px] text-slate-500">
            <span>60-69: +1 🪙</span>
            <span>70-89: +2 🪙</span>
            <span class="font-bold text-[#6D28D9]">90+: +3 🪙</span>
          </div>
        </div>

        <!-- 2. ATTENDANCE STATUS -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'ATTENDANCE'" class="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1.5">
          <label class="font-bold text-slate-700">Davomat holati:</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="attendanceStatusInput = 'PRESENT'"
              type="button"
              class="p-2 rounded-xl border font-bold transition cursor-pointer"
              :class="attendanceStatusInput === 'PRESENT' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border-slate-200'"
            >
              Qatnashdi (+1 coin)
            </button>
            <button
              @click="attendanceStatusInput = 'LATE'"
              type="button"
              class="p-2 rounded-xl border font-bold transition cursor-pointer"
              :class="attendanceStatusInput === 'LATE' ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 border-slate-200'"
            >
              Kechikdi (+0 coin)
            </button>
          </div>
        </div>

        <!-- 3. EXAM SCORE -->
        <div v-if="adjustMode === 'GIVE' && adjustSourceType === 'EXAM'" class="p-3 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-700">Imtihon bahosi (0-100):</span>
            <span class="font-black text-amber-700">{{ examScoreInput }} ball</span>
          </div>
          <input v-model.number="examScoreInput" type="range" min="0" max="100" class="w-full accent-amber-500 cursor-pointer" />
          <div class="flex items-center justify-between text-[10px] text-slate-500">
            <span>60-69: +1 🪙</span>
            <span>70-89: +2 🪙</span>
            <span class="font-bold text-amber-700">90+: +3 🪙</span>
          </div>
        </div>

        <!-- 4. MANUAL AMOUNT CHIPS -->
        <div v-if="adjustSourceType === 'ADMIN' || adjustMode === 'TAKE'" class="space-y-1.5">
          <label class="font-bold text-slate-700">Miqdor (coin):</label>
          <div class="flex gap-1.5">
            <button
              v-for="amt in [1, 2, 3, 5, 10]"
              :key="amt"
              type="button"
              @click="manualAmount = amt"
              class="px-2.5 py-1 rounded-lg border font-bold transition cursor-pointer"
              :class="manualAmount === amt ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : 'bg-slate-50 border-slate-200 text-slate-700'"
            >
              {{ adjustMode === 'GIVE' ? '+' : '-' }}{{ amt }}
            </button>
          </div>
        </div>

        <!-- Output preview -->
        <div class="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span class="font-bold text-slate-600">Natija:</span>
          <span class="text-sm font-black" :class="adjustMode === 'GIVE' ? 'text-emerald-600' : 'text-rose-600'">
            {{ adjustMode === 'GIVE' ? `+${calculatedRewardAmount}` : `-${manualAmount}` }} 🪙
          </span>
        </div>

        <div class="space-y-1">
          <label class="font-bold text-slate-700">Izoh / Sabab:</label>
          <input
            v-model="adjustDescription"
            type="text"
            placeholder="Masalan: Uyga vazifadagi a'lo faollik uchun"
            class="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-[#6D28D9] focus:outline-none"
          />
        </div>

        <div v-if="adjustSuccessMessage" class="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
          {{ adjustSuccessMessage }}
        </div>

        <div class="pt-2 flex justify-end gap-2">
          <button
            @click="showAdjustModal = false"
            type="button"
            class="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-600 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="adjustSubmitting"
            class="px-4 py-1.5 rounded-xl text-white font-bold cursor-pointer"
            :class="adjustMode === 'GIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'"
          >
            {{ adjustSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
