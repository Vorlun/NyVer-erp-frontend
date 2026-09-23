<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { Homework, HomeworkSubmission } from '../../types';
import Badge from '../../components/ui/Badge.vue';
import { Send, CheckCircle2, Award, Calendar } from 'lucide-vue-next';

const authStore = useAuthStore();
const studentId = computed(() => authStore.user?.id || 5);

const homeworks = ref<Homework[]>([]);
const submissions = ref<HomeworkSubmission[]>([]);
const loading = ref(false);

const selectedHomeworkId = ref<number | null>(null);

// Selected homework
const currentHomework = computed(() => {
  if (selectedHomeworkId.value) {
    return (
      homeworks.value.find((h) => h.id === selectedHomeworkId.value) ||
      homeworks.value[0]
    );
  }
  return homeworks.value[0];
});

// Student's submission for current homework
const mySubmission = computed(() =>
  submissions.value.find(
    (s) => s.studentId === studentId.value && s.homeworkId === currentHomework.value?.id
  )
);

// Form
const answerText = ref('');
const fileUrl = ref('');
const isSuccess = ref(false);

watch(
  mySubmission,
  (sub) => {
    if (sub) {
      answerText.value = sub.textAnswer || '';
      fileUrl.value = sub.fileUrls?.[0] || '';
    } else {
      answerText.value = '';
      fileUrl.value = '';
    }
  },
  { immediate: true }
);

async function loadData() {
  loading.value = true;
  try {
    const sId = studentId.value;
    const [hwRes, subRes] = await Promise.allSettled([
      erpService.getHomeworks(),
      erpService.getSubmissions({ studentId: sId }),
    ]);

    if (hwRes.status === 'fulfilled' && hwRes.value) {
      const val = hwRes.value;
      homeworks.value = Array.isArray(val) ? val : (val as any).data || [];
      if (homeworks.value.length > 0 && !selectedHomeworkId.value) {
        selectedHomeworkId.value = homeworks.value[0].id;
      }
    }
    if (subRes.status === 'fulfilled' && subRes.value) {
      const val = subRes.value;
      submissions.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error('Failed to load homework data:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

async function handleSubmit() {
  if (!currentHomework.value || !answerText.value) return;

  try {
    await erpService.submitHomework(currentHomework.value.id, {
      textAnswer: answerText.value,
      fileUrls: fileUrl.value ? [fileUrl.value] : [],
    });

    await loadData();
    isSuccess.value = true;
    setTimeout(() => {
      isSuccess.value = false;
    }, 4000);
  } catch (err) {
    console.error('Failed to submit homework:', err);
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Uy Vazifalarim</h1>
      <p class="text-sm text-slate-500">
        Topshiriqlarni o'z vaqtida yuboring, ball va rag'batlantiruvchi tangalarni qo'lga kiriting.
      </p>
    </div>

    <!-- Multiple Homeworks Selector -->
    <div v-if="homeworks.length > 1" class="flex items-center gap-2 overflow-x-auto pb-1">
      <button
        v-for="(hw, idx) in homeworks"
        :key="hw.id"
        @click="selectedHomeworkId = hw.id"
        type="button"
        class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2"
        :class="
          currentHomework?.id === hw.id
            ? 'bg-[#c26224] text-white shadow-xs'
            : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
        "
      >
        <span>Topshiriq #{{ idx + 1 }}: {{ hw.title }}</span>
      </button>
    </div>

    <!-- Active Homework Card -->
    <div v-if="currentHomework" class="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2">
            <span class="rounded-lg bg-[#fff4ed] px-2.5 py-1 text-xs font-bold text-[#c26224] border border-[#fed7aa]/60">
              Dars #3 Topshirig'i
            </span>
            <span class="flex items-center gap-1 text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md">
              <Calendar class="h-3.5 w-3.5" />
              Muddati: {{ new Date(currentHomework.deadline || '').toLocaleDateString('uz-UZ') }}
            </span>
          </div>
          <h2 class="text-lg font-bold text-slate-900 mt-2">
            {{ currentHomework.title }}
          </h2>
        </div>

        <div class="text-right self-start sm:self-auto">
          <Badge
            v-if="mySubmission"
            :variant="
              mySubmission.status === 'ACCEPTED'
                ? 'success'
                : mySubmission.status === 'REJECTED'
                ? 'danger'
                : 'warning'
            "
          >
            {{ mySubmission.status === 'PENDING' ? 'Tekshirilmoqda' : mySubmission.status }}
          </Badge>
          <Badge v-else variant="default">Topshirilmagan</Badge>
        </div>
      </div>

      <!-- Task Details -->
      <div class="text-xs text-slate-700 space-y-2 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
        <h4 class="font-bold uppercase text-[11px] tracking-wider text-slate-500">
          Vazifa Sharti:
        </h4>
        <p class="leading-relaxed">{{ currentHomework.task }}</p>

        <div class="pt-2 flex items-center gap-4 text-slate-600 font-medium">
          <span>🎯 Maksimal ball: <b>{{ currentHomework.maxScore }}</b></span>
          <span>🪙 Maksimal tanga: <b>{{ currentHomework.maxCoins }} coin</b></span>
        </div>
      </div>

      <!-- Submission Status & Teacher Feedback (if evaluated) -->
      <div
        v-if="mySubmission && (mySubmission.status === 'ACCEPTED' || mySubmission.status === 'REJECTED')"
        class="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs space-y-2"
      >
        <div class="flex items-center justify-between">
          <span class="font-bold text-emerald-900 text-sm">
            Ustoz Bahosi: {{ mySubmission.score }} ball
          </span>
          <span class="font-bold text-amber-600 bg-amber-100/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
            <Award class="h-4 w-4" />
            +{{ mySubmission.coinsEarned }} coin berildi
          </span>
        </div>
        <p v-if="mySubmission.feedback" class="text-emerald-800">
          <b>Ustoz sharhi:</b> "{{ mySubmission.feedback }}"
        </p>
      </div>

      <!-- Success Alert -->
      <div
        v-if="isSuccess"
        class="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800"
      >
        <CheckCircle2 class="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Vazifa muvaffaqiyatli topshirildi! Ustoz tekshiruvidan so'ng tangalar hisobingizga tushadi.</span>
      </div>

      <!-- Submit Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4 pt-2">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">
            Javobingiz yoki Loyiha Tavsifi *
          </label>
          <textarea
            v-model="answerText"
            required
            rows="4"
            placeholder="Qilgan ishlaringiz haqida qisqacha yozing..."
            class="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:border-[#c26224] focus:outline-none"
          ></textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">
            GitHub yoki Jonli Demo Havolasi (URL)
          </label>
          <input
            v-model="fileUrl"
            type="url"
            placeholder="https://github.com/foydalanuvchi/loyiha yoki https://my-app.vercel.app"
            class="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 focus:border-[#c26224] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#c26224] hover:bg-[#ab541d] active:bg-[#924515] text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
        >
          <Send class="h-4 w-4" />
          <span>{{ mySubmission ? 'Qayta Yuborish' : 'Vazifani Topshirish' }}</span>
        </button>
      </form>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!loading"
      class="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500"
    >
      <CheckCircle2 class="mx-auto h-12 w-12 text-slate-300 mb-3" />
      <h3 class="text-sm font-bold text-slate-700">Hozircha topshiriqlar mavjud emas</h3>
      <p class="text-xs text-slate-400 mt-1">Yangi uy vazifalari berilganda bu yerda ko'rinadi</p>
    </div>
  </div>
</template>
