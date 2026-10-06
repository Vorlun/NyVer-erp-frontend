<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { TeacherSubmission } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  BookOpenCheck,
  ExternalLink,
  CheckCircle,
  Coins,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-vue-next';

const submissions = ref<TeacherSubmission[]>([]);
const loading = ref(false);
const activeFilter = ref<'ALL' | 'PENDING' | 'CHECKED'>('ALL');
const searchQuery = ref('');

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

async function loadData() {
  loading.value = true;
  try {
    const res = await erpService.getTeacherSubmissions();
    submissions.value = res || [];
  } catch (err) {
    console.error('Failed to load homework submissions:', err);
    showToast('Topshiriqlarni yuklashda xatolik yuz berdi', 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const filteredSubmissions = computed(() => {
  let list = submissions.value;
  if (activeFilter.value === 'PENDING') {
    list = list.filter((s) => s.status === 'PENDING' || s.status === 'NOT_SUBMITTED');
  } else if (activeFilter.value === 'CHECKED') {
    list = list.filter((s) => s.status === 'CHECKED' || s.status === 'ACCEPTED' || s.status === 'REJECTED');
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (s) =>
        s.student?.firstName?.toLowerCase().includes(q) ||
        s.student?.lastName?.toLowerCase().includes(q) ||
        s.groupName?.toLowerCase().includes(q) ||
        s.lessonTopic?.toLowerCase().includes(q)
    );
  }
  return list;
});

// Checking modal
const showCheckModal = ref(false);
const activeSubmission = ref<TeacherSubmission | null>(null);
const scoreInput = ref(90);
const feedbackInput = ref('');
const isSaving = ref(false);

// Strict Nyver Coin Rules:
// 90-100: +3 coin, 70-89: +2 coin, 60-69: +1 coin, <60: 0 coin
const computedCoins = computed(() => {
  const val = Number(scoreInput.value) || 0;
  if (val >= 90) return 3;
  if (val >= 70) return 2;
  if (val >= 60) return 1;
  return 0;
});

function openCheckModal(sub: TeacherSubmission) {
  activeSubmission.value = sub;
  scoreInput.value = sub.score !== null && sub.score !== undefined ? sub.score : 90;
  feedbackInput.value = sub.feedback || '';
  showCheckModal.value = true;
}

function applyQuickFeedback(text: string) {
  feedbackInput.value = text;
}

async function handleSaveCheck() {
  if (!activeSubmission.value) return;

  isSaving.value = true;
  try {
    await erpService.gradeTeacherSubmission(activeSubmission.value.id, {
      score: Number(scoreInput.value),
      coinsEarned: computedCoins.value,
      feedback: feedbackInput.value,
      status: scoreInput.value >= 60 ? 'CHECKED' : 'REJECTED',
    });

    showToast(`Topshiriq baholandi va talabaga +${computedCoins.value} coin biriktirildi!`);
    showCheckModal.value = false;
    await loadData();
  } catch (err: any) {
    console.error('Failed to check submission:', err);
    showToast(err?.response?.data?.message || 'Baholashda xatolik yuz berdi', 'error');
  } finally {
    isSaving.value = false;
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getDate()} ${['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]}, ${d.getFullYear()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<template>
  <div class="space-y-6 pb-12 font-sans text-slate-800 max-w-6xl">
    <!-- Toast notification -->
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
        <CheckCircle v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
        <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Uy Vazifalarini Tekshirish</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          O'quvchilar yuborgan amaliy vazifalarni tekshiring, ball qo'ying va Nyver tangalarini taqsimlang.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="loadData"
          class="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          title="Yangilash"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>

        <!-- Status Filter tabs -->
        <div class="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80 text-xs font-semibold">
          <button
            @click="activeFilter = 'ALL'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            :class="activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Barchasi ({{ submissions.length }})
          </button>
          <button
            @click="activeFilter = 'PENDING'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            :class="activeFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Kutilmoqda ({{ submissions.filter(s => s.status === 'PENDING' || s.status === 'NOT_SUBMITTED').length }})
          </button>
          <button
            @click="activeFilter = 'CHECKED'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            :class="activeFilter === 'CHECKED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Tekshirilgan ({{ submissions.filter(s => s.status === 'CHECKED' || s.status === 'ACCEPTED').length }})
          </button>
        </div>
      </div>
    </div>

    <!-- Search Input -->
    <div class="relative max-w-md">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Talaba, guruh yoki mavzu bo'yicha qidirish..."
        class="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] shadow-2xs"
      />
    </div>

    <!-- Submissions List Matching Clean Aesthetic -->
    <div class="space-y-4">
      <div
        v-for="sub in filteredSubmissions"
        :key="sub.id"
        class="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-violet-50 text-[#6D28D9] font-bold flex items-center justify-center text-sm shrink-0 border border-violet-100">
              {{ sub.student.firstName?.charAt(0) || 'T' }}{{ sub.student.lastName?.charAt(0) || '' }}
            </div>
            <div>
              <h3 class="font-bold text-slate-900 text-sm">
                {{ sub.student.firstName }} {{ sub.student.lastName }}
              </h3>
              <p class="text-xs text-slate-500">
                Guruh: <span class="font-semibold text-slate-700">{{ sub.groupName }}</span> • Dars: <span class="font-medium text-slate-700">{{ sub.lessonTopic }}</span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span
              class="text-xs font-bold px-3 py-1 rounded-full border tracking-wide"
              :class="
                sub.status === 'CHECKED' || sub.status === 'ACCEPTED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : sub.status === 'REJECTED'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              "
            >
              {{ sub.status === 'CHECKED' || sub.status === 'ACCEPTED' ? 'Tekshirilgan' : sub.status === 'REJECTED' ? 'Qaytarildi' : 'Kutilmoqda' }}
            </span>

            <span class="text-xs text-slate-400">
              {{ formatDate(sub.submittedAt) }}
            </span>
          </div>
        </div>

        <!-- Submission Content -->
        <div class="space-y-2 text-xs">
          <div v-if="sub.textAnswer" class="text-slate-700 font-medium bg-[#fcf8f2] p-3 rounded-xl border border-[#ede3d4]/70">
            💬 "{{ sub.textAnswer }}"
          </div>

          <div v-if="sub.fileUrl || (sub.fileUrls && sub.fileUrls.length > 0)" class="flex items-center gap-2 pt-1">
            <span class="text-slate-500 font-medium">Havola / Fayl:</span>
            <a
              :href="sub.fileUrl || sub.fileUrls[0]"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline break-all"
            >
              <ExternalLink class="h-3.5 w-3.5 shrink-0" />
              <span>{{ sub.fileUrl || sub.fileUrls[0] }}</span>
            </a>
          </div>

          <!-- Existing Evaluation -->
          <div
            v-if="sub.status === 'CHECKED' || sub.status === 'ACCEPTED' || sub.status === 'REJECTED'"
            class="mt-3 p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div class="flex items-center gap-3">
              <span class="font-bold text-emerald-900 text-sm">
                Ball: {{ sub.score }} / 100
              </span>
              <span v-if="sub.coinsEarned" class="text-amber-600 font-bold flex items-center gap-1 text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <Coins class="h-3.5 w-3.5 text-amber-500" />
                +{{ sub.coinsEarned }} coin berilgan
              </span>
            </div>
            <p v-if="sub.feedback" class="text-slate-600 text-xs italic">
              "{{ sub.feedback }}"
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-2 border-t border-slate-100 flex justify-end">
          <button
            @click="openCheckModal(sub)"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-semibold text-xs transition cursor-pointer shadow-2xs active:scale-95"
          >
            <BookOpenCheck class="h-4 w-4" />
            <span>{{ sub.status === 'PENDING' || sub.status === 'NOT_SUBMITTED' ? 'Baholash va Tekshirish' : 'Qayta Baholash' }}</span>
          </button>
        </div>
      </div>

      <div v-if="filteredSubmissions.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
        Hozircha hech qanday topshiriqlar mavjud emas
      </div>
    </div>

    <!-- Check & Grading Modal -->
    <Modal
      :show="showCheckModal"
      title="Topshiriqni Baholash"
      description="Talabaning ishini baholang va qoidaga ko'ra Nyver coinlarni biriktiring."
      maxWidth="md"
      @close="showCheckModal = false"
    >
      <div v-if="activeSubmission" class="space-y-4 text-xs">
        <!-- Student Info Header -->
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
          <div>
            <div class="font-bold text-slate-900">{{ activeSubmission.student.firstName }} {{ activeSubmission.student.lastName }}</div>
            <div class="text-slate-500 text-[11px]">{{ activeSubmission.groupName }} • {{ activeSubmission.lessonTopic }}</div>
          </div>
          <span class="text-xs text-slate-400 font-medium">100 ballik shkala</span>
        </div>

        <!-- Score Input & Coin Preview -->
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Ball (0 - 100) *</label>
            <input
              v-model.number="scoreInput"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-xl border border-slate-200 p-2.5 font-bold text-slate-900 focus:border-[#6D28D9] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Coin mukofoti</label>
            <div class="w-full rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 font-bold text-amber-800 flex items-center justify-between">
              <span class="flex items-center gap-1.5">
                <Coins class="w-4 h-4 text-amber-600" />
                +{{ computedCoins }} Coin
              </span>
              <span class="text-[10px] text-amber-600 font-normal">
                {{ scoreInput >= 90 ? 'A\'lo (+3)' : scoreInput >= 70 ? 'Yaxshi (+2)' : scoreInput >= 60 ? 'Qoniqarli (+1)' : '0 coin' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Quick Coin Rules Guide -->
        <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
          <div class="font-bold text-slate-700">Nyver Coin Qoidasi:</div>
          <div class="flex items-center justify-between">
            <span>90–100 ball: <b>+3 coin</b></span>
            <span>70–89 ball: <b>+2 coin</b></span>
            <span>60–69 ball: <b>+1 coin</b></span>
          </div>
        </div>

        <!-- Feedback & Quick Presets -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="block font-semibold text-slate-700">Ustoz Izohi / Feedback</label>
            <span class="text-[10px] text-slate-400">Tezkor shablonlar:</span>
          </div>

          <!-- Quick feedback chips -->
          <div class="flex flex-wrap gap-1 mb-2">
            <button
              type="button"
              @click="applyQuickFeedback('A\'lo darajada bajarilgan! Kod toza va to\'g\'ri yozilgan.')"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 transition cursor-pointer"
            >
              A'lo darajada
            </button>
            <button
              type="button"
              @click="applyQuickFeedback('Yaxshi, lekin ba\'zi joylarni optimallashtirish kerak.')"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 transition cursor-pointer"
            >
              Optimallashtirish
            </button>
            <button
              type="button"
              @click="applyQuickFeedback('Vazifa shartiga to\'liq javob bermaydi, qayta ko\'rib chiqing.')"
              class="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-600 transition cursor-pointer"
            >
              Qayta topshirish
            </button>
          </div>

          <textarea
            v-model="feedbackInput"
            rows="3"
            placeholder="Talabaga tavsiya va izoh yozing..."
            class="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#6D28D9] focus:outline-none resize-none"
          ></textarea>
        </div>
      </div>

      <template #footer>
        <button
          @click="showCheckModal = false"
          class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          :disabled="isSaving"
          @click="handleSaveCheck"
          class="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5b21b6] rounded-xl cursor-pointer disabled:opacity-50 shadow-xs active:scale-95"
        >
          <CheckCircle class="h-4 w-4" />
          <span>{{ isSaving ? 'Saqlanmoqda...' : 'Natijani Tasdiqlash' }}</span>
        </button>
      </template>
    </Modal>
  </div>
</template>
