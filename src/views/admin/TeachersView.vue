<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import { getTeacherPhoto } from '../../utils/teacherAvatars';
import {
  Trash2,
  RotateCcw,
  X,
  SlidersHorizontal,
  Pen,
  Eye,
  UploadCloud,
  Check,
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

// Real Pagination (10 per page as in image)
const currentPage = ref(1);
const itemsPerPage = 10;

// Slide-Over Drawer State (Image 1)
const showDrawer = ref(false);
const isEditing = ref(false);
const currentEditingId = ref<number | null>(null);

const formPhone = ref('+998');
const formEmail = ref('');
const formFIO = ref('');
const formSelectedGroupIds = ref<number[]>([]);
const formAddress = ref('');
const formPassword = ref('123456');
const formPhoto = ref<string>('');
const formError = ref('');
const isSubmitting = ref(false);

// Teacher Group Picker inside Drawer
const showGroupPicker = ref(false);

// Teacher Detail Modal (Eye action)
const showDetailModal = ref(false);
const selectedTeacherForDetail = ref<User | null>(null);

const fileInputRef = ref<HTMLInputElement | null>(null);

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

// Extract available unique group names
const availableGroups = computed(() => {
  return groups.value;
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
  if (!dateStr) return '27.08.2026';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '27.08.2026';
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
    const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
    const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
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

// ================= REAL WORKING PAGINATION =================
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTeachers.value.length / itemsPerPage)));

const paginatedTeachers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredTeachers.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, activeTab, selectedGroupFilter], () => {
  currentPage.value = 1;
});

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
  if (p >= 1 && p <= totalPages.value) {
    currentPage.value = p;
  }
}

const paginationDisplayPages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  const pages: (number | string)[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
  }
  return pages;
});

// Row selection
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

// ================= SLIDE-OVER DRAWER ACTIONS =================
function openCreateDrawer() {
  isEditing.value = false;
  currentEditingId.value = null;
  formPhone.value = '+998';
  formEmail.value = 'one.humoyun@gmail.com';
  formFIO.value = '';
  formSelectedGroupIds.value = [];
  formAddress.value = '';
  formPassword.value = '123456';
  formPhoto.value = '';
  formError.value = '';
  showGroupPicker.value = false;
  showDrawer.value = true;
}

function openEditDrawer(teacher: User) {
  isEditing.value = true;
  currentEditingId.value = teacher.id;
  formPhone.value = teacher.phone || '+998';
  formEmail.value = teacher.email || '';
  formFIO.value = `${teacher.firstName} ${teacher.lastName || ''}`.trim();
  formAddress.value = teacher.address || '';
  formPassword.value = '';
  formPhoto.value = teacher.photo || '';
  formError.value = '';

  // Extract linked group IDs
  const teacherGroupIds: number[] = [];
  groups.value.forEach((g) => {
    const isLinked = (g as any).teachers?.some(
      (t: any) => t.teacherId === teacher.id || t.id === teacher.id || t.teacher?.id === teacher.id
    );
    if (isLinked) teacherGroupIds.push(g.id);
  });
  formSelectedGroupIds.value = teacherGroupIds;
  showGroupPicker.value = false;
  showDrawer.value = true;
}

function closeDrawer() {
  showDrawer.value = false;
  showGroupPicker.value = false;
}

