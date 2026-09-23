<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  Search,
  Archive,
  Edit2,
  Trash2,
  RotateCcw,
  Coins,
  ChevronDown,
  Eye,
  LayoutGrid,
  List,
  Phone,
  Mail,
  MapPin,
  Plus,
  GraduationCap,
  X,
} from 'lucide-vue-next';

const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const loading = ref(false);

const searchQuery = ref('');
const activeTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const viewMode = ref<'grid' | 'table'>('grid');
const selectedGroupFilter = ref<string>('ALL');
const sortOrder = ref<'asc' | 'desc'>('asc');

// Selected checkboxes
const selectedIds = ref<number[]>([]);

// Pagination
const currentPage = ref(1);
const itemsPerPage = computed(() => (viewMode.value === 'grid' ? 12 : 10));

// Avatar gradients for students
const avatarGradients = [
  'from-violet-600 to-indigo-600 text-white',
  'from-blue-600 to-cyan-600 text-white',
  'from-emerald-600 to-teal-600 text-white',
  'from-amber-500 to-orange-600 text-white',
  'from-rose-500 to-pink-600 text-white',
  'from-fuchsia-600 to-purple-700 text-white',
  'from-teal-500 to-emerald-700 text-white',
  'from-indigo-500 to-purple-600 text-white',
];

function getAvatarGradient(id: number): string {
  return avatarGradients[id % avatarGradients.length];
}

// Create Student Modal
const showCreateModal = ref(false);
const formFirstName = ref('');
const formLastName = ref('');
const formPhone = ref('+998');
const formEmail = ref('');
const formBirthDate = ref('');
const formAddress = ref('');
const formPassword = ref('123456');
const formGroupId = ref<number | string>('');
const formError = ref('');
const isSubmitting = ref(false);

// Edit Student Modal
const showEditModal = ref(false);
const editStudentId = ref<number | null>(null);
const editFirstName = ref('');
const editLastName = ref('');
const editPhone = ref('');
const editEmail = ref('');
const editAddress = ref('');
const editBirthDate = ref('');

// Coins Modal
const showCoinModal = ref(false);
const selectedStudent = ref<User | null>(null);
const coinAmount = ref(10);
const coinReason = ref('Darsdagi faollik uchun');

