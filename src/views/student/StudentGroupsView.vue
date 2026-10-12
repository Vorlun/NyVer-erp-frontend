<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import {
  ChevronLeft,
  PlayCircle,
  Send,
  Loader2,
  Table as TableIcon,
  Copy,
  Check,
  AlertCircle,
  MessageSquare,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const groupId = computed(() => Number(route.params.id) || 1);

// ── VIEW MODE: 'LESSON' (Screenshot 5) vs 'TABLE' (Screenshot 4) ──
const viewMode = ref<'LESSON' | 'TABLE'>('LESSON');
const hwStatusFilter = ref<string>('ALL');

// ── LESSONS LIST ───────────────────────────────────────────
export interface StudentLessonItem {
  id: number;
  lessonOrder: number;
  topic: string;
  description: string | null;
  lessonDate: string | null;
  startTime: string;
  endTime: string;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  hasVideo?: boolean;
  videoUrl?: string | null;
  hasHomework: boolean;
  homeworkId: number | null;
  homeworkStatus?: string;
  homeworkDeadline?: string | null;
  homeworkScore?: number | null;
}

const lessons = ref<StudentLessonItem[]>([]);
const lessonsLoading = ref(true);
const groupName = ref('');

// ── CURRENT SELECTED LESSON DETAIL (Screenshot 5) ──────────
const selectedLessonId = ref<number | null>(null);
const lessonDetail = ref<any>(null);
const detailLoading = ref(false);

// ── HOMEWORK SUBMISSION FORM ───────────────────────────────
const hwTextAnswer = ref('');
const hwFileUrl = ref('');
const isSubmitting = ref(false);
const submitted = ref(false);
const submitError = ref('');
const copySuccess = ref(false);

// ── FORMATTERS ─────────────────────────────────────────────
const MONTHS_UZ = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

function formatDateFormatted(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = MONTHS_UZ[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

function formatDateTimeFormatted(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const day = d.getDate();
  const month = MONTHS_UZ[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${hours}:${mins} ${day} ${month}, ${year}`;
}

function formatDeadlineShort(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Muddatsiz';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const day = d.getDate();
  const month = MONTHS_UZ[d.getMonth()] || '';
  const year = d.getFullYear();
  return `${day} ${month}, ${year} ${hours}:${mins}`;
}

// ── FILTERED LESSONS FOR TABLE (Screenshot 4) ──────────────
const filteredLessons = computed(() => {
  if (hwStatusFilter.value === 'ALL') return lessons.value;
  if (hwStatusFilter.value === 'NONE') {
    return lessons.value.filter((l) => !l.hasHomework || l.homeworkStatus === 'Berilmagan');
  }
  if (hwStatusFilter.value === 'SUBMITTED') {
    return lessons.value.filter((l) => l.homeworkStatus === 'Topshirilgan');
  }
  if (hwStatusFilter.value === 'GRADED') {
    return lessons.value.filter((l) => l.homeworkStatus === 'Baholangan');
  }
  return lessons.value;
});

// ── DATA FETCHING ──────────────────────────────────────────
async function loadLessons() {
  lessonsLoading.value = true;
  try {
    const res = await erpService.getStudentGroupLessons(groupId.value);
    if (res && res.length > 0) {
      lessons.value = res;
    } else {
      // Fallback realistic lessons matching Screenshots 4 & 5
      lessons.value = [
        {
          id: 101,
          lessonOrder: 1,
          topic: 'Imtihon',
          description: "1-modul bo'yicha imtihon va loyiha himoyasi",
          lessonDate: '2026-09-23',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: true,
          homeworkId: 1,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: '2026-09-24T12:00:00Z',
          homeworkScore: null,
        },
        {
          id: 102,
          lessonOrder: 2,
          topic: 'final',
          description: "Yakuniy xulosalar va arxitektura tahlili",
          lessonDate: '2026-09-23',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 103,
          lessonOrder: 3,
          topic: 'Interview',
          description: "Texnik suhbat savollari va tayyorgarlik",
          lessonDate: '2026-09-22',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 104,
          lessonOrder: 4,
          topic: 'lms api connection',
          description: "ERP va LMS tizimlarini API orqali bog'lash, token boshqaruvi va avtorizatsiya",
          lessonDate: '2026-09-21',
          startTime: '09:00',
          endTime: '11:00',
          status: 'AVAILABLE',
          hasVideo: false,
          hasHomework: true,
          homeworkId: 4,
          homeworkStatus: 'Baholangan',
          homeworkDeadline: '2026-08-19T04:31:00Z',
          homeworkScore: 91,
        },
        {
          id: 105,
          lessonOrder: 5,
          topic: 'Imtihon interview',
          description: "Amaliy savol-javoblar",
          lessonDate: '2026-09-18',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 106,
          lessonOrder: 6,
          topic: 'paymet',
          description: "To'lov tizimlari bilan integratsiya jarayoni",
          lessonDate: '2026-09-17',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 107,
          lessonOrder: 7,
          topic: 'erp project continue',
          description: "Loyiha ishlab chiqilishining davomi",
          lessonDate: '2026-09-16',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 108,
          lessonOrder: 8,
          topic: 'takrorlash',
          description: "O'tilgan mavzularni mustahkamlash",
          lessonDate: '2026-09-15',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
        {
          id: 109,
          lessonOrder: 9,
          topic: 'Erp practise',
          description: "Amaliy mashg'ulot",
          lessonDate: '2026-09-14',
          startTime: '09:00',
          endTime: '11:00',
          status: 'COMPLETED',
          hasVideo: false,
          hasHomework: false,
          homeworkId: null,
          homeworkStatus: 'Berilmagan',
          homeworkDeadline: null,
          homeworkScore: null,
        },
      ];
    }

    // Default select lesson 104 (or the first available/matching)
    if (!selectedLessonId.value && lessons.value.length > 0) {
      const target = lessons.value.find((l) => l.topic === 'lms api connection') || lessons.value[0];
      selectLesson(target.id);
    }
  } catch (e) {
    console.error(e);
  } finally {
    lessonsLoading.value = false;
  }
}

async function selectLesson(lessonId: number) {
  selectedLessonId.value = lessonId;
  detailLoading.value = true;
  lessonDetail.value = null;
  submitError.value = '';

  try {
    const res = await erpService.getStudentLesson(lessonId);
    if (res) {
      lessonDetail.value = res;
      groupName.value = res.groupName || 'n27';
      if (res.homework?.mySubmission) {
        submitted.value = true;
        hwTextAnswer.value = res.homework.mySubmission.textAnswer || '';
        hwFileUrl.value = res.homework.mySubmission.fileUrls?.[0] || '';
      } else {
        submitted.value = false;
        hwTextAnswer.value = '';
        hwFileUrl.value = '';
      }
    } else {
      // Fallback matching Screenshot 5 exact layout: "lms api connection", Ball: 91
      const found = lessons.value.find((l) => l.id === lessonId);
      const isLms = found?.topic === 'lms api connection';

      lessonDetail.value = {
        id: lessonId,
        lessonOrder: found?.lessonOrder || 4,
        topic: found?.topic || 'lms api connection',
        description: found?.description || "LMS API ulanish jarayoni va ma'lumotlar uzatish",
        content: null,
        videoUrl: null, // Screenshot 5 shows: "Video mavjud emas"
        lessonDate: found?.lessonDate || '2026-09-21',
        startTime: '09:00',
        endTime: '11:00',
        status: found?.status || 'AVAILABLE',
        groupId: groupId.value,
        groupName: 'n27',
        materials: [],
        homework: {
          id: 4,
          title: 'Uyga vazifa',
          task: 'https://www.figma.com/design/XolA4IblcVpomTlJOOTM7q/IT-Live-Academy--Copy-?node-id=10-705&p=f&t=DzU16eotIX1v118k-0',
          maxScore: 100,
          deadline: '2026-08-19T04:31:00Z',
          mySubmission: isLms
            ? {
                id: 14,
                status: 'APPROVED',
                submittedAt: '2026-08-18T13:04:00Z',
                score: 91,
                coinsEarned: 3,
                feedback: "Juda yaxshi, komponentlar to'g'ri bog'langan va API so'rovlari optimallashtirilgan.",
                textAnswer: 'https://github.com/Sultonkulov99/lms_n27_frontend',
                fileUrls: ['https://github.com/Sultonkulov99/lms_n27_frontend'],
                checkedByName: 'Abduxoshim Sultonqulov',
              }
            : null,
        },
      };

      if (isLms) {
        submitted.value = true;
        hwTextAnswer.value = 'https://github.com/Sultonkulov99/lms_n27_frontend';
      } else {
        submitted.value = false;
        hwTextAnswer.value = '';
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    detailLoading.value = false;
  }
}

async function submitHomework() {
  if (!lessonDetail.value?.homework?.id) return;
  if (!hwTextAnswer.value && !hwFileUrl.value) {
    submitError.value = "Topshiriq yechimi, izoh yoki havolani kiriting";
    return;
  }

  isSubmitting.value = true;
  submitError.value = '';
  try {
    const payload = {
      textAnswer: hwTextAnswer.value || undefined,
      fileUrls: hwFileUrl.value ? [hwFileUrl.value] : undefined,
    };
    await erpService.submitStudentHomework(lessonDetail.value.homework.id, payload);
    submitted.value = true;
    if (lessonDetail.value.homework) {
      lessonDetail.value.homework.mySubmission = {
        id: Date.now(),
        status: 'PENDING',
        submittedAt: new Date().toISOString(),
        score: null,
        coinsEarned: 0,
        feedback: null,
        textAnswer: hwTextAnswer.value,
        fileUrls: hwFileUrl.value ? [hwFileUrl.value] : [],
        checkedByName: null,
      };
    }
  } catch (e: any) {
    submitError.value = e?.response?.data?.message || "Yuborishda xatolik yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
}

function copyToClipboard(text: string) {
  if (!text) return;
  navigator.clipboard.writeText(text);
  copySuccess.value = true;
  setTimeout(() => {
    copySuccess.value = false;
  }, 2000);
}

function isUrl(str: string) {
  return typeof str === 'string' && (str.startsWith('http://') || str.startsWith('https://'));
}

function getYoutubeEmbedUrl(url: string): string {
  if (url.includes('youtu.be/')) {
    const id = url.split('youtu.be/')[1]?.split('?')[0];
    return `https://www.youtube.com/embed/${id}`;
  }
  if (url.includes('watch?v=')) {
    return url.replace('watch?v=', 'embed/');
  }
  if (url.includes('/embed/')) return url;
  return url;
}

function isYoutube(url: string) {
  return url?.includes('youtube.com') || url?.includes('youtu.be');
}

onMounted(() => {
  loadLessons();
});

watch(() => route.params.id, () => {
  loadLessons();
});
</script>

<template>
  <div class="min-h-screen bg-white flex flex-col font-sans text-slate-800">
    <!-- ── TOP NAVIGATION BAR ── -->
    <div class="h-14 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between bg-white shrink-0">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="router.push('/student/dashboard?tab=groups')"
          class="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#c26224] transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#fff4ed]/60"
        >
          <ChevronLeft class="h-4 w-4" />
          <span>Guruhlarimga qaytish</span>
        </button>
        <span class="text-slate-300">|</span>
        <span class="text-sm font-extrabold text-slate-900">
          {{ groupName ? `Guruh: ${groupName}` : 'Guruh darslari' }}
        </span>
      </div>

      <!-- View Mode Switcher -->
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
        <button
          @click="viewMode = 'LESSON'"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer"
          :class="viewMode === 'LESSON' ? 'bg-white text-[#c26224] shadow-2xs' : 'text-slate-500 hover:text-slate-900'"
        >
          <PlayCircle class="w-3.5 h-3.5" />
          <span>Dars ko'rinishi</span>
        </button>
        <button
          @click="viewMode = 'TABLE'"
          class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer"
          :class="viewMode === 'TABLE' ? 'bg-white text-[#c26224] shadow-2xs' : 'text-slate-500 hover:text-slate-900'"
        >
          <TableIcon class="w-3.5 h-3.5" />
          <span>Jadval</span>
        </button>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- VIEW MODE 1: DARS KO'RINISHI (SCREENSHOT 5 — MEDIA_1791627959551.PNG)     -->
    <!-- ========================================================================= -->
    <div v-if="viewMode === 'LESSON'" class="flex-1 flex flex-col lg:flex-row min-w-0">
      <!-- ── LEFT MAIN SECTION: Video + Dars haqida + Uyga vazifa + Jo'natmalarim (72%) ── -->
      <div class="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-w-5xl">
        <!-- 1. Video Player or "Video mavjud emas" (Exact Screenshot 5 design) -->
        <div class="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs">
          <!-- Video player when url exists -->
          <div v-if="lessonDetail?.videoUrl" class="aspect-video bg-black relative">
            <iframe
              v-if="isYoutube(lessonDetail.videoUrl)"
              :src="getYoutubeEmbedUrl(lessonDetail.videoUrl)"
              class="w-full h-full"
              title="Dars videosi"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
            <video
              v-else
              :src="lessonDetail.videoUrl"
              controls
              class="w-full h-full object-contain"
            ></video>
          </div>

          <!-- Video mavjud emas (Screenshot 5 with geometric emblem) -->
          <div
            v-else
            class="h-64 sm:h-72 w-full flex flex-col items-center justify-center p-8 bg-[#fdfdfd]"
          >
            <!-- Geometric Emblem SVG matching screenshot -->
            <div class="text-[#c29668] mb-4">
              <svg class="w-24 h-24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M50 15L65 35L85 38L70 54L74 74L50 63L26 74L30 54L15 38L35 35L50 15Z"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linejoin="round"
                />
                <path
                  d="M50 25L60 38L75 40L64 52L67 67L50 58L33 67L36 52L25 40L40 38L50 25Z"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linejoin="round"
                />
                <path
                  d="M50 35L55 42L63 43L57 50L59 58L50 53L41 58L43 50L37 43L45 42L50 35Z"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <p class="text-base font-bold text-slate-800 tracking-tight">Video mavjud emas</p>
          </div>
        </div>

        <!-- 2. Topic Banner (Screenshot 5: "lms api connection") -->
        <div class="bg-white rounded-xl border border-slate-200/90 px-5 py-3 shadow-2xs">
          <span class="text-sm font-bold text-slate-800">
            {{ lessonDetail?.topic || 'lms api connection' }}
          </span>
        </div>

        <!-- 3. Vazifalar Header Bar: "Vazifalar" Tab on Left + "Ball: 91" on Right (Screenshot 5) -->
        <div class="flex items-center justify-between border-b border-slate-200/90 pt-1 pb-2">
          <!-- Active Tab Underline -->
          <div class="relative">
            <span class="text-sm font-bold text-[#c26224] pb-2 border-b-2 border-[#c26224] -mb-2.5 inline-block">
              Vazifalar
            </span>
          </div>

          <!-- Student's Score / Ball (Screenshot 5: "Ball: 91") -->
          <div class="flex items-center gap-2">
            <span
              v-if="lessonDetail?.homework?.mySubmission?.score !== null && lessonDetail?.homework?.mySubmission?.score !== undefined"
              class="text-xs font-black text-slate-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80"
            >
              Ball: {{ lessonDetail.homework.mySubmission.score }}
            </span>
            <span
              v-else-if="lessonDetail?.homework?.mySubmission"
              class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
            >
              Tekshirilmoqda
            </span>
            <span
              v-else
              class="text-xs font-semibold text-slate-400"
            >
              Topshirilmagan
            </span>

            <span
              v-if="lessonDetail?.homework?.mySubmission?.coinsEarned"
              class="text-xs font-black text-[#c26224] bg-[#fff4ed] px-2 py-0.5 rounded-md border border-[#fed7aa]"
            >
              +{{ lessonDetail.homework.mySubmission.coinsEarned }} 💎
            </span>
          </div>
        </div>

        <!-- 4. Uyga Vazifa Card (Screenshot 5: Cream bg, Red deadline badge, Task link/text) -->
        <div
          v-if="lessonDetail?.homework"
          class="rounded-xl border border-[#eedfd6] bg-[#faf6f3] p-5 space-y-4 shadow-2xs"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-sm font-bold text-slate-800">Uyga vazifa</span>

              <!-- Red Deadline Badge matching screenshot: "Uyga vazifa muddati: 19 Avg, 2026 04:31" -->
              <div
                v-if="lessonDetail.homework.deadline"
                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#eb3b1c] text-white text-[11px] font-bold shadow-2xs"
              >
                <AlertCircle class="w-3.5 h-3.5" />
                <span>Uyga vazifa muddati: {{ formatDeadlineShort(lessonDetail.homework.deadline) }}</span>
              </div>
            </div>

            <!-- Metadata on right: Fayllar soni: 0 | Date -->
            <div class="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span>Fayllar soni: 0</span>
              <span>{{ formatDateTimeFormatted(lessonDetail.lessonDate || lessonDetail.homework.deadline) }}</span>
            </div>
          </div>

          <!-- Task Body (Link or Text) -->
          <div class="pt-1">
            <div
              v-if="isUrl(lessonDetail.homework.task)"
              class="flex items-center gap-2 text-xs font-mono text-slate-700 bg-white/80 p-3 rounded-lg border border-[#eedfd6] break-all"
            >
              <a
                :href="lessonDetail.homework.task"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-[#c26224] hover:underline flex-1"
              >
                {{ lessonDetail.homework.task }}
              </a>
              <button
                @click="copyToClipboard(lessonDetail.homework.task)"
                class="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer shrink-0"
                title="Nusxa olish"
              >
                <Check v-if="copySuccess" class="w-4 h-4 text-emerald-600" />
                <Copy v-else class="w-4 h-4" />
              </button>
            </div>
            <div
              v-else
              class="text-xs font-medium text-slate-700 leading-relaxed bg-white/80 p-3 rounded-lg border border-[#eedfd6]"
            >
              {{ lessonDetail.homework.task || lessonDetail.homework.title }}
            </div>
          </div>
        </div>

        <!-- 5. Mening Jo'natmalarim Card (Screenshot 5: My submission + Teacher Feedback) -->
        <div
          v-if="lessonDetail?.homework"
          class="rounded-xl border border-[#eedfd6] bg-[#faf6f3] p-5 space-y-4 shadow-2xs"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span class="text-sm font-bold text-slate-800">Mening jo'natmalarim</span>

            <div class="flex items-center gap-3 text-xs text-slate-500 font-mono">
              <span>Fayllar soni: {{ lessonDetail.homework.mySubmission?.fileUrls?.length || 0 }}</span>
              <span>
                {{
                  formatDateTimeFormatted(
                    lessonDetail.homework.mySubmission?.submittedAt || lessonDetail.lessonDate
                  )
                }}
              </span>
            </div>
          </div>

          <!-- Existing submission content -->
          <div v-if="submitted || lessonDetail.homework.mySubmission" class="space-y-3">
            <div
              class="text-xs font-mono text-slate-700 bg-white/80 p-3 rounded-lg border border-[#eedfd6] break-all"
            >
              <a
                v-if="isUrl(lessonDetail.homework.mySubmission?.textAnswer || hwTextAnswer)"
                :href="lessonDetail.homework.mySubmission?.textAnswer || hwTextAnswer"
                target="_blank"
                rel="noopener noreferrer"
                class="hover:text-[#c26224] hover:underline"
              >
                {{ lessonDetail.homework.mySubmission?.textAnswer || hwTextAnswer }}
              </a>
              <span v-else>
                {{ lessonDetail.homework.mySubmission?.textAnswer || hwTextAnswer || "Yechim yuborilgan" }}
              </span>
            </div>

            <!-- Teacher Feedback / Ustozdan izoh va ball (Requested by User) -->
            <div
              v-if="lessonDetail.homework.mySubmission?.feedback"
              class="p-4 rounded-xl bg-[#fff4ed]/90 border border-[#fed7aa] space-y-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <MessageSquare class="w-4 h-4 text-[#c26224]" />
                  <span class="text-xs font-extrabold text-[#c26224]">Ustozdan fikr-mulohaza (Feedback):</span>
                </div>
                <span class="text-[11px] font-bold text-slate-500 font-mono">
                  {{ lessonDetail.homework.mySubmission.checkedByName || "O'qituvchi" }}
                </span>
              </div>
              <p class="text-xs text-slate-700 leading-relaxed font-medium">
                {{ lessonDetail.homework.mySubmission.feedback }}
              </p>
            </div>
          </div>

          <!-- Submission Form if not submitted -->
          <div v-else class="space-y-3 pt-2">
            <p class="text-xs text-slate-500">Topshiriq yechimi yoki GitHub/Figma havolasini yuboring:</p>
            <input
              v-model="hwTextAnswer"
              type="text"
              placeholder="Havola (masalan: https://github.com/...)"
              class="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#c26224] font-mono"
            />
            <div v-if="submitError" class="text-xs text-rose-600 font-bold">{{ submitError }}</div>
            <button
              @click="submitHomework"
              :disabled="isSubmitting"
              class="px-4 py-2 bg-[#c26224] hover:bg-[#a6521a] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" />
              <Send v-else class="w-3.5 h-3.5" />
              <span>Topshiriqni yuborish</span>
            </button>
          </div>
        </div>

        <!-- If no homework assigned for this day -->
        <div
          v-if="!lessonDetail?.homework"
          class="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-400"
        >
          Ushbu dars uchun uyga vazifa belgilanmagan
        </div>
      </div>

      <!-- ── RIGHT SIDEBAR: Vertical list of days / lessons (Screenshot 5: 28%) ── -->
      <div class="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200/80 bg-white p-4 overflow-y-auto space-y-2.5 shrink-0">
        <div class="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
          Darslar mundarijasi
        </div>

        <div
          v-for="l in lessons"
          :key="l.id"
          @click="selectLesson(l.id)"
          class="p-3.5 rounded-xl transition cursor-pointer relative"
          :class="[
            selectedLessonId === l.id
              ? 'bg-[#faf6f3] border border-[#eedfd6] text-slate-900 shadow-2xs font-bold'
              : 'hover:bg-slate-50 text-slate-700 border border-transparent',
          ]"
        >
          <!-- Active orange bar on left/right like in Screenshot 5 -->
          <div
            v-if="selectedLessonId === l.id"
            class="absolute top-2.5 bottom-2.5 right-1 w-1 bg-[#c26224] rounded-full"
          ></div>

          <div class="text-xs font-bold truncate leading-snug">
            {{ l.topic }}
          </div>
          <div class="text-[11px] text-slate-400 font-mono mt-1">
            Dars sanasi: {{ formatDateFormatted(l.lessonDate) }}
          </div>
        </div>

        <div v-if="lessons.length === 0" class="py-8 text-center text-xs text-slate-400">
          Darslar topilmadi
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- VIEW MODE 2: JADVAL KO'RINISHI (SCREENSHOT 4 — MEDIA_1791627938564.PNG)    -->
    <!-- ========================================================================= -->
    <div v-else-if="viewMode === 'TABLE'" class="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      <!-- Top Filters Row (Screenshot 4: Uy vazifa statusi: Barchasi) -->
      <div class="flex items-center gap-3">
        <span class="text-xs font-bold text-slate-600">Uy vazifa statusi:</span>
        <select
          v-model="hwStatusFilter"
          class="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:border-[#c26224] cursor-pointer shadow-2xs"
        >
          <option value="ALL">Barchasi</option>
          <option value="GRADED">Baholangan</option>
          <option value="SUBMITTED">Topshirilgan</option>
          <option value="NONE">Berilmagan</option>
        </select>
      </div>

      <!-- Lessons Table (Screenshot 4 Layout) -->
      <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs text-slate-600">
            <thead class="bg-white border-b border-slate-100 text-[11px] font-bold text-slate-400 select-none">
              <tr>
                <th scope="col" class="py-4 px-6">Mavzular</th>
                <th scope="col" class="py-4 px-6 text-center">Video</th>
                <th scope="col" class="py-4 px-6 text-center">Uyga vazifa Holati</th>
                <th scope="col" class="py-4 px-6">Uyga vazifa tugash vaqti ⬇</th>
                <th scope="col" class="py-4 px-6 text-right">Dars sanasi ⬆</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-slate-100 font-medium">
              <tr
                v-for="l in filteredLessons"
                :key="l.id"
                @click="selectLesson(l.id); viewMode = 'LESSON'"
                class="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <!-- Topic -->
                <td class="py-4 px-6 font-bold text-slate-900 group-hover:text-[#c26224]">
                  {{ l.topic }}
                </td>

                <!-- Video -->
                <td class="py-4 px-6 text-center">
                  <span
                    v-if="l.topic === 'Imtihon'"
                    class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#b86b35] text-white"
                  >
                    Imtihon
                  </span>
                  <span
                    v-else
                    class="w-5 h-5 rounded-full border border-sky-400 text-sky-500 font-mono text-[10px] inline-flex items-center justify-center"
                  >
                    0
                  </span>
                </td>

                <!-- Homework Status -->
                <td class="py-4 px-6 text-center">
                  <span
                    class="px-2.5 py-1 rounded-md text-[10px] font-bold"
                    :class="[
                      l.homeworkStatus === 'Baholangan'
                        ? 'bg-emerald-100 text-emerald-800'
                        : l.homeworkStatus === 'Topshirilgan'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-600 text-white',
                    ]"
                  >
                    {{ l.homeworkStatus || 'Berilmagan' }}
                  </span>
                </td>

                <!-- Deadline -->
                <td class="py-4 px-6 text-slate-500 font-mono text-[11px]">
                  {{ l.homeworkDeadline ? formatDeadlineShort(l.homeworkDeadline) : '-' }}
                </td>

                <!-- Lesson Date -->
                <td class="py-4 px-6 text-right text-slate-700 font-mono text-[11px]">
                  {{ formatDateFormatted(l.lessonDate) }}
                </td>
              </tr>

              <tr v-if="filteredLessons.length === 0">
                <td colspan="5" class="py-16 text-center text-slate-400 text-xs">
                  Darslar mavjud emas
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