function onFileSelect(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      formPhoto.value = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function toggleGroupSelection(groupId: number) {
  const idx = formSelectedGroupIds.value.indexOf(groupId);
  if (idx > -1) {
    formSelectedGroupIds.value.splice(idx, 1);
  } else {
    formSelectedGroupIds.value.push(groupId);
  }
}

function removeSelectedGroup(groupId: number) {
  formSelectedGroupIds.value = formSelectedGroupIds.value.filter((id) => id !== groupId);
}

function getGroupNameById(id: number): string {
  const g = groups.value.find((item) => item.id === id);
  return g ? g.name : `Guruh #${id}`;
}

async function handleSaveTeacher() {
  if (!formFIO.value.trim() || !formPhone.value.trim()) {
    formError.value = "Iltimos, O'qituvchi FIO va Telefon raqamini kiriting.";
    return;
  }

  isSubmitting.value = true;
  formError.value = '';

  const nameParts = formFIO.value.trim().split(/\s+/);
  const firstName = nameParts[0] || 'O\'qituvchi';
  const lastName = nameParts.slice(1).join(' ') || '';

  try {
    if (isEditing.value && currentEditingId.value) {
      await erpService.updateUser(currentEditingId.value, {
        firstName,
        lastName,
        phone: formPhone.value.trim(),
        email: formEmail.value.trim() || undefined,
        address: formAddress.value.trim() || undefined,
        photo: formPhoto.value || undefined,
      });

      // Update groups
      for (const groupId of formSelectedGroupIds.value) {
        try {
          await erpService.addTeacherToGroup(groupId, currentEditingId.value, true);
        } catch {
          // ignore
        }
      }
    } else {
      const created = await erpService.createUser({
        firstName,
        lastName,
        role: 'TEACHER',
        phone: formPhone.value.trim(),
        email: formEmail.value.trim() || 'one.humoyun@gmail.com',
        password: formPassword.value.trim() || '123456',
        address: formAddress.value.trim() || undefined,
        photo: formPhoto.value || undefined,
      });

      const newTeacherId = (created as any)?.id || (created as any)?.data?.id;
      if (newTeacherId && formSelectedGroupIds.value.length > 0) {
        for (const groupId of formSelectedGroupIds.value) {
          try {
            await erpService.addTeacherToGroup(groupId, newTeacherId, true);
          } catch {
            // ignore
          }
        }
      }
    }

    closeDrawer();
    await loadData();
  } catch (err: any) {
    formError.value = err.response?.data?.message || err.message || 'Xatolik yuz berdi';
  } finally {
    isSubmitting.value = false;
  }
}

// Detail View Modal (Eye Icon)
function openDetailModal(teacher: User) {
  selectedTeacherForDetail.value = teacher;
  showDetailModal.value = true;
}

// Archive / Delete / Restore
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
</script>

<template>
  <div class="space-y-6">
    <!-- ================= TOP HEADER (Matching Image 2) ================= -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          O'qituvchilar
        </h1>
        <p class="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Ushbu sahifada siz o'qituvchilar ro'yxatini va ularning ma'lumotlarini topasiz. Har bir o'qituvchining ismi, fanlari va aloqa ma'lumotlari keltirilgan.
        </p>
      </div>

      <!-- + O'qituvchi qo'shish Button (Purple - Matching Image 2) -->
      <button
        @click="openCreateDrawer"
        type="button"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0"
      >
        <span>+ O'qituvchi qo'shish</span>
      </button>
    </div>

    <!-- ================= MAIN CARD CONTAINER (Matching Image 2) ================= -->
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
          :key="grp.id"
          @click="selectedGroupFilter = selectedGroupFilter === grp.name ? 'ALL' : grp.name"
          class="px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition"
          :class="selectedGroupFilter === grp.name ? 'bg-[#6D28D9] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'"
        >
          {{ grp.name }}
        </button>
      </div>

      <!-- ================= TEACHERS TABLE (Matching Image 2) ================= -->
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="text-xs bg-slate-50/70 text-slate-700 font-bold border-b border-slate-200/80 select-none">
            <tr>
              <th class="py-3.5 px-4 w-10">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                  class="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300 cursor-pointer"
                />
              </th>
              <th class="py-3.5 px-4">
                <button
                  @click="toggleSort"
                  type="button"
                  class="inline-flex items-center gap-1 font-bold text-slate-800 hover:text-[#6D28D9] cursor-pointer"
                >
                  <span>Nomi</span>
                  <span class="text-xs font-black">{{ sortDesc ? '↑' : '↓' }}</span>
                </button>
              </th>
              <th class="py-3.5 px-4 font-semibold text-slate-600">Guruh</th>
              <th class="py-3.5 px-4 font-semibold text-slate-600">Telefon raqamlari</th>
              <th class="py-3.5 px-4 font-semibold text-slate-600">Email</th>
              <th class="py-3.5 px-4 font-semibold text-slate-600">Manzil</th>
              <th class="py-3.5 px-4 font-semibold text-slate-600">Yaratilgan sana</th>
              <th class="py-3.5 px-4 text-right font-semibold text-slate-600">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 font-medium">
            <tr v-if="loading">
              <td colspan="8" class="py-12 text-center text-slate-400 text-xs">O'qituvchilar yuklanmoqda...</td>
            </tr>
            <tr v-else-if="paginatedTeachers.length === 0">
              <td colspan="8" class="py-12 text-center text-slate-400 text-xs">
                {{ activeTab === 'ARCHIVE' ? "Arxivda o'qituvchilar mavjud emas" : "O'qituvchilar topilmadi" }}
              </td>
            </tr>
            <tr
              v-for="t in paginatedTeachers"
              :key="t.id"
              class="hover:bg-slate-50/70 transition-colors"
              :class="selectedTeacherIds.includes(t.id) ? 'bg-violet-50/30' : ''"
            >
              <!-- Checkbox Column -->
              <td class="py-3.5 px-4">
                <input
                  type="checkbox"
                  :checked="selectedTeacherIds.includes(t.id)"
                  @change="toggleSelectTeacher(t.id)"
                  class="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] border-slate-300 cursor-pointer"
                />
              </td>

              <!-- Nomi (With Avatar Thumbnail as in Image 2) -->
              <td class="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                <div class="flex items-center gap-3">
                  <img
                    :src="t.photo || getTeacherPhoto(t)"
                    :alt="t.firstName"
                    class="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                  <span>{{ t.firstName }} {{ t.lastName }}</span>
                </div>
              </td>

              <!-- Guruh -->
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
                <span v-else class="text-slate-400"></span>
              </td>

              <!-- Telefon raqamlari -->
              <td class="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                {{ formatPhone(t.phone) }}
              </td>

              <!-- Email -->
              <td class="py-3.5 px-4 text-slate-600">
                {{ t.email || '-' }}
              </td>

              <!-- Manzil -->
              <td class="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                {{ t.address || '-' }}
              </td>

              <!-- Yaratilgan sana -->
              <td class="py-3.5 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                {{ formatDate((t as any).createdAt || (t as any).created_at) }}
              </td>

              <!-- Amallar (Eye, Trash2, Pen in that order - Image 2) -->
              <td class="py-3.5 px-4 text-right">
                <div class="flex items-center justify-end gap-2 text-slate-400">
                  <!-- Eye View Icon -->
                  <button
                    @click="openDetailModal(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                    title="Ko'rish"
                  >
                    <Eye class="h-4 w-4" />
                  </button>

                  <!-- Trash / Archive Icon -->
                  <button
                    v-if="activeTab === 'ACTIVE'"
                    @click="handleArchiveTeacher(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    title="Arxivlash"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                  <template v-else>
                    <button
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
                      title="Butunlay o'chirish"
                    >
                      <Trash2 class="h-4 w-4" />
                    </button>
                  </template>

                  <!-- Pen Edit Icon -->
                  <button
                    @click="openEditDrawer(t)"
                    type="button"
                    class="p-1 rounded-lg hover:text-[#6D28D9] hover:bg-violet-50 transition cursor-pointer"
                    title="Tahrirlash"
                  >
                    <Pen class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ================= REAL WORKING PAGINATION (Matching Image 2) ================= -->
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

    <!-- ================= SLIDE-OVER RIGHT DRAWER (O'qituvchi qo'shish - Matching Image 1) ================= -->
    <Teleport to="body">
      <!-- Backdrop -->
      <div
        v-if="showDrawer"
        @click="closeDrawer"
        class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity duration-300"
      ></div>

      <!-- Drawer Panel -->
      <div
        class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out"
        :class="showDrawer ? 'translate-x-0' : 'translate-x-full'"
      >
        <!-- Drawer Header -->
        <div class="px-6 py-5 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 class="text-lg font-bold text-slate-900">
              {{ isEditing ? "O'qituvchini tahrirlash" : "O'qituvchi qo'shish" }}
            </h2>
            <p class="text-xs text-slate-400 mt-1">
              {{ isEditing ? "O'qituvchi ma'lumotlarini o'zgartiring." : "Bu yerda siz yangi o'qituvchi qo'shishingiz mumkin." }}
            </p>
          </div>
          <button
            @click="closeDrawer"
            type="button"
            class="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Drawer Body Form -->
        <form @submit.prevent="handleSaveTeacher" class="flex-1 overflow-y-auto p-6 space-y-4">
          <div v-if="formError" class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            {{ formError }}
          </div>

          <!-- Telefon raqam -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Telefon raqam</label>
            <input
              v-model="formPhone"
              type="text"
              required
              placeholder="+998 90 123 45 67"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] font-mono text-slate-800"
            />
          </div>

          <!-- Mail -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Mail</label>
            <input
              v-model="formEmail"
              type="email"
              placeholder="one.humoyun@gmail.com"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
            />
          </div>

          <!-- O'qituvchi FIO -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">O'qituvchi FIO</label>
            <input
              v-model="formFIO"
              type="text"
              required
              placeholder="Masalan: Rustam Qodirov"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
            />
          </div>

          <!-- Guruh -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Guruh</label>
            <div class="border border-slate-200 rounded-xl p-2.5 bg-white">
              <div v-if="formSelectedGroupIds.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="gId in formSelectedGroupIds"
                  :key="gId"
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-[#6D28D9] border border-violet-100"
                >
                  {{ getGroupNameById(gId) }}
                  <button
                    @click.prevent="removeSelectedGroup(gId)"
                    class="text-[#6D28D9] hover:text-rose-600 cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              </div>

              <!-- + Qo'shish Button -->
              <button
                @click.prevent="showGroupPicker = !showGroupPicker"
                type="button"
                class="inline-flex items-center gap-1.5 text-xs font-bold text-[#6D28D9] hover:text-[#5B21B6] cursor-pointer py-1 px-2 rounded-lg hover:bg-violet-50 transition"
              >
                <span>+ Qo'shish</span>
              </button>

              <!-- Group Selector Dropdown -->
              <div
                v-if="showGroupPicker"
                class="mt-2 pt-2 border-t border-slate-100 max-h-40 overflow-y-auto space-y-1"
              >
                <div
                  v-for="grp in groups"
                  :key="grp.id"
                  @click="toggleGroupSelection(grp.id)"
                  class="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer hover:bg-slate-50 transition"
                  :class="formSelectedGroupIds.includes(grp.id) ? 'bg-violet-50/60 font-bold text-[#6D28D9]' : 'text-slate-700'"
                >
                  <span>{{ grp.name }}</span>
                  <Check v-if="formSelectedGroupIds.includes(grp.id)" class="h-3.5 w-3.5 text-[#6D28D9]" />
                </div>
              </div>
            </div>
          </div>

          <!-- Surati (Dashed Box Upload matching Image 1) -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Surati</label>
            <div
              @click="fileInputRef?.click()"
              class="border-2 border-dashed border-slate-200 hover:border-[#6D28D9] rounded-2xl p-6 text-center cursor-pointer transition relative bg-slate-50/50 hover:bg-violet-50/10"
            >
              <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="onFileSelect"
              />

              <div v-if="formPhoto" class="flex flex-col items-center gap-2">
                <img
                  :src="formPhoto"
                  alt="Yuklangan rasm"
                  class="w-16 h-16 rounded-full object-cover border-2 border-[#6D28D9] shadow-xs"
                />
                <span class="text-xs font-bold text-[#6D28D9]">Rasmni almashtirish</span>
              </div>

              <div v-else class="flex flex-col items-center justify-center gap-2">
                <!-- Cloud Icon -->
                <div class="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <UploadCloud class="h-5 w-5 text-slate-400" />
                </div>
                <p class="text-xs text-slate-600">
                  <span class="text-[#6D28D9] font-bold">Click to upload</span> or drag and drop
                </p>
                <p class="text-[11px] text-slate-400">JPG or PNG (max. 800x800px)</p>
              </div>
            </div>
          </div>

          <!-- Manzil -->
          <div>
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Manzil</label>
            <input
              v-model="formAddress"
              type="text"
              placeholder="Manzilni kiriting"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800"
            />
          </div>

          <!-- Parol -->
          <div v-if="!isEditing">
            <label class="block text-xs font-bold text-slate-800 mb-1.5">Parol</label>
            <input
              v-model="formPassword"
              type="text"
              placeholder="Parolni kiriting"
              class="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6D28D9] focus:border-[#6D28D9] text-slate-800 font-mono"
            />
          </div>
        </form>

        <!-- Drawer Footer (Bekor qilish & Saqlash) -->
        <div class="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            @click="closeDrawer"
            type="button"
            class="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            @click="handleSaveTeacher"
            type="button"
            :disabled="isSubmitting"
            class="px-6 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] active:bg-[#4c1d95] text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </div>
    </Teleport>

    <!-- ================= TEACHER DETAIL MODAL (Eye Action) ================= -->
    <Modal
      :show="showDetailModal"
      title="O'qituvchi ma'lumotlari"
      max-width="md"
      @close="showDetailModal = false"
    >
      <div v-if="selectedTeacherForDetail" class="space-y-4">
        <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <img
            :src="selectedTeacherForDetail.photo || getTeacherPhoto(selectedTeacherForDetail)"
            alt="Teacher"
            class="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
          />
          <div>
            <h3 class="text-base font-bold text-slate-900">
              {{ selectedTeacherForDetail.firstName }} {{ selectedTeacherForDetail.lastName }}
            </h3>
            <p class="text-xs text-slate-500 font-mono mt-0.5">
              {{ selectedTeacherForDetail.phone }}
            </p>
            <p class="text-xs text-slate-500">
              {{ selectedTeacherForDetail.email || 'Email yo\'q' }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span class="text-slate-400 block mb-0.5 font-medium">Manzil:</span>
            <span class="font-bold text-slate-800">{{ selectedTeacherForDetail.address || '-' }}</span>
          </div>
          <div class="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
            <span class="text-slate-400 block mb-0.5 font-medium">Yaratilgan sana:</span>
            <span class="font-bold text-slate-800 font-mono">{{ formatDate((selectedTeacherForDetail as any).created_at || (selectedTeacherForDetail as any).createdAt) }}</span>
          </div>
        </div>

        <div class="p-3 bg-slate-50/70 rounded-xl border border-slate-100 text-xs">
          <span class="text-slate-400 block mb-1 font-medium">Biriktirilgan guruhlar:</span>
          <div v-if="getTeacherGroupsList(selectedTeacherForDetail.id).length > 0" class="flex flex-wrap gap-1">
            <span
              v-for="grp in getTeacherGroupsList(selectedTeacherForDetail.id)"
              :key="grp"
              class="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-50 text-[#6D28D9] border border-violet-100"
            >
              {{ grp }}
            </span>
          </div>
          <span v-else class="text-slate-400 italic">Hozircha guruhlar biriktirilmagan</span>
        </div>

        <div class="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            @click="showDetailModal = false"
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>
