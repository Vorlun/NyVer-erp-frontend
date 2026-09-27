<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { erpService } from '../../api/erpService';
import type { Course, Room, User } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import Pagination from '../../components/ui/Pagination.vue';
import {
  X,
  Trash2,
  Pen,
  DoorOpen,
  Users,
  LayoutGrid,
  List,
  Phone,
  Mail,
  Archive,
  RotateCcw,
} from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();

// Active Tab: 'courses' | 'rooms' | 'staff'
const activeTab = ref<'courses' | 'rooms' | 'staff'>('courses');

const courses = ref<Course[]>([]);
const rooms = ref<Room[]>([]);
const staff = ref<User[]>([]);
const loading = ref(false);

// ================= KURSLAR (COURSES) STATE =================
const courseTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const showCourseDrawer = ref(false);
const isEditingCourse = ref(false);
const editingCourseId = ref<number | null>(null);
const courseFormName = ref('');
const courseFormLessonDuration = ref('60 daqiqa');
const courseFormMonths = ref<number>(6);
const courseFormPrice = ref<number | string>('');
const courseFormDescription = ref('');
const courseFormStatus = ref<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
const courseSubmitting = ref(false);
const courseError = ref('');

// ================= XONALAR (ROOMS) STATE =================
const roomTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const showRoomDrawer = ref(false);
const isEditingRoom = ref(false);
const editingRoomId = ref<number | null>(null);
const roomFormName = ref('');
const roomFormCapacity = ref(20);
const roomFormStatus = ref<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
const roomSubmitting = ref(false);
const roomError = ref('');

// ================= XODIMLAR (STAFF) STATE =================
const staffTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const staffSearchQuery = ref('');
const staffRoleFilter = ref('ALL');
const staffViewMode = ref<'table' | 'grid'>('table');
const showStaffModal = ref(false);
const isEditingStaff = ref(false);
const editingStaffId = ref<number | null>(null);
const staffFormFirstName = ref('');
const staffFormLastName = ref('');
const staffFormRole = ref<'ADMIN' | 'SUPERADMIN' | 'ASSISTANT'>('ADMIN');
const staffFormPhone = ref('+998');
const staffFormEmail = ref('');
const staffFormPassword = ref('123456');
const staffFormStatus = ref<'ACTIVE' | 'INACTIVE' | 'ARCHIVED'>('ACTIVE');
const staffSubmitting = ref(false);

// ================= CONFIRMATION MODAL STATE =================
interface ConfirmActionTarget {
  type: 'course' | 'room' | 'staff';
  id: number;
  name: string;
  action: 'archive' | 'restore' | 'deletePermanent';
}
const showConfirmModal = ref(false);
const confirmTarget = ref<ConfirmActionTarget | null>(null);
const confirmSubmitting = ref(false);

// ================= OCH KO'K, OCH QORA VA STEEL SLATE THEMES =================
const courseCardThemes = [
  {
    bg: 'bg-[#F0F6FD]', // Och ko'k (Ice Blue)
    border: 'border-[#D0E2F5] hover:border-blue-400/80 hover:shadow-md',
    accent: 'bg-blue-600',
  },
  {
    bg: 'bg-[#F3F5F8]', // Och qora / Slate Graphite (Soft Charcoal)
    border: 'border-[#D8DEE7] hover:border-slate-400/80 hover:shadow-md',
    accent: 'bg-slate-700',
  },
  {
    bg: 'bg-[#EEF2F7]', // Shu 2 rang orasidagi rang (Cool Steel Slate Blue)
    border: 'border-[#D2DCE8] hover:border-indigo-400/80 hover:shadow-md',
    accent: 'bg-indigo-600',
  },
];

function getCourseTheme(index: number) {
  return courseCardThemes[index % courseCardThemes.length];
}

const roomCardThemes = [
  {
    bg: 'bg-[#F0F6FD]', // Och ko'k
    border: 'border-[#D0E2F5] hover:border-blue-400/80 hover:shadow-md',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    bg: 'bg-[#F3F5F8]', // Och qora / Slate
    border: 'border-[#D8DEE7] hover:border-slate-400/80 hover:shadow-md',
    iconBg: 'bg-slate-200 text-slate-700',
  },
  {
    bg: 'bg-[#EEF2F7]', // Orasidagi rang (Steel Slate Blue)
    border: 'border-[#D2DCE8] hover:border-indigo-400/80 hover:shadow-md',
    iconBg: 'bg-indigo-100 text-indigo-700',
  },
];

function getRoomTheme(index: number) {
  return roomCardThemes[index % roomCardThemes.length];
}

// ================= COMPUTED LISTS =================
const courseArchiveCount = computed(() => courses.value.filter((c) => c.status === 'ARCHIVED').length);
const filteredCourses = computed(() => {
  return courses.value.filter((c) => {
    if (courseTab.value === 'ACTIVE') return c.status !== 'ARCHIVED';
    return c.status === 'ARCHIVED';
  });
});

const roomArchiveCount = computed(() => rooms.value.filter((r) => r.status === 'ARCHIVED').length);
const filteredRooms = computed(() => {
  return rooms.value.filter((r) => {
    if (roomTab.value === 'ACTIVE') return r.status !== 'ARCHIVED';
    return r.status === 'ARCHIVED';
  });
});

const staffArchiveCount = computed(() => staff.value.filter((s) => s.status === 'ARCHIVED').length);
const filteredStaff = computed(() => {
  return staff.value.filter((s) => {
    if (staffTab.value === 'ACTIVE' && s.status === 'ARCHIVED') return false;
    if (staffTab.value === 'ARCHIVE' && s.status !== 'ARCHIVED') return false;
    if (staffRoleFilter.value !== 'ALL' && s.role !== staffRoleFilter.value) return false;
    const q = staffSearchQuery.value.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });
});

// Staff Pagination
const staffCurrentPage = ref(1);
const staffPageSize = ref(8);
const staffTotalPages = computed(() => Math.ceil(filteredStaff.value.length / staffPageSize.value) || 1);
const paginatedStaff = computed(() => {
  const start = (staffCurrentPage.value - 1) * staffPageSize.value;
  return filteredStaff.value.slice(start, start + staffPageSize.value);
});