async function loadData() {
  loading.value = true;
  try {
    const [usersRes, groupsRes] = await Promise.allSettled([
      erpService.getUsers({ limit: 100 }),
      erpService.getGroups(),
    ]);

    if (usersRes.status === 'fulfilled' && usersRes.value) {
      const val = usersRes.value;
      users.value = Array.isArray(val) ? val : (val as any).data || [];
    }
    if (groupsRes.status === 'fulfilled' && groupsRes.value) {
      const val = groupsRes.value;
      groups.value = Array.isArray(val) ? val : (val as any).data || [];
    }
  } catch (err) {
    console.error("Talabalar ma'lumotlarini yuklashda xatolik:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

// All students
const studentsList = computed(() => {
  return users.value.filter((u) => u.role === 'STUDENT');
});

// Map student ID to enrolled groups as array
function getStudentGroupsList(studentId: number): string[] {
  const user = users.value.find((u) => u.id === studentId);
  if (user && (user as any).studentEnrollments && (user as any).studentEnrollments.length > 0) {
    const names = (user as any).studentEnrollments
      .map((e: any) => e.group?.name)
      .filter(Boolean);
    if (names.length > 0) return names;
  }

  const studentGroups = groups.value.filter((g) => {
    return (g as any).students?.some(
      (s: any) => s.studentId === studentId || s.id === studentId || s.student?.id === studentId
    );
  });
  if (studentGroups.length > 0) {
    return studentGroups.map((g) => g.name);
  }
  return [];
}

// Map student ID to enrolled groups string
function getStudentGroups(studentId: number): string {
  const list = getStudentGroupsList(studentId);
  return list.length > 0 ? list.join(', ') : '-';
}

// Filtered students
const filteredStudents = computed(() => {
  return studentsList.value.filter((s) => {
    const isArchived = s.status === 'ARCHIVED';
    if (activeTab.value === 'ACTIVE' && isArchived) return false;
    if (activeTab.value === 'ARCHIVE' && !isArchived) return false;

    const q = searchQuery.value.trim().toLowerCase();
    const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      s.phone.includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.address && s.address.toLowerCase().includes(q));

    if (selectedGroupFilter.value !== 'ALL') {
      const gStr = getStudentGroups(s.id);
      if (!gStr.includes(selectedGroupFilter.value)) return false;
    }

    return matchesSearch;
  }).sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`;
    const nameB = `${b.firstName} ${b.lastName}`;
    return sortOrder.value === 'asc'
      ? nameA.localeCompare(nameB)
      : nameB.localeCompare(nameA);
  });
});

const archiveCount = computed(() => studentsList.value.filter((s) => s.status === 'ARCHIVED').length);

// Pagination
const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudents.value.length / itemsPerPage.value)));
const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  return filteredStudents.value.slice(start, start + itemsPerPage.value);
});

// Checkbox select all
const isAllSelected = computed(() => {
  return (
    paginatedStudents.value.length > 0 &&
    paginatedStudents.value.every((s) => selectedIds.value.includes(s.id))
  );
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedIds.value = [];
  } else {
    selectedIds.value = paginatedStudents.value.map((s) => s.id);
  }
}

function toggleSelect(id: number) {
  const idx = selectedIds.value.indexOf(id);
  if (idx > -1) {
    selectedIds.value.splice(idx, 1);
  } else {
    selectedIds.value.push(id);
  }
}

function toggleSort() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
}

// Archive / Delete action
async function handleArchiveStudent(student: User) {
  if (!confirm(`Haqiqatan ham ${student.firstName} ${student.lastName} talabasini arxivlamoqchimisiz?`)) return;
  try {
    await erpService.changeUserStatus(student.id, 'ARCHIVED');
    await loadData();
  } catch (err) {
    console.error('Arxivlashda xatolik:', err);
  }
}

async function handleRestoreStudent(student: User) {
  try {
    await erpService.changeUserStatus(student.id, 'ACTIVE');
    await loadData();
  } catch (err) {
    console.error('Tiklashda xatolik:', err);
  }
}

async function handlePermanentDelete(student: User) {
  if (!confirm(`DIQQAT! ${student.firstName} ${student.lastName} butunlay o'chiriladi. Rozimisiz?`)) return;
  try {
    await erpService.deleteUser(student.id);
    await loadData();
  } catch (err) {
    console.error("O'chirishda xatolik:", err);
  }
}

// Create student
function openCreateModal() {
  formFirstName.value = '';
  formLastName.value = '';
  formPhone.value = '+998';
  formEmail.value = '';
  formBirthDate.value = '';
  formAddress.value = '';
  formPassword.value = '123456';
  formGroupId.value = groups.value[0]?.id || '';
  formError.value = '';
  showCreateModal.value = true;
}

async function handleCreateStudent() {
  if (!formFirstName.value || !formLastName.value || !formPhone.value) {
    formError.value = 'Iltimos, barcha majburiy maydonlarni to\'ldiring.';
    return;
  }
  isSubmitting.value = true;
  try {
    const student = await erpService.createUser({
      firstName: formFirstName.value.trim(),
      lastName: formLastName.value.trim(),
      role: 'STUDENT',
      phone: formPhone.value.trim(),
      email: formEmail.value.trim() || undefined,
      password: formPassword.value.trim() || '123456',
      address: formAddress.value.trim() || undefined,
    });

    if (formGroupId.value && student && student.id) {
      try {
        await erpService.addStudentToGroup(Number(formGroupId.value), student.id);
      } catch (gErr) {
        console.warn('Guruhga biriktirishda xatolik:', gErr);
      }
    }

    showCreateModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    isSubmitting.value = false;
  }
}

// Edit student
function openEditModal(student: User) {
  editStudentId.value = student.id;
  editFirstName.value = student.firstName;
  editLastName.value = student.lastName;
  editPhone.value = student.phone;
  editEmail.value = student.email || '';
  editAddress.value = student.address || '';
  editBirthDate.value = student.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : '';
  showEditModal.value = true;
}

async function handleEditStudent() {
  if (!editStudentId.value || !editFirstName.value || !editLastName.value || !editPhone.value) return;
  isSubmitting.value = true;
  try {
    await erpService.updateUser(editStudentId.value, {
      firstName: editFirstName.value.trim(),
      lastName: editLastName.value.trim(),
      phone: editPhone.value.trim(),
      email: editEmail.value.trim() || undefined,
      address: editAddress.value.trim() || undefined,
    });
    showEditModal.value = false;
    await loadData();
  } catch (err: any) {
    console.error('Tahrirlashda xatolik:', err);
  } finally {
    isSubmitting.value = false;
  }
}

// Coins modal
function openCoinModal(student: User) {
  selectedStudent.value = student;
  coinAmount.value = 10;
  coinReason.value = 'Darsdagi faollik uchun';
  showCoinModal.value = true;
}

async function handleAdjustCoins() {
  if (!selectedStudent.value) return;
  isSubmitting.value = true;
  try {
    await erpService.updateUserCoins(selectedStudent.value.id, Number(coinAmount.value), coinReason.value);
    showCoinModal.value = false;
    await loadData();
  } catch (err) {
    console.error('Tangalarni yangilashda xatolik:', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- 1. Top Header: Minimalist & Clean -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-3">
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Talabalar
        </h1>
        <span
          class="px-2.5 py-1 text-xs font-bold rounded-full border shadow-2xs"
          :class="activeTab === 'ACTIVE' ? 'bg-violet-50 text-[#6D28D9] border-violet-150' : 'bg-amber-50 text-amber-700 border-amber-200'"
        >
          {{ activeTab === 'ACTIVE' ? `${filteredStudents.length} nafar faol` : `${archiveCount} nafar arxivda` }}
        </span>
      </div>

      <!-- Action Button -->
      <button
        @click="openCreateModal"
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0 self-start sm:self-auto hover:shadow-md active:scale-98"
      >
        <Plus class="h-4 w-4" />
        <span>Yangi talaba qo'shish</span>
      </button>
    </div>

    <!-- 2. Controls & Filter Toolbar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
      <!-- Left: Search Bar & Group Filter -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
        <!-- Search -->
        <div class="relative flex-1 max-w-md">
          <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Ism, telefon, email yoki manzil bo'yicha qidirish..."
            class="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 transition font-medium"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            type="button"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Group Select Filter -->
        <div class="relative w-full sm:w-56">
          <select
            v-model="selectedGroupFilter"
            class="w-full pl-3 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] text-slate-700 font-semibold cursor-pointer transition appearance-none"
          >
            <option value="ALL">Barcha guruhlar</option>
            <option v-for="g in groups" :key="g.id" :value="g.name">
              {{ g.name }}
            </option>
          </select>
          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <!-- Right: View Switcher (Grid/Table) & Status Filter (Active/Archive) -->
      <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
        <!-- Active / Archive Switcher -->
        <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            @click="activeTab = 'ACTIVE'"
            type="button"
            class="px-3 py-1.5 rounded-lg transition cursor-pointer"
            :class="activeTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
          >
            Faol
          </button>
          <button
            @click="activeTab = 'ARCHIVE'"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer"
            :class="activeTab === 'ARCHIVE' ? 'bg-amber-600 text-white shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'"
          >
            <Archive class="h-3.5 w-3.5" />
            <span>Arxiv</span>
            <span
              v-if="archiveCount > 0"
              class="px-1.5 py-0.2 rounded-full text-[10px]"
              :class="activeTab === 'ARCHIVE' ? 'bg-amber-800 text-white' : 'bg-slate-200 text-slate-700'"
            >
              {{ archiveCount }}
            </span>
          </button>
        </div>

        <!-- Grid / Table View Switcher -->
        <div class="inline-flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            @click="viewMode = 'grid'"
            type="button"
            class="p-1.5 rounded-lg transition cursor-pointer"
            :class="viewMode === 'grid' ? 'bg-white text-[#6D28D9] shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
            title="Karta ko'rinishi (Kreativ grid)"
          >
            <LayoutGrid class="h-4 w-4" />
          </button>
          <button
            @click="viewMode = 'table'"
            type="button"
            class="p-1.5 rounded-lg transition cursor-pointer"
            :class="viewMode === 'table' ? 'bg-white text-[#6D28D9] shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
            title="Jadval ko'rinishi"
          >
            <List class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Active State Notice if Viewing Arxiv -->
    <div
      v-if="activeTab === 'ARCHIVE'"
      class="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-center justify-between shadow-2xs"
    >
      <div class="flex items-center gap-2.5">
        <Archive class="h-4 w-4 text-amber-600 shrink-0" />
        <span>Siz hozirda <strong>Arxivlangan talabalar</strong> ro'yxatidasiz. O'chirilgan talabalar shu yerda saqlanadi.</span>
      </div>
      <button
        @click="activeTab = 'ACTIVE'"
        class="text-xs font-bold text-amber-900 hover:underline cursor-pointer ml-3 shrink-0"
      >
        Faol talabalarga qaytish →
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-20 text-center space-y-3">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#6D28D9] border-r-transparent"></div>
      <p class="text-xs font-medium text-slate-500">Talabalar ma'lumotlari yuklanmoqda...</p>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredStudents.length === 0"
      class="py-16 px-4 bg-white rounded-2xl border border-dashed border-slate-200 text-center space-y-3"
    >
      <div class="h-12 w-12 rounded-2xl bg-violet-50 text-[#6D28D9] mx-auto flex items-center justify-center">
        <GraduationCap class="h-6 w-6" />
      </div>
      <h3 class="text-sm font-bold text-slate-800">
        {{ activeTab === 'ARCHIVE' ? 'Arxivda talabalar mavjud emas' : 'Talabalar topilmadi' }}
      </h3>
      <p class="text-xs text-slate-400 max-w-sm mx-auto">
        {{ searchQuery || selectedGroupFilter !== 'ALL' ? 'Qidiruv shartlariga mos keluvchi talaba topilmadi. Qidiruvni tozalab ko\'ring.' : 'Tizimda hozircha talabalar mavjud emas.' }}
      </p>
      <button
        v-if="searchQuery || selectedGroupFilter !== 'ALL'"
        @click="searchQuery = ''; selectedGroupFilter = 'ALL'"
        type="button"
        class="px-3.5 py-1.5 text-xs font-semibold text-[#6D28D9] bg-violet-50 hover:bg-violet-100 rounded-xl transition cursor-pointer"
      >
        Filtrlarni tozalash
      </button>
    </div>

    <!-- VIEW 1: CREATIVE MINIMALIST GRID VIEW (Karta rejimi) -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5"
    >
      <div
        v-for="s in paginatedStudents"
        :key="s.id"
        class="group relative bg-white rounded-2xl border border-slate-200/80 hover:border-violet-300 hover:shadow-lg transition-all duration-200 p-5 flex flex-col justify-between space-y-4 hover:-translate-y-0.5 shadow-2xs"
      >
        <!-- Top: Avatar, Name & Coins -->
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <!-- Avatar & Student Info -->
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-11 w-11 rounded-2xl bg-gradient-to-br flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs tracking-tight"
                :class="getAvatarGradient(s.id)"
              >
                {{ s.firstName?.charAt(0) || 'T' }}{{ s.lastName?.charAt(0) || '' }}
              </div>
              <div class="min-w-0">
                <router-link
                  :to="'/dashboard/users/' + s.id"
                  class="font-bold text-sm text-slate-900 group-hover:text-[#6D28D9] transition-colors truncate block leading-tight"
                  :title="`${s.firstName} ${s.lastName} — 360° profilga o'tish`"
                >
                  {{ s.firstName }} {{ s.lastName }}
                </router-link>
                <p class="text-[11px] text-slate-400 font-mono mt-0.5 truncate flex items-center gap-1">
                  <Phone class="h-3 w-3 text-slate-400 shrink-0" />
                  <span>{{ s.phone }}</span>
                </p>
              </div>
            </div>

            <!-- Coins Badge (Interactive) -->
            <button
              @click="openCoinModal(s)"
              type="button"
              class="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 group/coin"
              title="Tanga qo'shish yoki yechib olish"
            >
              <span class="group-hover/coin:rotate-12 transition-transform">🪙</span>
              <span>{{ s.coins || 0 }}</span>
            </button>
          </div>

          <!-- Groups Enrolled Chips -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Guruhlari:
            </span>
            <div class="flex flex-wrap gap-1.5">
              <template v-if="getStudentGroupsList(s.id).length > 0">
                <span
                  v-for="grp in getStudentGroupsList(s.id)"
                  :key="grp"
                  class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-violet-50/80 text-[#6D28D9] border border-violet-100/90 truncate max-w-full"
                  :title="grp"
                >
                  {{ grp }}
                </span>
              </template>
              <span
                v-else
                class="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-500"
              >
                Guruhsiz
              </span>
            </div>
          </div>

          <!-- Student Contact Details (Clean & Minimal) -->
          <div class="space-y-1 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
            <div v-if="s.email" class="flex items-center gap-1.5 truncate text-slate-500" :title="s.email">
              <Mail class="h-3 w-3 text-slate-400 shrink-0" />
              <span class="truncate">{{ s.email }}</span>
            </div>
            <div v-if="s.address" class="flex items-center gap-1.5 truncate text-slate-500" :title="s.address">
              <MapPin class="h-3 w-3 text-slate-400 shrink-0" />
              <span class="truncate">{{ s.address }}</span>
            </div>
          </div>
        </div>

        <!-- Footer Actions: Profile (360°), Edit, Trash -->
        <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <!-- 360° Profile Button -->
          <router-link
            :to="'/dashboard/users/' + s.id"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-[#6D28D9] text-[#6D28D9] hover:text-white font-bold text-xs transition-all shadow-2xs cursor-pointer active:scale-95"
            title="360° boshqaruv profilini ochish"
          >
            <Eye class="h-3.5 w-3.5" />
            <span>Profil</span>
          </router-link>

          <!-- Quick Action Buttons -->
          <div class="flex items-center gap-1">
            <template v-if="activeTab === 'ACTIVE'">
              <button
                @click="openCoinModal(s)"
                type="button"
                class="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                title="Tanga boshqaruvi"
              >
                <Coins class="h-4 w-4" />
              </button>
              <button
                @click="openEditModal(s)"
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-slate-100 transition cursor-pointer"
                title="Tahrirlash"
              >
                <Edit2 class="h-4 w-4" />
              </button>
              <button
                @click="handleArchiveStudent(s)"
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Arxivlash (O'chirish)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </template>
            <template v-else>
              <button
                @click="handleRestoreStudent(s)"
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg transition cursor-pointer text-xs"
                title="Tiklash"
              >
                <RotateCcw class="h-3.5 w-3.5" />
                <span>Tiklash</span>
              </button>
              <button
                @click="handlePermanentDelete(s)"
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Butunlay o'chirish"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- VIEW 2: CLEAN MINIMALIST TABLE VIEW (Jadval rejimi) -->
    <div v-else class="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-[12px] bg-slate-50/90 text-slate-500 font-bold border-b border-slate-200/80 select-none">
            <tr>
              <th class="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="rounded text-[#6D28D9] focus:ring-[#6D28D9] h-4 w-4 cursor-pointer accent-[#6D28D9]"
                />
              </th>
              <th @click="toggleSort" class="py-3 px-4 cursor-pointer hover:text-slate-900">
                <div class="flex items-center gap-1.5">
                  <span>Talaba</span>
                  <span class="text-xs text-slate-400">↓</span>
                </div>
              </th>
              <th class="py-3 px-4">Tanga</th>
              <th class="py-3 px-4">Guruhlar</th>
              <th class="py-3 px-4">Telefon</th>
              <th class="py-3 px-4">Manzil</th>
              <th class="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <tr
              v-for="s in paginatedStudents"
              :key="s.id"
              class="hover:bg-slate-50/70 transition-colors"
              :class="selectedIds.includes(s.id) ? 'bg-indigo-50/30' : ''"
            >
              <!-- Checkbox -->
              <td class="py-3.5 px-4">
                <input
                  type="checkbox"
                  :checked="selectedIds.includes(s.id)"
                  @change="toggleSelect(s.id)"
                  class="rounded text-[#6D28D9] focus:ring-[#6D28D9] h-4 w-4 cursor-pointer accent-[#6D28D9]"
                />
              </td>

              <!-- Talaba (Avatar + Ism + Email) -->
              <td class="py-3.5 px-4">
                <router-link
                  :to="'/dashboard/users/' + s.id"
                  class="flex items-center gap-3 group/student hover:opacity-90 transition-opacity"
                  title="360° to'liq boshqaruv sahifasiga o'tish"
                >
                  <div
                    class="h-9 w-9 rounded-xl bg-gradient-to-br flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs"
                    :class="getAvatarGradient(s.id)"
                  >
                    {{ s.firstName?.charAt(0) || 'T' }}{{ s.lastName?.charAt(0) || '' }}
                  </div>
                  <div>
                    <span class="font-bold text-slate-900 group-hover/student:text-[#6D28D9] inline-flex items-center gap-1.5 leading-tight text-xs transition-colors">
                      <span>{{ s.firstName }} {{ s.lastName }}</span>
                      <Eye class="h-3 w-3 opacity-0 group-hover/student:opacity-100 text-[#6D28D9] transition-opacity shrink-0" />
                    </span>
                    <span v-if="s.email" class="text-[11px] text-slate-400 block truncate max-w-44">
                      {{ s.email }}
                    </span>
                  </div>
                </router-link>
              </td>

              <!-- Tanga balansi -->
              <td class="py-3.5 px-4">
                <button
                  @click="openCoinModal(s)"
                  type="button"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/70 text-xs font-bold transition cursor-pointer shadow-2xs"
                  title="Tanga berish / ayirish"
                >
                  <span>🪙</span>
                  <span>{{ s.coins || 0 }}</span>
                </button>
              </td>

              <!-- Guruhlar -->
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1 max-w-xs">
                  <template v-if="getStudentGroupsList(s.id).length > 0">
                    <span
                      v-for="grp in getStudentGroupsList(s.id)"
                      :key="grp"
                      class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 text-[#6D28D9] border border-violet-150"
                    >
                      {{ grp }}
                    </span>
                  </template>
                  <span v-else class="text-slate-400 text-xs">-</span>
                </div>
              </td>

              <!-- Telefon -->
              <td class="py-3.5 px-4">
                <span class="text-slate-700 font-mono text-xs">{{ s.phone }}</span>
              </td>

              <!-- Manzil -->
              <td class="py-3.5 px-4">
                <span class="text-slate-500 truncate max-w-44 block text-xs">{{ s.address || '-' }}</span>
              </td>

              <!-- Amallar -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <template v-if="activeTab === 'ACTIVE'">
                    <router-link
                      :to="'/dashboard/users/' + s.id"
                      class="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition cursor-pointer"
                      title="360° profil va to'liq boshqaruv"
                    >
                      <Eye class="h-4 w-4" />
                    </router-link>
                    <button
                      @click="openCoinModal(s)"
                      class="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                      title="Tanga berish / ayirish"
                    >
                      <Coins class="h-4 w-4" />
                    </button>
                    <button
                      @click="openEditModal(s)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-[#6D28D9] hover:bg-slate-100 transition cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 class="h-4 w-4" />
                    </button>
                    <button
                      @click="handleArchiveStudent(s)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Arxivlash"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </template>

                  <template v-else>
                    <button
                      @click="handleRestoreStudent(s)"
                      class="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg transition cursor-pointer text-xs"
                      title="Faol holatga qaytarish"
                    >
                      <RotateCcw class="h-3.5 w-3.5" />
                      <span>Tiklash</span>
                    </button>
                    <button
                      @click="handlePermanentDelete(s)"
                      class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Butunlay o'chirish"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 3. Clean Pagination (Grid va Jadval uchun birdek ishlaydi) -->
    <div
      v-if="filteredStudents.length > itemsPerPage"
      class="px-5 py-3.5 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600 shadow-2xs"
    >
      <button
        @click="currentPage = Math.max(1, currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
      >
        ← Oldingi
      </button>

      <div class="flex items-center gap-1.5">
        <button
          v-for="p in totalPages"
          :key="p"
          @click="currentPage = p"
          class="h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
          :class="currentPage === p ? 'bg-[#6D28D9] text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'"
        >
          {{ p }}
        </button>
      </div>

      <button
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3.5 py-1.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
      >
        Keyingi →
      </button>
    </div>

    <!-- Create Student Modal -->
    <Modal
      :show="showCreateModal"
      title="Yangi Talaba Qo'shish"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreateStudent" class="space-y-4">
        <div v-if="formError" class="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {{ formError }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ism *</label>
            <input
              v-model="formFirstName"
              type="text"
              required
              placeholder="Jasur"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Familiya *</label>
            <input
              v-model="formLastName"
              type="text"
              required
              placeholder="Bekmirzayev"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
            <input
              v-model="formPhone"
              type="text"
              required
              placeholder="+998901234567"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              v-model="formEmail"
              type="email"
              placeholder="student@nyver.uz"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Tug'ilgan sana</label>
            <input
              v-model="formBirthDate"
              type="date"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Guruhga biriktirish</label>
            <select
              v-model="formGroupId"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            >
              <option value="">Guruh tanlanmagan</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} ({{ g.course?.name }})
              </option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Manzil</label>
          <input
            v-model="formAddress"
            type="text"
            placeholder="Toshkent sh., Olmazor tumani"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Dastlabki Parol</label>
          <input
            v-model="formPassword"
            type="text"
            placeholder="123456"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
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

    <!-- Edit Student Modal -->
    <Modal
      :show="showEditModal"
      title="Talaba Ma'lumotlarini Tahrirlash"
      @close="showEditModal = false"
    >
      <form @submit.prevent="handleEditStudent" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Ism *</label>
            <input
              v-model="editFirstName"
              type="text"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Familiya *</label>
            <input
              v-model="editLastName"
              type="text"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Telefon *</label>
            <input
              v-model="editPhone"
              type="text"
              required
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">Email</label>
            <input
              v-model="editEmail"
              type="email"
              class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Manzil</label>
          <input
            v-model="editAddress"
            type="text"
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
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
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Yangilash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- Adjust Coins Modal -->
    <Modal
      :show="showCoinModal"
      title="Tangalar Balansini Boshqarish"
      @close="showCoinModal = false"
    >
      <form @submit.prevent="handleAdjustCoins" class="space-y-4">
        <div v-if="selectedStudent" class="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
          Talaba: <strong>{{ selectedStudent.firstName }} {{ selectedStudent.lastName }}</strong><br />
          Hozirgi balans: <strong>{{ selectedStudent.coins }} tanga</strong>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tanga miqdori (+ yoki -)</label>
          <input
            v-model="coinAmount"
            type="number"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Sabab / Izoh</label>
          <input
            v-model="coinReason"
            type="text"
            required
            class="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showCoinModal = false"
            type="button"
            class="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
