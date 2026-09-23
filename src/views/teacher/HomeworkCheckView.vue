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
} from 'lucide-vue-next';

const submissions = ref<TeacherSubmission[]>([]);
const loading = ref(false);
const activeFilter = ref<'ALL' | 'PENDING' | 'CHECKED'>('ALL');

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
  if (activeFilter.value === 'PENDING') {
    return submissions.value.filter((s) => s.status === 'PENDING' || s.status === 'NOT_SUBMITTED');
  }
  if (activeFilter.value === 'CHECKED') {
    return submissions.value.filter((s) => s.status === 'CHECKED' || s.status === 'ACCEPTED' || s.status === 'REJECTED');
  }
  return submissions.value;
});

// Checking modal
const showCheckModal = ref(false);
const activeSubmission = ref<TeacherSubmission | null>(null);
const scoreInput = ref(85);
const feedbackInput = ref('');
const isSaving = ref(false);

const computedCoins = computed(() => {
  if (scoreInput.value >= 80) return 10;
  if (scoreInput.value >= 60) return 5;
  return 0;
});

function openCheckModal(sub: TeacherSubmission) {
  activeSubmission.value = sub;
  scoreInput.value = sub.score !== null && sub.score !== undefined ? sub.score : 85;
  feedbackInput.value = sub.feedback || '';
  showCheckModal.value = true;
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

    showToast('Topshiriq baholandi va talabaga tangalar biriktirildi!');
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
  return `${d.getDate()}-${['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek'][d.getMonth()]} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<template>
  <div class="space-y-6 pb-12 font-sans text-slate-800">
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
          O'quvchilar yuborgan topshiriqlarni tekshiring, baholang va rag'batlantiruvchi tangalar bering.
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
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Barchasi ({{ submissions.length }})
          </button>
          <button
            @click="activeFilter = 'PENDING'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeFilter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Kutilmoqda ({{ submissions.filter(s => s.status === 'PENDING' || s.status === 'NOT_SUBMITTED').length }})
          </button>
          <button
            @click="activeFilter = 'CHECKED'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition"
            :class="activeFilter === 'CHECKED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
          >
            Tekshirilgan ({{ submissions.filter(s => s.status === 'CHECKED' || s.status === 'ACCEPTED').length }})
          </button>
        </div>
      </div>
    </div>

    <!-- Submissions List -->
    <div class="space-y-3">
      <div
        v-for="sub in filteredSubmissions"
        :key="sub.id"
        class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all space-y-4"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-red-50 text-[#BC000D] font-bold flex items-center justify-center text-sm shrink-0">
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
              class="text-xs font-bold px-2.5 py-1 rounded-full border"
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
          <div v-if="sub.textAnswer" class="text-slate-700 font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
            💬 "{{ sub.textAnswer }}"
          </div>

          <div v-if="sub.fileUrl || (sub.fileUrls && sub.fileUrls.length > 0)" class="flex items-center gap-2 pt-1">
            <span class="text-slate-500 font-medium">Havola / Fayl:</span>
            <a
              :href="sub.fileUrl || sub.fileUrls[0]"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <ExternalLink class="h-3.5 w-3.5" />
              <span>Yuborilgan faylni ko'rish</span>
            </a>
          </div>

          <!-- Existing Evaluation -->
          <div
            v-if="sub.status === 'CHECKED' || sub.status === 'ACCEPTED' || sub.status === 'REJECTED'"
            class="mt-3 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <span class="font-bold text-emerald-800 text-sm">
                Natija: {{ sub.score }} / 100 ball
              </span>
              <span v-if="sub.coinsEarned" class="text-amber-600 font-bold flex items-center gap-1">
                <Coins class="h-3.5 w-3.5 text-amber-500" />
                +{{ sub.coinsEarned }} coin berildi
              </span>
            </div>
            <p v-if="sub.feedback" class="text-slate-600 italic">
              "{{ sub.feedback }}"
            </p>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-2 border-t border-slate-100 flex justify-end">
          <button
            @click="openCheckModal(sub)"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#BC000D] hover:bg-[#9c000b] text-white font-semibold text-xs transition cursor-pointer"
          >
            <BookOpenCheck class="h-4 w-4" />
            <span>{{ sub.status === 'PENDING' || sub.status === 'NOT_SUBMITTED' ? 'Baholash va Tekshirish' : 'Qayta Baholash' }}</span>
          </button>
        </div>
      </div>

      <div v-if="filteredSubmissions.length === 0" class="text-center py-16 bg-white rounded-2xl border border-slate-100 text-slate-400 text-xs">
        Hech qanday topshiriqlar topilmadi
      </div>
    </div>

    <!-- Check Modal -->
    <Modal
      :show="showCheckModal"
      title="Topshiriqni Baholash"
      description="Ball va talaba uchun rag'batlantiruvchi tangalarni belgilang."
      maxWidth="md"
      @close="showCheckModal = false"
    >
      <div v-if="activeSubmission" class="space-y-4 text-xs">
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div class="font-bold text-slate-900">{{ activeSubmission.student.firstName }} {{ activeSubmission.student.lastName }}</div>
          <div class="text-slate-500 text-[11px]">{{ activeSubmission.groupName }} • {{ activeSubmission.lessonTopic }}</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block font-semibold text-slate-700 mb-1">Ball (0 - 100) *</label>
            <input
              v-model.number="scoreInput"
              type="number"
              min="0"
              max="100"
              class="w-full rounded-xl border border-slate-200 p-2.5 font-bold focus:border-[#BC000D] focus:outline-none"
            />
          </div>

          <div>
            <label class="block font-semibold text-slate-700 mb-1">Beriladigan Tanga (Coin)</label>
            <div class="w-full rounded-xl border border-slate-200 bg-amber-50/60 p-2.5 font-bold text-amber-700 flex items-center gap-1">
              <Coins class="w-4 h-4 text-amber-500" />
              <span>+{{ computedCoins }} Coin</span>
            </div>
          </div>
        </div>

        <div>
          <label class="block font-semibold text-slate-700 mb-1">O'qituvchi Fikri / Maslahati</label>
          <textarea
            v-model="feedbackInput"
            rows="3"
            placeholder="Talabaga tavsiya va izoh yozing..."
            class="w-full rounded-xl border border-slate-200 p-2.5 focus:border-[#BC000D] focus:outline-none"
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
          class="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#BC000D] hover:bg-[#9c000b] rounded-xl cursor-pointer disabled:opacity-50"
        >
          <CheckCircle class="h-4 w-4" />
          <span>{{ isSaving ? 'Saqlanmoqda...' : 'Natijani Tasdiqlash' }}</span>
        </button>
      </template>
    </Modal>
  </div>
</template>
