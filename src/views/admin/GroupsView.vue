<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { Group, Course, Room, User, WeekDay } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import { getTeacherPhoto } from '../../utils/teacherAvatars';
import {
  Archive,
  Edit2,
  Trash2,
  RotateCcw,
  Search,
  LayoutGrid,
  List,
  Calendar,
  Clock,
  CalendarDays,
  Building2,
  UserCheck,
  ArrowRight,
  Plus,
  X,
} from 'lucide-vue-next';

const groups = ref<Group[]>([]);
const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const teachers = ref<User[]>([]);
const students = ref<User[]>([]);
const loading = ref(false);

const activeTab = ref<'GROUPS' | 'ARCHIVE'>('GROUPS');
const searchQuery = ref('');
const selectedCourseFilter = ref<string>('ALL');
const viewMode = ref<'GRID' | 'TABLE' | 'CALENDAR'>('GRID');

// Create Group Modal
const showCreateModal = ref(false);
const groupName = ref('');
const selectedCourseId = ref<number | string>('');
const selectedRoomId = ref<number | string>('');
const selectedTeacherId = ref<number | string>('');
const startDate = ref('2026-03-01');
const startTime = ref('14:00');
const endTime = ref('16:00');
const selectedDays = ref<WeekDay[]>(['MONDAY', 'WEDNESDAY', 'FRIDAY']);
const maxStudents = ref(15);
const formError = ref('');
const isSubmitting = ref(false);

// Edit Group Modal
const showEditModal = ref(false);
const editGroupId = ref<number | null>(null);
const editGroupName = ref('');
const editCourseId = ref<number | string>('');
const editRoomId = ref<number | string>('');
const editTeacherId = ref<number | string>('');
const editStartTime = ref('');
const editEndTime = ref('');

const allWeekDays: { label: string; value: WeekDay }[] = [
  { label: 'Dushanba', value: 'MONDAY' },
  { label: 'Seshanba', value: 'TUESDAY' },
  { label: 'Chorshanba', value: 'WEDNESDAY' },
  { label: 'Payshanba', value: 'THURSDAY' },
  { label: 'Juma', value: 'FRIDAY' },
  { label: 'Shanba', value: 'SATURDAY' },
];

interface DaySchedule {
  key: WeekDay;
  label: string;
  short: string;
  isWeekend: boolean;
}

const calendarDays: DaySchedule[] = [
  { key: 'MONDAY', label: 'Dushanba', short: 'Du', isWeekend: false },
  { key: 'TUESDAY', label: 'Seshanba', short: 'Se', isWeekend: false },
  { key: 'WEDNESDAY', label: 'Chorshanba', short: 'Chor', isWeekend: false },
  { key: 'THURSDAY', label: 'Payshanba', short: 'Pay', isWeekend: false },
  { key: 'FRIDAY', label: 'Juma', short: 'Ju', isWeekend: false },
  { key: 'SATURDAY', label: 'Shanba', short: 'Shan', isWeekend: true },
  { key: 'SUNDAY', label: 'Yakshanba', short: 'Yak', isWeekend: true },
];

function toggleDay(day: WeekDay) {
  if (selectedDays.value.includes(day)) {
    selectedDays.value = selectedDays.value.filter((d) => d !== day);
  } else {
    selectedDays.value.push(day);
  }
}

