<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { erpService } from '../../api/erpService';
import type { User, Group } from '../../types';
import Modal from '../../components/ui/Modal.vue';
import { getTeacherPhoto, getTeacherMeta } from '../../utils/teacherAvatars';
import {
  Search,
  Archive,
  Edit2,
  Trash2,
  RotateCcw,
  Phone,
  Mail,
  Plus,
  X,
  LayoutGrid,
  List,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Sparkles,
} from 'lucide-vue-next';

const users = ref<User[]>([]);
const groups = ref<Group[]>([]);
const loading = ref(false);

const searchQuery = ref('');
const activeTab = ref<'ACTIVE' | 'ARCHIVE'>('ACTIVE');
const selectedGroupFilter = ref<string>('ALL');
const viewMode = ref<'grid' | 'list'>('grid');

// Pagination
const currentPage = ref(1);
const itemsPerPage = 12;

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

function getGroupBadgeClass(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('fe') || lower.includes('vue')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (lower.includes('be') || lower.includes('nest')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (lower.includes('ielts')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (lower.includes('ds') || lower.includes('ai') || lower.includes('python')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (lower.includes('ui') || lower.includes('figma')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

const filteredTeachers = computed(() => {
  return teachersList.value.filter((t) => {
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

const activeTeachersCount = computed(() => teachersList.value.filter((t) => t.status !== 'ARCHIVED').length);
const archiveCount = computed(() => teachersList.value.filter((t) => t.status === 'ARCHIVED').length);

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTeachers.value.length / itemsPerPage)));
const paginatedTeachers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredTeachers.value.slice(start, start + itemsPerPage);
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
  <div class="space-y-5">
    <!-- ================= TOP ACTION BAR ================= -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <!-- Title & Live Counter -->
      <div class="flex items-center gap-3">
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          O'qituvchilar & Mentorlar
        </h1>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
          {{ filteredTeachers.length }} nafar
        </span>
      </div>

      <!-- Controls: Search, View Mode, Status Tab, Add Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Search -->
        <div class="relative w-44 sm:w-56">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Qidiruv..."
            class="w-full pl-8.5 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 placeholder:text-slate-400 transition"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X class="h-3 w-3" />
          </button>
        </div>

        <!-- View Mode Switcher: Grid / List -->
        <div class="inline-flex p-0.5 bg-slate-100 rounded-xl">
          <button
            @click="viewMode = 'grid'"
            type="button"
            :class="viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Karta ko'rinishi"
          >
            <LayoutGrid class="h-3.5 w-3.5" />
          </button>
          <button
            @click="viewMode = 'list'"
            type="button"
            :class="viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400 hover:text-slate-700'"
            class="p-1.5 rounded-lg transition cursor-pointer"
            title="Ro'yxat ko'rinishi"
          >
            <List class="h-3.5 w-3.5" />
          </button>
        </div>

        <!-- Status Filter: Faol / Arxiv -->
        <div class="inline-flex p-0.5 bg-slate-100 rounded-xl text-xs">
          <button
            @click="activeTab = 'ACTIVE'"
            type="button"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer font-medium"
            :class="activeTab === 'ACTIVE' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
          >
            Faol ({{ activeTeachersCount }})
          </button>
          <button
            @click="activeTab = 'ARCHIVE'"
            type="button"
            class="px-2.5 py-1 rounded-lg transition cursor-pointer font-medium"
            :class="activeTab === 'ARCHIVE' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'"
          >
            Arxiv{{ archiveCount > 0 ? ` (${archiveCount})` : '' }}
          </button>
        </div>

        <!-- Add Button -->
        <button
          @click="openCreateModal"
          type="button"
          class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-2xs cursor-pointer active:scale-95"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Yangi o'qituvchi</span>
        </button>
      </div>
    </div>

    <!-- ================= QUICK GROUP FILTER CHIPS ================= -->
    <div v-if="availableGroups.length > 0" class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
      <button
        @click="selectedGroupFilter = 'ALL'"
        type="button"
        class="px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0"
        :class="selectedGroupFilter === 'ALL' ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'"
      >
        Barchasi
      </button>

      <button
        v-for="grp in availableGroups"
        :key="grp"
        @click="selectedGroupFilter = selectedGroupFilter === grp ? 'ALL' : grp"
        type="button"
        class="px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 border"
        :class="selectedGroupFilter === grp ? 'bg-slate-900 text-white border-slate-900 font-semibold' : 'bg-white text-slate-600 border-slate-200/80 hover:border-slate-300'"
      >
        {{ grp }}
      </button>
    </div>

    <!-- Active State Notice if Viewing Arxiv -->
    <div
      v-if="activeTab === 'ARCHIVE'"
      class="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center justify-between"
    >
      <div class="flex items-center gap-2">
        <Archive class="h-4 w-4 text-amber-600 shrink-0" />
        <span>Arxivlangan o'qituvchilar ko'rsatilmoqda.</span>
      </div>
      <button
        @click="activeTab = 'ACTIVE'"
        class="text-xs font-semibold text-amber-900 underline hover:no-underline cursor-pointer"
      >
        Faollarga qaytish
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="py-16 text-center text-xs text-slate-400">
      O'qituvchilar ma'lumotlari yuklanmoqda...
    </div>

    <!-- Empty State -->
    <div v-else-if="paginatedTeachers.length === 0" class="py-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
      {{ activeTab === 'ARCHIVE' ? "Arxivda o'qituvchilar mavjud emas." : "O'qituvchilar topilmadi." }}
    </div>

    <!-- ================= VIEW MODE 1: SLIMMER & TALLER PORTRAIT CARDS ================= -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5"
    >
      <div
        v-for="t in paginatedTeachers"
        :key="t.id"
        class="group bg-white rounded-3xl border border-slate-200/90 hover:border-slate-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
      >
        <!-- 1. TALL PORTRAIT PHOTO SECTION (Significantly taller height) -->
        <div class="relative h-110 sm:h-120 w-full overflow-hidden bg-slate-100">
          <img
            :src="getTeacherPhoto(t)"
            :alt="`${t.firstName} ${t.lastName}`"
            class="w-full h-full object-cover object-[center_top] group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          <!-- Smooth bottom gradient overlay -->
          <div class="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/25 to-transparent"></div>

          <!-- Top Pills: Specialty badge & Active dot -->
          <div class="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold backdrop-blur-md bg-slate-900/65 text-white border border-white/15 shadow-sm truncate max-w-[70%]">
              <Sparkles class="w-3 h-3 text-amber-400 shrink-0" />
              <span class="truncate">{{ getTeacherMeta(t).specialty.split('(')[0].trim() }}</span>
            </span>

            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold backdrop-blur-md shadow-sm shrink-0"
              :class="t.status === 'ARCHIVED' ? 'bg-amber-500/90 text-white' : 'bg-emerald-500/90 text-white'"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              {{ t.status === 'ARCHIVED' ? 'Arxiv' : 'Faol' }}
            </span>
          </div>

          <!-- Quick Action Buttons (Glass style) -->
          <div class="absolute top-3.5 right-3.5 flex items-center gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              @click.stop="openEditModal(t)"
              type="button"
              class="p-1.5 rounded-xl backdrop-blur-md bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 shadow-md transition cursor-pointer"
              title="Tahrirlash"
            >
              <Edit2 class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="activeTab === 'ACTIVE'"
              @click.stop="handleArchiveTeacher(t)"
              type="button"
              class="p-1.5 rounded-xl backdrop-blur-md bg-white/90 hover:bg-rose-50 text-slate-700 hover:text-rose-600 shadow-md transition cursor-pointer"
              title="Arxivlash"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
            <button
              v-else
              @click.stop="handleRestoreTeacher(t)"
              type="button"
              class="p-1.5 rounded-xl backdrop-blur-md bg-white/90 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 shadow-md transition cursor-pointer"
              title="Qayta tiklash"
            >
              <RotateCcw class="w-3.5 h-3.5" />
            </button>
          </div>

          <!-- Name & Role on bottom of photo -->
          <div class="absolute bottom-3.5 left-4 right-4 text-white">
            <h3 class="text-lg sm:text-xl font-bold tracking-tight drop-shadow-sm truncate">
              {{ t.firstName }} {{ t.lastName }}
            </h3>
            <p class="text-[11px] text-slate-200/90 font-medium drop-shadow-sm mt-0.5 truncate">
              {{ getTeacherMeta(t).experience }}
            </p>
          </div>
        </div>

        <!-- 2. MINIMALIST CLEAN BODY -->
        <div class="p-4 sm:p-4.5 flex-1 flex flex-col justify-between space-y-3.5">
          <!-- Bio & Assigned Groups -->
          <div class="space-y-2.5">
            <p class="text-[11.5px] text-slate-500 leading-relaxed line-clamp-2">
              {{ getTeacherMeta(t).bio }}
            </p>

            <!-- Groups Pills -->
            <div v-if="getTeacherGroupsList(t.id).length > 0" class="flex flex-wrap gap-1 pt-0.5">
              <span
                v-for="grpName in getTeacherGroupsList(t.id)"
                :key="grpName"
                class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold border shadow-2xs"
                :class="getGroupBadgeClass(grpName)"
              >
                {{ grpName }}
              </span>
            </div>
            <div v-else class="text-[11px] text-slate-400 italic">
              Guruh biriktirilmagan
            </div>
          </div>

          <!-- Contact & Location -->
          <div class="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div class="flex items-center justify-between gap-2">
              <a
                :href="'tel:' + t.phone"
                class="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-slate-700 hover:text-indigo-600 transition truncate"
                title="Qo'ng'iroq qilish"
              >
                <Phone class="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{{ t.phone }}</span>
              </a>

              <a
                v-if="t.email"
                :href="'mailto:' + t.email"
                class="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-600 transition shrink-0"
                :title="t.email"
              >
                <Mail class="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            <div v-if="t.address" class="flex items-center gap-1.5 text-[10.5px] text-slate-400 truncate">
              <MapPin class="w-3 h-3 text-slate-400 shrink-0" />
              <span class="truncate">{{ t.address }}</span>
            </div>
          </div>

          <!-- Clean Primary Action Button -->
          <div class="pt-1">
            <router-link
              :to="'/dashboard/users/' + t.id"
              class="w-full py-2 px-3.5 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-semibold text-xs transition duration-200 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer group-hover:bg-indigo-600"
            >
              <span>360° Profil</span>
              <ArrowRight class="w-3.5 h-3.5" />
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= VIEW MODE 2: CLEAN COMPACT TABLE ================= -->
    <div
      v-else
      class="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th class="py-3 px-4">O'qituvchi</th>
              <th class="py-3 px-4">Mutaxassislik</th>
              <th class="py-3 px-4">Guruhlar</th>
              <th class="py-3 px-4">Aloqa</th>
              <th class="py-3 px-4">Holat</th>
              <th class="py-3 px-4 text-right">Amallar</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 text-slate-700">
            <tr
              v-for="t in paginatedTeachers"
              :key="t.id"
              class="hover:bg-slate-50/60 transition group"
            >
              <!-- Name & Photo -->
              <td class="py-3 px-4">
                <router-link
                  :to="'/dashboard/users/' + t.id"
                  class="flex items-center gap-3"
                >
                  <img
                    :src="getTeacherPhoto(t)"
                    :alt="t.firstName"
                    class="h-9 w-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0"
                    loading="lazy"
                  />
                  <div>
                    <div class="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {{ t.firstName }} {{ t.lastName }}
                    </div>
                    <div v-if="t.email" class="text-[11px] text-slate-400">
                      {{ t.email }}
                    </div>
                  </div>
                </router-link>
              </td>

              <!-- Specialty -->
              <td class="py-3 px-4 text-slate-600 font-medium">
                {{ getTeacherMeta(t).specialty }}
              </td>

              <!-- Groups -->
              <td class="py-3 px-4">
                <div v-if="getTeacherGroupsList(t.id).length > 0" class="flex flex-wrap gap-1">
                  <span
                    v-for="grpName in getTeacherGroupsList(t.id)"
                    :key="grpName"
                    class="px-2 py-0.5 rounded-md text-[10.5px] font-semibold border"
                    :class="getGroupBadgeClass(grpName)"
                  >
                    {{ grpName }}
                  </span>
                </div>
                <span v-else class="text-[11px] text-slate-400 italic">-</span>
              </td>

              <!-- Contact -->
              <td class="py-3 px-4 font-mono text-[11px] text-slate-600">
                <a :href="'tel:' + t.phone" class="hover:text-slate-950 transition">
                  {{ t.phone }}
                </a>
              </td>

              <!-- Status -->
              <td class="py-3 px-4">
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold"
                  :class="t.status === 'ARCHIVED' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="t.status === 'ARCHIVED' ? 'bg-amber-500' : 'bg-emerald-500'"
                  ></span>
                  {{ t.status === 'ARCHIVED' ? 'Arxivda' : 'Faol' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="flex items-center justify-end gap-1">
                  <template v-if="activeTab === 'ACTIVE'">
                    <router-link
                      :to="'/dashboard/users/' + t.id"
                      class="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                      title="Profil"
                    >
                      <ArrowUpRight class="h-3.5 w-3.5" />
                    </router-link>
                    <button
                      @click="openEditModal(t)"
                      type="button"
                      class="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      title="Tahrirlash"
                    >
                      <Edit2 class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="handleArchiveTeacher(t)"
                      type="button"
                      class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Arxivlash"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </template>
                  <template v-else>
                    <button
                      @click="handleRestoreTeacher(t)"
                      type="button"
                      class="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                      title="Tiklash"
                    >
                      <RotateCcw class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="handlePermanentDelete(t)"
                      type="button"
                      class="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </template>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ================= MINIMALIST PAGINATION ================= -->
    <div v-if="totalPages > 1" class="pt-2 flex items-center justify-between text-xs text-slate-500">
      <button
        @click="currentPage = Math.max(1, currentPage - 1)"
        :disabled="currentPage === 1"
        class="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
      >
        Oldingi
      </button>

      <div class="flex items-center gap-1">
        <button
          v-for="p in totalPages"
          :key="p"
          @click="currentPage = p"
          class="h-6.5 w-6.5 rounded-lg text-xs font-semibold flex items-center justify-center transition cursor-pointer"
          :class="currentPage === p ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'"
        >
          {{ p }}
        </button>
      </div>

      <button
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="px-3 py-1 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
      >
        Keyingi
      </button>
    </div>

    <!-- ================= MINIMALIST SAAS MODAL: YANGI O'QITUVCHI ================= -->
    <Modal
      :show="showCreateModal"
      title="Yangi O'qituvchi"
      max-width="md"
      @close="showCreateModal = false"
    >
      <form @submit.prevent="handleCreateTeacher" class="space-y-3.5">
        <div v-if="formError" class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
          {{ formError }}
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Ism *</label>
            <input
              v-model="formFirstName"
              type="text"
              required
              placeholder="Rustam"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Familiya *</label>
            <input
              v-model="formLastName"
              type="text"
              required
              placeholder="Qodirov"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Telefon *</label>
            <input
              v-model="formPhone"
              type="text"
              required
              placeholder="+998901234567"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition font-mono"
            />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
            <input
              v-model="formEmail"
              type="email"
              placeholder="teacher@nyver.uz"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Manzil</label>
          <input
            v-model="formAddress"
            type="text"
            placeholder="Toshkent sh., Yunusobod tumani"
            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          />
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Dastlabki Parol</label>
          <input
            v-model="formPassword"
            type="text"
            placeholder="123456"
            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition font-mono"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showCreateModal = false"
            type="button"
            class="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>

    <!-- ================= MINIMALIST SAAS MODAL: O'QITUVCHINI TAHRIRLASH ================= -->
    <Modal
      :show="showEditModal"
      title="O'qituvchini Tahrirlash"
      max-width="md"
      @close="showEditModal = false"
    >
      <form @submit.prevent="handleEditTeacher" class="space-y-3.5">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Ism *</label>
            <input
              v-model="editFirstName"
              type="text"
              required
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Familiya *</label>
            <input
              v-model="editLastName"
              type="text"
              required
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Telefon *</label>
            <input
              v-model="editPhone"
              type="text"
              required
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition font-mono"
            />
          </div>
          <div>
            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Email</label>
            <input
              v-model="editEmail"
              type="email"
              class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
            />
          </div>
        </div>

        <div>
          <label class="block text-[11px] font-semibold text-slate-600 mb-1">Manzil</label>
          <input
            v-model="editAddress"
            type="text"
            class="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition"
          />
        </div>

        <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            @click="showEditModal = false"
            type="button"
            class="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition shadow-2xs cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {{ isSubmitting ? 'Saqlanmoqda...' : 'Saqlash' }}
          </button>
        </div>
      </form>
    </Modal>
  </div>
</template>
