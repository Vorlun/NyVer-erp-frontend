<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import {
  Coins,
  Trophy,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Clock,
  ArrowRight,
  Layers,
  CreditCard,
  Zap,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

// ── TAB ──────────────────────────────────────────────
type Tab = 'home' | 'groups' | 'payments';
const activeTab = ref<Tab>('home');
const tabs = [
  { key: 'home' as Tab, label: 'Bosh sahifa' },
  { key: 'groups' as Tab, label: 'Guruhlarim' },
  { key: 'payments' as Tab, label: "To'lovlar" },
];

// ── DASHBOARD DATA ───────────────────────────────────
const loading = ref(true);
const dashData = ref({
  coins: 0,
  xp: 0,
  level: 1,
  xpInLevel: 0,
  xpToNext: 300,
  rating: 1,
  totalStudents: 1,
  upcomingLessons: [] as Array<{
    date: string;
    groupName: string;
    groupId: number;
    lessonId: number;
    topic: string;
    startTime: string;
    endTime: string;
  }>,
});

// ── CALENDAR ─────────────────────────────────────────
const calendarDate = ref(new Date());
const selectedDay = ref<string | null>(null);

const MONTH_NAMES = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const WEEK_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

const currentMonthLabel = computed(() => {
  const d = calendarDate.value;
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
});

const calendarDays = computed(() => {
  const d = calendarDate.value;
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Shift: Mon=0
  const startOffset = (firstDay + 6) % 7;
  const days: Array<{ date: string; day: number; isCurrentMonth: boolean; isToday: boolean }> = [];

  // Prev month fill
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    days.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day, isCurrentMonth: false, isToday: false });
  }

  // Current month
  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === i;
    days.push({ date: dateStr, day: i, isCurrentMonth: true, isToday });
  }

  // Next month fill
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`, day: i, isCurrentMonth: false, isToday: false });
  }

  return days;
});

const lessonDates = computed(() => {
  const set = new Set<string>();
  for (const l of dashData.value.upcomingLessons) set.add(l.date);
  return set;
});

const selectedDayLessons = computed(() => {
  if (!selectedDay.value) return [];
  return dashData.value.upcomingLessons.filter((l) => l.date === selectedDay.value);
});

function prevMonth() {
  const d = calendarDate.value;
  calendarDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  selectedDay.value = null;
}
function nextMonth() {
  const d = calendarDate.value;
  calendarDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  selectedDay.value = null;
}
function selectDay(dateStr: string) {
  selectedDay.value = selectedDay.value === dateStr ? null : dateStr;
}

// ── GROUPS ───────────────────────────────────────────
const groups = ref<any[]>([]);
const groupsLoading = ref(false);

async function loadGroups() {
  groupsLoading.value = true;
  try {
    const res = await erpService.getStudentGroups();
    groups.value = res || [];
  } catch (e) {
    console.error(e);
  } finally {
    groupsLoading.value = false;
  }
}

// ── PAYMENTS ─────────────────────────────────────────
const payments = ref<any[]>([]);
const paymentsLoading = ref(false);

async function loadPayments() {
  paymentsLoading.value = true;
  try {
    const res = await erpService.getPayments();
    const list = (res as any)?.data || res || [];
    payments.value = Array.isArray(list)
      ? list.map((p: any) => ({
          id: `INV-${String(p.id).padStart(4, '0')}`,
          date: p.paidForDate ? new Date(p.paidForDate).toLocaleDateString('uz-UZ') : '-',
          course: p.comment || "Kurs to'lovi",
          amount: Number(p.amount).toLocaleString('uz-UZ') + ' UZS',
          method: p.type === 'CASH' ? 'Naqd pul' : p.type || 'Bank',
          status: p.status === 'PAID' ? "To'langan" : p.status === 'PENDING' ? 'Kutilmoqda' : p.status,
          isPaid: p.status === 'PAID',
        }))
      : [];
  } catch (e) {
    console.error(e);
  } finally {
    paymentsLoading.value = false;
  }
}

const xpPercent = computed(() => {
  const pct = Math.round((dashData.value.xpInLevel / 300) * 100);
  return Math.min(pct, 100);
});

function formatTime(t: string) {
  if (!t) return '';
  return t.length > 5 ? t.slice(0, 5) : t;
}

function goToGroup(groupId: number) {
  router.push(`/student/groups/${groupId}`);
}

function switchTab(tab: Tab) {
  activeTab.value = tab;
  if (tab === 'groups' && groups.value.length === 0) loadGroups();
  if (tab === 'payments' && payments.value.length === 0) loadPayments();
}

onMounted(async () => {
  try {
    const data = await erpService.getStudentDashboard();
    if (data) dashData.value = data;
    // Pre-select today if has lessons
    const today = new Date().toISOString().slice(0, 10);
    if (data?.upcomingLessons?.some((l) => l.date === today)) {
      selectedDay.value = today;
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Header -->
    <div class="bg-white border-b border-slate-200 px-4 sm:px-6 py-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-base font-bold text-slate-900">
            Salom, {{ authStore.user?.firstName || 'Talaba' }} 👋
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">Bugun ham muvaffaqiyatli o'qish uchun tayyor bo'ling</p>
        </div>
        <div class="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Coins class="h-4 w-4 text-amber-500" />
          <span class="text-sm font-bold text-amber-700">{{ dashData.coins }}</span>
        </div>
      </div>

      <!-- Tab nav -->
      <div class="flex items-center gap-1 mt-4">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          @click="switchTab(t.key)"
          class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
          :class="activeTab === t.key
            ? 'bg-slate-900 text-white'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- ═══ HOME TAB ═══ -->
    <div v-if="activeTab === 'home'" class="p-4 sm:p-6 space-y-5 max-w-4xl mx-auto">

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <div class="h-24 bg-slate-200 rounded-2xl"></div>
        <div class="h-64 bg-slate-200 rounded-2xl"></div>
      </div>

      <template v-else>
        <!-- Gamification Card -->
        <div class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="grid grid-cols-3 gap-3">
            <!-- Coins -->
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
              <div class="flex items-center justify-center mb-1">
                <Coins class="h-5 w-5 text-amber-500" />
              </div>
              <div class="text-xl font-extrabold text-amber-700">{{ dashData.coins }}</div>
              <div class="text-[11px] text-amber-500 font-medium mt-0.5">Tangalar</div>
            </div>

            <!-- Level -->
            <div class="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-center">
              <div class="flex items-center justify-center mb-1">
                <Zap class="h-5 w-5 text-indigo-500" />
              </div>
              <div class="text-xl font-extrabold text-indigo-700">{{ dashData.level }}-bosqich</div>
              <div class="text-[11px] text-indigo-500 font-medium mt-0.5">{{ dashData.xp }} XP</div>
            </div>

            <!-- Rating -->
            <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
              <div class="flex items-center justify-center mb-1">
                <Trophy class="h-5 w-5 text-emerald-500" />
              </div>
              <div class="text-xl font-extrabold text-emerald-700">#{{ dashData.rating }}</div>
              <div class="text-[11px] text-emerald-500 font-medium mt-0.5">Reyting</div>
            </div>
          </div>

          <!-- XP Progress -->
          <div>
            <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
              <span class="font-semibold">{{ dashData.level }}-bosqich</span>
              <span>{{ dashData.xpInLevel }} / 300 XP</span>
              <span class="font-semibold">{{ dashData.level + 1 }}-bosqich</span>
            </div>
            <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                :style="{ width: `${xpPercent}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Calendar Section -->
        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="p-5">
            <!-- Month nav -->
            <div class="flex items-center justify-between mb-4">
              <button @click="prevMonth" type="button" class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                <ChevronLeft class="h-4 w-4" />
              </button>
              <span class="text-sm font-bold text-slate-900">{{ currentMonthLabel }}</span>
              <button @click="nextMonth" type="button" class="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                <ChevronRight class="h-4 w-4" />
              </button>
            </div>

            <!-- Weekday headers -->
            <div class="grid grid-cols-7 mb-2">
              <div v-for="wd in WEEK_DAYS" :key="wd" class="text-center text-[11px] font-bold text-slate-400 py-1">
                {{ wd }}
              </div>
            </div>

            <!-- Days grid -->
            <div class="grid grid-cols-7 gap-y-1">
              <button
                v-for="d in calendarDays"
                :key="d.date"
                type="button"
                @click="d.isCurrentMonth ? selectDay(d.date) : undefined"
                class="relative flex flex-col items-center justify-center h-9 rounded-xl text-xs font-semibold transition"
                :class="{
                  'cursor-pointer': d.isCurrentMonth,
                  'cursor-default': !d.isCurrentMonth,
                  'text-slate-200': !d.isCurrentMonth,
                  'text-slate-700 hover:bg-slate-100': d.isCurrentMonth && !d.isToday && selectedDay !== d.date,
                  'bg-slate-900 text-white': selectedDay === d.date,
                  'bg-rose-500 text-white': d.isToday && selectedDay !== d.date,
                }"
              >
                {{ d.day }}
                <!-- Red dot for lesson day -->
                <span
                  v-if="d.isCurrentMonth && lessonDates.has(d.date) && selectedDay !== d.date && !d.isToday"
                  class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-rose-500"
                ></span>
              </button>
            </div>
          </div>

          <!-- Selected day lessons -->
          <div v-if="selectedDay" class="border-t border-slate-100 p-4">
            <div v-if="selectedDayLessons.length > 0" class="space-y-2">
              <div class="text-xs font-bold text-slate-700 mb-2">
                {{ selectedDay }} — Dars jadvali
              </div>
              <div
                v-for="lesson in selectedDayLessons"
                :key="lesson.lessonId"
                class="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:border-slate-300 transition"
                @click="goToGroup(lesson.groupId)"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-lg bg-rose-100 border border-rose-200 flex items-center justify-center">
                    <BookOpen class="h-4 w-4 text-rose-600" />
                  </div>
                  <div>
                    <div class="text-xs font-bold text-slate-900">{{ lesson.groupName }}</div>
                    <div class="text-[11px] text-slate-500">{{ lesson.topic }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1 text-[11px] font-mono text-slate-500 shrink-0">
                  <Clock class="h-3 w-3" />
                  <span>{{ formatTime(lesson.startTime) }}–{{ formatTime(lesson.endTime) }}</span>
                </div>
              </div>
            </div>
            <div v-else class="py-3 text-center text-xs text-slate-400">
              Bu kunda dars yo'q
            </div>
          </div>
          <div v-else class="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
            Dars kunlarini ko'rish uchun sanaga bosing
          </div>
        </div>

        <!-- Upcoming lessons quick list -->
        <div v-if="dashData.upcomingLessons.length > 0">
          <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Yaqinlashayotgan darslar</h3>
          <div class="space-y-2">
            <div
              v-for="lesson in dashData.upcomingLessons.slice(0, 5)"
              :key="`${lesson.date}-${lesson.lessonId}`"
              class="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition cursor-pointer"
              @click="goToGroup(lesson.groupId)"
            >
              <div class="flex items-center gap-3">
                <div class="text-center min-w-[36px]">
                  <div class="text-[10px] text-slate-400 font-medium">{{ lesson.date.slice(5, 7) }}/{{ lesson.date.slice(8, 10) }}</div>
                </div>
                <div>
                  <div class="text-xs font-bold text-slate-900">{{ lesson.groupName }}</div>
                  <div class="text-[11px] text-slate-500 truncate max-w-xs">{{ lesson.topic }}</div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                <Clock class="h-3 w-3" />
                <span class="font-mono">{{ formatTime(lesson.startTime) }}</span>
                <ArrowRight class="h-3 w-3 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ GROUPS TAB ═══ -->
    <div v-else-if="activeTab === 'groups'" class="p-4 sm:p-6 max-w-4xl mx-auto">
      <div v-if="groupsLoading" class="space-y-3 animate-pulse">
        <div v-for="i in 2" :key="i" class="h-28 bg-slate-200 rounded-2xl"></div>
      </div>

      <div v-else-if="groups.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Layers class="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p class="text-sm font-semibold text-slate-600">Hali guruh yo'q</p>
        <p class="text-xs text-slate-400 mt-1">Siz hali hech qaysi guruhga qo'shilmagansiz</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="group in groups"
          :key="group.id"
          class="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition cursor-pointer"
          @click="goToGroup(group.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-sm font-bold text-slate-900">{{ group.name }}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="group.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'">
                  {{ group.status === 'ACTIVE' ? 'Faol' : group.status }}
                </span>
              </div>
              <div class="text-xs text-slate-500 mb-0.5">{{ group.courseName }}</div>
              <div class="text-[11px] text-slate-400">O'qituvchi: <span class="font-semibold text-slate-600">{{ group.teacherName }}</span></div>
              <div class="text-[11px] text-slate-400 mt-0.5 font-mono">{{ formatTime(group.startTime) }}–{{ formatTime(group.endTime) }}</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-base font-extrabold text-slate-900">{{ group.progressPercent }}%</div>
              <div class="text-[10px] text-slate-400">{{ group.completedLessons }}/{{ group.totalLessons }} dars</div>
            </div>
          </div>

          <!-- Progress bar -->
          <div class="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
              :style="{ width: `${group.progressPercent}%` }"
            ></div>
          </div>

          <div class="flex items-center justify-between mt-3">
            <div class="flex items-center gap-1 text-[11px] text-slate-400">
              <BookOpen class="h-3 w-3" />
              <span>{{ group.weekDays?.join(', ') || 'Har kuni' }}</span>
            </div>
            <div class="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold">
              <span>Darslarni ko'rish</span>
              <ArrowRight class="h-3 w-3" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ PAYMENTS TAB ═══ -->
    <div v-else-if="activeTab === 'payments'" class="p-4 sm:p-6 max-w-4xl mx-auto">
      <div v-if="paymentsLoading" class="animate-pulse h-40 bg-slate-200 rounded-2xl"></div>

      <div v-else-if="payments.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <CreditCard class="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p class="text-sm font-semibold text-slate-600">To'lovlar tarixi yo'q</p>
      </div>

      <div v-else class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th class="py-3 px-4 font-bold">Kvitansiya</th>
                <th class="py-3 px-4 font-bold">Sana</th>
                <th class="py-3 px-4 font-bold">Kurs</th>
                <th class="py-3 px-4 font-bold">Summa</th>
                <th class="py-3 px-4 font-bold">Usul</th>
                <th class="py-3 px-4 font-bold">Holat</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="p in payments" :key="p.id" class="hover:bg-slate-50/60 transition">
                <td class="py-3 px-4 font-mono text-slate-500">{{ p.id }}</td>
                <td class="py-3 px-4 text-slate-700">{{ p.date }}</td>
                <td class="py-3 px-4 font-medium text-slate-800">{{ p.course }}</td>
                <td class="py-3 px-4 font-bold text-slate-900">{{ p.amount }}</td>
                <td class="py-3 px-4 text-slate-600">{{ p.method }}</td>
                <td class="py-3 px-4">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                    :class="p.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'">
                    {{ p.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
