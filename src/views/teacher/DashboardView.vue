<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type {
  TeacherGroup,
  TeacherSubmission,
  TeacherDashboardStats,
  CreateLessonTeacherPayload,
} from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  Layers,
  Users,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  ExternalLink,
  BookOpen,
  Coins,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  CalendarCheck,
} from 'lucide-vue-next';

// State
const loading = ref(false);
const groups = ref<TeacherGroup[]>([]);
const submissions = ref<TeacherSubmission[]>([]);
const stats = ref<TeacherDashboardStats>({
  groupsCount: 0,
  studentsCount: 0,
  pendingSubmissionsCount: 0,
  checkedSubmissionsCount: 0,
});

const selectedGroupId = ref<number | 'all'>('all');
const searchQuery = ref('');

// Toast notification state
const toast = ref<{ show: boolean; message: string; type: 'success' | 'error' }>({
  show: false,
  message: '',
  type: 'success',
});

function showToast(message: string, type: 'success' | 'error' = 'success') {
  toast.value = { show: true, message, type };
  setTimeout(() => {
    toast.value.show = false;
  }, 4000);
}

// Load data
async function loadAllData() {
  loading.value = true;
  try {
    const [groupsData, subsData, statsData] = await Promise.all([
      erpService.getTeacherGroups(),
      erpService.getTeacherSubmissions(),
      erpService.getTeacherDashboardStats(),
    ]);

    groups.value = groupsData || [];
    submissions.value = subsData || [];
    if (statsData) {
      stats.value = statsData;
    }
  } catch (err) {
    console.error('Failed to load teacher data:', err);
    showToast('Ma\'lumotlarni yuklashda xatolik yuz berdi', 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAllData();
});

// Selected group helper
const selectedGroup = computed(() => {
  if (selectedGroupId.value === 'all') return null;
  return groups.value.find((g) => g.id === selectedGroupId.value) || null;
});

// Dynamic Revenue Calculations
const totalGroupRevenue = computed(() => {
  return groups.value.reduce(
    (acc, g) => acc + (g.groupMonthlyRevenue || g.studentsCount * (g.coursePrice || 850000)),
    0
  );
});

const totalTeacherEarnings = computed(() => {
  return groups.value.reduce(
    (acc, g) =>
      acc + (g.teacherEarnings || Math.round(g.studentsCount * (g.coursePrice || 850000) * 0.45)),
    0
  );
});

const currentViewRevenue = computed(() => {
  if (selectedGroup.value) {
    return (
      selectedGroup.value.teacherEarnings ||
      Math.round(
        selectedGroup.value.studentsCount * (selectedGroup.value.coursePrice || 850000) * 0.45
      )
    );
  }
  return totalTeacherEarnings.value;
});

const currentViewGroupRevenue = computed(() => {
  if (selectedGroup.value) {
    return (
      selectedGroup.value.groupMonthlyRevenue ||
      selectedGroup.value.studentsCount * (selectedGroup.value.coursePrice || 850000)
    );
  }
  return totalGroupRevenue.value;
});

const currentViewStudentsCount = computed(() => {
  if (selectedGroup.value) {
    return selectedGroup.value.studentsCount;
  }
  return (
    stats.value.studentsCount || groups.value.reduce((sum, g) => sum + g.studentsCount, 0)
  );
});

function formatMoney(amount?: number | null) {
  if (!amount && amount !== 0) return '0 so\'m';
  return Number(amount).toLocaleString('uz-UZ') + ' so\'m';
}

// Filtered Groups
const filteredGroups = computed(() => {
  if (!searchQuery.value.trim()) return groups.value;
  const q = searchQuery.value.toLowerCase();
  return groups.value.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.courseName.toLowerCase().includes(q) ||
      g.roomName.toLowerCase().includes(q)
  );
});

// Submissions filtered by selected group
const groupSubmissions = computed(() => {
  if (selectedGroupId.value === 'all') return submissions.value;
  return submissions.value.filter((s) => {
    const group = groups.value.find((g) => g.id === selectedGroupId.value);
    return group && s.groupName === group.name;
  });
});

// Kanban columns
const pendingSubmissions = computed(() =>
  groupSubmissions.value.filter(
    (s) => s.status === 'PENDING' || s.status === 'NOT_SUBMITTED'
  )
);

