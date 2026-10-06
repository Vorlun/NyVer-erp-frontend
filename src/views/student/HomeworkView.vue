<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import {
  Send,
  AlertCircle,
  Link as LinkIcon,
  UploadCloud,
  Check,
  ExternalLink,
  FolderOpen,
} from 'lucide-vue-next';

// Syllabus & Lessons list matching Screenshot 2
interface LessonItem {
  id: number;
  title: string;
  lessonDate: string;
  videoUrl?: string;
  hasVideo?: boolean;
  score?: number | null;
  homework?: {
    id: number;
    title: string;
    deadline: string;
    filesCount: number;
    content: string;
    assignedAt: string;
  };
  submission?: {
    id: number;
    textAnswer: string;
    linkUrl: string;
    filesCount: number;
    submittedAt: string;
    score?: number | null;
    feedback?: string;
  } | null;
}

const lessons = ref<LessonItem[]>([
  {
    id: 1,
    title: 'lms api connection',
    lessonDate: '18 Avg, 2026',
    hasVideo: false,
    score: 91,
    homework: {
      id: 1,
      title: 'Uyga vazifa',
      deadline: '19 Avg, 2026 04:31',
      filesCount: 0,
      content: 'https://www.figma.com/design/XolA4IblcVpomTLJOOTM7q/IT-Live-Academy--Copy-?node-id=10-705&p=f&t=DzU16eotIX1v118k-0',
      assignedAt: '12:31 18 Avg, 2026',
    },
    submission: {
      id: 101,
      textAnswer: '',
      linkUrl: 'https://github.com/Sultonkulov99/lms_n27_frontend',
      filesCount: 0,
      submittedAt: '13:04 18 Avg, 2026',
      score: 91,
      feedback: "A'lo darajada bajarilgan. API ulanishi to'g'ri sozlangan.",
    },
  },
  {
    id: 2,
    title: 'Imtixon',
    lessonDate: '23 Sen, 2026',
    hasVideo: false,
    score: 88,
    homework: {
      id: 2,
      title: 'Imtihon topshirig\'i',
      deadline: '24 Sen, 2026 18:00',
      filesCount: 1,
      content: 'Vue 3 va Pinia yordamida savat (cart) funksionalini mustaqil yakunlash va havola qoldirish.',
      assignedAt: '10:00 23 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 3,
    title: 'final',
    lessonDate: '23 Sen, 2026',
    hasVideo: false,
    score: null,
    homework: {
      id: 3,
      title: 'Final loyihani taqdimot qilish',
      deadline: '25 Sen, 2026 23:59',
      filesCount: 0,
      content: 'Portfolio loyihangizni Vercel ga deploy qilib, live demo URL manzilini topshiring.',
      assignedAt: '14:00 23 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 4,
    title: 'Interview',
    lessonDate: '22 Sen, 2026',
    hasVideo: false,
    score: 95,
    homework: {
      id: 4,
      title: 'Texnik savollar tahlili',
      deadline: '23 Sen, 2026 09:00',
      filesCount: 0,
      content: 'JavaScript Event Loop va Vue Lifecycle hooks bo\'yicha 5 ta savolga video/audio javob tayyorlash.',
      assignedAt: '16:30 22 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 5,
    title: '.',
    lessonDate: '21 Sen, 2026',
    hasVideo: false,
    score: null,
    homework: {
      id: 5,
      title: 'Mustaqil amaliyot',
      deadline: '22 Sen, 2026 12:00',
      filesCount: 0,
      content: 'Figma maketini to\'liq pixel-perfect ko\'rinishda adaptiv HTML/CSS da terish.',
      assignedAt: '11:15 21 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 6,
    title: 'Imtihon interview',
    lessonDate: '18 Sen, 2026',
    hasVideo: false,
    score: 85,
    homework: {
      id: 6,
      title: 'Oral interview topshiriqlari',
      deadline: '19 Sen, 2026 15:00',
      filesCount: 0,
      content: 'Backend API arxitekturasi va RESTful tamoyillar bo\'yicha tushunchalar.',
      assignedAt: '15:20 18 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 7,
    title: 'paymet',
    lessonDate: '17 Sen, 2026',
    hasVideo: false,
    score: 90,
    homework: {
      id: 7,
      title: 'Payment integratsiyasi',
      deadline: '18 Sen, 2026 18:00',
      filesCount: 0,
      content: 'Click va Payme checkout sahifasining front-end qismini yaratish.',
      assignedAt: '10:00 17 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 8,
    title: 'erp project continue',
    lessonDate: '16 Sen, 2026',
    hasVideo: false,
    score: 92,
    homework: {
      id: 8,
      title: 'ERP loyihasi davomi',
      deadline: '17 Sen, 2026 23:59',
      filesCount: 0,
      content: 'Sidebar drawer va responsive navigation komponentlarini yakunlash.',
      assignedAt: '11:45 16 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 9,
    title: 'takrorlash',
    lessonDate: '15 Sen, 2026',
    hasVideo: false,
    score: 80,
    homework: {
      id: 9,
      title: 'Takrorlash va testlar',
      deadline: '16 Sen, 2026 18:00',
      filesCount: 0,
      content: 'Ot\'ilgan modullar bo\'yicha 20 ta test savolini to\'liq yechish.',
      assignedAt: '14:10 15 Sen, 2026',
    },
    submission: null,
  },
  {
    id: 10,
    title: 'Erp practise',
    lessonDate: '14 Sen, 2026',
    hasVideo: false,
    score: 85,
    homework: {
      id: 10,
      title: 'ERP amaliyot darsi',
      deadline: '15 Sen, 2026 18:00',
      filesCount: 0,
      content: 'Talabalar davomati jadvali va filtrlar logikasini yozish.',
      assignedAt: '09:30 14 Sen, 2026',
    },
    submission: null,
  },
]);

const selectedLessonId = ref<number>(1);
const activeLesson = computed(() => {
  return lessons.value.find((l) => l.id === selectedLessonId.value) || lessons.value[0];
});

// Submission Form State
const showSubmitModal = ref(false);
const inputLinkUrl = ref('');
const inputTextAnswer = ref('');
const selectedFiles = ref<{ name: string; size: string }[]>([]);
const isSubmitting = ref(false);
const submitSuccess = ref(false);

function openSubmitForm() {
  if (activeLesson.value.submission) {
    inputLinkUrl.value = activeLesson.value.submission.linkUrl || '';
    inputTextAnswer.value = activeLesson.value.submission.textAnswer || '';
  } else {
    inputLinkUrl.value = '';
    inputTextAnswer.value = '';
  }
  selectedFiles.value = [];
  showSubmitModal.value = true;
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  if (!target.files) return;
  for (let i = 0; i < target.files.length; i++) {
    const f = target.files[i];
    selectedFiles.value.push({
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
    });
  }
}

async function handleSendSubmission() {
  if (!inputLinkUrl.value && !inputTextAnswer.value && selectedFiles.value.length === 0) {
    alert("Iltimos, havola, matn yoki fayl kiriting!");
    return;
  }
  isSubmitting.value = true;
  try {
    const hwId = activeLesson.value.homework?.id || 1;
    await erpService.submitHomework(hwId, {
      textAnswer: inputTextAnswer.value,
      fileUrls: inputLinkUrl.value ? [inputLinkUrl.value] : [],
    });

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getDate()} ${['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][now.getMonth()]}, ${now.getFullYear()}`;

    activeLesson.value.submission = {
      id: Date.now(),
      textAnswer: inputTextAnswer.value,
      linkUrl: inputLinkUrl.value,
      filesCount: selectedFiles.value.length,
      submittedAt: timeStr,
      score: activeLesson.value.submission?.score || null,
    };

    submitSuccess.value = true;
    setTimeout(() => {
      submitSuccess.value = false;
      showSubmitModal.value = false;
    }, 1500);
  } catch (err) {
    console.error('Submission failed:', err);
    // Local fallback update
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${now.getDate()} Avg, ${now.getFullYear()}`;
    activeLesson.value.submission = {
      id: Date.now(),
      textAnswer: inputTextAnswer.value,
      linkUrl: inputLinkUrl.value,
      filesCount: selectedFiles.value.length,
      submittedAt: timeStr,
      score: null,
    };
    showSubmitModal.value = false;
  } finally {
    isSubmitting.value = false;
  }
}

async function loadData() {
  try {
    const hwRes = await erpService.getHomeworks();
    if (Array.isArray(hwRes) && hwRes.length > 0) {
      // Map live homework into lessons if present
      hwRes.forEach((hw, idx) => {
        if (lessons.value[idx]) {
          lessons.value[idx].homework = {
            id: hw.id,
            title: hw.title || 'Uyga vazifa',
            deadline: hw.deadline ? new Date(hw.deadline).toLocaleString('uz-UZ') : '19 Avg, 2026 04:31',
            filesCount: hw.fileUrls?.length || 0,
            content: hw.task || hw.title,
            assignedAt: (hw as any).assignedAt || 'Bugun',
          };
        }
      });
    }
  } catch (e) {
    console.warn('API error, using initial mock data:', e);
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-4 pb-12 font-sans text-slate-800">
    <!-- Main 2-Column Layout Matching Screenshot 2 -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      <!-- ================= LEFT / MAIN CONTENT AREA (lg:col-span-9) ================= -->
      <div class="lg:col-span-9 space-y-4">
        <!-- 1. VIDEO PLAYER SECTION (Screenshot 2: Geometric Emblem + "Video mavjud emas") -->
        <div class="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          <div class="w-full h-64 sm:h-72 bg-linear-to-b from-[#faf8f5] to-[#f4efe8] flex flex-col items-center justify-center relative p-6 select-none">
            <!-- Geometric Emblem Logo (Golden/Bronze Luxury Symbol from Screenshot 2) -->
            <div class="text-[#c59d5f] mb-3">
              <svg width="84" height="64" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="drop-shadow-2xs">
                <!-- Outer wings -->
                <path d="M50 75L15 25L28 10L50 45L72 10L85 25L50 75Z" stroke="#B8860B" stroke-width="2.5" stroke-linejoin="round" />
                <path d="M50 60L25 25L35 15L50 38L65 15L75 25L50 60Z" stroke="#B8860B" stroke-width="2" stroke-linejoin="round" />
                <!-- Center diamond lines -->
                <path d="M50 15L40 30L50 48L60 30L50 15Z" stroke="#B8860B" stroke-width="2" stroke-linejoin="round" />
                <path d="M50 48V75" stroke="#B8860B" stroke-width="2" />
                <path d="M35 15L50 0L65 15" stroke="#B8860B" stroke-width="2" stroke-linejoin="round" />
              </svg>
            </div>

            <div class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Video mavjud emas
            </div>
          </div>

          <!-- Bottom Topic Strip Matching Screenshot 2 -->
          <div class="px-5 py-3 border-t border-slate-100 bg-white flex items-center justify-between">
            <span class="text-xs font-semibold text-slate-800">
              {{ activeLesson.title }}
            </span>
            <span class="text-[11px] font-medium text-slate-400">
              {{ activeLesson.lessonDate }}
            </span>
          </div>
        </div>

        <!-- 2. VAZIFALAR TAB BAR & BALL SCORE BADGE (Screenshot 2) -->
        <div class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-[#b45309] pb-1 border-b-2 border-[#b45309]">
                Vazifalar
              </span>
            </div>

            <!-- Score Pill Matching Screenshot 2 (e.g. Ball: 91) -->
            <div class="text-xs font-bold text-slate-700">
              <span v-if="activeLesson.score !== null && activeLesson.score !== undefined" class="text-slate-900">
                Ball: <span class="text-emerald-700 font-extrabold text-sm">{{ activeLesson.score }}</span>
              </span>
              <span v-else class="text-slate-400 font-medium">
                Baholanmagan
              </span>
            </div>
          </div>

          <!-- 3. CARD 1: UYGA VAZIFA (Screenshot 2) -->
          <div class="rounded-xl border border-slate-100 bg-[#fdfbf8] p-4 sm:p-5 space-y-3 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <h3 class="text-sm font-bold text-slate-900">
                Uyga vazifa
              </h3>

              <!-- Orange-Red Deadline Pill Badge (Screenshot 2) -->
              <div class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#EA580C] text-white text-xs font-bold shadow-2xs self-start sm:self-auto">
                <AlertCircle class="h-3.5 w-3.5 shrink-0" />
                <span>Uyga vazifa muddati: {{ activeLesson.homework?.deadline || '19 Avg, 2026 04:31' }}</span>
              </div>

              <!-- Fayllar soni (Screenshot 2) -->
              <div class="text-xs font-semibold text-slate-600 self-end sm:self-auto">
                Fayllar soni: {{ activeLesson.homework?.filesCount || 0 }}
              </div>
            </div>

            <!-- Homework Content Link / Text (Screenshot 2) -->
            <div class="pt-2 text-xs text-slate-700 break-all leading-relaxed">
              <a
                v-if="activeLesson.homework?.content.startsWith('http')"
                :href="activeLesson.homework.content"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-1"
              >
                <span>{{ activeLesson.homework.content }}</span>
                <ExternalLink class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              </a>
              <p v-else class="text-slate-700 font-medium">
                {{ activeLesson.homework?.content }}
              </p>
            </div>

            <!-- Assigned Timestamp (Screenshot 2: Bottom Right e.g. "12:31 18 Avg, 2026") -->
            <div class="text-right text-[11px] font-medium text-slate-500 pt-1">
              {{ activeLesson.homework?.assignedAt || '12:31 18 Avg, 2026' }}
            </div>
          </div>

          <!-- 4. CARD 2: MENING JO'NATMALARIM (Screenshot 2) -->
          <div class="rounded-xl border border-slate-100 bg-[#fdfbf8] p-4 sm:p-5 space-y-3 shadow-2xs">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">
                Mening jo'natmalarim
              </h3>

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  @click="openSubmitForm"
                  class="px-3 py-1 rounded-lg text-xs font-bold bg-[#6D28D9] text-white hover:bg-[#5b21b6] transition cursor-pointer active:scale-95 shadow-2xs"
                >
                  {{ activeLesson.submission ? "Tahrirlash / Qayta yuborish" : "+ Vazifani topshirish" }}
                </button>
                <span class="text-xs font-semibold text-slate-600">
                  Fayllar soni: {{ activeLesson.submission?.filesCount || 0 }}
                </span>
              </div>
            </div>

            <!-- Submitted Link / Content (Screenshot 2) -->
            <div v-if="activeLesson.submission" class="pt-2 text-xs text-slate-700 break-all leading-relaxed">
              <a
                v-if="activeLesson.submission.linkUrl"
                :href="activeLesson.submission.linkUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 hover:underline flex items-start gap-1 font-medium"
              >
                <span>{{ activeLesson.submission.linkUrl }}</span>
                <ExternalLink class="h-3.5 w-3.5 shrink-0 mt-0.5" />
              </a>
              <p v-if="activeLesson.submission.textAnswer" class="mt-1 text-slate-800">
                {{ activeLesson.submission.textAnswer }}
              </p>

              <!-- Feedback note if evaluated -->
              <div v-if="activeLesson.submission.feedback" class="mt-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                <span class="font-bold">Ustoz izohi:</span> {{ activeLesson.submission.feedback }}
              </div>

              <!-- Submitted Timestamp (Screenshot 2: Bottom Right e.g. "13:04 18 Avg, 2026") -->
              <div class="text-right text-[11px] font-medium text-slate-500 pt-2">
                {{ activeLesson.submission.submittedAt }}
              </div>
            </div>

            <!-- Empty State when not submitted -->
            <div v-else class="py-6 text-center text-xs text-slate-400 space-y-2">
              <FolderOpen class="h-8 w-8 mx-auto text-slate-300" />
              <p>Siz hali bu dars uchun vazifa topshirmagansiz.</p>
              <button
                type="button"
                @click="openSubmitForm"
                class="px-4 py-2 rounded-xl text-xs font-bold bg-[#6D28D9] text-white hover:bg-[#5b21b6] transition cursor-pointer shadow-2xs"
              >
                Vazifani yuborish
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= RIGHT / SYLLABUS TIMELINE SIDEBAR (lg:col-span-3 - Matching Screenshot 2) ================= -->
      <div class="lg:col-span-3 space-y-2">
        <div
          v-for="item in lessons"
          :key="item.id"
          @click="selectedLessonId = item.id"
          class="p-3.5 rounded-xl border transition-all cursor-pointer select-none group"
          :class="
            selectedLessonId === item.id
              ? 'bg-[#fcf8f2] border-[#e7d8c4] shadow-xs'
              : 'bg-white border-slate-200/70 hover:bg-slate-50/70'
          "
        >
          <div class="font-bold text-xs text-slate-900 group-hover:text-[#b45309] transition-colors leading-tight">
            {{ item.title }}
          </div>
          <div class="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Dars sanasi: {{ item.lessonDate }}</span>
            <span
              v-if="item.score !== null && item.score !== undefined"
              class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100"
            >
              {{ item.score }} ball
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= SUBMIT HOMEWORK MODAL ================= -->
    <Teleport to="body">
      <div
        v-if="showSubmitModal"
        @click="showSubmitModal = false"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
      ></div>

      <div
        v-if="showSubmitModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          @click.stop
          class="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all p-6 space-y-4"
        >
          <div class="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 class="text-base font-bold text-slate-900">
                Uyga vazifa topshirish
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ activeLesson.title }} ({{ activeLesson.lessonDate }})
              </p>
            </div>
            <button
              @click="showSubmitModal = false"
              class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form @submit.prevent="handleSendSubmission" class="space-y-4">
            <!-- Link input (GitHub, Figma, Google Drive) -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">
                Loyiha yoki Vazifa havolasi (GitHub, Figma, Vercel va h.k.) *
              </label>
              <div class="relative">
                <input
                  v-model="inputLinkUrl"
                  type="url"
                  placeholder="https://github.com/..."
                  class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] text-slate-800"
                />
                <LinkIcon class="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <!-- Text Description -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">
                Qo'shimcha izoh yoki matnli javob
              </label>
              <textarea
                v-model="inputTextAnswer"
                rows="3"
                placeholder="Vazifa bajarilishi haqida qisqacha ma'lumot..."
                class="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] text-slate-800 resize-none"
              ></textarea>
            </div>

            <!-- File Upload Dropzone -->
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">
                Fayllar yuklash (ixtiyoriy)
              </label>
              <label class="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-[#6D28D9] rounded-xl cursor-pointer bg-slate-50/50 hover:bg-violet-50/20 transition">
                <UploadCloud class="h-6 w-6 text-slate-400" />
                <span class="text-xs font-semibold text-slate-600 mt-1">Faylni tanlang yoki shu yerga tashlang</span>
                <span class="text-[10px] text-slate-400">PDF, ZIP, PNG, MP4 (maksimal 25MB)</span>
                <input type="file" multiple @change="handleFileSelect" class="hidden" />
              </label>

              <!-- Selected Files List -->
              <div v-if="selectedFiles.length > 0" class="mt-2 space-y-1">
                <div
                  v-for="(f, fIdx) in selectedFiles"
                  :key="fIdx"
                  class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-100 text-xs text-slate-700"
                >
                  <span class="font-medium truncate max-w-xs">{{ f.name }} ({{ f.size }})</span>
                  <button
                    type="button"
                    @click="selectedFiles.splice(fIdx, 1)"
                    class="text-rose-500 hover:text-rose-700 font-bold ml-2 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Success Alert -->
            <div v-if="submitSuccess" class="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <Check class="h-4 w-4 text-emerald-600" />
              <span>Vazifa muvaffaqiyatli topshirildi!</span>
            </div>

            <!-- Footer Buttons -->
            <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                @click="showSubmitModal = false"
                class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                :disabled="isSubmitting"
                class="px-5 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-2"
              >
                <Send class="h-3.5 w-3.5" />
                <span>{{ isSubmitting ? "Yuborilmoqda..." : "Yuborish" }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
