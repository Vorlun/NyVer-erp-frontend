<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { AttendanceStatus, User, Lesson, TeacherGroup } from '../../types';
import {
  CalendarCheck,
  Save,
  CheckCircle2,
  Layers,
  Users,
  BookOpen,
  Sparkles,
  Calendar,
  RotateCcw,
  AlertCircle,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// ─── State ────────────────────────────────────────────────────────────────────
const loadingGroups = ref(false);
const loadingGroupDetail = ref(false);
const saving = ref(false);
const saveSuccess = ref(false);
const errorMessage = ref('');

const teacherGroups = ref<TeacherGroup[]>([]);
const selectedGroupId = ref<number | null>(null);

const currentGroup = ref<any | null>(null);
const lessons = ref<Lesson[]>([]);
const selectedLessonId = ref<number | null>(null);

const formTopic = ref('');
const formDescription = ref('');

interface StudentRow {
  studentId: number;
  student: User;
  status: AttendanceStatus;
  coins: number;
  note: string;
}

const attendanceRows = ref<StudentRow[]>([]);

// ─── Calendar State ───────────────────────────────────────────────────────────
const today = new Date();
const calendarYear = ref(today.getFullYear());
const calendarMonth = ref(today.getMonth()); // 0-indexed

const UZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];
const UZ_DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function prevMonth() {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11;
    calendarYear.value--;
  } else {
    calendarMonth.value--;
  }
}
function nextMonth() {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0;
    calendarYear.value++;
  } else {
    calendarMonth.value++;
  }
}

// ─── Calendar Grid Generation ─────────────────────────────────────────────────
interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  lessons: Lesson[];
  hasLesson: boolean;
  isSelectable: boolean; // only today's lessons
}

const todayStr = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
});

// Map lesson dates to lesson objects
const lessonsByDate = computed<Record<string, Lesson[]>>(() => {
  const map: Record<string, Lesson[]> = {};
  for (const l of lessons.value) {
    const dateKey = (l.lessonDate as string)?.slice(0, 10);
    if (dateKey) {
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(l);
    }
  }
  return map;
});

const calendarDays = computed<CalendarDay[]>(() => {
  const year = calendarYear.value;
  const month = calendarMonth.value;

  const firstDayOfMonth = new Date(year, month, 1);
  // Monday-based week: 0=Mon,...,6=Sun
  let startDow = firstDayOfMonth.getDay(); // 0=Sun,1=Mon,...
  startDow = startDow === 0 ? 6 : startDow - 1; // convert to Mon-based

  const days: CalendarDay[] = [];

  // Fill leading days from prev month
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    const dateStr = formatDateStr(d);
    days.push(buildDay(d, dateStr, false));
  }

  // Days of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = formatDateStr(date);
    days.push(buildDay(date, dateStr, true));
  }

  // Fill trailing days to complete 6 rows
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, month + 1, d);
    const dateStr = formatDateStr(date);
    days.push(buildDay(date, dateStr, false));
  }

  return days;
});

function formatDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildDay(d: Date, dateStr: string, isCurrentMonth: boolean): CalendarDay {
  const isToday = dateStr === todayStr.value;
  const isPast = dateStr < todayStr.value;
  const isFuture = dateStr > todayStr.value;
  const dayLessons = lessonsByDate.value[dateStr] || [];
  const hasLesson = dayLessons.length > 0;
  // Selectable ONLY if today
  const isSelectable = isToday && hasLesson;

  return {
    date: d,
    dateStr,
    isCurrentMonth,
    isToday,
    isPast,
    isFuture,
    lessons: dayLessons,
    hasLesson,
    isSelectable,
  };
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const selectedLesson = computed(() => {
  if (!selectedLessonId.value) return null;
  return lessons.value.find((l) => l.id === selectedLessonId.value) || null;
});

const plannedLessonForOrder = computed(() => {
  if (!selectedLesson.value || !currentGroup.value) return null;
  const order = selectedLesson.value.lessonOrder;
  if (currentGroup.value.plan?.lessons) {
    const found = currentGroup.value.plan.lessons.find((pl: any) => pl.lessonOrder === order);
    if (found) return found;
  }
  if (currentGroup.value.course?.plans?.length > 0) {
    for (const plan of currentGroup.value.course.plans) {
      if (plan.lessons) {
        const found = plan.lessons.find((pl: any) => pl.lessonOrder === order);
        if (found) return found;
      }
    }
  }
  return null;
});

const isTopicCustomized = computed(() => {
  if (!plannedLessonForOrder.value) return false;
  return formTopic.value.trim() !== plannedLessonForOrder.value.topic.trim();
});

const allPlanLessons = computed(() => {
  if (!currentGroup.value) return [];
  if (currentGroup.value.plan?.lessons?.length) return currentGroup.value.plan.lessons;
  if (currentGroup.value.course?.plans?.[0]?.lessons?.length) return currentGroup.value.course.plans[0].lessons;
  return [];
});

const statsSummary = computed(() => {
  const total = attendanceRows.value.length;
  const present = attendanceRows.value.filter((r) => r.status === 'PRESENT').length;
  const late = attendanceRows.value.filter((r) => r.status === 'LATE').length;
  const absent = attendanceRows.value.filter((r) => r.status === 'ABSENT').length;
  const excused = attendanceRows.value.filter((r) => r.status === 'EXCUSED').length;
  return { total, present, late, absent, excused };
});

// ─── Data Loading ─────────────────────────────────────────────────────────────
async function loadTeacherGroups() {
  loadingGroups.value = true;
  try {
    let list = await erpService.getTeacherGroups();
    if (!list || list.length === 0) {
      const allGroups = await erpService.getGroups();
      list = (allGroups as any) || [];
    }
    teacherGroups.value = list;
    const queryGroupId = Number(route.query.groupId);
    if (queryGroupId && list.some((g: any) => g.id === queryGroupId)) {
      selectedGroupId.value = queryGroupId;
    } else if (list.length > 0) {
      selectedGroupId.value = list[0].id;
    }
  } catch (err) {
    console.error('Failed to load teacher groups:', err);
    errorMessage.value = 'Guruhlarni yuklashda xatolik yuz berdi';
  } finally {
    loadingGroups.value = false;
  }
}

async function loadGroupDetails(groupId: number) {
  loadingGroupDetail.value = true;
  errorMessage.value = '';
  selectedLessonId.value = null;
  attendanceRows.value = [];
  try {
    const groupData = await erpService.getTeacherGroup(groupId);
    currentGroup.value = groupData;
    lessons.value = groupData.lessons || [];

    // Auto-select today's lesson if query param given
    const queryLessonId = Number(route.query.lessonId);
    if (queryLessonId && lessons.value.some((l) => l.id === queryLessonId)) {
      const qLesson = lessons.value.find((l) => l.id === queryLessonId);
      const qDate = (qLesson?.lessonDate as string)?.slice(0, 10);
      // Only auto-select if it's today's lesson
      if (qDate === todayStr.value) {
        selectedLessonId.value = queryLessonId;
        await loadLessonAttendance();
      }
    }
    // Navigate calendar to show the month with lessons
    if (lessons.value.length > 0) {
      // Show current month
      calendarYear.value = today.getFullYear();
      calendarMonth.value = today.getMonth();
    }
  } catch (err) {
    console.error('Failed to load group detail:', err);
    errorMessage.value = "Guruh ma'lumotlarini yuklashda xatolik yuz berdi";
  } finally {
    loadingGroupDetail.value = false;
  }
}

async function loadLessonAttendance() {
  if (!selectedLessonId.value || !currentGroup.value) return;
  const activeLesson = lessons.value.find((l) => l.id === selectedLessonId.value);
  if (activeLesson) {
    formTopic.value = activeLesson.topic || '';
    formDescription.value = (activeLesson as any).description || '';
  }
  saveSuccess.value = false;
  try {
    const existingRecords = await erpService.getLessonAttendance(selectedLessonId.value);
    const records = Array.isArray(existingRecords) ? existingRecords : (existingRecords as any).data || [];
    const enrolledStudents: User[] = currentGroup.value.students || [];
    attendanceRows.value = enrolledStudents.map((student) => {
      const existing = records.find((r: any) => r.studentId === student.id);
      return {
        studentId: student.id,
        student,
        status: existing ? existing.status : 'PRESENT',
        coins: existing ? existing.coinsEarned : 1,
        note: existing?.note || '',
      };
    });
  } catch (err) {
    console.error('Failed to load lesson attendance:', err);
  }
}

async function handleGenerateSchedule() {
  if (!selectedGroupId.value) return;
  loadingGroupDetail.value = true;
  try {
    await erpService.generateGroupLessons(selectedGroupId.value);
    await loadGroupDetails(selectedGroupId.value);
  } catch (err) {
    console.error('Failed to generate schedule:', err);
  } finally {
    loadingGroupDetail.value = false;
  }
}

function applyTopicFromPlan(planLesson: any) {
  if (!planLesson) return;
  formTopic.value = planLesson.topic;
  if (planLesson.description) formDescription.value = planLesson.description;
}

function resetToOriginalPlan() {
  if (plannedLessonForOrder.value) {
    formTopic.value = plannedLessonForOrder.value.topic;
    formDescription.value = plannedLessonForOrder.value.description || '';
  }
}

function setStatus(row: StudentRow, status: AttendanceStatus) {
  row.status = status;
  row.coins = status === 'PRESENT' ? 1 : 0;
}

function markAllPresent() {
  attendanceRows.value.forEach((r) => { r.status = 'PRESENT'; r.coins = 1; });
}

function markAllAbsent() {
  attendanceRows.value.forEach((r) => { r.status = 'ABSENT'; r.coins = 0; });
}

// Click on a calendar day (only selectable days work)
async function selectCalendarDay(day: CalendarDay) {
  if (!day.isSelectable || day.lessons.length === 0) return;
  // Select the first lesson of that day (or the unattended one)
  const unattended = day.lessons.find((l: any) => !l.attendanceCount || l.attendanceCount === 0);
  const lessonToSelect = unattended || day.lessons[0];
  selectedLessonId.value = lessonToSelect.id;
  await loadLessonAttendance();
}

async function handleSaveAttendance() {
  if (!selectedLessonId.value) return;
  if (!formTopic.value.trim()) {
    errorMessage.value = 'Dars mavzusini kiritish majburiy';
    return;
  }
  saving.value = true;
  errorMessage.value = '';
  try {
    await erpService.saveAttendance(
      selectedLessonId.value,
      attendanceRows.value.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        coinsEarned: r.coins,
        note: r.note,
      })),
      formTopic.value.trim(),
      formDescription.value.trim() || undefined
    );
    const les = lessons.value.find((l) => l.id === selectedLessonId.value);
    if (les) {
      les.topic = formTopic.value.trim();
      (les as any).description = formDescription.value.trim();
      (les as any).attendanceCount = attendanceRows.value.length;
    }
    saveSuccess.value = true;
    setTimeout(() => { saveSuccess.value = false; }, 4500);
  } catch (err: any) {
    console.error('Save attendance error:', err);
    errorMessage.value = err?.response?.data?.message || 'Davomatni saqlashda xatolik yuz berdi';
  } finally {
    saving.value = false;
  }
}

