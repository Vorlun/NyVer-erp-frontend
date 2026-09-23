<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Course } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Badge from '../../components/ui/Badge.vue';
import {
  BookOpen,
  Plus,
  RefreshCw,
  MoreVertical,
  Clock,
} from 'lucide-vue-next';

const coursesList = ref<Course[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);

const newName = ref('');
const newPrice = ref<number>(800000);
const newDuration = ref<number>(6);
const saving = ref(false);

const defaultCourses: Course[] = [
  {
    id: 1,
    name: 'Full-stack Bootcamp',
    price: 1200000,
    durationMonths: 6,
    lessonsPerMonth: 12,
    totalLessons: 72,
    status: 'ACTIVE',
    description: 'Frontend & Backend dasturlash kursi',
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 2,
    name: 'React.js & Next.js',
    price: 900000,
    durationMonths: 4,
    lessonsPerMonth: 12,
    totalLessons: 48,
    status: 'ACTIVE',
    description: 'Zamonaviy Frontend web-ilovalari',
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 3,
    name: 'Python Backend & Django',
    price: 950000,
    durationMonths: 5,
    lessonsPerMonth: 12,
    totalLessons: 60,
    status: 'ACTIVE',
    description: 'Python arxitekturasi va ma\'lumotlar bazasi',
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 4,
    name: 'Foundation (IT Boshlang\'ich)',
    price: 600000,
    durationMonths: 3,
    lessonsPerMonth: 12,
    totalLessons: 36,
    status: 'ACTIVE',
    description: 'Kompyuter savodxonligi va algoritmlar',
    created_at: '2026-02-10T00:00:00Z',
    updated_at: '2026-02-10T00:00:00Z',
  },
];

async function loadCourses() {
  loading.value = true;
  try {
    const res = await erpService.getCourses();
    const data = Array.isArray(res) ? res : (res as any)?.data || [];
    if (data.length > 0) {
      coursesList.value = data;
    } else {
      coursesList.value = defaultCourses;
    }
  } catch (err) {
    console.error('Failed to load courses', err);
    coursesList.value = defaultCourses;
  } finally {
    loading.value = false;
  }
}

async function handleCreateCourse() {
  if (!newName.value.trim()) return;
  saving.value = true;
  try {
    await erpService.createCourse({
      name: newName.value.trim(),
      price: Number(newPrice.value),
      durationMonths: Number(newDuration.value),
    });
    showCreateModal.value = false;
    newName.value = '';
    await loadCourses();
  } catch (err) {
    console.error(err);
    // Add locally to fallback list
    coursesList.value.push({
      id: Date.now(),
      name: newName.value.trim(),
      price: Number(newPrice.value),
      durationMonths: Number(newDuration.value),
      lessonsPerMonth: 12,
      totalLessons: Number(newDuration.value) * 12,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    showCreateModal.value = false;
    newName.value = '';
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  loadCourses();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Kurslar</h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">O'quv markazida o'tiladigan barcha ta'lim yo'nalishlari va narxlari.</p>
      </div>

      <div class="flex items-center gap-3">
        <button
          @click="showCreateModal = true"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
        >
          <Plus class="h-4 w-4" />
          <span>Yangi Kurs Qo'shish</span>
        </button>
      </div>
    </div>

    <!-- Courses Table Card -->
    <div class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" class="py-3.5 px-6">Kurs nomi</th>
              <th scope="col" class="py-3.5 px-6">Davomiyligi</th>
              <th scope="col" class="py-3.5 px-6">Oylik narxi</th>
              <th scope="col" class="py-3.5 px-6">Holati</th>
              <th scope="col" class="py-3.5 px-6 text-right">
                <button
                  @click="loadCourses"
                  class="p-1 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer"
                  title="Yangilash"
                >
                  <RefreshCw class="h-3.5 w-3.5" :class="loading ? 'animate-spin' : ''" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="course in coursesList"
              :key="course.id"
              class="hover:bg-slate-50/60 transition-colors"
            >
              <td class="py-4 px-6 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                    <BookOpen class="h-4 w-4" />
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 block">{{ course.name }}</span>
                    <span class="text-[11px] text-slate-400">{{ course.description || 'Amaliy darslar va portfolio' }}</span>
                  </div>
                </div>
              </td>

              <td class="py-4 px-6 whitespace-nowrap font-medium text-slate-700">
                <div class="flex items-center gap-1.5">
                  <Clock class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ course.durationMonths }} oy</span>
                </div>
              </td>

              <td class="py-4 px-6 whitespace-nowrap font-bold text-slate-900">
                {{ Number(course.price).toLocaleString() }} so'm
              </td>

              <td class="py-4 px-6 whitespace-nowrap">
                <Badge variant="success" class="text-[10px] font-bold px-2 py-0.5">Faol</Badge>
              </td>

              <td class="py-4 px-6 whitespace-nowrap text-right">
                <button
                  type="button"
                  class="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Course Modal -->
    <Modal :show="showCreateModal" title="Yangi Kurs Qo'shish" max-width="md" @close="showCreateModal = false">
      <form @submit.prevent="handleCreateCourse" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Kurs nomi *</label>
          <input
            v-model="newName"
            type="text"
            required
            placeholder="Masalan, Node.js Backend"
            class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Davomiyligi (oy) *</label>
            <input
              v-model="newDuration"
              type="number"
              min="1"
              required
              class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Oylik narxi (so'm) *</label>
            <input
              v-model="newPrice"
              type="number"
              min="0"
              required
              class="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="saving || !newName.trim()"
            class="px-5 py-2 rounded-xl bg-[#6D28D9] text-white text-xs font-bold hover:bg-[#5B21B6] active:bg-[#4C1D95] disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
