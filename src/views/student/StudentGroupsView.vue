<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import {
  ChevronLeft,
  Lock,
  CheckCircle2,
  PlayCircle,
  Download,
  FileText,
  Send,
  BookOpen,
  Clock,
  Loader2,
  FileArchive,
  Link as LinkIcon,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

const groupId = computed(() => Number(route.params.id));

// ── LESSONS LIST ──────────────────────────────────────
type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
interface LessonItem {
  id: number;
  lessonOrder: number;
  topic: string;
  description: string | null;
  lessonDate: string | null;
  startTime: string;
  endTime: string;
  status: LessonStatus;
  hasHomework: boolean;
  homeworkId: number | null;
}

const lessons = ref<LessonItem[]>([]);
const lessonsLoading = ref(true);
const groupName = ref('');

// ── LESSON DETAIL ─────────────────────────────────────
const selectedLessonId = ref<number | null>(null);
const lessonDetail = ref<any>(null);
const detailLoading = ref(false);

// ── HOMEWORK SUBMIT ───────────────────────────────────
const hwTextAnswer = ref('');
const hwFileUrl = ref('');
const isSubmitting = ref(false);
const submitted = ref(false);
const submitError = ref('');

// ── MOBILE SIDEBAR ────────────────────────────────────
const showSidebar = ref(true);

const completedCount = computed(() => lessons.value.filter((l) => l.status === 'COMPLETED').length);
const progressPercent = computed(() =>
  lessons.value.length > 0
    ? Math.round((completedCount.value / lessons.value.length) * 100)
    : 0,
);

async function loadLessons() {
  lessonsLoading.value = true;
  try {
    const res = await erpService.getStudentGroupLessons(groupId.value);
    lessons.value = res || [];
    // Get group name from first lesson (or just use route)
    if (lessons.value.length > 0) {
      // Auto-select first AVAILABLE
      const first = lessons.value.find((l) => l.status === 'AVAILABLE' || l.status === 'COMPLETED');
      if (first) selectLesson(first.id);
    }
  } catch (e) {
    console.error(e);
  } finally {
    lessonsLoading.value = false;
  }
}

async function selectLesson(lessonId: number) {
  const lesson = lessons.value.find((l) => l.id === lessonId);
  if (lesson?.status === 'LOCKED') return;

  selectedLessonId.value = lessonId;
  detailLoading.value = true;
  lessonDetail.value = null;
  hwTextAnswer.value = '';
  hwFileUrl.value = '';
  submitted.value = false;
  submitError.value = '';

  // On mobile: hide sidebar when lesson selected
  if (window.innerWidth < 768) showSidebar.value = false;

  try {
    const res = await erpService.getStudentLesson(lessonId);
    lessonDetail.value = res;
    groupName.value = res?.groupName || '';

    // If already submitted
    if (res?.homework?.mySubmission) {
      submitted.value = true;
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
    submitError.value = "Matn yoki fayl havola kiriting";
    return;
  }

  isSubmitting.value = true;
  submitError.value = '';
  try {
    await erpService.submitStudentHomework(lessonDetail.value.homework.id, {
      textAnswer: hwTextAnswer.value || undefined,
      fileUrls: hwFileUrl.value ? [hwFileUrl.value] : undefined,
    });
    submitted.value = true;
  } catch (e: any) {
    submitError.value = e?.response?.data?.message || "Yuborishda xatolik yuz berdi";
  } finally {
    isSubmitting.value = false;
  }
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

function formatDate(dateStr: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()}-${['Yan','Fev','Mar','Apr','May','Iyu','Iyu','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(t: string) {
  return t?.slice(0, 5) || '';
}

function getFileIcon(fileType: string) {
  if (fileType?.toLowerCase().includes('pdf')) return 'pdf';
  if (fileType?.toLowerCase().includes('zip') || fileType?.toLowerCase().includes('rar')) return 'archive';
  return 'link';
}

onMounted(loadLessons);
watch(() => route.params.id, loadLessons);
</script>

<template>
  <div class="flex h-screen bg-slate-50 overflow-hidden">

    <!-- ─── SIDEBAR: Lessons List ─── -->
    <aside
      class="flex flex-col border-r border-slate-200 bg-white transition-all duration-300 shrink-0"
      :class="showSidebar ? 'w-72' : 'w-0 overflow-hidden md:w-72'"
    >
      <!-- Sidebar header -->
      <div class="p-4 border-b border-slate-100 shrink-0">
        <button
          type="button"
          @click="router.push('/student/dashboard')"
          class="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer mb-3"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          <span>Bosh sahifaga qaytish</span>
        </button>
        <h2 class="text-sm font-bold text-slate-900 truncate">{{ groupName || 'Guruh darslari' }}</h2>
        <!-- Progress -->
        <div class="mt-2">
          <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span>{{ completedCount }} / {{ lessons.length }} dars</span>
            <span class="font-bold text-slate-700">{{ progressPercent }}%</span>
          </div>
          <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-700"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Lessons List -->
      <div class="flex-1 overflow-y-auto py-2">
        <div v-if="lessonsLoading" class="p-4 space-y-2 animate-pulse">
          <div v-for="i in 6" :key="i" class="h-12 bg-slate-100 rounded-xl"></div>
        </div>

        <div
          v-for="lesson in lessons"
          :key="lesson.id"
          @click="selectLesson(lesson.id)"
          class="flex items-start gap-3 px-4 py-3 border-b border-slate-100/70 transition-all"
          :class="{
            'cursor-pointer hover:bg-slate-50': lesson.status !== 'LOCKED',
            'opacity-50 cursor-not-allowed': lesson.status === 'LOCKED',
            'bg-indigo-50 border-l-2 border-l-indigo-500': selectedLessonId === lesson.id,
          }"
        >
          <!-- Status Icon -->
          <div class="shrink-0 mt-0.5">
            <CheckCircle2 v-if="lesson.status === 'COMPLETED'" class="h-4 w-4 text-emerald-500" />
            <PlayCircle v-else-if="lesson.status === 'AVAILABLE'" class="h-4 w-4 text-indigo-500" />
            <Lock v-else class="h-4 w-4 text-slate-300" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="text-[11px] text-slate-400 font-mono">{{ lesson.lessonOrder }}-dars</div>
            <div class="text-xs font-semibold leading-snug truncate"
              :class="{
                'text-slate-900': lesson.status !== 'LOCKED',
                'text-slate-400': lesson.status === 'LOCKED',
              }">
              {{ lesson.topic }}
            </div>
            <div v-if="lesson.lessonDate" class="text-[10px] text-slate-400 mt-0.5">{{ formatDate(lesson.lessonDate) }}</div>
          </div>

          <!-- Homework badge -->
          <span v-if="lesson.hasHomework && lesson.status !== 'LOCKED'"
            class="shrink-0 w-4 h-4 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-[9px] font-bold">
            HW
          </span>
        </div>

        <div v-if="!lessonsLoading && lessons.length === 0" class="px-4 py-8 text-center text-xs text-slate-400">
          Darslar topilmadi
        </div>
      </div>
    </aside>

    <!-- ─── MAIN: Lesson Detail ─── -->
    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto">

      <!-- Mobile top bar -->
      <div class="md:hidden flex items-center gap-3 p-3 bg-white border-b border-slate-200 shrink-0">
        <button type="button" @click="showSidebar = !showSidebar" class="p-2 rounded-lg border border-slate-200 cursor-pointer">
          <BookOpen class="h-4 w-4 text-slate-600" />
        </button>
        <span class="text-sm font-bold text-slate-900 truncate">
          {{ lessonDetail?.topic || groupName || 'Dars' }}
        </span>
      </div>

      <!-- Empty state -->
      <div v-if="!selectedLessonId && !lessonsLoading" class="flex-1 flex items-center justify-center p-8">
        <div class="text-center">
          <BookOpen class="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p class="text-sm font-semibold text-slate-600">Darsni tanlang</p>
          <p class="text-xs text-slate-400 mt-1">Chap tarafdan darsni bosing</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="detailLoading" class="flex-1 flex items-center justify-center">
        <Loader2 class="h-8 w-8 text-indigo-500 animate-spin" />
      </div>

      <!-- Lesson content -->
      <div v-else-if="lessonDetail" class="flex-1 p-4 sm:p-6 space-y-5 max-w-3xl mx-auto w-full">

        <!-- Lesson header -->
        <div>
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono text-slate-400">{{ lessonDetail.lessonOrder }}-dars</span>
            <span v-if="lessonDetail.lessonDate" class="text-xs text-slate-400">• {{ formatDate(lessonDetail.lessonDate) }}</span>
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full"
              :class="lessonDetail.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'">
              {{ lessonDetail.status === 'COMPLETED' ? "Tugatildi ✓" : "Mavjud" }}
            </span>
          </div>
          <h1 class="text-lg sm:text-xl font-bold text-slate-900 leading-tight">{{ lessonDetail.topic }}</h1>
          <div class="flex items-center gap-1 text-xs text-slate-500 mt-1">
            <Clock class="h-3 w-3" />
            <span>{{ formatTime(lessonDetail.startTime) }}–{{ formatTime(lessonDetail.endTime) }}</span>
            <span class="mx-1">•</span>
            <span class="font-medium">{{ lessonDetail.groupName }}</span>
          </div>
        </div>

        <!-- Video Player -->
        <div class="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
          <div class="aspect-video relative">
            <iframe
              v-if="lessonDetail.videoUrl && isYoutube(lessonDetail.videoUrl)"
              :src="getYoutubeEmbedUrl(lessonDetail.videoUrl)"
              class="w-full h-full"
              title="Dars videosi"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
            <video
              v-else-if="lessonDetail.videoUrl"
              :src="lessonDetail.videoUrl"
              controls
              class="w-full h-full object-contain"
            ></video>
            <div v-else class="w-full h-full flex flex-col items-center justify-center text-slate-400 p-8">
              <PlayCircle class="h-12 w-12 text-slate-600 mb-2" />
              <p class="text-xs text-slate-400">Video havola qo'shilmagan</p>
            </div>
          </div>
        </div>

        <!-- Description / Content -->
        <div v-if="lessonDetail.description || lessonDetail.content" class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FileText class="h-4 w-4 text-indigo-500" />
            Dars tavsifi
          </h3>
          <div v-if="lessonDetail.description" class="text-sm text-slate-600 leading-relaxed mb-3">
            {{ lessonDetail.description }}
          </div>
          <div v-if="lessonDetail.content" class="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">
            {{ lessonDetail.content }}
          </div>
        </div>

        <!-- Materials -->
        <div v-if="lessonDetail.materials?.length > 0" class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Download class="h-4 w-4 text-emerald-500" />
            Dars materiallari
          </h3>
          <div class="space-y-2">
            <a
              v-for="mat in lessonDetail.materials"
              :key="mat.id"
              :href="mat.fileUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileArchive v-if="getFileIcon(mat.fileType) === 'archive'" class="h-4 w-4 text-amber-500" />
                  <FileText v-else-if="getFileIcon(mat.fileType) === 'pdf'" class="h-4 w-4 text-rose-500" />
                  <LinkIcon v-else class="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div class="text-xs font-semibold text-slate-900">{{ mat.title }}</div>
                  <div class="text-[10px] text-slate-400 uppercase">{{ mat.fileType || 'Fayl' }}</div>
                </div>
              </div>
              <Download class="h-4 w-4 text-slate-300 group-hover:text-slate-600 transition" />
            </a>
          </div>
        </div>

        <!-- Homework -->
        <div v-if="lessonDetail.homework" class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
            <BookOpen class="h-4 w-4 text-amber-500" />
            Uyga vazifa
          </h3>
          <div class="text-xs text-slate-400 mb-3">
            Maks. {{ lessonDetail.homework.maxScore }} ball
            <span v-if="lessonDetail.homework.deadline">
              • Muddat: {{ formatDate(lessonDetail.homework.deadline) }}
            </span>
          </div>

          <div class="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-slate-700 mb-4 leading-relaxed">
            {{ lessonDetail.homework.task || lessonDetail.homework.title }}
          </div>

          <!-- Already submitted -->
          <div v-if="submitted" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <CheckCircle2 class="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <div class="text-xs font-bold text-emerald-800">Topshiriq yuborildi!</div>
              <div class="text-[11px] text-emerald-600 mt-0.5">
                Holat: <span class="font-semibold">Tekshirilmoqda</span>
              </div>
            </div>
          </div>

          <!-- Submit form -->
          <div v-else class="space-y-3">
            <textarea
              v-model="hwTextAnswer"
              rows="4"
              placeholder="Yechim matni, izoh yoki qisqacha tushuntirish..."
              class="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-400 transition resize-none leading-relaxed"
            ></textarea>
            <input
              v-model="hwFileUrl"
              type="url"
              placeholder="GitHub, Google Drive yoki boshqa havola..."
              class="w-full h-10 px-3.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-400 transition"
            />
            <div v-if="submitError" class="text-xs text-rose-600 font-medium">{{ submitError }}</div>
            <button
              type="button"
              @click="submitHomework"
              :disabled="isSubmitting"
              class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-sm transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Loader2 v-if="isSubmitting" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              <span>{{ isSubmitting ? 'Yuborilmoqda...' : "Topshiriqni Yuborish" }}</span>
            </button>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>
