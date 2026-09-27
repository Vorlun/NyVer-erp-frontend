<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import {
  Archive,
  Trash2,
  RotateCcw,
  X,
  SlidersHorizontal,
  Pen,
} from 'lucide-vue-next';

const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const loading = ref(false);

const searchQuery = ref('');
const activeTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const selectedGroupFilter = ref<string>('ALL');
const showFilterModal = ref(false);
const sortDesc = ref(false);
const selectedTeacherIds = ref<number[]>([]);

// Pagination (Matching Image 1: 10 per page)
const currentPage = ref(1);
const itemsPerPage = 10;

// Create Teacher Modal
const showCreateModal = ref(false);
const formFirstName = ref('');
const formLastName = ref('');
const formPhone = ref('+998');
const formEmail = ref('');
const formAddress = ref('');
const formPassword = ref('123456');
const formError = ref('');
const isSubmitting = ref(false);

// Edit Teacher Modal
const showEditModal = ref(false);
const editTeacherId = ref<number | null>(null);
const editFirstName = ref('');
const editLastName = ref('');
const editPhone = ref('');
const editEmail = ref('');
const editAddress = ref('');

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
    console.error("O'qituvchilar ma'lumotlarini yuklashda xatolik:", err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadData();
});

const teachersList = computed(() => {
  return users.value.filter((u) => u.role === 'TEACHER');
});

// Extract all unique group names across teachers
const availableGroups = computed(() => {
  const set = new Set<string>();
  groups.value.forEach((g) => {
    if (g.name) set.add(g.name);
  });
  return Array.from(set);
});

function getTeacherGroupsList(teacherId: number): string[] {
  const user = users.value.find((u) => u.id === teacherId);
  if (user && (user as any).teachingGroups && (user as any).teachingGroups.length > 0) {
    const names = (user as any).teachingGroups
      .map((e: any) => e.group?.name)
      .filter(Boolean);
    if (names.length > 0) return names;
  }

  const teacherGroups = groups.value.filter((g) => {
    return (g as any).teachers?.some(
      (t: any) => t.teacherId === teacherId || t.id === teacherId || t.teacher?.id === teacherId
    );
  });
  if (teacherGroups.length > 0) {
    return teacherGroups.map((g) => g.name);
  }
  return [];
}

function getTeacherGroups(teacherId: number): string {
  const list = getTeacherGroupsList(teacherId);
  return list.length > 0 ? list.join(', ') : '';
}

function toggleSort() {
  sortDesc.value = !sortDesc.value;
}

function toggleArchiveView() {
  activeTab.value = activeTab.value === 'ACTIVE' ? 'ARCHIVE' : 'ACTIVE';
  currentPage.value = 1;
}

function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return '24.08.2026';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '24.08.2026';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatPhone(phone?: string): string {
  if (!phone) return '-';
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean.length === 13 && clean.startsWith('+998')) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 11)} ${clean.slice(11, 13)}`;
  }
  return phone;
}

const sortedTeachers = computed(() => {
  const list = [...teachersList.value];
  return list.sort((a, b) => {
    const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
    return sortDesc.value ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
  });
});

const filteredTeachers = computed(() => {
  return sortedTeachers.value.filter((t) => {
    const isArchived = t.status === 'ARCHIVED';
    if (activeTab.value === 'ACTIVE' && isArchived) return false;
    if (activeTab.value === 'ARCHIVE' && !isArchived) return false;

    const q = searchQuery.value.trim().toLowerCase();
    const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
    const matchesSearch =
      !q ||
      fullName.includes(q) ||
      t.phone.includes(q) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q));

    if (selectedGroupFilter.value !== 'ALL') {
      const groupStr = getTeacherGroups(t.id);
      if (!groupStr.includes(selectedGroupFilter.value)) return false;
    }

    return matchesSearch;
  });
});

const archiveCount = computed(() => teachersList.value.filter((t) => t.status === 'ARCHIVED').length);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTeachers.value.length / itemsPerPage)));

const paginatedTeachers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredTeachers.value.slice(start, start + itemsPerPage);
});

const isAllSelected = computed(() => {
  return (
    paginatedTeachers.value.length > 0 &&
    paginatedTeachers.value.every((t) => selectedTeacherIds.value.includes(t.id))
  );
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedTeacherIds.value = [];
  } else {
    selectedTeacherIds.value = paginatedTeachers.value.map((t) => t.id);
  }
}

function toggleSelectTeacher(id: number) {
  const idx = selectedTeacherIds.value.indexOf(id);
  if (idx > -1) {
    selectedTeacherIds.value.splice(idx, 1);
  } else {
    selectedTeacherIds.value.push(id);
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function goToPage(p: number) {
  currentPage.value = p;
}

const paginationDisplayPages = computed(() => {
  const total = Math.max(totalPages.value, 10);
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, 2, 3, '...', total - 2, total - 1, total);
  }
  return pages;
});

async function handleArchiveTeacher(teacher: User) {
  if (!confirm(`Haqiqatan ham ${teacher.firstName} ${teacher.lastName} o'qituvchisini arxivlamoqchimisiz?`)) return;
  try {
    await erpService.changeUserStatus(teacher.id, 'ARCHIVED');
    await loadData();
  } catch (err) {
    console.error('Arxivlashda xatolik:', err);
  }
}

