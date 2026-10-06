<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { AttendanceStatus, User, Lesson, TeacherGroup } from '../../types';
import {
  CalendarCheck,
  Save,
  CheckCircle2,
  Coins,
  Clock,
  Layers,
  Users,
  BookOpen,
  Sparkles,
  Calendar,
  RotateCcw,
  Check,
  AlertCircle,
  Edit3,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// State
const loadingGroups = ref(false);
const loadingGroupDetail = ref(false);
const saving = ref(false);
const saveSuccess = ref(false);
const errorMessage = ref('');

const teacherGroups = ref<TeacherGroup[]>([]);
const selectedGroupId = ref<number | null>(null);

// Active group data
const currentGroup = ref<any | null>(null);
const lessons = ref<Lesson[]>([]);
const selectedLessonId = ref<number | null>(null);

// Topic & Material form for current lesson
const formTopic = ref('');
const formDescription = ref('');

// Attendance sheet state
interface StudentRow {
  studentId: number;
  student: User;
  status: AttendanceStatus;
  coins: number;
  note: string;
}

const attendanceRows = ref<StudentRow[]>([]);

// Selected lesson computed
const selectedLesson = computed(() => {
  if (!selectedLessonId.value) return null;
  return lessons.value.find((l) => l.id === selectedLessonId.value) || null;
});

// Planned topic from course plan for this lesson order
const plannedLessonForOrder = computed(() => {
  if (!selectedLesson.value || !currentGroup.value) return null;
  const order = selectedLesson.value.lessonOrder;

  // 1. From group assigned plan
  if (currentGroup.value.plan?.lessons) {
    const found = currentGroup.value.plan.lessons.find((pl: any) => pl.lessonOrder === order);
    if (found) return found;
  }

  // 2. From course default plan
  if (currentGroup.value.course?.plans && currentGroup.value.course.plans.length > 0) {
    for (const plan of currentGroup.value.course.plans) {
      if (plan.lessons) {
        const found = plan.lessons.find((pl: any) => pl.lessonOrder === order);
        if (found) return found;
      }
    }
  }

  return null;
});

// Is topic customized by teacher vs matching original plan
const isTopicCustomized = computed(() => {
  if (!plannedLessonForOrder.value) return false;
  return formTopic.value.trim() !== plannedLessonForOrder.value.topic.trim();
});

// Available plan template lessons for quick selection
const allPlanLessons = computed(() => {
  if (!currentGroup.value) return [];
  if (currentGroup.value.plan?.lessons?.length) {
    return currentGroup.value.plan.lessons;
  }
  if (currentGroup.value.course?.plans?.[0]?.lessons?.length) {
    return currentGroup.value.course.plans[0].lessons;
  }
  return [];
});

// Attendance summary stats
const statsSummary = computed(() => {
  const total = attendanceRows.value.length;
  const present = attendanceRows.value.filter((r) => r.status === 'PRESENT').length;
  const late = attendanceRows.value.filter((r) => r.status === 'LATE').length;
  const absent = attendanceRows.value.filter((r) => r.status === 'ABSENT').length;
  const excused = attendanceRows.value.filter((r) => r.status === 'EXCUSED').length;
  return { total, present, late, absent, excused };
});

// Load groups assigned to this teacher
async function loadTeacherGroups() {
  loadingGroups.value = true;
  try {
    let list = await erpService.getTeacherGroups();
    if (!list || list.length === 0) {
      const allGroups = await erpService.getGroups();
      list = (allGroups as any) || [];
    }
    teacherGroups.value = list;

    // Determine initial group
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

// Load full details of selected group (lessons, syllabus plan, students)
async function loadGroupDetails(groupId: number) {
  loadingGroupDetail.value = true;
  errorMessage.value = '';
  try {
    const groupData = await erpService.getTeacherGroup(groupId);
    currentGroup.value = groupData;
    lessons.value = groupData.lessons || [];

    // Select lesson
    const queryLessonId = Number(route.query.lessonId);
    if (queryLessonId && lessons.value.some((l) => l.id === queryLessonId)) {
      selectedLessonId.value = queryLessonId;
    } else if (lessons.value.length > 0) {
      // Pick first lesson that has not been marked yet, or the first lesson
      const pendingLesson = lessons.value.find((l: any) => !l.attendanceCount || l.attendanceCount === 0);
      selectedLessonId.value = pendingLesson ? pendingLesson.id : lessons.value[0].id;
    } else {
      selectedLessonId.value = null;
    }

    if (selectedLessonId.value) {
      await loadLessonAttendance();
    }
  } catch (err) {
    console.error('Failed to load group detail:', err);
    errorMessage.value = "Guruh ma'lumotlarini yuklashda xatolik yuz berdi";
  } finally {
    loadingGroupDetail.value = false;
  }
}

// Load attendance records for active lesson
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
        // Per AGENTS.md: PRESENT = 1 coin, LATE/ABSENT = 0
        coins: existing ? existing.coinsEarned : 1,
        note: existing?.note || '',
      };
    });
  } catch (err) {
    console.error('Failed to load lesson attendance:', err);
  }
}

