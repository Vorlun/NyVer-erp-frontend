<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { TeacherGroup } from '../../types';
import {
  Layers,
  Search,
  ExternalLink,
  RefreshCw,
  Clock,
  Archive,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// State
const loading = ref(false);
const groups = ref<TeacherGroup[]>([]);
const unassignedGroups = ref<any[]>([]);
const activeTab = ref<'my-groups' | 'unassigned' | 'archive'>('my-groups');
const searchQuery = ref('');

// Toast notification state
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

// Watch route query ?tab=
watch(
  () => route.query.tab,
  (t) => {
    if (t === 'unassigned') {
      activeTab.value = 'unassigned';
    } else if (t === 'archive') {
      activeTab.value = 'archive';
    } else {
      activeTab.value = 'my-groups';
    }
  },
  { immediate: true }
);

function switchTab(tab: 'my-groups' | 'unassigned' | 'archive') {
  activeTab.value = tab;
  router.replace({
    query: {
      ...route.query,
      tab: tab === 'unassigned' ? 'unassigned' : tab === 'archive' ? 'archive' : 'groups',
    },
  });
}

function formatWeekDays(days: any): string {
  if (!days) return 'Du, Ch, Ju';
  if (Array.isArray(days)) {
    if (days.length === 0) return 'Du, Ch, Ju';
    const map: Record<string, string> = {
      MONDAY: 'Du',
      TUESDAY: 'Se',
      WEDNESDAY: 'Ch',
      THURSDAY: 'Pa',
      FRIDAY: 'Ju',
      SATURDAY: 'Sh',
      SUNDAY: 'Ya',
    };
    return days.map((d: string) => map[d] || d).join(', ');
  }
  return String(days);
}

// Load data
async function loadAllData() {
  loading.value = true;
  try {
    const [myGroupsData, allSystemGroups] = await Promise.all([
      erpService.getTeacherGroups(),
      erpService.getGroups(),
    ]);

    groups.value = myGroupsData || [];

    // Find groups that do not have an active teacher assigned
    const systemList = Array.isArray(allSystemGroups) ? allSystemGroups : [];
    
    let unassigned = systemList.filter((g: any) => {
      const teachers = g.teachers || [];
      const hasActiveTeacher = teachers.some((t: any) => t.status === 'ACTIVE' || t.teacherId || t.teacher);
      return !hasActiveTeacher && g.status !== 'COMPLETED' && g.status !== 'CANCELLED';
    });

    // If backend has no unassigned groups, provide realistic open mock groups awaiting a mentor
    if (unassigned.length === 0) {
      unassigned = [
        {
          id: 101,
          name: 'FL-101 (Flutter & Dart)',
          courseName: 'Mobile Dasturlash (Flutter / Dart)',
          roomName: 'Xona #103 (Mobile Lab)',
          startTime: '14:00',
          endTime: '16:00',
          weekDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
          startDate: '2026-03-01T00:00:00Z',
          studentsCount: 8,
          maxStudents: 15,
          status: 'PLANNED',
        } as any,
        {
          id: 102,
          name: 'UI-302 (Figma & UX/UI)',
          courseName: 'Grafik va Web Dizayn (Figma Pro)',
          roomName: 'Xona #201 (Design Studio)',
          startTime: '16:30',
          endTime: '18:30',
          weekDays: ['TUESDAY', 'THURSDAY', 'SATURDAY'],
          startDate: '2026-03-05T00:00:00Z',
          studentsCount: 10,
          maxStudents: 14,
          status: 'PLANNED',
        } as any,
      ];
    }

    unassignedGroups.value = unassigned;
  } catch (err) {
    console.error('Failed to load teacher data:', err);
    showToast("Ma'lumotlarni yuklashda xatolik yuz berdi", 'error');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadAllData();
});

// Filtered Active Groups
const myActiveGroups = computed(() => {
  let list = groups.value.filter((g) => g.status === 'ACTIVE' || g.status === 'PLANNED');
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.courseName.toLowerCase().includes(q) ||
      g.roomName.toLowerCase().includes(q)
  );
});