watch([staffSearchQuery, staffRoleFilter, staffTab], () => {
  staffCurrentPage.value = 1;
});

function formatPhone(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length === 13 && clean.startsWith('+998')) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 11)} ${clean.slice(11, 13)}`;
  }
  return phone;
}

// ================= LOAD DATA =================
async function loadData() {
  loading.value = true;
  try {
    const [coursesRes, roomsRes, usersRes] = await Promise.allSettled([
      erpService.getCourses(),
      erpService.getRooms(),
      erpService.getUsers({ limit: 100 }),
    ]);

    if (coursesRes.status === 'fulfilled' && coursesRes.value) {
      const val = coursesRes.value;
      courses.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (roomsRes.status === 'fulfilled' && roomsRes.value) {
      const val = roomsRes.value;
      rooms.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      const allUsers: User[] = Array.isArray(val) ? val : (val as any).data || [];
      staff.value = allUsers.filter((u) => u.role === 'ADMIN' || u.role === 'SUPERADMIN' || u.role === 'ASSISTANT');
    }
  } catch (err) {
    console.error("Boshqaruv ma'lumotlarini yuklashda xatolik:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

// Sync route with active tab
watch(
  () => route.path,
  (path) => {
    if (path.includes('/course') || path === '/management/course') {
      activeTab.value = 'courses';
    } else if (path.includes('/room') || path === '/management/rooms') {
      activeTab.value = 'rooms';
    } else if (path.includes('/staff') || path === '/management/staff') {
      activeTab.value = 'staff';
    }
  },
  { immediate: true }
);

function switchTab(tab: 'courses' | 'rooms' | 'staff') {
  activeTab.value = tab;
  if (tab === 'courses') router.push('/management/course');
  else if (tab === 'rooms') router.push('/management/rooms');
  else if (tab === 'staff') router.push('/management/staff');
}

// ================= COURSE METHODS =================
function openCreateCourseDrawer() {
  isEditingCourse.value = false;
  editingCourseId.value = null;
  courseFormName.value = '';
  courseFormLessonDuration.value = '60 daqiqa';
  courseFormMonths.value = 6;
  courseFormPrice.value = '';
  courseFormDescription.value = '';
  courseFormStatus.value = 'ACTIVE';
  courseError.value = '';
  showCourseDrawer.value = true;
}

function openEditCourseDrawer(c: Course) {
  isEditingCourse.value = true;
  editingCourseId.value = c.id;
  courseFormName.value = c.name;
  courseFormLessonDuration.value = (c as any).lessonDuration || '60 daqiqa';
  courseFormMonths.value = c.durationMonths || 6;
  courseFormPrice.value = c.price;
  courseFormDescription.value = c.description || '';
  courseFormStatus.value = (c.status as any) || 'ACTIVE';
  courseError.value = '';
  showCourseDrawer.value = true;
}

async function handleSaveCourse() {
  if (!courseFormName.value.trim() || !courseFormPrice.value) {
    courseError.value = 'Kurs nomi va narxini kiritish shart.';
    return;
  }
  courseSubmitting.value = true;
  try {
    if (isEditingCourse.value && editingCourseId.value) {
      await erpService.updateCourse(editingCourseId.value, {
        name: courseFormName.value.trim(),
        price: Number(courseFormPrice.value),
        durationMonths: Number(courseFormMonths.value),
        description: courseFormDescription.value.trim() || undefined,
        status: courseFormStatus.value as any,
      });
    } else {
      const created = await erpService.createCourse({
        name: courseFormName.value.trim(),
        price: Number(courseFormPrice.value),
        durationMonths: Number(courseFormMonths.value),
        description: courseFormDescription.value.trim() || undefined,
        lessonsPerMonth: 12,
        totalLessons: Number(courseFormMonths.value) * 12,
      });
      if (courseFormStatus.value !== 'ACTIVE' && created?.id) {
        await erpService.updateCourse(created.id, { status: courseFormStatus.value as any });
      }
    }
    showCourseDrawer.value = false;
    await loadData();
  } catch (err: any) {
    courseError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    courseSubmitting.value = false;
  }
}

async function toggleCourseStatus(c: Course) {
  const nextStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await erpService.updateCourse(c.id, { status: nextStatus as any });
  c.status = nextStatus as any;
}

// ================= ROOM METHODS (SLIDE-OVER DRAWER) =================
function openCreateRoomDrawer() {
  editingRoomId.value = null;
  isEditingRoom.value = false;
  roomFormName.value = '';
  roomFormCapacity.value = 20;
  roomFormStatus.value = 'ACTIVE';
  roomError.value = '';
  showRoomDrawer.value = true;
}

function openEditRoomDrawer(room: Room) {
  editingRoomId.value = room.id;
  isEditingRoom.value = true;
  roomFormName.value = room.name;
  roomFormCapacity.value = room.capacity;
  roomFormStatus.value = (room.status as any) || 'ACTIVE';
  roomError.value = '';
  showRoomDrawer.value = true;
}

async function handleSaveRoom() {
  if (!roomFormName.value.trim()) {
    roomError.value = 'Xona nomini kiritish shart.';
    return;
  }
  roomSubmitting.value = true;
  try {
    if (isEditingRoom.value && editingRoomId.value) {
      await erpService.updateRoom(editingRoomId.value, {
        name: roomFormName.value.trim(),
        capacity: Number(roomFormCapacity.value),
        status: roomFormStatus.value as any,
      });
    } else {
      await erpService.createRoom({
        name: roomFormName.value.trim(),
        capacity: Number(roomFormCapacity.value),
      });
      if (roomFormStatus.value !== 'ACTIVE') {
        const roomsRes = await erpService.getRooms();
        const created = roomsRes.find((r) => r.name === roomFormName.value.trim());
        if (created) {
          await erpService.updateRoom(created.id, { status: roomFormStatus.value as any });
        }
      }
    }
    showRoomDrawer.value = false;
    await loadData();
  } catch (err: any) {
    roomError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    roomSubmitting.value = false;
  }
}

async function toggleRoomStatus(r: Room) {
  const nextStatus = r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await erpService.updateRoom(r.id, { status: nextStatus as any });
  r.status = nextStatus as any;
}

// ================= STAFF METHODS =================
function openCreateStaffModal() {
  editingStaffId.value = null;
  isEditingStaff.value = false;
  staffFormFirstName.value = '';
  staffFormLastName.value = '';
  staffFormPhone.value = '+998';
  staffFormEmail.value = '';
  staffFormRole.value = 'ADMIN';
  staffFormPassword.value = '123456';
  staffFormStatus.value = 'ACTIVE';
  showStaffModal.value = true;
}

function openEditStaffModal(s: User) {
  editingStaffId.value = s.id;
  isEditingStaff.value = true;
  staffFormFirstName.value = s.firstName;
  staffFormLastName.value = s.lastName;
  staffFormPhone.value = s.phone;
  staffFormEmail.value = s.email || '';
  staffFormRole.value = (s.role as any) || 'ADMIN';
  staffFormStatus.value = (s.status as any) || 'ACTIVE';
  showStaffModal.value = true;
}

async function handleSaveStaff() {
  if (!staffFormFirstName.value || !staffFormLastName.value || !staffFormPhone.value) return;
  staffSubmitting.value = true;
  try {
    if (isEditingStaff.value && editingStaffId.value) {
      await erpService.updateUser(editingStaffId.value, {
        firstName: staffFormFirstName.value.trim(),
        lastName: staffFormLastName.value.trim(),
        phone: staffFormPhone.value.trim(),
        email: staffFormEmail.value.trim() || undefined,
        status: staffFormStatus.value as any,
      });
    } else {
      await erpService.createUser({
        firstName: staffFormFirstName.value.trim(),
        lastName: staffFormLastName.value.trim(),
        role: staffFormRole.value,
        phone: staffFormPhone.value.trim(),
        email: staffFormEmail.value.trim() || undefined,
        password: staffFormPassword.value.trim() || '123456',
      });
    }
    showStaffModal.value = false;
    await loadData();
  } catch (err) {
    console.error("Xodimni saqlashda xatolik:", err);
  } finally {
    staffSubmitting.value = false;
  }
}

async function toggleStaffStatus(s: User) {
  const nextStatus = s.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await erpService.updateUser(s.id, { status: nextStatus as any });
  s.status = nextStatus as any;
}

// ================= CONFIRM ACTION MODAL (SOFT DELETE & ARCHIVE) =================
function requestArchive(type: 'course' | 'room' | 'staff', id: number, name: string) {
  confirmTarget.value = { type, id, name, action: 'archive' };
  showConfirmModal.value = true;
}

function requestRestore(type: 'course' | 'room' | 'staff', id: number, name: string) {
  confirmTarget.value = { type, id, name, action: 'restore' };
  showConfirmModal.value = true;
}

function requestPermanentDelete(type: 'course' | 'room' | 'staff', id: number, name: string) {
  confirmTarget.value = { type, id, name, action: 'deletePermanent' };
  showConfirmModal.value = true;
}

async function handleConfirmAction() {
  if (!confirmTarget.value) return;
  confirmSubmitting.value = true;
  const { type, id, action } = confirmTarget.value;
  try {
    if (action === 'archive') {
      if (type === 'course') await erpService.updateCourse(id, { status: 'ARCHIVED' as any });
      else if (type === 'room') await erpService.updateRoom(id, { status: 'ARCHIVED' as any });
      else if (type === 'staff') await erpService.updateUser(id, { status: 'ARCHIVED' as any });
    } else if (action === 'restore') {
      if (type === 'course') await erpService.updateCourse(id, { status: 'ACTIVE' as any });
      else if (type === 'room') await erpService.updateRoom(id, { status: 'ACTIVE' as any });
      else if (type === 'staff') await erpService.updateUser(id, { status: 'ACTIVE' as any });
    } else if (action === 'deletePermanent') {
      if (type === 'course') await erpService.deleteCourse(id);
      else if (type === 'room') await erpService.deleteRoom(id);
      else if (type === 'staff') await erpService.deleteUser(id);
    }
    showConfirmModal.value = false;
    confirmTarget.value = null;
    await loadData();
  } catch (err) {
    console.error("Amalni bajarishda xatolik:", err);
  } finally {
    confirmSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6 relative">
    <!-- Top Header: Title -->
    <div>
      <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
        Boshqarish
      </h1>
    </div>

    <!-- Sub-navigation Tabs: Kurslar, Xonalar, Xodimlar -->
    <div class="flex items-center gap-6 border-b border-slate-200/80 text-sm font-semibold">
      <button
        @click="switchTab('courses')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'courses'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Kurslar</span>
        <span
          v-if="activeTab === 'courses'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="switchTab('rooms')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'rooms'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Xonalar</span>
        <span
          v-if="activeTab === 'rooms'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>

      <button
        @click="switchTab('staff')"
        type="button"
        class="pb-3 transition-colors cursor-pointer relative"
        :class="
          activeTab === 'staff'
            ? 'text-[#6D28D9] font-bold'
            : 'text-slate-500 hover:text-slate-800'
        "
      >
        <span>Xodimlar</span>
        <span
          v-if="activeTab === 'staff'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#6D28D9] rounded-full"
        ></span>
      </button>
    </div>

    <!-- ================= TAB 1: KURSLAR ================= -->
    <div v-if="activeTab === 'courses'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
      <!-- Top Action Bar: Title, Arxiv Switcher & Add Button -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
            Kurslar
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            O'quv markazida mavjud barcha ta'lim yo'nalishlari
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Active / Arxiv Switcher -->
          <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              @click="courseTab = 'ACTIVE'"
              type="button"
              class="px-3 py-1.5 rounded-lg transition cursor-pointer"
              :class="courseTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
            >
              Faol ({{ courses.filter((c) => c.status !== 'ARCHIVED').length }})
            </button>
            <button
              @click="courseTab = 'ARCHIVE'"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer"
              :class="courseTab === 'ARCHIVE' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
            >
              <Archive class="h-3.5 w-3.5" />
              <span>Arxiv</span>
              <span v-if="courseArchiveCount > 0" class="ml-1 opacity-80">({{ courseArchiveCount }})</span>
            </button>
          </div>

          <button
            @click="openCreateCourseDrawer"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <span class="text-sm font-black leading-none">+</span>
            <span>Kurslar qo'shish</span>
          </button>
        </div>
      </div>

      <!-- Archive Mode Info Banner -->
      <div
        v-if="courseTab === 'ARCHIVE'"
        class="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-center justify-between shadow-2xs"
      >
        <div class="flex items-center gap-2.5">
          <Archive class="h-4 w-4 text-amber-600 shrink-0" />
          <span>Siz hozirda <strong>Arxivlangan kurslar</strong> ro'yxatidasiz. O'chirilgan (soft-deleted) kurslar shu yerda saqlanadi.</span>
        </div>
        <button
          @click="courseTab = 'ACTIVE'"
          class="text-xs font-bold text-amber-900 hover:underline cursor-pointer ml-3 shrink-0"
        >
          Faol kurslarga qaytish →
        </button>
      </div>

      <!-- Courses Cards Grid -->
      <div v-if="loading" class="py-12 text-center text-xs text-slate-400">
        Kurslar yuklanmoqda...
      </div>
      <div v-else-if="filteredCourses.length === 0" class="py-12 text-center text-xs text-slate-400">
        {{ courseTab === 'ARCHIVE' ? 'Arxivda kurslar mavjud emas' : 'Hozircha kurslar mavjud emas' }}
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          v-for="(c, idx) in filteredCourses"
          :key="c.id"
          class="rounded-xl p-4 sm:p-4.5 border transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5"
          :class="[getCourseTheme(idx).bg, getCourseTheme(idx).border]"
        >
          <div>
            <!-- Top Row: Course Title & Action Icons -->
            <div class="flex items-start justify-between gap-2.5">
              <h3 class="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight line-clamp-1" :title="c.name">
                {{ c.name }}
              </h3>

              <div class="flex items-center gap-1 shrink-0 text-slate-400">
                <!-- If ACTIVE: Edit & Soft-delete/Archive -->
                <template v-if="courseTab === 'ACTIVE'">
                  <button
                    @click="requestArchive('course', c.id, c.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                    title="Arxivlash (Soft delete)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="openEditCourseDrawer(c)"
                    type="button"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-slate-100 transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pen class="h-3.5 w-3.5" />
                  </button>
                </template>

                <!-- If ARCHIVE: Restore & Permanent Delete -->
                <template v-else>
                  <button
                    @click="requestRestore('course', c.id, c.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    title="Qayta tiklash"
                  >
                    <RotateCcw class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="requestPermanentDelete('course', c.id, c.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Butunlay o'chirish"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </template>
              </div>
            </div>

            <!-- Description -->
            <p class="text-xs text-slate-500 mt-1 mb-3.5 line-clamp-2 leading-relaxed">
              {{ c.description || 'Kurs tavsifi' }}
            </p>
          </div>

          <!-- Bottom Chips Row: Duration, Months, Price, and Status Toggle -->
          <div class="flex flex-wrap items-center gap-1.5 pt-1">
            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
              {{ (c as any).lessonDuration ? (String((c as any).lessonDuration).includes('min') ? (c as any).lessonDuration : (c as any).lessonDuration + ' min') : '60 min' }}
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700 shadow-2xs">
              {{ c.durationMonths }} oy
            </span>
            <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-xs font-bold font-mono text-slate-800 shadow-2xs tracking-tight">
              {{ c.price }}
            </span>

            <!-- Status Toggle Chip (Admin can change active/inactive with one click!) -->
            <button
              @click="toggleCourseStatus(c)"
              type="button"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-bold transition shadow-2xs cursor-pointer ml-auto"
              :class="
                c.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
              "
              :title="'Holatni o\'zgartirish: ' + (c.status === 'ACTIVE' ? 'Faol' : 'Nofaol')"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
              <span>{{ c.status === 'ACTIVE' ? 'Faol' : 'Nofaol' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= TAB 2: XONALAR ================= -->
    <div v-if="activeTab === 'rooms'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
      <!-- Top Action Bar: Title, Arxiv Switcher & Add Button -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
            Xonalar
          </h2>
          <p class="text-xs text-slate-400 mt-0.5">
            O'quv markazining dars va amaliyot xonalari ro'yxati
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Active / Arxiv Switcher -->
          <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              @click="roomTab = 'ACTIVE'"
              type="button"
              class="px-3 py-1.5 rounded-lg transition cursor-pointer"
              :class="roomTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
            >
              Faol ({{ rooms.filter((r) => r.status !== 'ARCHIVED').length }})
            </button>
            <button
              @click="roomTab = 'ARCHIVE'"
              type="button"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer"
              :class="roomTab === 'ARCHIVE' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
            >
              <Archive class="h-3.5 w-3.5" />
              <span>Arxiv</span>
              <span v-if="roomArchiveCount > 0" class="ml-1 opacity-80">({{ roomArchiveCount }})</span>
            </button>
          </div>

          <button
            @click="openCreateRoomDrawer"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <span class="text-sm font-black leading-none">+</span>
            <span>Xona qo'shish</span>
          </button>
        </div>
      </div>

      <!-- Archive Mode Info Banner -->
      <div
        v-if="roomTab === 'ARCHIVE'"
        class="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-center justify-between shadow-2xs"
      >
        <div class="flex items-center gap-2.5">
          <Archive class="h-4 w-4 text-amber-600 shrink-0" />
          <span>Siz hozirda <strong>Arxivlangan xonalar</strong> ro'yxatidasiz. O'chirilgan xonalar shu yerda saqlanadi.</span>
        </div>
        <button
          @click="roomTab = 'ACTIVE'"
          class="text-xs font-bold text-amber-900 hover:underline cursor-pointer ml-3 shrink-0"
        >
          Faol xonalarga qaytish →
        </button>
      </div>

      <!-- Rooms Grid -->
      <div v-if="loading" class="py-12 text-center text-xs text-slate-400">
        Xonalar yuklanmoqda...
      </div>
      <div v-else-if="filteredRooms.length === 0" class="py-12 text-center text-xs text-slate-400">
        {{ roomTab === 'ARCHIVE' ? 'Arxivda xonalar mavjud emas' : 'Hozircha xonalar mavjud emas' }}
      </div>
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-3.5 sm:gap-4">
        <div
          v-for="(r, idx) in filteredRooms"
          :key="r.id"
          class="rounded-xl p-4 sm:p-4.5 border transition-all duration-200 flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5"
          :class="[getRoomTheme(idx).bg, getRoomTheme(idx).border]"
        >
          <div>
            <!-- Top Row: Room Icon + Name & Action Buttons -->
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <div
                  class="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-2xs"
                  :class="getRoomTheme(idx).iconBg"
                >
                  <DoorOpen class="h-4.5 w-4.5" />
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm sm:text-[15px] font-bold text-slate-900 leading-tight truncate" :title="r.name">
                    {{ r.name }}
                  </h3>
                  <span class="text-[11px] font-medium text-slate-400 block mt-0.5">
                    O'quv xonasi
                  </span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-1 shrink-0 text-slate-400">
                <!-- If ACTIVE: Edit & Soft-delete/Archive -->
                <template v-if="roomTab === 'ACTIVE'">
                  <button
                    @click="requestArchive('room', r.id, r.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-white/80 transition cursor-pointer"
                    title="Arxivlash (Soft delete)"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="openEditRoomDrawer(r)"
                    type="button"
                    class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-white/80 transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pen class="h-3.5 w-3.5" />
                  </button>
                </template>

                <!-- If ARCHIVE: Restore & Permanent Delete -->
                <template v-else>
                  <button
                    @click="requestRestore('room', r.id, r.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    title="Qayta tiklash"
                  >
                    <RotateCcw class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="requestPermanentDelete('room', r.id, r.name)"
                    type="button"
                    class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Butunlay o'chirish"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </template>
              </div>
            </div>
          </div>

          <!-- Bottom: Capacity Pill & Status & Footer -->
          <div class="pt-4 space-y-3">
            <div class="flex flex-wrap items-center gap-1.5">
              <!-- Capacity pill with Users icon -->
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200/80 text-xs font-bold text-slate-700 shadow-2xs">
                <Users class="h-3.5 w-3.5 text-slate-400" />
                <span>{{ r.capacity }} ta o'rin</span>
              </span>

              <!-- Status Toggle Chip (Admin can toggle status with one click!) -->
              <button
                @click="toggleRoomStatus(r)"
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-bold transition shadow-2xs cursor-pointer ml-auto"
                :class="
                  r.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                "
                :title="'Holatni o\'zgartirish: ' + (r.status === 'ACTIVE' ? 'Faol' : 'Nofaol')"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="r.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                <span>{{ r.status === 'ACTIVE' ? 'Faol' : 'Nofaol' }}</span>
              </button>
            </div>

            <!-- Footer indicator -->
            <div class="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[11px] text-slate-500">
              <span>Darslar uchun</span>
              <span class="font-bold text-slate-700">Tayyor</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= TAB 3: XODIMLAR ================= -->
    <div v-if="activeTab === 'staff'" class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs p-6 space-y-5">
      <!-- Top Action Controls Bar -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <!-- Left: Role Filter Tabs & Arxiv Switcher -->
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            @click="staffRoleFilter = 'ALL'"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="staffRoleFilter === 'ALL' ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-bold shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
          >
            Barchasi ({{ staff.length }})
          </button>
          <button
            @click="staffRoleFilter = 'ADMIN'"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="staffRoleFilter === 'ADMIN' ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-bold shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
          >
            Adminlar
          </button>
          <button
            @click="staffRoleFilter = 'SUPERADMIN'"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="staffRoleFilter === 'SUPERADMIN' ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-bold shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
          >
            Superadminlar
          </button>
          <button
            @click="staffRoleFilter = 'ASSISTANT'"
            type="button"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="staffRoleFilter === 'ASSISTANT' ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-bold shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
          >
            Assistentlar
          </button>

          <!-- Arxiv Button -->
          <button
            @click="staffTab = staffTab === 'ACTIVE' ? 'ARCHIVE' : 'ACTIVE'"
            type="button"
            class="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="staffTab === 'ARCHIVE' ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'"
          >
            <Archive class="h-3.5 w-3.5" />
            <span>Arxiv</span>
            <span v-if="staffArchiveCount > 0" class="ml-0.5 opacity-85">({{ staffArchiveCount }})</span>
          </button>
        </div>

        <!-- Right: Search, Grid/Table Switcher & Add Button -->
        <div class="flex items-center gap-2.5">
          <!-- Search Input -->
          <div class="relative w-full sm:w-60">
            <input
              v-model="staffSearchQuery"
              type="text"
              placeholder="Qidirish..."
              class="w-full px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 transition"
            />
            <button
              v-if="staffSearchQuery"
              @click="staffSearchQuery = ''"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X class="h-3 w-3" />
            </button>
          </div>

          <!-- View Switcher (Grid / Table) -->
          <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              @click="staffViewMode = 'table'"
              type="button"
              class="p-1.5 rounded-lg transition cursor-pointer"
              :class="staffViewMode === 'table' ? 'bg-white text-[#6D28D9] shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
              title="Jadval ko'rinishi"
            >
              <List class="h-4 w-4" />
            </button>
            <button
              @click="staffViewMode = 'grid'"
              type="button"
              class="p-1.5 rounded-lg transition cursor-pointer"
              :class="staffViewMode === 'grid' ? 'bg-white text-[#6D28D9] shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
              title="Karta ko'rinishi"
            >
              <LayoutGrid class="h-4 w-4" />
            </button>
          </div>

          <!-- + Xodim qo'shish Button -->
          <button
            @click="openCreateStaffModal"
            type="button"
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <span class="text-sm font-black leading-none">+</span>
            <span>Xodim qo'shish</span>
          </button>
        </div>
      </div>

      <!-- Archive Notice Banner -->
      <div
        v-if="staffTab === 'ARCHIVE'"
        class="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-center justify-between shadow-2xs"
      >
        <div class="flex items-center gap-2.5">
          <Archive class="h-4 w-4 text-amber-600 shrink-0" />
          <span>Siz hozirda <strong>Arxivlangan xodimlar</strong> ro'yxatidasiz. O'chirilgan xodimlar shu yerda saqlanadi.</span>
        </div>
        <button
          @click="staffTab = 'ACTIVE'"
          class="text-xs font-bold text-amber-900 hover:underline cursor-pointer ml-3 shrink-0"
        >
          Faol xodimlarga qaytish →
        </button>
      </div>

      <!-- VIEW 1: TABLE MODE -->
      <div v-if="staffViewMode === 'table'" class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-xs bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200/80 select-none">
            <tr>
              <th class="py-3 px-4 font-bold text-slate-800">F.I.Sh.</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Lavozim</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Telefon raqamlari</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Email</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Holat</th>
              <th class="py-3 px-4 text-right font-semibold text-slate-600">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="6" class="py-12 text-center text-slate-400 text-xs">Xodimlar yuklanmoqda...</td>
            </tr>
            <tr v-else-if="filteredStaff.length === 0">
              <td colspan="6" class="py-12 text-center text-slate-400 text-xs">
                {{ staffTab === 'ARCHIVE' ? 'Arxivda xodimlar mavjud emas' : 'Xodimlar topilmadi' }}
              </td>
            </tr>
            <tr
              v-for="s in paginatedStaff"
              :key="s.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="py-3.5 px-4 font-bold text-slate-900">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-xl bg-violet-100 text-[#6D28D9] font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                    {{ (s.firstName?.[0] || '') + (s.lastName?.[0] || '') }}
                  </div>
                  <div>
                    <span class="block text-slate-900 font-bold text-sm">{{ s.firstName }} {{ s.lastName }}</span>
                    <span class="block text-[11px] text-slate-400 font-normal">{{ s.email || 'Email kiritilmagan' }}</span>
                  </div>
                </div>
              </td>
              <td class="py-3.5 px-4">
                <span
                  class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border"
                  :class="
                    s.role === 'SUPERADMIN'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : s.role === 'ADMIN'
                      ? 'bg-violet-50 text-[#6D28D9] border-violet-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  "
                >
                  {{ s.role }}
                </span>
              </td>
              <td class="py-3.5 px-4 font-mono text-slate-700">
                {{ formatPhone(s.phone) }}
              </td>
              <td class="py-3.5 px-4 text-slate-500">
                {{ s.email || '-' }}
              </td>
              <td class="py-3.5 px-4">
                <!-- Status Toggle Button for Admin -->
                <button
                  @click="toggleStaffStatus(s)"
                  type="button"
                  class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition cursor-pointer"
                  :class="
                    s.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  "
                  :title="'Holatni o\'zgartirish: ' + (s.status === 'ACTIVE' ? 'Faol' : 'Nofaol')"
                >
                  <span class="w-1.5 h-1.5 rounded-full" :class="s.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                  <span>{{ s.status === 'ACTIVE' ? 'Faol' : 'Nofaol' }}</span>
                </button>
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <template v-if="staffTab === 'ACTIVE'">
                    <button
                      @click="openEditStaffModal(s)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-slate-100 transition cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Pen class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="requestArchive('staff', s.id, s.firstName + ' ' + s.lastName)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Arxivlash (Soft delete)"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="requestRestore('staff', s.id, s.firstName + ' ' + s.lastName)"
                      class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      title="Qayta tiklash"
                    >
                      <RotateCcw class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="requestPermanentDelete('staff', s.id, s.firstName + ' ' + s.lastName)"
                      class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Butunlay o'chirish"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Staff Table Pagination -->
        <div class="px-5 py-3 border-t border-slate-100">
          <Pagination
            v-model:currentPage="staffCurrentPage"
            :totalPages="staffTotalPages"
            :totalItems="filteredStaff.length"
            :pageSize="staffPageSize"
          />
        </div>
      </div>

      <!-- VIEW 2: GRID CARDS MODE -->
      <div v-else class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
          <div
            v-for="s in paginatedStaff"
            :key="s.id"
            class="bg-white rounded-2xl border border-slate-200/80 p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
          >
          <div>
            <!-- Card Header: Avatar, Name, Role badge -->
            <div class="flex items-start justify-between gap-2.5">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="h-10 w-10 rounded-xl bg-violet-100 text-[#6D28D9] font-black text-xs flex items-center justify-center shrink-0 uppercase shadow-2xs">
                  {{ (s.firstName?.[0] || '') + (s.lastName?.[0] || '') }}
                </div>
                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-slate-900 truncate" :title="s.firstName + ' ' + s.lastName">
                    {{ s.firstName }} {{ s.lastName }}
                  </h3>
                  <span
                    class="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold border"
                    :class="
                      s.role === 'SUPERADMIN'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : s.role === 'ADMIN'
                        ? 'bg-violet-50 text-[#6D28D9] border-violet-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    "
                  >
                    {{ s.role }}
                  </span>
                </div>
              </div>

              <!-- Status toggle dot -->
              <button
                @click="toggleStaffStatus(s)"
                type="button"
                class="w-3 h-3 rounded-full cursor-pointer transition hover:scale-125"
                :class="s.status === 'ACTIVE' ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-slate-300 ring-2 ring-slate-100'"
                :title="'Holatni o\'zgartirish: ' + (s.status === 'ACTIVE' ? 'Faol' : 'Nofaol')"
              ></button>
            </div>

            <!-- Contact Details -->
            <div class="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
              <div class="flex items-center gap-2">
                <Phone class="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span class="font-mono text-slate-700 truncate">{{ formatPhone(s.phone) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <Mail class="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span class="text-slate-500 truncate">{{ s.email || 'Email kiritilmagan' }}</span>
              </div>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1.5">
            <template v-if="staffTab === 'ACTIVE'">
              <button
                @click="openEditStaffModal(s)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-slate-100 transition cursor-pointer"
                title="Tahrirlash"
              >
                <Pen class="h-3.5 w-3.5" />
              </button>
              <button
                @click="requestArchive('staff', s.id, s.firstName + ' ' + s.lastName)"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Arxivlash (Soft delete)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </template>
            <template v-else>
              <button
                @click="requestRestore('staff', s.id, s.firstName + ' ' + s.lastName)"
                class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                title="Qayta tiklash"
              >
                <RotateCcw class="h-3.5 w-3.5" />
              </button>
              <button
                @click="requestPermanentDelete('staff', s.id, s.firstName + ' ' + s.lastName)"
                class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Butunlay o'chirish"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </template>
          </div>
        </div>
      </div>

        <!-- Staff Grid Pagination -->
        <div class="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs mt-4">
          <Pagination
            v-model:currentPage="staffCurrentPage"
            :totalPages="staffTotalPages"
            :totalItems="filteredStaff.length"
            :pageSize="staffPageSize"
          />
        </div>
      </div>
    </div>

    <!-- ================= SLIDE-OVER DRAWER: KURS QO'SHISH / TAHRIRLASH ================= -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showCourseDrawer"
        class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end"
        @click="showCourseDrawer = false"
      >
        <div
          class="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          @click.stop
        >
          <!-- Drawer Header -->
          <div class="p-6 sm:p-7 pb-5 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-extrabold text-slate-900 leading-tight">
                  {{ isEditingCourse ? 'Kursni tahrirlash' : 'Kurs qo\'shish' }}
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                  Bu yerda siz yangi kurs qo'shishingiz yoki mavjudini tahrirlashingiz mumkin.
                </p>
              </div>

              <button
                @click="showCourseDrawer = false"
                type="button"
                class="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Drawer Body: Form Fields -->
          <form @submit.prevent="handleSaveCourse" id="courseForm" class="p-6 sm:p-7 space-y-5 sm:space-y-6 flex-1">
            <div v-if="courseError" class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {{ courseError }}
            </div>

            <!-- 1. Nomi -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Nomi *</label>
              <input
                v-model="courseFormName"
                type="text"
                required
                placeholder="HR Manager..."
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>

            <!-- 2. Dars davomiyligi -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Dars davomiyligi</label>
              <select
                v-model="courseFormLessonDuration"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-slate-700 transition cursor-pointer"
              >
                <option value="60 daqiqa">60 daqiqa</option>
                <option value="80 daqiqa">80 daqiqa</option>
                <option value="90 daqiqa">90 daqiqa</option>
                <option value="120 daqiqa">120 daqiqa</option>
              </select>
            </div>

            <!-- 3. Kurs davomiyligi (oylarda) -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Kurs davomiyligi (oylarda)</label>
              <select
                v-model="courseFormMonths"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-slate-700 transition cursor-pointer"
              >
                <option :value="1">1 oy</option>
                <option :value="2">2 oy</option>
                <option :value="3">3 oy</option>
                <option :value="4">4 oy</option>
                <option :value="5">5 oy</option>
                <option :value="6">6 oy</option>
                <option :value="9">9 oy</option>
                <option :value="12">12 oy</option>
              </select>
            </div>

            <!-- 4. Narx -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Narx *</label>
              <input
                v-model="courseFormPrice"
                type="number"
                required
                min="0"
                step="10000"
                placeholder="Narxini kiriting"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>

            <!-- 5. Holati (Status) -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Holati (Status) *</label>
              <select
                v-model="courseFormStatus"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-slate-700 transition cursor-pointer"
              >
                <option value="ACTIVE">Faol (Active)</option>
                <option value="INACTIVE">Nofaol (Inactive)</option>
                <option value="ARCHIVED">Arxivlangan (Archived)</option>
              </select>
              <p class="text-xs text-slate-400 mt-1.5">Admin sifatida kursning faollik holatini belgilang.</p>
            </div>

            <!-- 6. Description -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Description</label>
              <textarea
                v-model="courseFormDescription"
                rows="4"
                placeholder="A little about the company and the team that you'll be working with."
                class="w-full p-4 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent placeholder:text-slate-400 resize-none min-h-28 transition"
              ></textarea>
              <p class="text-xs text-slate-400 mt-1.5">This is a hint text to help user.</p>
            </div>
          </form>

          <!-- Drawer Footer -->
          <div class="p-6 sm:p-7 pt-4 sm:pt-5 border-t border-slate-100 flex items-center justify-end gap-3.5">
            <button
              @click="showCourseDrawer = false"
              type="button"
              class="h-11 px-6 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="courseForm"
              :disabled="courseSubmitting"
              class="h-11 px-7 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-sm transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {{ courseSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================= SLIDE-OVER DRAWER: XONA QO'SHISH / TAHRIRLASH (Matching Course Drawer) ================= -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showRoomDrawer"
        class="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex justify-end"
        @click="showRoomDrawer = false"
      >
        <div
          class="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
          @click.stop
        >
          <!-- Drawer Header -->
          <div class="p-6 sm:p-7 pb-5 border-b border-slate-100">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-xl font-extrabold text-slate-900 leading-tight">
                  {{ isEditingRoom ? 'Xonani tahrirlash' : 'Xona qo\'shish' }}
                </h3>
                <p class="text-xs sm:text-sm text-slate-500 mt-1">
                  Bu yerda siz o'quv xonasi ma'lumotlarini kiritishingiz yoki o'zgartirishingiz mumkin.
                </p>
              </div>

              <button
                @click="showRoomDrawer = false"
                type="button"
                class="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Drawer Body: Form Fields (Enlarged & Spacious) -->
          <form @submit.prevent="handleSaveRoom" id="roomDrawerForm" class="p-6 sm:p-7 space-y-5 sm:space-y-6 flex-1">
            <div v-if="roomError" class="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {{ roomError }}
            </div>

            <!-- 1. Xona nomi -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Xona Nomi *</label>
              <input
                v-model="roomFormName"
                type="text"
                required
                placeholder="Masalan: Xona #301 (Frontend Studio)"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>

            <!-- 2. O'rinlar sig'imi -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">O'rinlar Sig'imi *</label>
              <input
                v-model="roomFormCapacity"
                type="number"
                min="1"
                max="150"
                required
                placeholder="Masalan: 20"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent placeholder:text-slate-400 transition"
              />
            </div>

            <!-- 3. Holati (Status) -->
            <div>
              <label class="block text-sm font-bold text-slate-800 mb-2">Holati (Status) *</label>
              <select
                v-model="roomFormStatus"
                class="w-full h-12 px-4.5 text-[15px] font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-transparent text-slate-700 transition cursor-pointer"
              >
                <option value="ACTIVE">Faol (Active)</option>
                <option value="INACTIVE">Nofaol (Inactive)</option>
                <option value="ARCHIVED">Arxivlangan (Archived)</option>
              </select>
              <p class="text-xs text-slate-400 mt-1.5">Admin sifatida xonaning faollik holatini belgilang.</p>
            </div>
          </form>

          <!-- Drawer Footer -->
          <div class="p-6 sm:p-7 pt-4 sm:pt-5 border-t border-slate-100 flex items-center justify-end gap-3.5">
            <button
              @click="showRoomDrawer = false"
              type="button"
              class="h-11 px-6 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              form="roomDrawerForm"
              :disabled="roomSubmitting"
              class="h-11 px-7 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-sm transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {{ roomSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ================= STAFF MODAL ================= -->
    <Modal :show="showStaffModal" :title="isEditingStaff ? 'Xodimni Tahrirlash' : 'Yangi Xodim Qo\'shish'" @close="showStaffModal = false">
      <form @submit.prevent="handleSaveStaff" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ism *</label>
            <input v-model="staffFormFirstName" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Familiya *</label>
            <input v-model="staffFormLastName" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
            <input v-model="staffFormPhone" type="text" required class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Lavozim *</label>
            <select v-model="staffFormRole" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]">
              <option value="ADMIN">Admin</option>
              <option value="SUPERADMIN">Superadmin</option>
              <option value="ASSISTANT">Assistent</option>
            </select>
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input v-model="staffFormEmail" type="email" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Holati (Status) *</label>
          <select v-model="staffFormStatus" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]">
            <option value="ACTIVE">Faol (Active)</option>
            <option value="INACTIVE">Nofaol (Inactive)</option>
            <option value="ARCHIVED">Arxivlangan (Archived)</option>
          </select>
        </div>
        <div v-if="!isEditingStaff">
          <label class="block text-xs font-bold text-slate-700 mb-1">Parol</label>
          <input v-model="staffFormPassword" type="password" placeholder="Standart: 123456" class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]" />
        </div>
        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button @click="showStaffModal = false" type="button" class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer">
            Bekor qilish
          </button>
          <button type="submit" :disabled="staffSubmitting" class="px-5 py-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50">
            {{ staffSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- ================= CONFIRMATION MODAL (Rostdan o'chirasizmi? / Arxivlaysizmi?) ================= -->
    <Modal :show="showConfirmModal" title="Tasdiqlash" @close="showConfirmModal = false">
      <div class="p-6 text-center space-y-4">
        <!-- Colored Icon Badge -->
        <div
          class="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center shadow-xs"
          :class="
            confirmTarget?.action === 'deletePermanent'
              ? 'bg-rose-50 text-rose-600 ring-4 ring-rose-100/60'
              : confirmTarget?.action === 'archive'
              ? 'bg-amber-50 text-amber-600 ring-4 ring-amber-100/60'
              : 'bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/60'
          "
        >
          <Trash2 v-if="confirmTarget?.action === 'deletePermanent'" class="h-7 w-7" />
          <Archive v-else-if="confirmTarget?.action === 'archive'" class="h-7 w-7" />
          <RotateCcw v-else class="h-7 w-7" />
        </div>

        <div>
          <h3 class="text-lg font-black text-slate-900">
            {{
              confirmTarget?.action === 'deletePermanent'
                ? 'Butunlay o\'chirmoqchimisiz?'
                : confirmTarget?.action === 'archive'
                ? 'Arxivlamoqchimisiz?'
                : 'Qayta tiklamoqchimisiz?'
            }}
          </h3>
          <p class="text-xs text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
            <template v-if="confirmTarget?.action === 'archive'">
              Siz haqiqatan ham <strong>"{{ confirmTarget?.name }}"</strong> ni arxivga o'tkazmoqchimisiz? Uni keyinchalik arxiv bo'limidan qayta tiklashingiz mumkin bo'ladi.
            </template>
            <template v-else-if="confirmTarget?.action === 'restore'">
              Siz haqiqatan ham <strong>"{{ confirmTarget?.name }}"</strong> ni qayta faollashtirmoqchimisiz? U asosiy ro'yxatga qaytadi.
            </template>
            <template v-else>
              Diqqat! <strong>"{{ confirmTarget?.name }}"</strong> butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi!
            </template>
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex items-center justify-center gap-3 pt-3">
          <button
            @click="showConfirmModal = false"
            type="button"
            class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            @click="handleConfirmAction"
            :disabled="confirmSubmitting"
            type="button"
            class="px-6 py-2.5 rounded-xl text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
            :class="
              confirmTarget?.action === 'deletePermanent'
                ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                : confirmTarget?.action === 'archive'
                ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
            "
          >
            {{
              confirmSubmitting
                ? 'Bajarilmoqda...'
                : confirmTarget?.action === 'deletePermanent'
                ? 'Ha, o\'chirilsin'
                : confirmTarget?.action === 'archive'
                ? 'Ha, arxivlansin'
                : 'Ha, tiklansin'
            }}
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