// Generate schedule if group had no lessons
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

// Select a topic from course syllabus templates
function applyTopicFromPlan(planLesson: any) {
  if (!planLesson) return;
  formTopic.value = planLesson.topic;
  if (planLesson.description) {
    formDescription.value = planLesson.description;
  }
}

// Reset topic back to original plan
function resetToOriginalPlan() {
  if (plannedLessonForOrder.value) {
    formTopic.value = plannedLessonForOrder.value.topic;
    formDescription.value = plannedLessonForOrder.value.description || '';
  }
}

// Attendance Status change handler (Strictly follows AGENTS.md gamification rules: PRESENT = 1, others = 0)
function setStatus(row: StudentRow, status: AttendanceStatus) {
  row.status = status;
  if (status === 'PRESENT') row.coins = 1;
  else row.coins = 0;
}

// Quick mass status helpers
function markAllPresent() {
  attendanceRows.value.forEach((r) => {
    r.status = 'PRESENT';
    r.coins = 1;
  });
}

function markAllAbsent() {
  attendanceRows.value.forEach((r) => {
    r.status = 'ABSENT';
    r.coins = 0;
  });
}

// Select a lesson from schedule
function selectLesson(lessonId: number) {
  selectedLessonId.value = lessonId;
  loadLessonAttendance();
}

// Save attendance & atomic update of lesson topic/description
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

    // Update locally in lesson list
    const les = lessons.value.find((l) => l.id === selectedLessonId.value);
    if (les) {
      les.topic = formTopic.value.trim();
      (les as any).description = formDescription.value.trim();
      (les as any).attendanceCount = attendanceRows.value.length;
    }

    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 4500);
  } catch (err: any) {
    console.error('Save attendance error:', err);
    errorMessage.value = err?.response?.data?.message || 'Davomatni saqlashda xatolik yuz berdi';
  } finally {
    saving.value = false;
  }
}