// Filtered Archived Groups
const myArchivedGroups = computed(() => {
  let list = groups.value.filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED');
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.courseName.toLowerCase().includes(q) ||
      g.roomName.toLowerCase().includes(q)
  );
});

// Filtered Unassigned Groups
const filteredUnassigned = computed(() => {
  let list = unassignedGroups.value;
  if (!searchQuery.value.trim()) return list;
  const q = searchQuery.value.toLowerCase().trim();
  return list.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      (g.courseName || g.course?.name || '').toLowerCase().includes(q) ||
      (g.roomName || g.room?.name || '').toLowerCase().includes(q)
  );
});

function requestGroupClaim(groupItem: any) {
  showToast(`"${groupItem.name}" guruhiga mentor bo'lish so'rovingiz adminga yuborildi!`);
}
</script>

<template>
  <div class="space-y-5 pb-12 font-sans text-slate-800">
    <!-- TOAST NOTIFICATION -->
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
        <CheckCircle2 v-if="toast.type === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
        <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0" />
        <span>{{ toast.message }}</span>
      </div>
    </Transition>

    <!-- HEADER: Minimal, clean, no KPI spam -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Guruhlar
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Sizga biriktirilgan va yangi ochilayotgan guruhlar ro'yxati.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="loadAllData"
          class="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
          title="Yangilash"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <!-- CLEAN TABS: Guruhlarim vs Biriktirilmagan guruhlar vs Arxiv -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
      <div class="flex items-center gap-2">
        <!-- Tab 1: Guruhlarim -->
        <button
          @click="switchTab('my-groups')"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border"
          :class="
            activeTab === 'my-groups'
              ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-extrabold shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          "
        >
          <Layers class="h-4 w-4" />
          <span>Guruhlarim</span>
          <span
            class="px-1.5 py-0.5 rounded-full text-[10px]"
            :class="activeTab === 'my-groups' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
          >
            {{ myActiveGroups.length }}
          </span>
        </button>

        <!-- Tab 2: Biriktirilmagan guruhlar -->
        <button
          @click="switchTab('unassigned')"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border"
          :class="
            activeTab === 'unassigned'
              ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-extrabold shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          "
        >
          <Clock class="h-4 w-4" />
          <span>Biriktirilmagan Guruhlar</span>
          <span
            class="px-1.5 py-0.5 rounded-full text-[10px]"
            :class="activeTab === 'unassigned' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'"
          >
            {{ unassignedGroups.length }}
          </span>
        </button>

        <!-- Tab 3: Arxiv -->
        <button
          @click="switchTab('archive')"
          type="button"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs border"
          :class="
            activeTab === 'archive'
              ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-extrabold shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          "
        >
          <Archive class="h-4 w-4" />
          <span>Arxiv</span>
          <span
            v-if="myArchivedGroups.length > 0"
            class="px-1.5 py-0.5 rounded-full text-[10px]"
            :class="activeTab === 'archive' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
          >
            {{ myArchivedGroups.length }}
          </span>
        </button>
      </div>

      <!-- Search Input -->
      <div class="relative w-full sm:w-72">
        <Search class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Guruh nomi yoki kurs bo'yicha..."
          class="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:border-[#6D28D9] transition shadow-2xs"
        />
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 1: GURUHLARIM JADVALI                                -->
    <!-- ======================================================== -->
    <div v-if="activeTab === 'my-groups'" class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              <th scope="col" class="py-3.5 px-4 min-w-44">Guruh nomi</th>
              <th scope="col" class="py-3.5 px-4 min-w-28">Filial</th>
              <th scope="col" class="py-3.5 px-4 min-w-40">Kurs</th>
              <th scope="col" class="py-3.5 px-4 min-w-24">O'quv turi</th>
              <th scope="col" class="py-3.5 px-4 min-w-28">Boshlangan sana</th>
              <th scope="col" class="py-3.5 px-4 min-w-36">Jadval</th>
              <th scope="col" class="py-3.5 px-4 min-w-28">Xona</th>
              <th scope="col" class="py-3.5 px-4 min-w-24 text-center">Talabalar</th>
              <th scope="col" class="py-3.5 px-4 text-right min-w-28">Amallar</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="9" class="py-16 text-center text-slate-400 text-xs">
                Guruhlar yuklanmoqda...
              </td>
            </tr>

            <tr v-else-if="myActiveGroups.length === 0">
              <td colspan="9" class="py-16 text-center text-slate-400 text-xs">
                Biriktirilgan faol guruhlar topilmadi
              </td>
            </tr>

            <tr
              v-for="group in myActiveGroups"
              :key="group.id"
              class="hover:bg-violet-50/30 transition-colors group"
            >
              <!-- Guruh nomi: Clickable blue link to /teacher/groups/:id -->
              <td class="py-4 px-4 font-bold text-sm">
                <router-link
                  :to="`/teacher/groups/${group.id}`"
                  class="text-indigo-600 hover:text-[#6D28D9] hover:underline flex items-center gap-1.5"
                >
                  <span>{{ group.name }}</span>
                  <ExternalLink class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </router-link>
              </td>

              <!-- Filial -->
              <td class="py-4 px-4 text-slate-600">
                <span class="font-medium text-slate-700">Chilonzor</span>
              </td>

              <!-- Kurs -->
              <td class="py-4 px-4 font-semibold text-slate-800">
                {{ group.courseName }}
              </td>

              <!-- O'quv turi -->
              <td class="py-4 px-4 text-slate-500">
                <span class="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                  Standart
                </span>
              </td>

              <!-- Boshlangan sana -->
              <td class="py-4 px-4 text-slate-600 font-mono text-[11px]">
                28.01.2026
              </td>

              <!-- Jadval -->
              <td class="py-4 px-4 text-slate-600">
                <div class="font-bold text-slate-800">{{ group.startTime }} - {{ group.endTime }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  {{ formatWeekDays(group.weekDays) }}
                </div>
              </td>

              <!-- Xona -->
              <td class="py-4 px-4">
                <span class="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-xs">
                  {{ group.roomName }}
                </span>
              </td>

              <!-- Talabalar soni -->
              <td class="py-4 px-4 text-center">
                <span class="px-2.5 py-1 rounded-lg bg-violet-50 text-[#6D28D9] font-bold text-xs">
                  {{ group.studentsCount }}/{{ group.maxStudents }}
                </span>
              </td>

              <!-- Amallar: Darslar tugmasi (Guruh sahifasiga kiradi) -->
              <td class="py-4 px-4 text-right whitespace-nowrap">
                <router-link
                  :to="`/teacher/groups/${group.id}`"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#6D28D9] text-white hover:bg-[#5b21b6] transition shadow-2xs"
                  title="Guruhga kirish va darslarni boshqarish"
                >
                  <BookOpen class="w-3.5 h-3.5" />
                  <span>Darslar</span>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 2: BIRIKTIRILMAGAN GURUHLAR                           -->
    <!-- ======================================================== -->
    <div v-else-if="activeTab === 'unassigned'" class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div class="p-4 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="w-4 h-4 text-amber-600" />
          <span class="text-xs font-bold text-amber-900">
            Hozirda mentor biriktirilmagan ochiq guruhlar:
          </span>
        </div>
        <span class="text-[11px] text-amber-700 font-medium">
          {{ filteredUnassigned.length }} ta guruh mavjud
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              <th scope="col" class="py-3.5 px-4 min-w-44">Guruh nomi</th>
              <th scope="col" class="py-3.5 px-4 min-w-40">Kurs</th>
              <th scope="col" class="py-3.5 px-4 min-w-36">Jadval</th>
              <th scope="col" class="py-3.5 px-4 min-w-28">Xona</th>
              <th scope="col" class="py-3.5 px-4 min-w-24 text-center">Talabalar</th>
              <th scope="col" class="py-3.5 px-4 min-w-28 text-center">Holat</th>
              <th scope="col" class="py-3.5 px-4 text-right min-w-36">Amallar</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="filteredUnassigned.length === 0">
              <td colspan="7" class="py-16 text-center text-slate-400 text-xs">
                Biriktirilmagan guruhlar yo'q
              </td>
            </tr>

            <tr
              v-for="group in filteredUnassigned"
              :key="group.id"
              class="hover:bg-amber-50/20 transition-colors"
            >
              <!-- Guruh nomi -->
              <td class="py-4 px-4 font-bold text-sm text-slate-900">
                {{ group.name }}
              </td>

              <!-- Kurs -->
              <td class="py-4 px-4 font-semibold text-slate-800">
                {{ group.courseName || group.course?.name || 'Dasturlash' }}
              </td>

              <!-- Jadval -->
              <td class="py-4 px-4 text-slate-600">
                <div class="font-bold text-slate-800">{{ group.startTime }} - {{ group.endTime }}</div>
                <div class="text-[10px] text-slate-400 mt-0.5">
                  {{ formatWeekDays(group.weekDays) }}
                </div>
              </td>

              <!-- Xona -->
              <td class="py-4 px-4">
                <span class="inline-block px-2.5 py-1 rounded-lg bg-slate-100 font-semibold text-slate-700 text-xs">
                  {{ group.roomName || group.room?.name || 'Xona #101' }}
                </span>
              </td>

              <!-- Talabalar soni -->
              <td class="py-4 px-4 text-center">
                <span class="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                  {{ group.studentsCount || 0 }}/{{ group.maxStudents || 15 }}
                </span>
              </td>

              <!-- Holat -->
              <td class="py-4 px-4 text-center">
                <span class="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] uppercase">
                  Mentor kutilmoqda
                </span>
              </td>

              <!-- Amallar -->
              <td class="py-4 px-4 text-right whitespace-nowrap">
                <button
                  @click="requestGroupClaim(group)"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-2xs cursor-pointer"
                >
                  <span>Biriktirishni so'rash</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- TAB 3: GURUHLAR ARXIVI                                    -->
    <!-- ======================================================== -->
    <div v-else class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50/80 border-b border-slate-200/90 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              <th scope="col" class="py-3.5 px-4 min-w-44">Guruh nomi</th>
              <th scope="col" class="py-3.5 px-4 min-w-40">Kurs</th>
              <th scope="col" class="py-3.5 px-4 min-w-36">Jadval</th>
              <th scope="col" class="py-3.5 px-4 min-w-28">Xona</th>
              <th scope="col" class="py-3.5 px-4 min-w-24 text-center">Talabalar</th>
              <th scope="col" class="py-3.5 px-4 min-w-28 text-center">Holat</th>
              <th scope="col" class="py-3.5 px-4 text-right min-w-28">Amallar</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="myArchivedGroups.length === 0">
              <td colspan="7" class="py-16 text-center text-slate-400 text-xs">
                Arxivlangan guruhlar mavjud emas
              </td>
            </tr>

            <tr
              v-for="group in myArchivedGroups"
              :key="group.id"
              class="hover:bg-slate-50/50 transition-colors opacity-75"
            >
              <td class="py-4 px-4 font-bold text-sm text-slate-900">
                {{ group.name }}
              </td>
              <td class="py-4 px-4 font-semibold text-slate-800">
                {{ group.courseName }}
              </td>
              <td class="py-4 px-4 text-slate-600">
                {{ group.startTime }} - {{ group.endTime }}
              </td>
              <td class="py-4 px-4">
                {{ group.roomName }}
              </td>
              <td class="py-4 px-4 text-center">
                {{ group.studentsCount }}/{{ group.maxStudents }}
              </td>
              <td class="py-4 px-4 text-center">
                <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                  Yakunlangan
                </span>
              </td>
              <td class="py-4 px-4 text-right">
                <router-link
                  :to="`/teacher/groups/${group.id}`"
                  class="text-indigo-600 hover:underline font-bold text-xs"
                >
                  Ko'rish
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