async function handleRestoreTeacher(teacher: User) {
  try {
    await erpService.changeUserStatus(teacher.id, 'ACTIVE');
    await loadData();
  } catch (err) {
    console.error('Qayta tiklashda xatolik:', err);
  }
}

async function handlePermanentDelete(teacher: User) {
  if (!confirm(`DIQQAT! ${teacher.firstName} ${teacher.lastName} butunlay o'chiriladi. Rozimisiz?`)) return;
  try {
    await erpService.deleteUser(teacher.id);
    await loadData();
  } catch (err) {
    console.error("O'chirishda xatolik:", err);
  }
}

function openCreateModal() {
  formFirstName.value = '';
  formLastName.value = '';
  formPhone.value = '+998';
  formEmail.value = '';
  formAddress.value = '';
  formPassword.value = '123456';
  formError.value = '';
  showCreateModal.value = true;
}

async function handleCreateTeacher() {
  if (!formFirstName.value || !formLastName.value || !formPhone.value) {
    formError.value = "Iltimos, ism, familiya va telefon raqamini to'liq kiriting.";
    return;
  }
  isSubmitting.value = true;
  try {
    await erpService.createUser({
      firstName: formFirstName.value.trim(),
      lastName: formLastName.value.trim(),
      role: 'TEACHER',
      phone: formPhone.value.trim(),
      email: formEmail.value.trim() || undefined,
      password: formPassword.value.trim() || '123456',
      address: formAddress.value.trim() || undefined,
    });
    showCreateModal.value = false;
    await loadData();
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    isSubmitting.value = false;
  }
}

function openEditModal(teacher: User) {
  editTeacherId.value = teacher.id;
  editFirstName.value = teacher.firstName;
  editLastName.value = teacher.lastName;
  editPhone.value = teacher.phone;
  editEmail.value = teacher.email || '';
  editAddress.value = teacher.address || '';
  showEditModal.value = true;
}

