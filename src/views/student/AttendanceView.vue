<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { Attendance, Lesson } from '../../types';
import Badge from '../../components/ui/Badge.vue';
import { Coins, CheckCircle, Clock, XCircle } from 'lucide-vue-next';

const authStore = useAuthStore();
const studentId = computed(() => authStore.user?.id || 5);

const attendances = ref<Attendance[]>([]);
const lessons = ref<Lesson[]>([]);
const loading = ref(false);

const enrichedAttendances = computed(() => {
  return attendances.value.map((a) => ({
    ...a,
    lesson: lessons.value.find((l) => l.id === a.lessonId),
  }));
});

const presentCount = computed(
  () => attendances.value.filter((a) => a.status === 'PRESENT').length
);
const lateCount = computed(
  () => attendances.value.filter((a) => a.status === 'LATE').length
);
const absentCount = computed(
  () => attendances.value.filter((a) => a.status === 'ABSENT').length
);

async function loadData() {
  loading.value = true;
  try {
    const sId = studentId.value;
    const [attRes, lesRes] = await Promise.allSettled([
      erpService.getStudentAttendance(sId),
      erpService.getLessons(),
    ]);

    if (attRes.status === 'fulfilled' && attRes.value) {
      const val = attRes.value;
      attendances.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (lesRes.status === 'fulfilled' && lesRes.value) {
      const val = lesRes.value;
      lessons.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error('Failed to load student attendance:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold tracking-tight text-slate-900">Mening Davomatim</h1>
      <p class="text-sm text-slate-500">
        Barcha o'tilgan darslar bo'yicha qatnashuvingiz va olingan mukofot tangalari.
      </p>
    </div>

    <!-- Summary Counters -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div class="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1">
          <CheckCircle class="h-4 w-4" />
          <span>Kelgan</span>
        </div>
        <div class="text-2xl font-black text-slate-900">{{ presentCount }} ta</div>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div class="flex items-center gap-2 text-amber-600 text-xs font-bold mb-1">
          <Clock class="h-4 w-4" />
          <span>Kechikkan</span>
        </div>
        <div class="text-2xl font-black text-slate-900">{{ lateCount }} ta</div>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div class="flex items-center gap-2 text-rose-600 text-xs font-bold mb-1">
          <XCircle class="h-4 w-4" />
          <span>Qoldirilgan</span>
        </div>
        <div class="text-2xl font-black text-slate-900">{{ absentCount }} ta</div>
      </div>

      <div class="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div class="flex items-center gap-2 text-[#c26224] text-xs font-bold mb-1">
          <Coins class="h-4 w-4" />
          <span>Davomat Tangalari</span>
        </div>
        <div class="text-2xl font-black text-slate-900">
          +{{ attendances.reduce((acc, curr) => acc + curr.coinsEarned, 0) }} coin
        </div>
      </div>
    </div>

    <!-- Attendance Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold tracking-wider text-[11px]">
            <tr>
              <th class="px-6 py-3.5">Dars Tartibi</th>
              <th class="px-6 py-3.5">Mavzu</th>
              <th class="px-6 py-3.5">Sana</th>
              <th class="px-6 py-3.5">Qatnashuv Holati</th>
              <th class="px-6 py-3.5">Tanga</th>
              <th class="px-6 py-3.5">Ustoz Izohi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr
              v-for="att in enrichedAttendances"
              :key="att.id"
              class="hover:bg-slate-50/80 transition-colors"
            >
              <td class="px-6 py-4 font-bold text-slate-900">
                #{{ att.lesson?.lessonOrder || '—' }}
              </td>

              <td class="px-6 py-4 font-semibold text-slate-800">
                {{ att.lesson?.topic || 'Dars' }}
              </td>

              <td class="px-6 py-4 text-slate-500">
                {{ att.lesson?.lessonDate || new Date(att.created_at).toLocaleDateString('uz-UZ') }}
              </td>

              <td class="px-6 py-4">
                <Badge
                  :variant="
                    att.status === 'PRESENT'
                      ? 'success'
                      : att.status === 'LATE'
                      ? 'warning'
                      : 'danger'
                  "
                >
                  {{
                    att.status === 'PRESENT'
                      ? '✓ Kelgan'
                      : att.status === 'LATE'
                      ? '⏱ Kechikkan'
                      : '✕ Kelmagan'
                  }}
                </Badge>
              </td>

              <td class="px-6 py-4">
                <span
                  v-if="att.coinsEarned > 0"
                  class="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md"
                >
                  +{{ att.coinsEarned }} coin
                </span>
                <span v-else class="text-slate-400">0</span>
              </td>

              <td class="px-6 py-4 text-slate-500 italic">
                {{ att.note || '—' }}
              </td>
            </tr>

            <tr v-if="enrichedAttendances.length === 0">
              <td colspan="6" class="px-6 py-8 text-center text-slate-400">
                Davomat yozuvlari hali kiritilmagan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
