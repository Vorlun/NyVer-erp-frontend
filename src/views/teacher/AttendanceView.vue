<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { erpService } from '../../api/erpService';
import type { AttendanceStatus, User, Lesson } from '../../types';
import { CalendarCheck, Save, CheckCircle2, Coins, Clock } from 'lucide-vue-next';

const authStore = useAuthStore();
const teacherId = authStore.user?.id || 3;

const lessons = ref<Lesson[]>([]);
const selectedLessonId = ref<number>(1);
const allUsers = ref<User[]>([]);
const students = computed(() => allUsers.value.filter((u) => u.role === 'STUDENT'));
const loading = ref(false);

const selectedLesson = computed(() =>
  lessons.value.find((l) => l.id === selectedLessonId.value)
);

// Attendance sheet state
interface StudentRow {
  studentId: number;
  student: User;
  status: AttendanceStatus;
  coins: number;
  note: string;
}

const attendanceRows = ref<StudentRow[]>([]);
const saveSuccess = ref(false);

async function loadLessonAttendance() {
  if (!selectedLessonId.value) return;
  try {
    const existingRecords = await erpService.getLessonAttendance(selectedLessonId.value);
    const records = Array.isArray(existingRecords) ? existingRecords : (existingRecords as any).data || [];

    attendanceRows.value = students.value.map((student) => {
      const existing = records.find((r: any) => r.studentId === student.id);
      return {
        studentId: student.id,
        student,
        status: existing ? existing.status : 'PRESENT',
        coins: existing ? existing.coinsEarned : 2,
        note: existing?.note || '',
      };
    });
  } catch (err) {
    console.error('Failed to load lesson attendance:', err);
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [lesRes, usersRes] = await Promise.allSettled([
      erpService.getLessonsByTeacher(teacherId),
      erpService.getUsers({ role: 'STUDENT', limit: 100 }),
    ]);

    if (lesRes.status === 'fulfilled' && lesRes.value) {
      const val = lesRes.value;
      lessons.value = Array.isArray(val) ? val : (val as any).data || [];
      if (lessons.value.length > 0) {
        selectedLessonId.value = lessons.value[0].id;
      }
    }

    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      allUsers.value = Array.isArray(val) ? val : (val as any).data || [];
    }

    await loadLessonAttendance();
  } catch (err) {
    console.error('Failed to load attendance data:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

function onLessonChange() {
  saveSuccess.value = false;
  loadLessonAttendance();
}

function setStatus(row: StudentRow, status: AttendanceStatus) {
  row.status = status;
  if (status === 'PRESENT') row.coins = 2;
  else if (status === 'LATE') row.coins = 1;
  else row.coins = 0;
}

async function handleSaveAttendance() {
  try {
    await erpService.saveAttendance(
      selectedLessonId.value,
      attendanceRows.value.map((r) => ({
        studentId: r.studentId,
        status: r.status,
        coinsEarned: r.coins,
        note: r.note,
      }))
    );

    saveSuccess.value = true;
    setTimeout(() => {
      saveSuccess.value = false;
    }, 4000);
  } catch (err) {
    console.error('Save attendance error:', err);
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Tezkor Davomat Qilish</h1>
        <p class="text-sm text-slate-500">
          Darsni tanlang va talabalarning qatnashuvi hamda tangalarini belgilang.
        </p>
      </div>

      <button
        @click="handleSaveAttendance"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
      >
        <Save class="h-4 w-4" />
        Davomatni Saqlash
      </button>
    </div>

    <!-- Success Banner -->
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
        class="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
      >
        <CheckCircle2 class="h-5 w-5 text-emerald-600 shrink-0" />
        <span>Davomat muvaffaqiyatli saqlandi va talabalarga tangalar biriktirildi!</span>
      </div>
    </Transition>

    <!-- Lesson Selector Toolbar -->
    <div class="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4">
        <div class="flex-1">
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">
            Dars Mavzusini Tanlang:
          </label>
          <select
            v-model="selectedLessonId"
            @change="onLessonChange"
            class="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-medium text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
          >
            <option v-for="l in lessons" :key="l.id" :value="l.id">
              #{{ l.lessonOrder }}: {{ l.topic }} ({{ l.lessonDate }})
            </option>
          </select>
        </div>

        <div v-if="selectedLesson" class="sm:w-72 bg-emerald-50/60 border border-emerald-100 p-3 rounded-xl text-xs">
          <p class="font-bold text-emerald-900">{{ selectedLesson.topic }}</p>
          <div class="flex items-center gap-3 mt-1 text-[11px] text-emerald-700">
            <span class="flex items-center gap-1">
              <CalendarCheck class="h-3 w-3" />
              {{ selectedLesson.lessonDate }}
            </span>
            <span class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              {{ selectedLesson.startTime }} - {{ selectedLesson.endTime }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Attendance Table -->
    <div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
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
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-xs">
                    {{ row.student.firstName?.charAt(0) || 'S' }}{{ row.student.lastName?.charAt(0) || '' }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 text-sm">
                      {{ row.student.firstName }} {{ row.student.lastName }}
                    </p>
                    <div class="flex items-center gap-1 text-[11px] text-amber-600 font-semibold mt-0.5">
                      <Coins class="h-3 w-3" />
                      <span>Jami: {{ row.student.coins }} coin</span>
                    </div>
                  </div>
                </div>
              </td>

              <!-- Attendance Buttons -->
              <td class="px-6 py-4">
                <div class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    @click="setStatus(row, 'PRESENT')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                    :class="
                      row.status === 'PRESENT'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                    "
                  >
                    ✓ Keldi
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'LATE')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                    :class="
                      row.status === 'LATE'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
                    "
                  >
                    ⏱ Kechikdi
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'ABSENT')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                    :class="
                      row.status === 'ABSENT'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                    "
                  >
                    ✕ Kelmadi
                  </button>

                  <button
                    type="button"
                    @click="setStatus(row, 'EXCUSED')"
                    class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
                    :class="
                      row.status === 'EXCUSED'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700'
                    "
                  >
                    Sababli
                  </button>
                </div>
              </td>

              <!-- Coin Reward -->
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                  <input
                    v-model.number="row.coins"
                    type="number"
                    min="0"
                    max="10"
                    class="w-16 rounded-lg border border-slate-200 p-1.5 text-center font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                  <span class="text-slate-400 text-xs">tanga</span>
                </div>
              </td>

              <!-- Note / Comment -->
              <td class="px-6 py-4">
                <input
                  v-model="row.note"
                  type="text"
                  placeholder="Eslatma (masalan: faol qatnashdi)..."
                  class="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