async function handleEditTeacher() {
  if (!editTeacherId.value || !editFirstName.value || !editLastName.value || !editPhone.value) return;
  isSubmitting.value = true;
  try {
    await erpService.updateUser(editTeacherId.value, {
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
</script>

<template>
  <div class="space-y-6">
    <!-- ================= TOP HEADER (Matching Image 1) ================= -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          O'qituvchilar
        </h1>
        <p class="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
          Ushbu sahifada siz o'qituvchilar ro'yxatini va ularning ma'lumotlarini topasiz. Har bir o'qituvchining ismi, fanlari va aloqa ma'lumotlari keltirilgan.
        </p>
      </div>

      <!-- + O'qituvchi qo'shish Button (Purple) -->
      <button
        @click="openCreateModal"
        type="button"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white font-bold text-sm transition-all shadow-xs cursor-pointer shrink-0"
      >
        <span>+ O'qituvchi qo'shish</span>
      </button>
    </div>

    <!-- ================= MAIN CARD CONTAINER (Matching Image 1) ================= -->
    <div class="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-5">
      <!-- Action Controls Bar: Filters & Arxiv on left, Search on right -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <!-- Filters Button -->
          <button
            @click="showFilterModal = !showFilterModal"
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
            :class="selectedGroupFilter !== 'ALL' ? 'border-[#6D28D9] text-[#6D28D9] font-bold' : ''"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-slate-500" />
            <span>Filters</span>
            <span v-if="selectedGroupFilter !== 'ALL'" class="w-1.5 h-1.5 rounded-full bg-[#6D28D9]"></span>
          </button>

          <!-- Arxiv Button -->
          <button
            @click="toggleArchiveView"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs border"
            :class="
              activeTab === 'ARCHIVE'
                ? 'bg-[#6D28D9] text-white border-[#6D28D9] font-bold shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            "
          >
            <span>Arxiv</span>
            <span v-if="archiveCount > 0" class="ml-1 opacity-80">({{ archiveCount }})</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search"
            class="w-full px-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 transition"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X class="h-3 w-3" />
          </button>
        </div>
      </div>

      <!-- Expandable Filters Section -->
      <div v-if="showFilterModal" class="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 flex flex-wrap items-center gap-2">
        <span class="text-xs font-bold text-slate-500 mr-2">Guruh bo'yicha saralash:</span>
        <button
          @click="selectedGroupFilter = 'ALL'"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition"
          :class="selectedGroupFilter === 'ALL' ? 'bg-[#6D28D9] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'"
        >
          Barchasi
        </button>
        <button
          v-for="grp in availableGroups"
          :key="grp"
          @click="selectedGroupFilter = selectedGroupFilter === grp ? 'ALL' : grp"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition"
          :class="selectedGroupFilter === grp ? 'bg-[#6D28D9] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'"
        >
          {{ grp }}
        </button>
      </div>

      <!-- ================= TEACHERS TABLE (Matching Image 1) ================= -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-xs bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200/80 select-none">
            <tr>
              <th class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                    class="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300 cursor-pointer"
                  />
                  <button
                    @click="toggleSort"
                    type="button"
                    class="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-[#6D28D9] cursor-pointer"
                  >
                    <span>Nomi</span>
                    <span class="text-xs font-black">{{ sortDesc ? '↑' : '↓' }}</span>
                  </button>
                </div>
              </th>
              <th class="py-3 px-4 font-semibold text-slate-600">Guruh</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Telefon raqamlari</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Email</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Manzil</th>
              <th class="py-3 px-4 font-semibold text-slate-600">Yaratilgan sana</th>
              <th class="py-3 px-4 text-right font-semibold text-slate-600">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="7" class="py-12 text-center text-slate-400 text-xs">O'qituvchilar yuklanmoqda...</td>
            </tr>
            <tr v-else-if="paginatedTeachers.length === 0">
              <td colspan="7" class="py-12 text-center text-slate-400 text-xs">
                {{ activeTab === 'ARCHIVE' ? "Arxivda o'qituvchilar mavjud emas" : "O'qituvchilar topilmadi" }}
              </td>
            </tr>
            <tr
              v-for="t in paginatedTeachers"
              :key="t.id"
              class="hover:bg-slate-50/70 transition-colors"
              :class="selectedTeacherIds.includes(t.id) ? 'bg-violet-50/30' : ''"
            >
              <td class="py-3.5 px-4 font-bold text-slate-900">
                <div class="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    :checked="selectedTeacherIds.includes(t.id)"
                    @change="toggleSelectTeacher(t.id)"
                    class="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300 cursor-pointer"
                  />
                  <span>{{ t.firstName }} {{ t.lastName }}</span>
                </div>
              </td>
              <td class="py-3.5 px-4 text-slate-700">
                <div v-if="getTeacherGroupsList(t.id).length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="grp in getTeacherGroupsList(t.id)"
                    :key="grp"
                    class="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-violet-50 text-[#6D28D9] border border-violet-100"
                  >
                    {{ grp }}
                  </span>
                </div>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="py-3.5 px-4 font-mono text-slate-700">
                {{ formatPhone(t.phone) }}
              </td>
              <td class="py-3.5 px-4 text-slate-500">
                {{ t.email || '-' }}
              </td>
              <td class="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                {{ t.address || '-' }}
              </td>
              <td class="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                {{ formatDate((t as any).createdAt || (t as any).created_at) }}
              </td>
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-1.5 text-slate-400">
                  <button
                    @click="openEditModal(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pen class="h-4 w-4" />
                  </button>
                  <button
                    v-if="activeTab === 'ACTIVE'"
                    @click="handleArchiveTeacher(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                    title="Arxivlash"
                  >
                    <Archive class="h-4 w-4" />
                  </button>
                  <button
                    v-else
                    @click="handleRestoreTeacher(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                    title="Qayta tiklash"
                  >
                    <RotateCcw class="h-4 w-4" />
                  </button>
                  <button
                    @click="handlePermanentDelete(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= BOTTOM PAGINATION (Matching Image 1) ================= -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <!-- ← Previous Button -->
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
        >
          ← Previous
        </button>

        <!-- Page Numbers: 1, 2, 3, ... 8, 9, 10 -->
        <div class="flex items-center gap-1.5 overflow-x-auto max-w-full">
          <button
            v-for="(p, index) in paginationDisplayPages"
            :key="index"
            @click="typeof p === 'number' ? goToPage(p) : null"
            :disabled="typeof p !== 'number'"
            type="button"
            class="w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer shadow-2xs"
            :class="
              p === currentPage
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : typeof p === 'number'
                ? 'bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50'
                : 'bg-transparent text-slate-400 cursor-default'
            "
          >
            {{ p }}
          </button>
        </div>

        <!-- Next → Button -->
        <button
          @click="nextPage"
          :disabled="currentPage >= totalPages"
          type="button"
          class="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
        >
          Next →
        </button>
      </div>
    </div>

    <!-- ================= CREATE TEACHER MODAL ================= -->
    <Modal
      :show="showCreateModal"
      title="Yangi O'qituvchi Qo'shish"
      max-width="md"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreateTeacher" class="space-y-4">
        <div v-if="formError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
          {{ formError }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Ism *</label>
            <input
              v-model="formFirstName"
              type="text"
              required
              placeholder="Rustam"
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Familiya *</label>
            <input
              v-model="formLastName"
              type="text"
              required
              placeholder="Qodirov"
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Telefon *</label>
            <input
              v-model="formPhone"
              type="text"
              required
              placeholder="+998901234567"
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Email</label>
            <input
              v-model="formEmail"
              type="email"
              placeholder="teacher@nyver.uz"
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Manzil</label>
          <input
            v-model="formAddress"
            type="text"
            placeholder="Toshkent sh., Chilonzor"
            class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Dastlabki Parol</label>
          <input
            v-model="formPassword"
            type="text"
            placeholder="123456"
            class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] placeholder:text-slate-400 font-mono"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-6 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5b21b6] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- ================= EDIT TEACHER MODAL ================= -->
    <Modal
      :show="showEditModal"
      title="O'qituvchini Tahrirlash"
      max-width="md"
      @close="showEditModal = false"
    >
      <form @submit.prevent="handleEditTeacher" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Ism *</label>
            <input
              v-model="editFirstName"
              type="text"
              required
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Familiya *</label>
            <input
              v-model="editLastName"
              type="text"
              required
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Telefon *</label>
            <input
              v-model="editPhone"
              type="text"
              required
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] font-mono"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Email</label>
            <input
              v-model="editEmail"
              type="email"
              class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-800 mb-1.5">Manzil</label>
          <input
            v-model="editAddress"
            type="text"
            class="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9]"
          />
        </div>

        <div class="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-6 py-2 text-xs font-bold text-white bg-[#6D28D9] hover:bg-[#5b21b6] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