watch(selectedGroupId, (newId) => {
  if (newId) {
    router.replace({ query: { ...route.query, groupId: String(newId) } });
    loadGroupDetails(newId);
  }
});

onMounted(() => {
  loadTeacherGroups();
});
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto pb-12">

    <!-- ── PAGE HEADER ── -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <CalendarCheck class="h-6 w-6 text-[#6D28D9]" />
          <span>Dars Jadvali va Davomat</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Faqat bugungi dars kunlarini tanlang, mavzu kiriting va talabalar davomatini saqlang.
        </p>
      </div>
      <button
        v-if="selectedLesson"
        @click="handleSaveAttendance"
        :disabled="saving"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
      >
        <Save class="h-4 w-4" />
        <span>{{ saving ? 'Saqlanmoqda...' : 'Davomatni Saqlash' }}</span>
      </button>
    </div>

    <!-- ── SUCCESS / ERROR ── -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="saveSuccess"
        class="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs">
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p class="font-bold">Davomat va dars mavzusi muvaffaqiyatli saqlandi!</p>
          <p class="text-[11px] text-emerald-700 font-normal mt-0.5">
            Darsga kelgan talabalarga +1 tanga biriktirildi.
          </p>
        </div>
      </div>
    </Transition>
    <div v-if="errorMessage" class="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- ── GURUH TANLASH ── -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
      <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">Guruhni tanlang:</label>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="group in teacherGroups"
          :key="group.id"
          @click="selectedGroupId = group.id"
          type="button"
          class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2"
          :class="selectedGroupId === group.id
            ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs'
            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'"
        >
          <Layers class="h-3.5 w-3.5" />
          <span>{{ group.name }}</span>
          <span class="text-[10px] px-1.5 py-0.5 rounded-md font-bold"
            :class="selectedGroupId === group.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'">
            {{ group.studentsCount || 0 }} talaba
          </span>
        </button>
      </div>
    </div>

    <!-- ── EMPTY SCHEDULE BANNER ── -->
    <div v-if="!loadingGroupDetail && lessons.length === 0 && selectedGroupId"
      class="bg-amber-50/80 border border-amber-200 p-6 rounded-2xl text-center space-y-3">
      <AlertCircle class="h-8 w-8 text-amber-600 mx-auto" />
      <h3 class="text-sm font-bold text-slate-800">Ushbu guruh dars jadvali hali shakllanmagan</h3>
      <p class="text-xs text-slate-600 max-w-md mx-auto">
        Kurs o'quv rejasidan shablon asosida darslar tartibi, sanalari va mavzularini avtomatik generatsiya qiling.
      </p>
      <button @click="handleGenerateSchedule" type="button"
        class="inline-flex items-center gap-2 px-4 py-2 bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded-xl transition cursor-pointer">
        <Sparkles class="h-3.5 w-3.5" />
        <span>O'quv Rejasidan Dars Jadvalini Shakllantirish</span>
      </button>
    </div>

    <!-- ── MAIN GRID: CALENDAR + FORM ── -->
    <div v-if="lessons.length > 0" class="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

      <!-- CALENDAR (3 cols) -->
      <div class="xl:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">

        <!-- Calendar header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button @click="prevMonth" type="button"
            class="h-8 w-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer">
            <ChevronLeft class="h-4 w-4" />
          </button>
          <h3 class="text-sm font-black text-slate-900">
            {{ UZ_MONTHS[calendarMonth] }} {{ calendarYear }}
          </h3>
          <button @click="nextMonth" type="button"
            class="h-8 w-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer">
            <ChevronRight class="h-4 w-4" />
          </button>
        </div>

        <!-- Legend -->
        <div class="flex items-center gap-4 px-5 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
          <div class="flex items-center gap-1.5">
            <div class="h-2.5 w-2.5 rounded-full bg-[#6D28D9]"></div>
            <span>Bugungi dars</span>
          </div>
          <div class="flex items-center gap-1.5">
            <div class="h-2.5 w-2.5 rounded-full bg-slate-300"></div>
            <span>O'tilgan/Kelgusi</span>
          </div>
        </div>

        <!-- Day-of-week headers -->
        <div class="grid grid-cols-7 border-b border-slate-100">
          <div
            v-for="day in UZ_DAYS"
            :key="day"
            class="text-center py-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider"
          >
            {{ day }}
          </div>
        </div>

        <!-- Calendar grid -->
        <div class="grid grid-cols-7 gap-px bg-slate-100">
          <div
            v-for="(day, idx) in calendarDays"
            :key="idx"
            @click="day.isSelectable ? selectCalendarDay(day) : null"
            class="bg-white relative min-h-14 p-1.5 flex flex-col transition-colors"
            :class="[
              !day.isCurrentMonth ? 'bg-slate-50/80' : '',
              day.isSelectable ? 'cursor-pointer hover:bg-violet-50' : '',
              day.isToday && !day.hasLesson ? 'ring-1 ring-inset ring-violet-200' : '',
              selectedLessonId && day.lessons.some(l => l.id === selectedLessonId) ? 'bg-violet-50/80 ring-1 ring-inset ring-[#6D28D9]/30' : '',
            ]"
          >
            <!-- Date number -->
            <span
              class="text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full mb-0.5"
              :class="[
                day.isToday ? 'bg-[#6D28D9] text-white' : '',
                !day.isToday && !day.isCurrentMonth ? 'text-slate-300' : '',
                !day.isToday && day.isCurrentMonth ? 'text-slate-700' : '',
              ]"
            >
              {{ day.date.getDate() }}
            </span>

            <!-- Lesson dots/chips for this day -->
            <div v-if="day.hasLesson" class="flex flex-col gap-0.5">
              <div
                v-for="lesson in day.lessons"
                :key="lesson.id"
                class="text-[9px] font-bold px-1 py-0.5 rounded-md leading-tight truncate"
                :class="[
                  day.isSelectable
                    ? 'bg-[#6D28D9]/10 text-[#6D28D9] border border-[#6D28D9]/20'
                    : 'bg-slate-100 text-slate-400 border border-slate-200',
                ]"
              >
                #{{ lesson.lessonOrder }}
              </div>
            </div>

            <!-- Lock icon for past/future lesson days -->
            <Lock
              v-if="day.hasLesson && !day.isSelectable"
              class="absolute top-1 right-1 h-3 w-3 text-slate-300"
            />
          </div>
        </div>

        <!-- Calendar footer hint -->
        <div class="px-5 py-3 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
          Faqat bugungi dars kunini tanlash mumkin
        </div>
      </div>

      <!-- RIGHT PANEL: Topic Form + Attendance (2 cols) -->
      <div class="xl:col-span-3 space-y-5">

        <!-- No day selected placeholder -->
        <div v-if="!selectedLesson" class="bg-white rounded-2xl border border-slate-200/80 border-dashed shadow-2xs p-12 text-center">
          <Calendar class="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <p class="text-sm font-bold text-slate-400">Dars kunini tanlang</p>
          <p class="text-xs text-slate-400 mt-1">Kalendarda bugungi dars kuniga bosing</p>
        </div>

        <!-- TOPIC FORM (shown when lesson selected) -->
        <div v-if="selectedLesson" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2.5">
              <span class="h-9 w-9 rounded-xl bg-violet-100 text-[#6D28D9] font-black text-sm flex items-center justify-center">
                #{{ selectedLesson.lessonOrder }}
              </span>
              <div>
                <h2 class="text-sm font-black text-slate-900">{{ selectedLesson.lessonOrder }}-Dars Mavzusi</h2>
                <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                  <span>Sana: <strong class="text-slate-800">{{ selectedLesson.lessonDate }}</strong></span>
                  <span>•</span>
                  <span>Vaqt: <strong class="text-slate-800">{{ selectedLesson.startTime || currentGroup?.startTime }} - {{ selectedLesson.endTime || currentGroup?.endTime }}</strong></span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="isTopicCustomized" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <Edit3 class="h-3 w-3" />
                <span>Unikal mavzu</span>
              </span>
              <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-[#6D28D9] border border-violet-200">
                <Sparkles class="h-3 w-3" />
                <span>Reja mavzusi</span>
              </span>
              <button v-if="isTopicCustomized && plannedLessonForOrder" @click="resetToOriginalPlan" type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer">
                <RotateCcw class="h-3 w-3" />
                <span>Rejaga qaytarish</span>
              </button>
            </div>
          </div>

          <!-- Plan template picker -->
          <div v-if="allPlanLessons.length > 0" class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
            <span class="font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
              <BookOpen class="h-3.5 w-3.5 text-[#6D28D9]" />
              <span>Shablondan:</span>
            </span>
            <select
              @change="(e) => {
                const targetId = Number((e.target as HTMLSelectElement).value);
                const found = allPlanLessons.find((pl: any) => pl.id === targetId || pl.lessonOrder === targetId);
                if (found) applyTopicFromPlan(found);
              }"
              class="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer"
            >
              <option value="" disabled selected>O'quv rejasidan mavzu tanlash...</option>
              <option v-for="pl in allPlanLessons" :key="pl.id || pl.lessonOrder" :value="pl.id || pl.lessonOrder">
                #{{ pl.lessonOrder }}-dars: {{ pl.topic }}
              </option>
            </select>
          </div>

          <!-- Topic + Description inputs -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-800">Dars Mavzusi *</label>
              <input v-model="formTopic" type="text" required
                placeholder="Masalan: JavaScript funksiyalar"
                class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]" />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-800">Tavsif / Materiallar</label>
              <input v-model="formDescription" type="text"
                placeholder="Mavzu tavsifi, slaydlar..."
                class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]" />
            </div>
          </div>
        </div>

        <!-- ATTENDANCE TABLE (shown when lesson selected) -->
        <div v-if="selectedLesson" class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <!-- Toolbar -->
          <div class="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <span class="font-bold text-slate-900 flex items-center gap-1.5">
                <Users class="h-4 w-4 text-[#6D28D9]" />
                <span>Guruh Talabalari ({{ statsSummary.total }} ta)</span>
              </span>
              <span class="text-slate-300">|</span>
              <span class="px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-800 text-[11px]">{{ statsSummary.present }} keldi</span>
              <span class="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 text-[11px]">{{ statsSummary.late }} kechikdi</span>
              <span class="px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800 text-[11px]">{{ statsSummary.absent }} kelmadi</span>
              <span v-if="statsSummary.excused > 0" class="px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-800 text-[11px]">{{ statsSummary.excused }} sababli</span>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" @click="markAllPresent"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer">
                ✓ Barchasi (+1)
              </button>
              <button type="button" @click="markAllAbsent"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer">
                ✕ Barchasi (0)
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
                <tr>
                  <th class="px-6 py-3.5">Talaba</th>
                  <th class="px-6 py-3.5">Davomat Holati</th>
                  <th class="px-6 py-3.5">Rag'bat (Tanga)</th>
                  <th class="px-6 py-3.5">Izoh</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-slate-700">
                <tr v-for="row in attendanceRows" :key="row.studentId" class="hover:bg-slate-50/80 transition-colors">
                  <td class="px-6 py-3.5">
                    <div class="flex items-center gap-3">
                      <div class="h-9 w-9 rounded-full bg-blue-50 text-blue-600 font-black flex items-center justify-center text-xs shrink-0 border border-blue-100">
                        {{ row.student.firstName?.charAt(0) || 'S' }}{{ row.student.lastName?.charAt(0) || '' }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-900 text-sm">{{ row.student.firstName }} {{ row.student.lastName }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">{{ row.student.phone || '' }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-3.5">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <button type="button" @click="setStatus(row, 'PRESENT')"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 min-w-16 justify-center"
                        :class="row.status === 'PRESENT' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'">
                        <span>✓</span><span>+1</span>
                      </button>
                      <button type="button" @click="setStatus(row, 'LATE')"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                        :class="row.status === 'LATE' ? 'bg-amber-500 text-white border-amber-500 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'">
                        <span>⏱</span><span>Kechikdi</span>
                      </button>
                      <button type="button" @click="setStatus(row, 'ABSENT')"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                        :class="row.status === 'ABSENT' ? 'bg-rose-600 text-white border-rose-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'">
                        <span>✕</span><span>Kelmadi</span>
                      </button>
                      <button type="button" @click="setStatus(row, 'EXCUSED')"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                        :class="row.status === 'EXCUSED' ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'">
                        <span>⚪</span><span>Sababli</span>
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-3.5">
                    <div class="flex items-center gap-1.5">
                      <input v-model.number="row.coins" type="number" min="0" max="10"
                        class="w-14 rounded-lg border border-slate-200 p-1.5 text-center font-bold text-slate-800 focus:border-[#6D28D9] focus:outline-none" />
                      <span class="text-slate-400 text-xs font-medium">coin</span>
                    </div>
                  </td>
                  <td class="px-6 py-3.5">
                    <input v-model="row.note" type="text" placeholder="Izoh..."
                      class="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#6D28D9] focus:outline-none" />
                  </td>
                </tr>
                <tr v-if="attendanceRows.length === 0">
                  <td colspan="4" class="px-6 py-8 text-center text-xs text-slate-400">
                    Ushbu guruhda hali talabalar ro'yxatga olinmagan.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Bottom save bar -->
          <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p class="text-xs text-slate-500">Davomatni saqlash orqali talabalar balansi va dars mavzusi yangilanadi.</p>
            <button @click="handleSaveAttendance" :disabled="saving"
              class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50">
              <Save class="h-4 w-4" />
              <span>{{ saving ? 'Saqlanmoqda...' : 'Davomatni Saqlash' }}</span>
            </button>
          </div>
        </div>

      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loadingGroupDetail" class="flex items-center justify-center py-16">
      <div class="h-8 w-8 rounded-full border-2 border-[#6D28D9] border-t-transparent animate-spin"></div>
    </div>

  </div>
</template>