// Watchers
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
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <CalendarCheck class="h-6 w-6 text-[#6D28D9]" />
          <span>Dars Jadvali va Davomat</span>
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Guruh o'quv rejasini ko'rish, dars mavzusini kiritish va talabalar davomatini rag'batlantirish.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
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
    </div>

    <!-- Success & Error Banners -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="saveSuccess"
        class="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-xs"
      >
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p class="font-bold">Davomat va dars mavzusi muvaffaqiyatli saqlandi!</p>
          <p class="text-[11px] text-emerald-700 font-normal mt-0.5">
            Darsga kelgan talabalarga +1 tanga biriktirildi va tarixga yozildi.
          </p>
        </div>
      </div>
    </Transition>

    <div
      v-if="errorMessage"
      class="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl"
    >
      <AlertCircle class="h-4 w-4 shrink-0" />
      <span>{{ errorMessage }}</span>
    </div>

    <!-- 1. GURUH TANLASH PANELI -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <!-- Group Dropdown / Pills -->
        <div class="flex-1 space-y-1.5">
          <label class="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Guruhni tanlang:
          </label>
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="group in teacherGroups"
              :key="group.id"
              @click="selectedGroupId = group.id"
              type="button"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-2"
              :class="
                selectedGroupId === group.id
                  ? 'bg-[#6D28D9] text-white border-[#6D28D9] shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              "
            >
              <Layers class="h-3.5 w-3.5" />
              <span>{{ group.name }}</span>
              <span
                class="text-[10px] px-1.5 py-0.2 rounded-md font-bold"
                :class="selectedGroupId === group.id ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'"
              >
                {{ group.studentsCount || 0 }} talaba
              </span>
            </button>
          </div>
        </div>

        <!-- Selected Group Meta Pill -->
        <div
          v-if="currentGroup"
          class="flex flex-wrap items-center gap-3 bg-violet-50/70 border border-violet-100 px-4 py-2.5 rounded-xl text-xs text-slate-700"
        >
          <div class="flex items-center gap-1.5 font-bold text-[#6D28D9]">
            <BookOpen class="h-3.5 w-3.5" />
            <span>{{ currentGroup.course?.name || currentGroup.courseName }}</span>
          </div>
          <span class="text-slate-300">•</span>
          <div class="flex items-center gap-1 text-slate-600">
            <Clock class="h-3.5 w-3.5 text-slate-400" />
            <span>{{ currentGroup.startTime }} - {{ currentGroup.endTime }}</span>
          </div>
          <span class="text-slate-300">•</span>
          <div class="flex items-center gap-1 font-semibold text-slate-800">
            <span>{{ currentGroup.room?.name || currentGroup.roomName || 'Xona' }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty schedule banner if group has no lessons -->
    <div
      v-if="!loadingGroupDetail && lessons.length === 0"
      class="bg-amber-50/80 border border-amber-200 p-6 rounded-2xl text-center space-y-3"
    >
      <AlertCircle class="h-8 w-8 text-amber-600 mx-auto" />
      <h3 class="text-sm font-bold text-slate-800">Ushbu guruh dars jadvali hali shakllanmagan</h3>
      <p class="text-xs text-slate-600 max-w-md mx-auto">
        Kurs o'quv rejasidan shablon asosida darslar tartibi, sanalari va mavzularini bir zumda avtomatik generatsiya qilish mumkin.
      </p>
      <button
        @click="handleGenerateSchedule"
        type="button"
        class="inline-flex items-center gap-2 px-4 py-2 bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold rounded-xl transition cursor-pointer"
      >
        <Sparkles class="h-3.5 w-3.5" />
        <span>O'quv Rejasidan Dars Jadvalini Shakllantirish</span>
      </button>
    </div>

    <!-- 2. DARS JADVALI TIMELINE (Lesson Schedule Strip) -->
    <div v-if="lessons.length > 0" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar class="h-4 w-4 text-[#6D28D9]" />
          <span>Dars Jadvali (Jami: {{ lessons.length }} ta dars)</span>
        </label>
        <span class="text-[11px] text-slate-500">
          Davomat qilmoqchi bo'lgan darsingizni tanlang:
        </span>
      </div>

      <!-- Horizontal scrollable lessons list -->
      <div class="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <button
          v-for="les in lessons"
          :key="les.id"
          type="button"
          @click="selectLesson(les.id)"
          class="shrink-0 w-44 p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between"
          :class="
            selectedLessonId === les.id
              ? 'border-[#6D28D9] bg-violet-50/60 ring-2 ring-[#6D28D9]/20 shadow-xs'
              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
          "
        >
          <!-- Top row: Order badge & status indicator -->
          <div class="flex items-center justify-between mb-1.5">
            <span
              class="px-2 py-0.5 rounded-md text-[10px] font-black"
              :class="
                selectedLessonId === les.id
                  ? 'bg-[#6D28D9] text-white'
                  : 'bg-slate-200 text-slate-700'
              "
            >
              #{{ les.lessonOrder }}-dars
            </span>

            <span
              v-if="(les as any).attendanceCount && (les as any).attendanceCount > 0"
              class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md"
              title="Davomat olingan"
            >
              <Check class="h-3 w-3" />
              O'tildi
            </span>
            <span
              v-else
              class="text-[10px] text-slate-400 font-medium"
            >
              Kutilmoqda
            </span>
          </div>

          <!-- Topic Preview -->
          <p class="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
            {{ les.topic }}
          </p>

          <!-- Date -->
          <div class="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
            <span>{{ les.lessonDate || 'Sanasi belgilanmagan' }}</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 3. AKTIV DARS MAVZUSI VA MATERIALLARI (USTOZ REJADAGI YOKI O'ZI UNIKAL YOZISHI MUMKIN) -->
    <div v-if="selectedLesson" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-5 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2.5">
          <span class="h-8 w-8 rounded-xl bg-violet-100 text-[#6D28D9] font-black text-sm flex items-center justify-center">
            #{{ selectedLesson.lessonOrder }}
          </span>
          <div>
            <h2 class="text-sm font-black text-slate-900">
              {{ selectedLesson.lessonOrder }}-Dars Mavzusi va Materiallari
            </h2>
            <div class="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
              <span>Sana: <strong class="text-slate-800">{{ selectedLesson.lessonDate }}</strong></span>
              <span>•</span>
              <span>Vaqt: <strong class="text-slate-800">{{ selectedLesson.startTime || currentGroup?.startTime }} - {{ selectedLesson.endTime || currentGroup?.endTime }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Mode badge & Template Helper -->
        <div class="flex items-center gap-2">
          <span
            v-if="isTopicCustomized"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
          >
            <Edit3 class="h-3 w-3" />
            <span>Unikal mavzu (O'qituvchi kiritgan)</span>
          </span>
          <span
            v-else
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-violet-50 text-[#6D28D9] border border-violet-200"
          >
            <Sparkles class="h-3 w-3" />
            <span>O'quv rejasidagi mavzu</span>
          </span>

          <button
            v-if="isTopicCustomized && plannedLessonForOrder"
            @click="resetToOriginalPlan"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            title="Kurs o'quv rejasidagi asl mavzuga qaytarish"
          >
            <RotateCcw class="h-3 w-3" />
            <span>Rejaga qaytarish</span>
          </button>
        </div>
      </div>

      <!-- Quick template syllabus picker if teacher wants to select another topic from the plan -->
      <div v-if="allPlanLessons.length > 0" class="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-slate-50/80 rounded-xl border border-slate-200 text-xs">
        <span class="font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
          <BookOpen class="h-3.5 w-3.5 text-[#6D28D9]" />
          <span>Shablondan tanlash:</span>
        </span>
        <select
          @change="(e) => {
            const targetId = Number((e.target as HTMLSelectElement).value);
            const found = allPlanLessons.find((pl: any) => pl.id === targetId || pl.lessonOrder === targetId);
            if (found) applyTopicFromPlan(found);
          }"
          class="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#6D28D9] cursor-pointer"
        >
          <option value="" disabled selected>O'quv rejasidagi boshqa dars mavzusini tanlash...</option>
          <option v-for="pl in allPlanLessons" :key="pl.id || pl.lessonOrder" :value="pl.id || pl.lessonOrder">
            #{{ pl.lessonOrder }}-dars: {{ pl.topic }}
          </option>
        </select>
      </div>

      <!-- Editable Topic & Description -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Topic -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-800">
            Dars Mavzusi * <span class="font-normal text-slate-400 text-[11px]">(Erkin tahrirlash mumkin)</span>
          </label>
          <input
            v-model="formTopic"
            type="text"
            required
            placeholder="Masalan: Autentifikatsiya va JWT Tokenlar bilan ishlash"
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
          />
        </div>

        <!-- Description & Materials -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-slate-800">
            Dars Tavsifi / Havolalar / Materiallar
          </label>
          <input
            v-model="formDescription"
            type="text"
            placeholder="Mavzu tavsifi, slaydlar yoki foydali havolalar..."
            class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9]"
          />
        </div>
      </div>
    </div>

    <!-- 4. TALABALAR DAVOMATI JADVALI -->
    <div v-if="selectedLesson" class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
      <!-- Toolbar: Stats & Bulk Actions -->
      <div class="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <span class="font-bold text-slate-900 flex items-center gap-1.5">
            <Users class="h-4 w-4 text-[#6D28D9]" />
            <span>Guruh Talabalari ({{ statsSummary.total }} ta)</span>
          </span>
          <span class="text-slate-300">|</span>
          <span class="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 text-[11px]">
            {{ statsSummary.present }} keldi
          </span>
          <span class="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 text-[11px]">
            {{ statsSummary.late }} kechikdi
          </span>
          <span class="px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800 text-[11px]">
            {{ statsSummary.absent }} kelmadi
          </span>
          <span v-if="statsSummary.excused > 0" class="px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-800 text-[11px]">
            {{ statsSummary.excused }} sababli
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="markAllPresent"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
          >
            ✓ Barchasi keldi (+1 coin)
          </button>
          <button
            type="button"
            @click="markAllAbsent"
            class="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
          >
            ✕ Barchasi kelmadi (0)
          </button>
        </div>
      </div>

      <!-- Students Table -->
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
            <tr
              v-for="row in attendanceRows"
              :key="row.studentId"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <!-- Student Info -->
              <td class="px-6 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-full bg-violet-100 text-[#6D28D9] font-black flex items-center justify-center text-xs shrink-0">
                    {{ row.student.firstName?.charAt(0) || 'S' }}{{ row.student.lastName?.charAt(0) || '' }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm">
                      {{ row.student.firstName }} {{ row.student.lastName }}
                    </p>
                    <div class="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                      <Coins class="h-3 w-3" />
                      <span>Balansi: {{ row.student.coins ?? 0 }} coin</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Attendance Buttons -->
              <td class="px-6 py-3.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    @click="setStatus(row, 'PRESENT')"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                    :class="
                      row.status === 'PRESENT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    "
                  >
                    <span>✓</span>
                    <span>Keldi</span>
                    <span class="text-[10px] opacity-80">(+1)</span>
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'LATE')"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                    :class="
                      row.status === 'LATE'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                    "
                  >
                    <span>⏱</span>
                    <span>Kechikdi</span>
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'ABSENT')"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                    :class="
                      row.status === 'ABSENT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                    "
                  >
                    <span>✕</span>
                    <span>Kelmadi</span>
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'EXCUSED')"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1"
                    :class="
                      row.status === 'EXCUSED'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                    "
                  >
                    <span>⚪</span>
                    <span>Sababli</span>
                  </button>
                </div>
              </td>

              <!-- Coin Reward -->
              <td class="px-6 py-3.5">
                <div class="flex items-center gap-1.5">
                  <input
                    v-model.number="row.coins"
                    type="number"
                    min="0"
                    max="10"
                    class="w-14 rounded-lg border border-slate-200 p-1.5 text-center font-bold text-slate-800 focus:border-[#6D28D9] focus:outline-none"
                  />
                  <span class="text-slate-400 text-xs font-medium">coin</span>
                </div>
              </td>

              <!-- Note / Comment -->
              <td class="px-6 py-3.5">
                <input
                  v-model="row.note"
                  type="text"
                  placeholder="Izoh (masalan: faol qatnashdi)..."
                  class="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#6D28D9] focus:outline-none"
                />
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

      <!-- Bottom Save Action Bar -->
      <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <p class="text-xs text-slate-500">
          Davomatni saqlash orqali talabalar balansi va dars mavzusi yangilanadi.
        </p>

        <button
          @click="handleSaveAttendance"
          :disabled="saving"
          class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
        >
          <Save class="h-4 w-4" />
          <span>{{ saving ? 'Saqlanmoqda...' : 'Davomatni Saqlash' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