const checkedSubmissions = computed(() =>
  groupSubmissions.value.filter(
    (s) => s.status === 'CHECKED' || s.status === 'ACCEPTED' || s.status === 'REJECTED'
  )
);

// ============ BAHOLASH MODALI ============
const showGradeModal = ref(false);
const activeSubmission = ref<TeacherSubmission | null>(null);
const gradeScore = ref<number>(85);
const gradeFeedback = ref<string>('');
const gradeStatus = ref<'CHECKED' | 'ACCEPTED' | 'REJECTED'>('CHECKED');
const isSubmittingGrade = ref(false);

const computedCoins = computed(() => {
  if (gradeScore.value >= 80) return 10;
  if (gradeScore.value >= 60) return 5;
  return 0;
});

function openGradeModal(sub: TeacherSubmission) {
  activeSubmission.value = sub;
  gradeScore.value = sub.score !== null && sub.score !== undefined ? sub.score : 85;
  gradeFeedback.value = sub.feedback || '';
  gradeStatus.value = sub.status === 'REJECTED' ? 'REJECTED' : 'CHECKED';
  showGradeModal.value = true;
}

function setFeedbackTemplate(text: string) {
  gradeFeedback.value = text;
}

async function submitGrade() {
  if (!activeSubmission.value) return;

  isSubmittingGrade.value = true;
  try {
    await erpService.gradeTeacherSubmission(activeSubmission.value.id, {
      score: Number(gradeScore.value),
      feedback: gradeFeedback.value,
      coinsEarned: computedCoins.value,
      status: gradeStatus.value,
    });

    showToast('Topshiriq baholandi va talabaga tangalar biriktirildi!');
    showGradeModal.value = false;
    await loadAllData();
  } catch (err: any) {
    console.error('Failed to grade submission:', err);
    showToast(err?.response?.data?.message || 'Baholashda xatolik yuz berdi', 'error');
  } finally {
    isSubmittingGrade.value = false;
  }
}

// ============ YANGI DARS QO'SHISH MODALI ============
const showLessonModal = ref(false);
const isSavingLesson = ref(false);
const lessonForm = ref<CreateLessonTeacherPayload & { groupId: number | null }>({
  groupId: null,
  topic: '',
  videoUrl: '',
  content: '',
  homeworkTask: '',
  lessonDate: new Date().toISOString().slice(0, 10),
  startTime: '14:00',
  endTime: '16:00',
});

function openAddLessonModal(preselectedGroupId?: number) {
  lessonForm.value = {
    groupId: preselectedGroupId || (selectedGroupId.value !== 'all' ? selectedGroupId.value : groups.value[0]?.id ?? null),
    topic: '',
    videoUrl: '',
    content: '',
    homeworkTask: '',
    lessonDate: new Date().toISOString().slice(0, 10),
    startTime: '14:00',
    endTime: '16:00',
  };
  showLessonModal.value = true;
}

async function submitNewLesson() {
  if (!lessonForm.value.groupId || !lessonForm.value.topic.trim()) {
    showToast('Guruh va dars mavzusini kiritish majburiy', 'error');
    return;
  }

  isSavingLesson.value = true;
  try {
    await erpService.createTeacherLesson(lessonForm.value.groupId, {
      topic: lessonForm.value.topic,
      videoUrl: lessonForm.value.videoUrl || undefined,
      content: lessonForm.value.content || undefined,
      homeworkTask: lessonForm.value.homeworkTask || undefined,
      lessonDate: lessonForm.value.lessonDate,
      startTime: lessonForm.value.startTime,
      endTime: lessonForm.value.endTime,
    });

    showToast('Yangi dars va vazifa muvaffaqiyatli yaratildi!');
    showLessonModal.value = false;
    await loadAllData();
  } catch (err: any) {
    console.error('Failed to create lesson:', err);
    showToast(err?.response?.data?.message || 'Dars yaratishda xatolik yuz berdi', 'error');
  } finally {
    isSavingLesson.value = false;
  }
}

// ============ YANGI UYGA VAZIFA QO'SHISH MODALI ============
const showAddHomeworkModal = ref(false);
const isSavingHomework = ref(false);
const homeworkForm = ref<{
  groupId: number | null;
  lessonId: number | null;
  title: string;
  task: string;
  maxScore: number;
  maxCoins: number;
  deadline: string;
}>({
  groupId: null,
  lessonId: null,
  title: '',
  task: '',
  maxScore: 100,
  maxCoins: 10,
  deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
});