async function loadData() {
  loading.value = true;
  try {
    const [gRes, cRes, rRes, uRes] = await Promise.allSettled([
      erpService.getGroups(),
      erpService.getCourses(),
      erpService.getRooms(),
      erpService.getUsers({ limit: 100 }),
    ]);

    if (gRes.status === 'fulfilled' && gRes.value) {
      const val = gRes.value;
      groups.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (cRes.status === 'fulfilled' && cRes.value) {
      const val = cRes.value;
      courses.value = Array.isArray(val) ? val : (val as any).data || [];
      if (courses.value.length > 0 && !selectedCourseId.value) {
        selectedCourseId.value = courses.value[0].id;
      }
    }
    if (rRes.status === 'fulfilled' && rRes.value) {
      const val = rRes.value;
      rooms.value = Array.isArray(val) ? val : (val as any).data || [];
      if (rooms.value.length > 0 && !selectedRoomId.value) {
        selectedRoomId.value = rooms.value[0].id;
      }
    }
    if (uRes.status === 'fulfilled' && uRes.value) {
      const val = uRes.value;
      const allUsers: User[] = Array.isArray(val) ? val : (val as any).data || [];
      teachers.value = allUsers.filter((u) => u.role === 'TEACHER');
      students.value = allUsers.filter((u) => u.role === 'STUDENT');
      if (teachers.value.length > 0 && !selectedTeacherId.value) {
        selectedTeacherId.value = teachers.value[0].id;
      }
    }
  } catch (err) {
    console.error('Guruhlar ma\'lumotlarini yuklashda xatolik:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

// Display list based on tab, search query, and course filter
const displayedGroups = computed(() => {
  let list = groups.value;
  if (activeTab.value === 'ARCHIVE') {
    list = list.filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED');
  } else {
    list = list.filter((g) => g.status === 'ACTIVE' || g.status === 'PLANNED');
  }
  if (selectedCourseFilter.value !== 'ALL') {
    list = list.filter((g) => String(g.courseId) === String(selectedCourseFilter.value));
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.course?.name?.toLowerCase().includes(q) ||
        getGroupTeacher(g).toLowerCase().includes(q) ||
        g.room?.name?.toLowerCase().includes(q)
    );
  }
  return list;
});

const activeGroupsCount = computed(
  () => groups.value.filter((g) => g.status === 'ACTIVE' || g.status === 'PLANNED').length
);
const archiveGroupsCount = computed(
  () => groups.value.filter((g) => g.status === 'COMPLETED' || g.status === 'CANCELLED').length
);

function getGroupTeacherObj(group: Group): any {
  if ((group as any).teachers && (group as any).teachers.length > 0) {
    return (group as any).teachers[0].teacher;
  }
  return null;
}

function getGroupTeacher(group: Group): string {
  const t = getGroupTeacherObj(group);
  if (t) return `${t.firstName} ${t.lastName}`;
  return 'O\'qituvchi biriktirilmagan';
}

function getGroupDuration(group: Group): string {
  if (group.course?.durationMonths) {
    return `${group.course.durationMonths} oy`;
  }
  return '4 oy';
}

function getStudentCount(group: Group): number {
  return (group as any)._count?.students ?? (group as any).students?.length ?? 0;
}

function getStudentsRatio(group: Group): string {
  const count = getStudentCount(group);
  return `${count}/${group.maxStudents}`;
}

function getFillPercent(group: Group): number {
  const count = getStudentCount(group);
  const max = group.maxStudents || 15;
  return Math.min(100, Math.round((count / max) * 100));
}

function formatGroupDaysLabel(weekDays?: string[]): { text: string; sub: string } {
  if (!weekDays || weekDays.length === 0) {
    return { text: 'Du • Chor • Ju', sub: 'Toq kunlar' };
  }
  const isMWF = weekDays.includes('MONDAY') && weekDays.includes('WEDNESDAY') && weekDays.includes('FRIDAY');
  const isTTS = weekDays.includes('TUESDAY') && weekDays.includes('THURSDAY') && weekDays.includes('SATURDAY');
  if (isMWF) {
    return { text: 'Du • Chor • Ju', sub: 'Toq kunlar' };
  }
  if (isTTS) {
    return { text: 'Se • Pay • Shan', sub: 'Juft kunlar' };
  }
  if (weekDays.length >= 6) {
    return { text: 'Du – Shan', sub: 'Har kuni' };
  }
  const shortMap: Record<string, string> = {
    MONDAY: 'Du',
    TUESDAY: 'Se',
    WEDNESDAY: 'Chor',
    THURSDAY: 'Pay',
    FRIDAY: 'Ju',
    SATURDAY: 'Shan',
    SUNDAY: 'Yak',
  };
  return {
    text: weekDays.map((d) => shortMap[d] || d).join(' • '),
    sub: 'Hafta kunlari',
  };
}

function getCourseTheme(name?: string): { bg: string; text: string; border: string; accent: string } {
  const lower = (name || '').toLowerCase();
  if (lower.includes('ui') || lower.includes('figma') || lower.includes('design')) {
    return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: 'from-rose-500 to-pink-600' };
  }
  if (lower.includes('be') || lower.includes('backend') || lower.includes('nest')) {
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'from-emerald-500 to-teal-600' };
  }
  if (lower.includes('fe') || lower.includes('front') || lower.includes('vue')) {
    return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'from-indigo-500 to-blue-600' };
  }
  if (lower.includes('ai') || lower.includes('python') || lower.includes('data')) {
    return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'from-amber-500 to-orange-600' };
  }
  if (lower.includes('ielts') || lower.includes('english')) {
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'from-blue-500 to-cyan-600' };
  }
  return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', accent: 'from-slate-700 to-slate-900' };
}

