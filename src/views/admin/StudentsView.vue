<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  SlidersHorizontal,
  Edit2,
  Trash2,
  Eye,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-vue-next';

const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const loading = ref(false);

const searchQuery = ref('');
const activeTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const selectedGroupFilter = ref<string>('ALL');
const showFilterPopover = ref(false);
const sortAsc = ref(true);

// Selected checkboxes
const selectedIds = ref<number[]>([]);

// Pagination
const currentPage = ref(1);
const itemsPerPage = 10;

// Drawer state (Talaba qo'shish / tahrirlash)
const isDrawerOpen = ref(false);
const isEditing = ref(false);
const editingStudentId = ref<number | null>(null);

const drawerPhone = ref('+998');
const drawerEmail = ref('');
const drawerFio = ref('');
const drawerBirthDate = ref('');
const drawerAddress = ref('');
const drawerPassword = ref('');
const drawerGroupId = ref<number | string>('');

const drawerError = ref('');
const isSubmitting = ref(false);

// Toast message
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');
function showToast(msg: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = msg;
  toastType.value = type;
  setTimeout(() => {
    toastMessage.value = '';
  }, 4500);
}

// Student View Detail Modal
const showViewModal = ref(false);
const viewingStudent = ref<User | null>(null);

// Coins Modal
const showCoinModal = ref(false);
const selectedStudentForCoins = ref<User | null>(null);
const coinAmount = ref(10);
const coinReason = ref('Darsdagi faollik uchun');