// Guruh darslari ro'yxati (homework modal uchun)
const selectedGroupLessons = computed(() => {
  if (!homeworkForm.value.groupId) return [];
  const g = groups.value.find((item) => item.id === homeworkForm.value.groupId);
  return g?.recentLessons || [];
});

function openAddHomeworkModal(preselectedGroupId?: number) {
  const targetGId = preselectedGroupId || (selectedGroupId.value !== 'all' ? selectedGroupId.value : groups.value[0]?.id ?? null);
  homeworkForm.value = {
    groupId: targetGId,
    lessonId: null,
    title: '',
    task: '',
    maxScore: 100,
    maxCoins: 10,
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  };
  showAddHomeworkModal.value = true;
}

async function submitNewHomework() {
  if (!homeworkForm.value.groupId || !homeworkForm.value.title.trim() || !homeworkForm.value.task.trim()) {
    showToast('Guruh, vazifa mavzusi va topshiriq shartini kiritish majburiy', 'error');
    return;
  }

  isSavingHomework.value = true;
  try {
    await erpService.createTeacherHomework(homeworkForm.value.groupId, {
      title: homeworkForm.value.title.trim(),
      task: homeworkForm.value.task.trim(),
      lessonId: homeworkForm.value.lessonId || undefined,
      maxScore: Number(homeworkForm.value.maxScore) || 100,
      maxCoins: Number(homeworkForm.value.maxCoins) || 10,
      deadline: homeworkForm.value.deadline || undefined,
    });

    showToast('Yangi uyga vazifa muvaffaqiyatli saqlandi!');
    showAddHomeworkModal.value = false;
    await loadAllData();
  } catch (err: any) {
    console.error('Failed to create homework:', err);
    showToast(err?.response?.data?.message || 'Vazifa yaratishda xatolik yuz berdi', 'error');
  } finally {
    isSavingHomework.value = false;
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}-${['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<template>
  <div class="space-y-6 pb-12 font-sans text-slate-800">
    <!-- TOAST NOTIFICATION -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="toast.show"
        class="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium"
        :class="
          toast.type === 'success'
            ? 'bg-white text-emerald-800 border-emerald-200 shadow-emerald-500/10'
            : 'bg-white text-rose-800 border-rose-200 shadow-rose-500/10'
        "
      >
        <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
        <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- HEADER & STATS -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">
          Mentor Kabineti
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Guruhlar ro'yxati, dars qo'shish va talabalar yuborgan vazifalarni tekshirish doskasi.
        </p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="loadAllData"
          class="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
          title="Yangilash"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <button
          @click="openAddHomeworkModal()"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#BC000D] text-white hover:bg-[#9c000b] active:scale-[0.98] transition shadow-sm cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Yangi uy vazifasi</span>
        </button>

        <button
          @click="openAddLessonModal()"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
        >
          <Plus class="w-4 h-4" />
          <span>Yangi dars</span>
        </button>
      </div>
    </div>

    <!-- METRICS CARDS (GURUH TANLANGANDA SHU GURUH UCHUN DINAMIK CHIQADI) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Guruh / Tanlangan Guruh -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 shrink-0">
          <Layers class="w-6 h-6" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">
            {{ selectedGroup ? 'Tanlangan Guruh' : 'Guruhlarim' }}
          </div>
          <div class="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">
            {{ selectedGroup ? selectedGroup.name : `${groups.length} ta guruh` }}
          </div>
          <div v-if="selectedGroup" class="text-[11px] text-slate-400 truncate">
            {{ selectedGroup.roomName }} • {{ selectedGroup.courseName }}
          </div>
        </div>
      </div>

      <!-- Card 2: Talabalar -->
      <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
          <Users class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {{ selectedGroup ? "Guruh O'quvchilari" : "Jami O'quvchilar" }}
          </div>
          <div class="text-2xl font-bold text-slate-900 mt-0.5">{{ currentViewStudentsCount }}</div>
          <div v-if="selectedGroup" class="text-[11px] text-slate-400">
            Sig'im: {{ selectedGroup.studentsCount }}/{{ selectedGroup.maxStudents }}
          </div>
        </div>
      </div>

      <!-- Card 3: Tekshirilmagan -->
      <div class="bg-white p-5 rounded-2xl border border-amber-100/70 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
          <Clock class="w-6 h-6" />
        </div>
        <div>
          <div class="text-xs font-medium text-amber-700 uppercase tracking-wider">Kutilayotgan Vazifalar</div>
          <div class="text-2xl font-bold text-amber-900 mt-0.5">{{ pendingSubmissions.length }}</div>
          <div class="text-[11px] text-slate-400">
            {{ checkedSubmissions.length }} ta tekshirilgan
          </div>
        </div>
      </div>

      <!-- Card 4: Mentor Daromadi / Guruh Tushumi -->
      <div class="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-700 shrink-0">
          <Coins class="w-6 h-6" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-bold text-emerald-800 uppercase tracking-wider truncate flex items-center gap-1">
            <TrendingUp class="w-3.5 h-3.5 text-emerald-600" />
            <span>{{ selectedGroup ? `${selectedGroup.name} Daromadi` : 'Oylik Mentor Daromadi' }}</span>
          </div>
          <div class="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-0.5 truncate">
            {{ formatMoney(currentViewRevenue) }}
          </div>
          <div class="text-[11px] text-emerald-600/90 font-medium mt-0.5 truncate">
            Guruh oylik tushumi: {{ formatMoney(currentViewGroupRevenue) }}
          </div>
        </div>
      </div>
    </div>

    <!-- MAIN SECTION: SPLIT LAYOUT (GURUHLAR RO'YXATI + KANBAN DOSKASI) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- LEFT COLUMN: GURUHLAR RO'YXATI (4 Cols) -->
      <div class="lg:col-span-4 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-base text-slate-900 flex items-center gap-2">
              <Layers class="w-4 h-4 text-[#BC000D]" />
              <span>Guruhlarim</span>
            </h2>
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {{ groups.length }} ta
            </span>
          </div>

          <!-- Search filter -->
          <div class="relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Guruh nomini qidirish..."
              class="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
            />
          </div>

          <!-- All groups selector button -->
          <button
            @click="selectedGroupId = 'all'"
            type="button"
            class="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer border"
            :class="
              selectedGroupId === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            "
          >
            <span>Barcha guruhlar topshiriqlari</span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px]"
              :class="selectedGroupId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ submissions.length }}
            </span>
          </button>

          <!-- Groups List -->
          <div class="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            <div
              v-for="group in filteredGroups"
              :key="group.id"
              @click="selectedGroupId = group.id"
              class="p-4 rounded-xl border transition-all cursor-pointer relative group/item"
              :class="
                selectedGroupId === group.id
                  ? 'border-[#BC000D] bg-red-50/20 shadow-xs ring-1 ring-[#BC000D]/20'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              "
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                    <span>{{ group.name }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600">
                      {{ group.roomName }}
                    </span>
                  </div>
                  <div class="text-xs text-slate-500 mt-0.5">{{ group.courseName }}</div>
                </div>

                <div class="flex items-center gap-1">
                  <router-link
                    :to="`/teacher/attendance?groupId=${group.id}`"
                    @click.stop
                    class="opacity-80 group-hover/item:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-[#6D28D9] hover:bg-violet-50 transition"
                    title="Davomat olish"
                  >
                    <CalendarCheck class="w-4 h-4" />
                  </router-link>
                  <button
                    @click.stop="openAddHomeworkModal(group.id)"
                    class="opacity-80 group-hover/item:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-[#BC000D] hover:bg-red-50 transition"
                    title="Vazifa qo'shish"
                  >
                    <Plus class="w-4 h-4" />
                  </button>
                  <router-link
                    :to="`/teacher/groups/${group.id}`"
                    @click.stop
                    class="opacity-60 group-hover/item:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    title="Guruhga kirish"
                  >
                    <ExternalLink class="w-3.5 h-3.5" />
                  </router-link>
                </div>
              </div>

              <!-- Group specs and revenue badge -->
              <div class="mt-3 pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <Clock class="w-3.5 h-3.5 text-slate-400" />
                    <span>{{ group.startTime }} - {{ group.endTime }}</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <Users class="w-3.5 h-3.5 text-slate-400" />
                    <span>{{ group.studentsCount }} o'quvchi</span>
                  </div>
                </div>

                <!-- Daromad ko'rsatkichi -->
                <div class="flex items-center justify-between pt-1">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <Coins class="w-3 h-3 text-emerald-600" />
                    <span>Daromad: {{ formatMoney(group.teacherEarnings || Math.round((group.studentsCount * (group.coursePrice || 850000)) * 0.45)) }}</span>
                  </span>
                  <span class="text-[10px] text-slate-400">
                    {{ group.lessonsCount }} dars
                  </span>
                </div>
              </div>
            </div>

            <div v-if="filteredGroups.length === 0" class="text-center py-8 text-xs text-slate-400">
              Guruhlar topilmadi
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN: KANBAN DOSKASI (8 Cols) -->
      <div class="lg:col-span-8 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
          <!-- Kanban Title & Group Context -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <h2 class="font-bold text-base text-slate-900 flex items-center gap-2">
                <BookOpen class="w-4 h-4 text-[#BC000D]" />
                <span>Uy vazifalari tekshirish doskasi</span>
              </h2>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-xs text-slate-500">
                  Guruh:
                  <span class="font-bold text-slate-800">
                    {{
                      selectedGroupId === 'all'
                        ? 'Barcha guruhlar'
                        : selectedGroup?.name || 'Tanlangan guruh'
                    }}
                  </span>
                </span>
                <span
                  v-if="selectedGroup"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  <Coins class="w-3.5 h-3.5 text-emerald-600" />
                  <span>Daromad: {{ formatMoney(selectedGroup.teacherEarnings) }}</span>
                </span>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center gap-2">
              <button
                @click="openAddHomeworkModal(selectedGroupId !== 'all' ? selectedGroupId : undefined)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#BC000D] text-white hover:bg-[#9c000b] active:scale-95 transition shadow-sm cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>+ Vazifa</span>
              </button>

              <button
                @click="openAddLessonModal(selectedGroupId !== 'all' ? selectedGroupId : undefined)"
                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>+ Dars</span>
              </button>

              <router-link
                v-if="selectedGroup"
                :to="`/teacher/groups/${selectedGroup.id}`"
                class="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
              >
                <span>Guruhga kirish</span>
                <ExternalLink class="w-3 h-3" />
              </router-link>
            </div>
          </div>

          <!-- KANBAN TWO COLUMNS -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <!-- COLUMN 1: TEKSHIRILMAGAN (PENDING) -->
            <div class="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col min-h-[500px]">
              <div class="flex items-center justify-between mb-3 px-1">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span class="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Tekshirilmagan
                  </span>
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {{ pendingSubmissions.length }}
                </span>
              </div>

              <!-- Pending cards list -->
              <div class="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-1">
                <div
                  v-for="sub in pendingSubmissions"
                  :key="sub.id"
                  class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-3"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="font-bold text-sm text-slate-900">
                        {{ sub.student.firstName }} {{ sub.student.lastName }}
                      </div>
                      <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span class="font-medium text-slate-700">{{ sub.groupName }}</span>
                        <span>•</span>
                        <span>{{ sub.lessonTopic }}</span>
                      </div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                      Kutilmoqda
                    </span>
                  </div>

                  <!-- Student answer / files -->
                  <div v-if="sub.textAnswer" class="p-2.5 rounded-lg bg-slate-50 text-xs text-slate-700 line-clamp-2 italic border border-slate-100">
                    "{{ sub.textAnswer }}"
                  </div>

                  <div v-if="sub.fileUrl || (sub.fileUrls && sub.fileUrls.length > 0)" class="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <ExternalLink class="w-3.5 h-3.5" />
                    <a
                      :href="sub.fileUrl || sub.fileUrls[0]"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="hover:underline truncate max-w-[200px]"
                    >
                      Topshirilgan fayl / havola
                    </a>
                  </div>

                  <!-- Date & Action Button -->
                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span class="text-[10px] text-slate-400">
                      {{ formatDate(sub.submittedAt) }}
                    </span>
                    <button
                      @click="openGradeModal(sub)"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#BC000D] text-white hover:bg-[#9c000b] transition cursor-pointer"
                    >
                      Baholash
                    </button>
                  </div>
                </div>

                <div v-if="pendingSubmissions.length === 0" class="text-center py-16 text-slate-400 text-xs">
                  Tekshirilmagan vazifalar mavjud emas ✨
                </div>
              </div>
            </div>

            <!-- COLUMN 2: TEKSHIRILGAN (CHECKED / ACCEPTED) -->
            <div class="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60 flex flex-col min-h-[500px]">
              <div class="flex items-center justify-between mb-3 px-1">
                <div class="flex items-center gap-2">
                  <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span class="font-bold text-xs uppercase tracking-wider text-slate-700">
                    Tekshirilgan
                  </span>
                </div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {{ checkedSubmissions.length }}
                </span>
              </div>

              <!-- Checked cards list -->
              <div class="space-y-3 flex-1 overflow-y-auto max-h-[620px] pr-1">
                <div
                  v-for="sub in checkedSubmissions"
                  :key="sub.id"
                  class="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-3"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <div class="font-bold text-sm text-slate-900">
                        {{ sub.student.firstName }} {{ sub.student.lastName }}
                      </div>
                      <div class="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                        <span class="font-medium text-slate-700">{{ sub.groupName }}</span>
                        <span>•</span>
                        <span>{{ sub.lessonTopic }}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      <!-- Score Badge -->
                      <span
                        class="text-xs font-bold px-2 py-0.5 rounded-md"
                        :class="
                          (sub.score || 0) >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : (sub.score || 0) >= 60
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        "
                      >
                        {{ sub.score ?? 0 }} ball
                      </span>

                      <!-- Coins Badge -->
                      <span
                        v-if="sub.coinsEarned"
                        class="text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-0.5"
                      >
                        <Coins class="w-3 h-3 text-amber-500" />
                        <span>+{{ sub.coinsEarned }}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Feedback quote -->
                  <div v-if="sub.feedback" class="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100/70 text-xs text-emerald-900">
                    <span class="font-semibold text-emerald-800">Mentor izohi:</span>
                    "{{ sub.feedback }}"
                  </div>

                  <!-- Date & Edit button -->
                  <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Tekshirildi: {{ formatDate(sub.checkedAt) }}</span>
                    <button
                      @click="openGradeModal(sub)"
                      class="text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline cursor-pointer"
                    >
                      Tahrirlash
                    </button>
                  </div>
                </div>

                <div v-if="checkedSubmissions.length === 0" class="text-center py-16 text-slate-400 text-xs">
                  Hozircha baholangan vazifalar yo'q
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL 1: BAHOLASH VA IZOH YOZISH -->
    <Modal
      :show="showGradeModal"
      title="Vazifani Baholash va Fikr Bildirish"
      description="Talabaga ball qo'ying, izoh yozing va rag'batlantiruvchi tangalar bering."
      maxWidth="lg"
      @close="showGradeModal = false"
    >
      <div v-if="activeSubmission" class="space-y-4 text-xs sm:text-sm">
        <!-- Submission Context Card -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-900">
              {{ activeSubmission.student.firstName }} {{ activeSubmission.student.lastName }}
            </span>
            <span class="text-[11px] text-slate-500">{{ activeSubmission.groupName }}</span>
          </div>
          <div class="text-xs text-slate-600">
            Dars: <strong>{{ activeSubmission.lessonTopic }}</strong>
          </div>

          <div v-if="activeSubmission.textAnswer" class="mt-2 pt-2 border-t border-slate-200/60 text-xs text-slate-700">
            <div class="font-medium text-slate-500 mb-0.5">Talaba javobi:</div>
            <div class="bg-white p-2.5 rounded-lg border border-slate-200 whitespace-pre-wrap">
              {{ activeSubmission.textAnswer }}
            </div>
          </div>

          <div v-if="activeSubmission.fileUrl || (activeSubmission.fileUrls && activeSubmission.fileUrls.length > 0)" class="mt-2 pt-2 border-t border-slate-200/60">
            <a
              :href="activeSubmission.fileUrl || activeSubmission.fileUrls[0]"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
            >
              <ExternalLink class="w-3.5 h-3.5" />
              <span>Yuborilgan fayl/havolani ochish</span>
            </a>
          </div>
        </div>

        <!-- Score Input -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between font-semibold text-slate-700">
            <label for="score">Ball (0 - 100):</label>
            <span class="text-base font-extrabold text-[#BC000D]">{{ gradeScore }} ball</span>
          </div>
          <input
            id="score"
            v-model.number="gradeScore"
            type="range"
            min="0"
            max="100"
            step="1"
            class="w-full accent-[#BC000D] cursor-pointer"
          />
        </div>

        <!-- Coin reward preview -->
        <div class="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Coins class="w-5 h-5 text-amber-500" />
            <div>
              <div class="text-xs font-bold text-amber-950">Avtomatik Tangalar (Gamification)</div>
              <div class="text-[11px] text-amber-800">Ballga qarab talabaga tangalar beriladi</div>
            </div>
          </div>
          <div class="text-base font-extrabold text-amber-600">
            +{{ computedCoins }} Coin
          </div>
        </div>

        <!-- Feedback & Template Buttons -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="font-semibold text-slate-700">Mentor Izohi (Feedback):</label>
            <span class="text-[11px] text-slate-400">Shablonlar:</span>
          </div>

          <div class="flex flex-wrap gap-1.5">
            <button
              type="button"
              @click="setFeedbackTemplate('A\'lo darajada bajarilgan, kod toza va mukammal!')"
              class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              ✨ A'lo
            </button>
            <button
              type="button"
              @click="setFeedbackTemplate('Yaxshi natija, lekin responsive dizaynga yana bir bor e\'tibor qarating.')"
              class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              📱 Responsive
            </button>
            <button
              type="button"
              @click="setFeedbackTemplate('Vazifani qayta ishlab, to\'liqroq javob yuboring.')"
              class="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              🔄 Qayta ishlash
            </button>
          </div>

          <textarea
            v-model="gradeFeedback"
            rows="3"
            placeholder="O'quvchiga izoh va tavsiyangizni yozing..."
            class="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D] text-xs sm:text-sm"
          ></textarea>
        </div>

        <!-- Status selector -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Holat:</label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              @click="gradeStatus = 'CHECKED'"
              class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              :class="
                gradeStatus === 'CHECKED'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600'
              "
            >
              <CheckCircle2 class="w-4 h-4 text-emerald-600" />
              <span>Qabul qilindi (Tekshirildi)</span>
            </button>
            <button
              type="button"
              @click="gradeStatus = 'REJECTED'"
              class="py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              :class="
                gradeStatus === 'REJECTED'
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : 'border-slate-200 bg-white text-slate-600'
              "
            >
              <AlertCircle class="w-4 h-4 text-rose-600" />
              <span>Qaytarildi (Qayta topshirish)</span>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          @click="showGradeModal = false"
          class="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          type="button"
          :disabled="isSubmittingGrade"
          @click="submitGrade"
          class="px-5 py-2 text-xs sm:text-sm font-bold bg-[#BC000D] text-white hover:bg-[#9c000b] rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <CheckCircle2 class="w-4 h-4" />
          <span>{{ isSubmittingGrade ? 'Saqlanmoqda...' : 'Baholashni Saqlash' }}</span>
        </button>
      </template>
    </Modal>

    <!-- MODAL 2: YANGI DARS QO'SHISH -->
    <Modal
      :show="showLessonModal"
      title="Guruhga Yangi Dars Qo'shish"
      description="Dars mavzusi, video linki va uy vazifasini belgilang."
      maxWidth="lg"
      @close="showLessonModal = false"
    >
      <form @submit.prevent="submitNewLesson" class="space-y-4 text-xs sm:text-sm">
        <!-- Group selection -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Guruhni tanlang:</label>
          <select
            v-model="lessonForm.groupId"
            class="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          >
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }} — {{ g.courseName }}
            </option>
          </select>
        </div>

        <!-- Topic -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Dars mavzusi:</label>
          <input
            v-model="lessonForm.topic"
            type="text"
            required
            placeholder="Masalan: 3-Dars: CSS Grid va Flexbox amaliyoti"
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          />
        </div>

        <!-- Video link -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Video darslik havolasi (YouTube / Havola):</label>
          <input
            v-model="lessonForm.videoUrl"
            type="url"
            placeholder="https://youtu.be/..."
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          />
        </div>

        <!-- Content / Description -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Dars matni va ko'rsatmalar:</label>
          <textarea
            v-model="lessonForm.content"
            rows="3"
            placeholder="Darsda o'rganiladigan asosiy tushunchalar..."
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          ></textarea>
        </div>

        <!-- Homework Task -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700 flex items-center justify-between">
            <span>Uy vazifasi sharti (Topshiriq):</span>
            <span class="text-[11px] text-slate-400">Avtomatik tizimga bog'lanadi</span>
          </label>
          <textarea
            v-model="lessonForm.homeworkTask"
            rows="2"
            placeholder="Talabalar bajarishi kerak bo'lgan vazifa shartini yozing..."
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          ></textarea>
        </div>

        <!-- Date & Time -->
        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Sana:</label>
            <input
              v-model="lessonForm.lessonDate"
              type="date"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Boshlanish:</label>
            <input
              v-model="lessonForm.startTime"
              type="text"
              placeholder="14:00"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Tugash:</label>
            <input
              v-model="lessonForm.endTime"
              type="text"
              placeholder="16:00"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="showLessonModal = false"
          class="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          type="button"
          :disabled="isSavingLesson"
          @click="submitNewLesson"
          class="px-5 py-2 text-xs sm:text-sm font-bold bg-[#BC000D] text-white hover:bg-[#9c000b] rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Plus class="w-4 h-4" />
          <span>{{ isSavingLesson ? 'Saqlanmoqda...' : 'Darsni Saqlash' }}</span>
        </button>
      </template>
    </Modal>

    <!-- MODAL 3: YANGI UYGA VAZIFA QO'SHISH -->
    <Modal
      :show="showAddHomeworkModal"
      title="Yangi Uyga Vazifa Qo'shish"
      description="Guruh talabalariga yangi topshiriq biriktirish va ball/tanga belgilash"
      maxWidth="lg"
      @close="showAddHomeworkModal = false"
    >
      <form @submit.prevent="submitNewHomework" class="space-y-4 text-xs sm:text-sm">
        <!-- Guruh tanlash -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Guruhni tanlang:</label>
          <select
            v-model="homeworkForm.groupId"
            class="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          >
            <option v-for="g in groups" :key="g.id" :value="g.id">
              {{ g.name }} — {{ g.courseName }}
            </option>
          </select>
        </div>

        <!-- Dars tanlash (agar mavjud bo'lsa) -->
        <div v-if="selectedGroupLessons.length > 0" class="space-y-1.5">
          <label class="font-semibold text-slate-700 flex items-center justify-between">
            <span>Biriktiriladigan dars:</span>
            <span class="text-[11px] text-slate-400">Ixtiyoriy</span>
          </label>
          <select
            v-model="homeworkForm.lessonId"
            class="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          >
            <option :value="null">Oxirgi darsga / Yangi darsga avtomatik biriktirish</option>
            <option v-for="l in selectedGroupLessons" :key="l.id" :value="l.id">
              {{ l.lessonOrder }}-Dars: {{ l.topic }}
            </option>
          </select>
        </div>

        <!-- Vazifa sarlavhasi -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Vazifa mavzusi / sarlavhasi:</label>
          <input
            v-model="homeworkForm.title"
            type="text"
            required
            placeholder="Masalan: Flexbox va Grid amaliy loyihasi"
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          />
        </div>

        <!-- Vazifa sharti -->
        <div class="space-y-1.5">
          <label class="font-semibold text-slate-700">Vazifa sharti va talablari:</label>
          <textarea
            v-model="homeworkForm.task"
            rows="3"
            required
            placeholder="Talaba nima qilishi kerakligi, talablar va topshirish ko'rsatmalari..."
            class="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#BC000D]/20 focus:border-[#BC000D]"
          ></textarea>
        </div>

        <!-- Ball, Coins & Deadline -->
        <div class="grid grid-cols-3 gap-2">
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Max Ball:</label>
            <input
              v-model.number="homeworkForm.maxScore"
              type="number"
              min="1"
              max="100"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Mukofot (Coin):</label>
            <input
              v-model.number="homeworkForm.maxCoins"
              type="number"
              min="0"
              max="50"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
          <div class="space-y-1">
            <label class="text-[11px] font-semibold text-slate-600">Muddat (Deadline):</label>
            <input
              v-model="homeworkForm.deadline"
              type="date"
              class="w-full p-2 rounded-xl border border-slate-200 text-xs"
            />
          </div>
        </div>
      </form>

      <template #footer>
        <button
          type="button"
          @click="showAddHomeworkModal = false"
          class="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          type="button"
          :disabled="isSavingHomework"
          @click="submitNewHomework"
          class="px-5 py-2 text-xs sm:text-sm font-bold bg-[#BC000D] text-white hover:bg-[#9c000b] rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Plus class="w-4 h-4" />
          <span>{{ isSavingHomework ? 'Saqlanmoqda...' : 'Vazifani Saqlash' }}</span>
        </button>
      </template>
    </Modal>
  </div>
</template>