function getGroupsForDay(dayKey: WeekDay): Group[] {
  return displayedGroups.value
    .filter((g) => g.weekDays && g.weekDays.includes(dayKey))
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

async function handleCreateGroup() {
  if (!groupName.value || selectedDays.value.length === 0) {
    formError.value = 'Iltimos, guruh nomini va dars kunlarini tanlang.';
    return;
  }
  isSubmitting.value = true;
  try {
    await erpService.createGroup({
      name: groupName.value,
      courseId: Number(selectedCourseId.value),
      roomId: Number(selectedRoomId.value),
      teacherId: Number(selectedTeacherId.value || (teachers.value[0]?.id ?? 1)),
      startDate: startDate.value,
      startTime: startTime.value,
      endTime: endTime.value,
      weekDays: selectedDays.value,
      maxStudents: maxStudents.value,
    });

    await loadData();
    showCreateModal.value = false;
    groupName.value = '';
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    isSubmitting.value = false;
  }
}

// Archive / Complete Group
async function handleArchiveGroup(group: Group) {
  if (!confirm(`Haqiqatan ham "${group.name}" guruhini arxivlamoqchimisiz?`)) return;
  try {
    await erpService.updateGroup(group.id, { status: 'COMPLETED' as any });
    await loadData();
  } catch (err) {
    console.error('Arxivlashda xatolik:', err);
  }
}

async function handleRestoreGroup(group: Group) {
  try {
    await erpService.updateGroup(group.id, { status: 'ACTIVE' as any });
    await loadData();
  } catch (err) {
    console.error('Qayta tiklashda xatolik:', err);
  }
}

// Edit Group
function openEditModal(group: any) {
  editGroupId.value = group.id;
  editGroupName.value = group.name;
  editCourseId.value = group.courseId;
  editRoomId.value = group.roomId;
  editStartTime.value = group.startTime;
  editEndTime.value = group.endTime;
  const mainTeacher = group.teachers?.find((gt: any) => gt.isMain)?.teacher || group.teachers?.[0]?.teacher;
  editTeacherId.value = mainTeacher?.id || '';
  showEditModal.value = true;
}

async function handleEditGroup() {
  if (!editGroupId.value || !editGroupName.value) return;
  isSubmitting.value = true;
  try {
    await erpService.updateGroup(editGroupId.value, {
      name: editGroupName.value,
      courseId: Number(editCourseId.value),
      roomId: Number(editRoomId.value),
      teacherId: editTeacherId.value ? Number(editTeacherId.value) : undefined,
      startTime: editStartTime.value,
      endTime: editEndTime.value,
    });
    showEditModal.value = false;
    await loadData();
  } catch (err) {
    console.error('Tahrirlashda xatolik:', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- ================= TOP MINIMALIST ACTION BAR ================= -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <!-- Title & Live Counter -->
      <div class="flex items-center gap-3">
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Guruhlar
        </h1>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {{ displayedGroups.length }} ta guruh
        </span>
      </div>

      <!-- Controls: Search, View Mode Switcher, Status Tabs, Add Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Search -->
        <div class="relative w-44 sm:w-56">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Qidiruv..."
            class="w-full pl-8.5 pr-7 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400 transition font-medium"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X class="h-3 w-3" />
          </button>
        </div>

        <!-- Course Filter -->
        <select
          v-model="selectedCourseFilter"
          class="px-2.5 py-1.5 text-xs bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-slate-400 font-medium text-slate-700 cursor-pointer"
        >
          <option value="ALL">Barcha kurslar</option>
          <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>

        <!-- View Mode Switcher: Grid / Table / Calendar -->
        <div class="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs">
          <button
            @click="viewMode = 'GRID'"
            type="button"
            :class="viewMode === 'GRID' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            title="Karta ko'rinishi"
          >
            <LayoutGrid class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Karta</span>
          </button>
          <button
            @click="viewMode = 'TABLE'"
            type="button"
            :class="viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            title="Jadval ko'rinishi"
          >
            <List class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Jadval</span>
          </button>
          <button
            @click="viewMode = 'CALENDAR'"
            type="button"
            :class="viewMode === 'CALENDAR' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5"
            title="Haftalik dars jadvali"
          >
            <Calendar class="h-3.5 w-3.5 text-indigo-600" />
            <span class="hidden sm:inline">Kalendar</span>
          </button>
        </div>

        <!-- Status Filter: Faollar / Arxiv -->
        <div class="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs">
          <button
            @click="activeTab = 'GROUPS'"
            type="button"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer font-medium"
            :class="activeTab === 'GROUPS' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
          >
            Faol ({{ activeGroupsCount }})
          </button>
          <button
            @click="activeTab = 'ARCHIVE'"
            type="button"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer font-medium"
            :class="activeTab === 'ARCHIVE' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
          >
            Arxiv{{ archiveGroupsCount > 0 ? ` (${archiveGroupsCount})` : '' }}
          </button>
        </div>

        <!-- Add Button -->
        <button
          @click="showCreateModal = true"
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Guruh ochish</span>
        </button>
      </div>
    </div>

    <!-- Active State Notice if Viewing Arxiv -->
    <div
      v-if="activeTab === 'ARCHIVE'"
      class="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <Archive class="h-4 w-4 text-amber-600 shrink-0" />
        <span>Arxivlangan guruhlar ko'rsatilmoqda.</span>
      </div>
      <button
        @click="activeTab = 'GROUPS'"
        class="text-xs font-semibold text-amber-900 underline hover:no-underline cursor-pointer"
      >
        Faol guruhlarga qaytish
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-xs text-slate-400">
      Guruhlar ma'lumotlari yuklanmoqda...
    </div>

    <!-- Empty State -->
    <div
      v-else-if="displayedGroups.length === 0"
      class="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200"
    >
      {{ activeTab === 'ARCHIVE' ? "Arxivda guruhlar mavjud emas." : "Guruhlar topilmadi." }}
    </div>

    <!-- ================= VIEW MODE 1: KREATIV KARTALAR (GRID) ================= -->
    <div
      v-else-if="viewMode === 'GRID'"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
    >
      <div
        v-for="g in displayedGroups"
        :key="g.id"
        class="group bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5 flex flex-col justify-between overflow-hidden relative"
      >
        <div>
          <!-- Top Row: Course Icon + Title & Course Info + Status -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <!-- Course Avatar Box -->
              <div
                class="h-11 w-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 border shadow-2xs"
                :class="[
                  getCourseTheme(g.course?.name || g.name).bg,
                  getCourseTheme(g.course?.name || g.name).text,
                  getCourseTheme(g.course?.name || g.name).border,
                ]"
              >
                {{ g.name.substring(0, 2).toUpperCase() }}
              </div>

              <div class="min-w-0">
                <router-link
                  :to="'/dashboard/groups/' + g.id"
                  class="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors block truncate leading-tight"
                >
                  {{ g.name }}
                </router-link>
                <span class="text-[11.5px] text-slate-400 font-medium block truncate mt-0.5">
                  {{ g.course?.name || 'Asosiy kurs' }} • {{ getGroupDuration(g) }}
                </span>
              </div>
            </div>

            <!-- Status Badge -->
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shrink-0"
              :class="
                g.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  : 'bg-amber-50 text-amber-700 border border-amber-200/80'
              "
            >
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="g.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'"
              ></span>
              {{ g.status === 'ACTIVE' ? 'Faol' : 'Reja' }}
            </span>
          </div>

          <!-- Middle Info Grid: Ustoz, Xona, Vaqt, Kunlar -->
          <div class="grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs">
            <!-- Ustoz -->
            <div class="flex items-center gap-1.5 min-w-0">
              <img
                v-if="getGroupTeacherObj(g)"
                :src="getTeacherPhoto(getGroupTeacherObj(g))"
                :alt="getGroupTeacher(g)"
                class="h-5 w-5 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                loading="lazy"
              />
              <UserCheck v-else class="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span class="truncate font-semibold text-slate-700 text-[11px]" :title="getGroupTeacher(g)">
                {{ getGroupTeacher(g) }}
              </span>
            </div>

            <!-- Xona -->
            <div class="flex items-center gap-1.5 min-w-0">
              <Building2 class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span class="truncate text-slate-600 text-[11px]">
                {{ g.room?.name || 'Xona-1' }}
              </span>
            </div>

            <!-- Vaqt -->
            <div class="flex items-center gap-1.5 min-w-0">
              <Clock class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span class="font-mono text-slate-600 text-[11px]">
                {{ g.startTime || '14:00' }} – {{ g.endTime || '16:00' }}
              </span>
            </div>

            <!-- Kunlar -->
            <div class="flex items-center gap-1.5 min-w-0">
              <CalendarDays class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span class="truncate text-slate-600 text-[11px]">
                {{ formatGroupDaysLabel(g.weekDays).text }}
              </span>
            </div>
          </div>

          <!-- Capacity Progress -->
          <div class="mt-4 space-y-1.5">
            <div class="flex items-center justify-between text-[11px] font-medium">
              <span class="text-slate-400">Sig'im:</span>
              <span class="text-slate-700 font-mono font-bold">
                {{ getStudentCount(g) }} / {{ g.maxStudents || 15 }} o'quvchi
                <span class="text-slate-400 font-normal">({{ getFillPercent(g) }}%)</span>
              </span>
            </div>
            <div class="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="getFillPercent(g) >= 90 ? 'bg-amber-500' : 'bg-slate-900'"
                :style="{ width: `${Math.max(4, getFillPercent(g))}%` }"
              ></div>
            </div>
          </div>
        </div>

        <!-- Bottom Actions Row -->
        <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <router-link
            :to="'/dashboard/groups/' + g.id"
            class="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition"
          >
            <span>Batafsil ko'rish</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </router-link>

          <div class="flex items-center gap-1">
            <button
              @click="openEditModal(g)"
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Tahrirlash"
            >
              <Edit2 class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="activeTab === 'GROUPS'"
              @click="handleArchiveGroup(g)"
              type="button"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Arxivlash"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
            <button
              v-else
              @click="handleRestoreGroup(g)"
              type="button"
              class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
              title="Tiklash"
            >
              <RotateCcw class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW MODE 2: TOZA JADVAL (TABLE) ================= -->
    <div
      v-else-if="viewMode === 'TABLE'"
      class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th class="py-3 px-4">Guruh</th>
              <th class="py-3 px-4">Kurs</th>
              <th class="py-3 px-4">Dars vaqti</th>
              <th class="py-3 px-4">Xona</th>
              <th class="py-3 px-4">O'qituvchi</th>
              <th class="py-3 px-4">Talabalar</th>
              <th class="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr
              v-for="g in displayedGroups"
              :key="g.id"
              class="hover:bg-slate-50/60 transition group"
            >
              <!-- Group Name -->
              <td class="py-3 px-4">
                <router-link
                  :to="'/dashboard/groups/' + g.id"
                  class="font-bold text-slate-900 group-hover:text-indigo-600 transition"
                >
                  {{ g.name }}
                </router-link>
              </td>

              <!-- Course -->
              <td class="py-3 px-4 text-slate-600 font-medium">
                {{ g.course?.name || 'Asosiy kurs' }}
              </td>

              <!-- Schedule & Days -->
              <td class="py-3 px-4">
                <div class="font-mono text-slate-700 font-semibold">{{ g.startTime }} - {{ g.endTime }}</div>
                <div class="text-[10.5px] text-slate-400">{{ formatGroupDaysLabel(g.weekDays).text }}</div>
              </td>

              <!-- Room -->
              <td class="py-3 px-4 text-slate-600">
                {{ g.room?.name || 'Xona-1' }}
              </td>

              <!-- Teacher -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                  <img
                    v-if="getGroupTeacherObj(g)"
                    :src="getTeacherPhoto(getGroupTeacherObj(g))"
                    :alt="getGroupTeacher(g)"
                    class="h-6 w-6 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    loading="lazy"
                  />
                  <span>{{ getGroupTeacher(g) }}</span>
                </div>
              </td>

              <!-- Students -->
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                  {{ getStudentsRatio(g) }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <router-link
                    :to="'/dashboard/groups/' + g.id"
                    class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                    title="Batafsil"
                  >
                    <ArrowRight class="h-3.5 w-3.5" />
                  </router-link>
                  <button
                    @click="openEditModal(g)"
                    type="button"
                    class="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Edit2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-if="activeTab === 'GROUPS'"
                    @click="handleArchiveGroup(g)"
                    type="button"
                    class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Arxivlash"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    v-else
                    @click="handleRestoreGroup(g)"
                    type="button"
                    class="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    title="Tiklash"
                  >
                    <RotateCcw class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= VIEW MODE 3: HAFTALIK KALENDAR JADVALI (CALENDAR) ================= -->
    <div v-else-if="viewMode === 'CALENDAR'" class="space-y-3">
      <!-- Calendar Header Notice -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 pb-1 gap-2">
        <div class="flex items-center gap-2">
          <Calendar class="w-4 h-4 text-indigo-600" />
          <span class="font-semibold text-slate-800">Haftalik Dars Jadvali</span>
          <span class="text-slate-400 hidden sm:inline">• Har bir kun bo'yicha biriktirilgan guruhlar</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1.5 text-slate-600">
            <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span>Dushanba – Juma</span>
          </span>
          <span class="inline-flex items-center gap-1.5 font-bold text-rose-600">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Shanba & Yakshanba (Dam olish/Maxsus)</span>
          </span>
        </div>
      </div>

      <!-- 7 Days Grid Column -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          v-for="day in calendarDays"
          :key="day.key"
          class="rounded-2xl border flex flex-col transition-all min-h-84 overflow-hidden"
          :class="day.isWeekend ? 'bg-rose-50/25 border-rose-200/70 shadow-2xs' : 'bg-slate-50/40 border-slate-200/80'"
        >
          <!-- Day Header -->
          <div
            class="p-3 border-b flex items-center justify-between"
            :class="
              day.isWeekend
                ? 'bg-rose-100/60 border-rose-200/80 text-rose-900'
                : 'bg-white border-slate-200/80 text-slate-900'
            "
          >
            <div>
              <div class="font-bold text-xs flex items-center gap-1">
                <span>{{ day.label }}</span>
                <span
                  v-if="day.isWeekend"
                  class="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-200 text-rose-800 uppercase tracking-wider"
                >
                  Dam
                </span>
              </div>
              <div class="text-[10px] font-medium" :class="day.isWeekend ? 'text-rose-600' : 'text-slate-400'">
                {{ day.short }}
              </div>
            </div>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="day.isWeekend ? 'bg-rose-200/90 text-rose-800' : 'bg-slate-100 text-slate-600'"
            >
              {{ getGroupsForDay(day.key).length }}
            </span>
          </div>

          <!-- Day Groups List -->
          <div class="p-2.5 flex-1 space-y-2">
            <template v-if="getGroupsForDay(day.key).length > 0">
              <router-link
                v-for="g in getGroupsForDay(day.key)"
                :key="g.id"
                :to="'/dashboard/groups/' + g.id"
                class="block p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 group/card cursor-pointer"
              >
                <!-- Time & Room -->
                <div class="flex items-center justify-between text-[10.5px] mb-1">
                  <span class="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {{ g.startTime }}
                  </span>
                  <span class="text-slate-500 font-medium truncate max-w-20">
                    {{ g.room?.name || 'Xona-1' }}
                  </span>
                </div>

                <!-- Group Name -->
                <div class="font-bold text-xs text-slate-900 group-hover/card:text-indigo-600 transition-colors truncate">
                  {{ g.name }}
                </div>

                <!-- Course Name -->
                <div class="text-[10px] text-slate-500 truncate mt-0.5">
                  {{ g.course?.name }}
                </div>

                <!-- Teacher -->
                <div class="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[10.5px] text-slate-600">
                  <img
                    v-if="getGroupTeacherObj(g)"
                    :src="getTeacherPhoto(getGroupTeacherObj(g))"
                    :alt="getGroupTeacher(g)"
                    class="h-4 w-4 rounded-full object-cover ring-1 ring-slate-200 shrink-0"
                    loading="lazy"
                  />
                  <span class="truncate">{{ getGroupTeacher(g) }}</span>
                </div>
              </router-link>
            </template>

            <div v-else class="h-28 flex flex-col items-center justify-center text-center p-3 text-slate-400">
              <span class="text-[11px] italic">Darslar yo'q</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= CREATE GROUP MODAL ================= -->
    <Modal
      :show="showCreateModal"
      title="Yangi Guruh Ochish"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreateGroup" class="space-y-4">
        <div v-if="formError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {{ formError }}
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Guruh Nomi *</label>
          <input
            v-model="groupName"
            type="text"
            required
            placeholder="FE-202 (Vue 3)"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Kurs *</label>
            <select
              v-model="selectedCourseId"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Xona *</label>
            <select
              v-model="selectedRoomId"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">O'qituvchi</label>
            <select
              v-model="selectedTeacherId"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option v-for="t in teachers" :key="t.id" :value="t.id">{{ t.firstName }} {{ t.lastName }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Maksimal o'quvchi</label>
            <input
              v-model="maxStudents"
              type="number"
              min="1"
              max="50"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Dars boshlanish vaqti</label>
            <input
              v-model="startTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tugash vaqti</label>
            <input
              v-model="endTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-2">Hafta kunlari</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="d in allWeekDays"
              :key="d.value"
              type="button"
              @click="toggleDay(d.value)"
              class="py-2 px-3 text-xs font-bold rounded-xl border transition cursor-pointer"
              :class="
                selectedDays.includes(d.value)
                  ? 'bg-[#6D28D9] border-[#6D28D9] text-white shadow-xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              "
            >
              {{ d.label }}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- ================= EDIT GROUP MODAL ================= -->
    <Modal
      :show="showEditModal"
      title="Guruhni Tahrirlash"
      @close="showEditModal = false"
    >
      <form @submit.prevent="handleEditGroup" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Guruh Nomi *</label>
          <input
            v-model="editGroupName"
            type="text"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Kurs *</label>
            <select
              v-model="editCourseId"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option v-for="c in courses" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Xona *</label>
            <select
              v-model="editRoomId"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">O'qituvchi (Mentor) *</label>
          <select
            v-model="editTeacherId"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          >
            <option value="">O'qituvchini tanlang</option>
            <option v-for="t in teachers" :key="t.id" :value="t.id">
              {{ t.firstName }} {{ t.lastName }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Dars boshlanish vaqti</label>
            <input
              v-model="editStartTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tugash vaqti</label>
            <input
              v-model="editEndTime"
              type="time"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