async function loadData() {
  loading.value = true;
  try {
    const [usersRes, groupsRes] = await Promise.allSettled([
      erpService.getUsers({ limit: 150 }),
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

// Group lookup helper
function getStudentGroupNames(student: User): string {
  if ((student as any).studentEnrollments && (student as any).studentEnrollments.length > 0) {
    const names = (student as any).studentEnrollments
      .map((e: any) => e.group?.name)
      .filter(Boolean);
    if (names.length > 0) return names.join(', ');
  }

  const studentGroups = groups.value.filter((g) => {
    return (g as any).students?.some(
      (s: any) => s.studentId === student.id || s.id === student.id || s.student?.id === student.id
    );
  });
  if (studentGroups.length > 0) {
    return studentGroups.map((g) => g.name).join(', ');
  }
  return '-';
}

function getStudentGroupId(student: User): number | string {
  if ((student as any).studentEnrollments && (student as any).studentEnrollments.length > 0) {
    return (student as any).studentEnrollments[0].group?.id || '';
  }
  const g = groups.value.find((grp) => {
    return (grp as any).students?.some(
      (s: any) => s.studentId === student.id || s.id === student.id || s.student?.id === student.id
    );
  });
  return g?.id || '';
}

// Date formatting: DD.MM.YYYY
function formatDate(d?: string | Date | null): string {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '-';
  }
}

// Filtered & Sorted students
const filteredStudents = computed(() => {
  return studentsList.value
    .filter((s) => {
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
        const gName = getStudentGroupNames(s);
        if (!gName.includes(selectedGroupFilter.value)) return false;
      }

      return matchesSearch;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`;
      const nameB = `${b.firstName} ${b.lastName}`;
      return sortAsc.value
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    });
});

const archiveCount = computed(
  () => studentsList.value.filter((s) => s.status === 'ARCHIVED').length
);

// Pagination calculations
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredStudents.value.length / itemsPerPage))
);

const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredStudents.value.slice(start, start + itemsPerPage);
});

// Checkboxes selection
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
  sortAsc.value = !sortAsc.value;
}

// Drawer open/close
function openCreateDrawer() {
  isEditing.value = false;
  editingStudentId.value = null;
  drawerPhone.value = '+998';
  drawerEmail.value = '';
  drawerFio.value = '';
  drawerBirthDate.value = '';
  drawerAddress.value = '';
  drawerPassword.value = '';
  drawerGroupId.value = groups.value[0]?.id || '';
  drawerError.value = '';
  isDrawerOpen.value = true;
}

function openEditStudent(student: User) {
  isEditing.value = true;
  editingStudentId.value = student.id;
  drawerPhone.value = student.phone || '+998';
  drawerEmail.value = student.email || '';
  drawerFio.value = `${student.firstName} ${student.lastName}`.trim();
  drawerBirthDate.value = student.birthDate
    ? new Date(student.birthDate).toISOString().slice(0, 10)
    : '';
  drawerAddress.value = student.address || '';
  drawerPassword.value = '';
  drawerGroupId.value = getStudentGroupId(student);
  drawerError.value = '';
  isDrawerOpen.value = true;
}

function closeDrawer() {
  isDrawerOpen.value = false;
  drawerError.value = '';
}

// Save Student (Create or Edit)
async function handleSaveStudent() {
  if (!drawerPhone.value || !drawerFio.value.trim()) {
    drawerError.value = 'Iltimos, telefon raqami va talaba FIO sini kiriting.';
    return;
  }

  isSubmitting.value = true;
  drawerError.value = '';

  const trimmedFio = drawerFio.value.trim();
  const spaceIdx = trimmedFio.indexOf(' ');
  let firstName = trimmedFio;
  let lastName = '';
  if (spaceIdx !== -1) {
    firstName = trimmedFio.substring(0, spaceIdx).trim();
    lastName = trimmedFio.substring(spaceIdx + 1).trim();
  }

  try {
    if (isEditing.value && editingStudentId.value) {
      await erpService.updateUser(editingStudentId.value, {
        firstName,
        lastName,
        phone: drawerPhone.value.trim(),
        email: drawerEmail.value.trim() || undefined,
        address: drawerAddress.value.trim() || undefined,
        birthDate: drawerBirthDate.value ? drawerBirthDate.value : undefined,
      });

      if (drawerGroupId.value) {
        try {
          await erpService.addStudentToGroup(Number(drawerGroupId.value), editingStudentId.value);
        } catch (gErr) {
          console.warn('Guruhga biriktirish:', gErr);
        }
      }

      showToast("Talaba ma'lumotlari muvaffaqiyatli yangilandi!");
    } else {
      const created = await erpService.createUser({
        firstName,
        lastName,
        role: 'STUDENT',
        phone: drawerPhone.value.trim(),
        email: drawerEmail.value.trim() || undefined,
        password: drawerPassword.value.trim() || undefined,
        address: drawerAddress.value.trim() || undefined,
        birthDate: drawerBirthDate.value ? drawerBirthDate.value : undefined,
      });

      if (drawerGroupId.value && created && created.id) {
        try {
          await erpService.addStudentToGroup(Number(drawerGroupId.value), created.id);
        } catch (gErr) {
          console.warn('Guruhga biriktirish:', gErr);
        }
      }

      const emailNote = drawerEmail.value.trim()
        ? " Kirish rekvizitlari va 1 martalik parol student emailiga yuborildi."
        : "";
      showToast(`Talaba muvaffaqiyatli yaratildi!${emailNote}`);
    }

    closeDrawer();
    await loadData();
  } catch (err: any) {
    drawerError.value =
      err?.response?.data?.message || err.message || 'Xatolik yuz berdi. Qayta urinib ko\'ring.';
  } finally {
    isSubmitting.value = false;
  }
}

// Delete student
async function handleDeleteStudent(student: User) {
  if (
    !confirm(
      `Haqiqatan ham ${student.firstName} ${student.lastName} talabasini o'chirmoqchimisiz?`
    )
  )
    return;

  try {
    await erpService.deleteUser(student.id);
    showToast(`${student.firstName} ${student.lastName} muvaffaqiyatli o'chirildi!`);
    await loadData();
  } catch (err: any) {
    try {
      await erpService.changeUserStatus(student.id, 'ARCHIVED');
      showToast(`${student.firstName} arxivlandi!`);
      await loadData();
    } catch (e: any) {
      alert("O'chirishda xatolik yuz berdi: " + (e.message || ''));
    }
  }
}

// Restore student from archive
async function handleRestoreStudent(student: User) {
  try {
    await erpService.changeUserStatus(student.id, 'ACTIVE');
    showToast(`${student.firstName} talabasi faol holatga qaytarildi!`);
    await loadData();
  } catch (err) {
    console.error('Tiklashda xatolik:', err);
  }
}

// View student details
function openViewStudent(student: User) {
  viewingStudent.value = student;
  showViewModal.value = true;
}

// Coins modal
function openCoinModal(student: User) {
  selectedStudentForCoins.value = student;
  coinAmount.value = 10;
  coinReason.value = 'Darsdagi faollik uchun';
  showCoinModal.value = true;
}

async function handleAdjustCoins() {
  if (!selectedStudentForCoins.value) return;
  isSubmitting.value = true;
  try {
    await erpService.updateUserCoins(
      selectedStudentForCoins.value.id,
      Number(coinAmount.value),
      coinReason.value
    );
    showCoinModal.value = false;
    showToast("Student tangalar balansi muvaffaqiyatli yangilandi!");
    await loadData();
  } catch (err) {
    console.error('Tangalarni yangilashda xatolik:', err);
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Toast notification -->
    <transition
      enter-active-class="transform transition ease-out duration-300"
      enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="toastMessage"
        class="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold"
        :class="
          toastType === 'success'
            ? 'bg-white border-violet-200 text-slate-800 shadow-violet-500/10'
            : 'bg-white border-rose-200 text-rose-800 shadow-rose-500/10'
        "
      >
        <CheckCircle v-if="toastType === 'success'" class="w-5 h-5 text-emerald-600 shrink-0" />
        <AlertCircle v-else class="w-5 h-5 text-rose-600 shrink-0" />
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- 1. Top Header (Matching Screenshot 2) -->
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Talabalar
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Ushbu sahifada siz Talabalar ro'yxatini va ularning ma'lumotlarini topasiz. Har bir Talaba ismi, fanlari va aloqa ma'lumotlari keltirilgan.
        </p>
      </div>

      <!-- Add Student Purple Button -->
      <button
        @click="openCreateDrawer"
        type="button"
        class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0 self-start hover:shadow-md active:scale-98"
      >
        <Plus class="h-4 w-4" />
        <span>Talaba qo'shish</span>
      </button>
    </div>

    <!-- 2. Main White Container (Matching Screenshot 2) -->
    <div class="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
      <!-- Toolbar: Search on Left, Filters & Arxiv on Right -->
      <div class="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Search -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search"
            class="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D28D9] transition font-medium"
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

        <!-- Right Buttons: Filters & Arxiv -->
        <div class="relative flex items-center gap-2.5 self-end sm:self-auto">
          <!-- Filters Button -->
          <button
            @click="showFilterPopover = !showFilterPopover"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            :class="selectedGroupFilter !== 'ALL' ? 'border-[#6D28D9] text-[#6D28D9] bg-violet-50/50' : ''"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-slate-500" />
            <span>Filters</span>
          </button>

          <!-- Filter Popover -->
          <div
            v-if="showFilterPopover"
            class="absolute right-0 top-11 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-30 space-y-3"
          >
            <div class="flex items-center justify-between pb-2 border-b border-slate-100">
              <span class="text-xs font-bold text-slate-800">Filtrlar</span>
              <button
                @click="showFilterPopover = false"
                class="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">Guruh bo'yicha</label>
              <select
                v-model="selectedGroupFilter"
                class="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6D28D9]"
              >
                <option value="ALL">Barcha guruhlar</option>
                <option v-for="g in groups" :key="g.id" :value="g.name">
                  {{ g.name }}
                </option>
              </select>
            </div>

            <div class="pt-1 flex items-center justify-between">
              <button
                @click="selectedGroupFilter = 'ALL'"
                type="button"
                class="text-[11px] font-bold text-slate-500 hover:text-slate-800"
              >
                Tozalash
              </button>
              <button
                @click="showFilterPopover = false"
                type="button"
                class="px-3 py-1 bg-[#6D28D9] text-white text-[11px] font-bold rounded-lg hover:bg-[#5B21B6]"
              >
                Qo'llash
              </button>
            </div>
          </div>

          <!-- Arxiv Button -->
          <button
            @click="activeTab = activeTab === 'ACTIVE' ? 'ARCHIVE' : 'ACTIVE'"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            :class="activeTab === 'ARCHIVE' ? 'bg-[#6D28D9] text-white border-[#6D28D9]' : ''"
          >
            <span>Arxiv</span>
            <span
              v-if="archiveCount > 0"
              class="px-1.5 py-0.2 rounded-full text-[10px] font-bold"
              :class="activeTab === 'ARCHIVE' ? 'bg-white text-[#6D28D9]' : 'bg-slate-100 text-slate-600'"
            >
              {{ archiveCount }}
            </span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="py-20 text-center space-y-3">
        <div class="inline-block h-8 w-8 animate-spin rounded-full border-3 border-solid border-[#6D28D9] border-r-transparent"></div>
        <p class="text-xs font-medium text-slate-500">Talabalar ma'lumotlari yuklanmoqda...</p>
      </div>

      <!-- Table View (Exact layout from Screenshot 2) -->
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left text-xs sm:text-sm text-slate-600">
          <thead class="text-xs text-slate-600 font-bold border-b border-slate-200 select-none bg-white">
            <tr>
              <th class="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="rounded text-[#6D28D9] focus:ring-[#6D28D9] h-4 w-4 cursor-pointer accent-[#6D28D9]"
                />
              </th>
              <th @click="toggleSort" class="py-3.5 px-4 cursor-pointer hover:text-slate-900">
                <div class="flex items-center gap-1">
                  <span>Nomi</span>
                  <span class="text-xs text-slate-400">↓</span>
                </div>
              </th>
              <th class="py-3.5 px-4">Guruh</th>
              <th class="py-3.5 px-4">Telefon raqamlari</th>
              <th class="py-3.5 px-4">Email</th>
              <th class="py-3.5 px-4">Tug'ilgan sanasi</th>
              <th class="py-3.5 px-4">Manzil</th>
              <th class="py-3.5 px-4">Yaratilgan sana</th>
              <th class="py-3.5 px-4 text-right">Amallar</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-100 font-medium">
            <!-- Empty State (Screenshot 1: "Hozircha talabalar yo'q") -->
            <tr v-if="filteredStudents.length === 0">
              <td colspan="9" class="py-28 text-center text-slate-500 text-sm font-medium">
                Hozircha talabalar yo'q
              </td>
            </tr>

            <!-- Student Rows (Screenshot 2) -->
            <tr
              v-else
              v-for="s in paginatedStudents"
              :key="s.id"
              class="hover:bg-slate-50/70 transition-colors"
              :class="selectedIds.includes(s.id) ? 'bg-violet-50/30' : ''"
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

              <!-- Nomi (Avatar + Ism) -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2.5">
                  <div
                    class="h-7 w-7 rounded-full bg-violet-100 text-[#6D28D9] font-bold text-xs flex items-center justify-center shrink-0 tracking-tight"
                  >
                    {{ (s.firstName?.[0] || 'T').toUpperCase() }}
                  </div>
                  <span class="font-bold text-slate-900 whitespace-nowrap">
                    {{ s.firstName }} {{ s.lastName }}
                  </span>
                </div>
              </td>

              <!-- Guruh -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-600 font-medium">
                  {{ getStudentGroupNames(s) }}
                </span>
              </td>

              <!-- Telefon raqamlari -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-700 font-mono text-xs sm:text-sm">
                  {{ s.phone }}
                </span>
              </td>

              <!-- Email -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-600">
                  {{ s.email || '-' }}
                </span>
              </td>

              <!-- Tug'ilgan sanasi -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-600">
                  {{ formatDate(s.birthDate) }}
                </span>
              </td>

              <!-- Manzil -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-600">
                  {{ s.address || '-' }}
                </span>
              </td>

              <!-- Yaratilgan sana -->
              <td class="py-3.5 px-4 whitespace-nowrap">
                <span class="text-slate-600">
                  {{ formatDate(s.created_at) }}
                </span>
              </td>

              <!-- Amallar (Eye, Trash, Edit) -->
              <td class="py-3.5 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-1.5 text-slate-400">
                  <!-- Eye: View student detail -->
                  <button
                    @click="openViewStudent(s)"
                    type="button"
                    class="p-1 rounded-lg text-slate-500 hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                    title="Ko'rish"
                  >
                    <Eye class="h-4 w-4" />
                  </button>

                  <template v-if="activeTab === 'ACTIVE'">
                    <!-- Trash: Delete student -->
                    <button
                      @click="handleDeleteStudent(s)"
                      type="button"
                      class="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>

                    <!-- Edit: Edit student -->
                    <button
                      @click="openEditStudent(s)"
                      type="button"
                      class="p-1 rounded-lg text-slate-500 hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 class="h-4 w-4" />
                    </button>
                  </template>

                  <template v-else>
                    <!-- Restore from archive -->
                    <button
                      @click="handleRestoreStudent(s)"
                      type="button"
                      class="p-1 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                      title="Qayta tiklash"
                    >
                      <RotateCcw class="h-4 w-4" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 3. Pagination Bar (Exact design from Screenshot 2) -->
      <div
        class="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm text-slate-600 bg-white select-none"
      >
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          type="button"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
        >
          ← Previous
        </button>

        <!-- Page Numbers -->
        <div class="flex items-center gap-1.5">
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            type="button"
            class="h-7 w-7 rounded-lg font-bold text-xs flex items-center justify-center transition cursor-pointer"
            :class="
              currentPage === p
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100'
            "
          >
            {{ p }}
          </button>
        </div>

        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          type="button"
          class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition shadow-2xs"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- 4. SLIDE-OVER RIGHT DRAWER (Talaba qo'shish / tahrirlash — Matching Screenshot 1) -->
    <!-- Backdrop Overlay -->
    <div
      v-if="isDrawerOpen"
      @click="closeDrawer"
      class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 transition-opacity"
    />

    <!-- Drawer Panel -->
    <div
      v-if="isDrawerOpen"
      class="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out"
    >
      <!-- Drawer Header -->
      <div class="p-6 border-b border-slate-100 flex items-start justify-between">
        <div>
          <h2 class="text-lg sm:text-xl font-bold text-slate-900">
            {{ isEditing ? 'Talabani tahrirlash' : 'Talaba qo\'shish' }}
          </h2>
          <p class="text-xs text-slate-500 mt-1">
            {{ isEditing ? 'Bu yerda siz talaba ma\'lumotlarini yangilashingiz mumkin.' : 'Bu yerda siz yangi Talaba qo\'shishingiz mumkin.' }}
          </p>
        </div>
        <button
          @click="closeDrawer"
          type="button"
          class="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Drawer Body (Scrollable Form Fields) -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm">
        <!-- Error Banner -->
        <div
          v-if="drawerError"
          class="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium"
        >
          {{ drawerError }}
        </div>

        <!-- 1. Telefon raqam -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Telefon raqam
          </label>
          <input
            v-model="drawerPhone"
            type="text"
            placeholder="+998 90 123 45 67"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <!-- 2. Mail -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Mail
          </label>
          <input
            v-model="drawerEmail"
            type="email"
            placeholder="student@nyver.uz"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <!-- 3. Talaba FIO -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Talaba FIO
          </label>
          <input
            v-model="drawerFio"
            type="text"
            placeholder="Masalan: Sardor Rahimov"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <!-- 4. Tug'ilgan sanasi -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Tug'ilgan sanasi
          </label>
          <input
            v-model="drawerBirthDate"
            type="date"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800"
          />
        </div>

        <!-- 5. Manzil -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Manzil
          </label>
          <input
            v-model="drawerAddress"
            type="text"
            placeholder="Manzilni kiriting"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <!-- 6. Parol -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Parol
          </label>
          <input
            v-model="drawerPassword"
            type="text"
            placeholder="Parolni kiriting"
            class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-800 placeholder:text-slate-400"
          />
          <p class="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
            💡 Agar bo'sh qoldirilsa, tizim avtomatik ravishda 1 marttalik vaqtinchalik parol yaratadi va talaba emailiga login bilan yuboradi.
          </p>
        </div>

        <!-- 7. Guruh -->
        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">
            Guruh
          </label>
          <div class="relative">
            <select
              v-model="drawerGroupId"
              class="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-medium text-slate-700 appearance-none"
            >
              <option value="">+ Guruh qo'shish</option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }} ({{ g.course?.name || "Asosiy" }})
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Drawer Footer -->
      <div class="border-t border-slate-100 p-4 sm:p-5 flex items-center justify-end gap-3 bg-white">
        <button
          @click="closeDrawer"
          type="button"
          class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition cursor-pointer"
        >
          Bekor qilish
        </button>
        <button
          @click="handleSaveStudent"
          type="button"
          :disabled="isSubmitting"
          class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-xs sm:text-sm transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
      </div>
    </div>

    <!-- 5. View Student Modal (Eye action) -->
    <Modal
      :show="showViewModal"
      title="Talaba Ma'lumotlari"
      @close="showViewModal = false"
    >
      <div v-if="viewingStudent" class="space-y-4">
        <div class="flex items-center gap-3.5 pb-4 border-b border-slate-100">
          <div
            class="h-12 w-12 rounded-full bg-violet-100 text-[#6D28D9] font-bold text-base flex items-center justify-center shrink-0"
          >
            {{ (viewingStudent.firstName?.[0] || 'T').toUpperCase() }}
          </div>
          <div>
            <h3 class="text-base font-bold text-slate-900">
              {{ viewingStudent.firstName }} {{ viewingStudent.lastName }}
            </h3>
            <p class="text-xs text-slate-400 font-mono mt-0.5">
              {{ viewingStudent.phone }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">Email:</span>
            <span class="font-bold text-slate-800">{{ viewingStudent.email || '-' }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">Guruh:</span>
            <span class="font-bold text-[#6D28D9]">{{ getStudentGroupNames(viewingStudent) }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">Tug'ilgan sana:</span>
            <span class="font-bold text-slate-800">{{ formatDate(viewingStudent.birthDate) }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">Manzil:</span>
            <span class="font-bold text-slate-800">{{ viewingStudent.address || '-' }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">Tangalar (Coins):</span>
            <span class="font-bold text-amber-600">🪙 {{ viewingStudent.coins || 0 }}</span>
          </div>
          <div class="p-3 bg-slate-50 rounded-xl">
            <span class="text-slate-400 font-medium block">A'zo bo'lgan sana:</span>
            <span class="font-bold text-slate-800">{{ formatDate(viewingStudent.created_at) }}</span>
          </div>
        </div>

        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            @click="
              showViewModal = false;
              openCoinModal(viewingStudent);
            "
            type="button"
            class="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            🪙 Tanga berish / ayirish
          </button>
          <div class="flex items-center gap-2">
            <button
              @click="
                showViewModal = false;
                openEditStudent(viewingStudent);
              "
              type="button"
              class="px-4 py-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Tahrirlash
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- 6. Coins Modal -->
    <Modal
      :show="showCoinModal"
      title="Tangalar Balansini Boshqarish"
      @close="showCoinModal = false"
    >
      <form @submit.prevent="handleAdjustCoins" class="space-y-4">
        <div v-if="selectedStudentForCoins" class="p-3 bg-amber-50 rounded-xl text-xs text-amber-800">
          Talaba: <strong>{{ selectedStudentForCoins.firstName }} {{ selectedStudentForCoins.lastName }}</strong><br />
          Hozirgi balans: <strong>{{ selectedStudentForCoins.coins || 0 }} tanga</strong>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Tanga miqdori (+ yoki -)</label>
          <input
            v-model="coinAmount"
            type="number"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Sabab / Izoh</label>
          <input
            v-model="coinReason"
            type="text"
            required
            class="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            @click="showCoinModal = false"
            type="button"
            class="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Tasdiqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
