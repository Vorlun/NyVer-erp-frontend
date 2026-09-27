<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import {
  Layers,
  CalendarCheck,
  BookOpenCheck,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Plus,
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  X,
  Menu,
  Check,
  Clock,
  Archive,
} from 'lucide-vue-next';
import nyverLogo from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();

// Sidebar States
const mobileSidebarOpen = ref(false);
const submenuOpen = ref(false); // "Menu" secondary drawer (Boshqarish subpanel)
const sidebarCollapsed = ref(false); // Collapsed icon-only mode toggle

// Header dropdown states
const showCalendarMenu = ref(false);
const showQuickAddMenu = ref(false);
const showLanguageMenu = ref(false);
const showNotificationMenu = ref(false);
const showProfileMenu = ref(false);
const isDarkMode = ref(false);
const searchQuery = ref('');
const currentLang = ref('UZ');

// Close dropdowns on outside click
function onDocumentClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.dropdown-container')) {
    showCalendarMenu.value = false;
    showQuickAddMenu.value = false;
    showLanguageMenu.value = false;
    showNotificationMenu.value = false;
    showProfileMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  notificationsStore.connectWebSocket('TEACHER', authStore.user?.id);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  notificationsStore.disconnectWebSocket();
});

// Primary Navigation Items
const mainNavItems = [
  {
    id: 'groups',
    label: 'Guruhlar',
    icon: Layers,
    to: '/teacher/dashboard',
    checkActive: () => route.path === '/teacher/dashboard' && (!route.query.tab || route.query.tab === 'groups'),
  },
  {
    id: 'attendance',
    label: 'Davomat',
    icon: CalendarCheck,
    to: '/teacher/attendance',
    checkActive: () => route.path === '/teacher/attendance',
  },
  {
    id: 'homework',
    label: 'Uy vazifalari',
    icon: BookOpenCheck,
    to: '/teacher/homework',
    checkActive: () => route.path === '/teacher/homework',
  },
];

// Submenu Items (Boshqarish - navigates to sections directly)
const submenuItems = [
  {
    id: 'active-groups',
    label: 'Faol Guruhlar',
    icon: Layers,
    to: '/teacher/dashboard?tab=groups',
    action: () => {
      router.push('/teacher/dashboard?tab=groups');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path === '/teacher/dashboard' && (!route.query.tab || route.query.tab === 'groups'),
  },
  {
    id: 'upcoming-groups',
    label: 'Yig\'ilayotgan Guruhlar',
    icon: Clock,
    to: '/teacher/dashboard?tab=upcoming',
    action: () => {
      router.push('/teacher/dashboard?tab=upcoming');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path === '/teacher/dashboard' && route.query.tab === 'upcoming',
  },
  {
    id: 'archive-groups',
    label: 'Guruhlar Arxivi',
    icon: Archive,
    to: '/teacher/dashboard?tab=archive',
    action: () => {
      router.push('/teacher/dashboard?tab=archive');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path === '/teacher/dashboard' && route.query.tab === 'archive',
  },
  {
    id: 'take-attendance',
    label: 'Davomat Qilish',
    icon: CalendarCheck,
    to: '/teacher/attendance',
    action: () => {
      router.push('/teacher/attendance');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path === '/teacher/attendance',
  },
  {
    id: 'check-homework',
    label: 'Vazifalarni Tekshirish',
    icon: BookOpenCheck,
    to: '/teacher/homework',
    action: () => {
      router.push('/teacher/homework');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path === '/teacher/homework',
  },
];

function isMainItemActive(item: any): boolean {
  if (submenuOpen.value) {
    return false;
  }
  if (item.checkActive) {
    return item.checkActive();
  }
  return route.path === item.to;
}

function toggleSubmenu() {
  submenuOpen.value = !submenuOpen.value;
}

function closeSubmenu() {
  submenuOpen.value = false;
}

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleLogout() {
  authStore.logout();
  router.push('/');
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex overflow-x-hidden font-sans text-slate-800">
    <!-- Dark Backdrop for 2nd Sidebar Flyout Drawer -->
    <div
      v-if="submenuOpen"
      class="fixed inset-0 bg-slate-900/40 z-40 transition-opacity backdrop-blur-xs cursor-pointer"
      @click="closeSubmenu"
    ></div>

    <!-- ================= DESKTOP SIDEBAR AREA ================= -->
    <aside
      class="hidden lg:flex select-none z-50 shrink-0 relative transition-all duration-300"
      :class="sidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- 1. PRIMARY SIDEBAR (Overflow visible so toggle button and tooltips render outside cleanly) -->
      <div
        class="w-full bg-white border-r border-slate-200/80 rounded-tr-3xl rounded-br-3xl flex flex-col justify-between min-h-screen relative z-40 shadow-none transition-all duration-300 overflow-visible"
      >
        <!-- 50% Overlapping Collapse Toggle Button (Purple square button with white chevron) -->
        <button
          @click="toggleSidebarCollapse"
          type="button"
          class="absolute -right-3.5 top-6 h-7.5 w-7.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white flex items-center justify-center shadow-md cursor-pointer z-50 transition-all hover:scale-105 active:scale-95 shrink-0 border-2 border-white"
          :title="sidebarCollapsed ? 'Sidebar ochish' : 'Sidebar yopish'"
        >
          <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" />
          <ChevronLeft v-else class="h-4 w-4" />
        </button>

        <!-- Top Section: Logo & Nav -->
        <div class="overflow-visible">
          <!-- Logo Header with inset bottom border line that does not reach the ends -->
          <div
            class="relative h-20 flex items-center transition-all duration-300"
            :class="sidebarCollapsed ? 'justify-center px-2' : 'px-4.5'"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <img :src="nyverLogo" alt="NyVer" class="h-11 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div v-if="!sidebarCollapsed" class="min-w-0 transition-opacity">
                <span class="text-lg font-black tracking-tight text-slate-900 block truncate leading-tight">
                  NyVer<span class="text-[#6D28D9]">Edu</span>
                </span>
                <span class="text-[11px] font-bold text-slate-400 block uppercase tracking-wider mt-0.5">
                  Ustoz Paneli
                </span>
              </div>
            </div>
            <!-- Inset border line under logo (oxirigacha yetmagan) -->
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-200/80"></div>
          </div>

          <!-- Main Nav Links with Hover Pointer Tooltips -->
          <div class="px-3.5 py-3 space-y-2">
            <div
              v-for="item in mainNavItems"
              :key="item.id"
              class="relative group"
            >
              <router-link
                :to="item.to"
                @click="closeSubmenu()"
                class="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200 cursor-pointer"
                :class="[
                  isMainItemActive(item)
                    ? 'bg-violet-50 text-[#6D28D9] border border-violet-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : '',
                ]"
              >
                <component
                  :is="item.icon"
                  class="h-5 w-5 shrink-0 transition-colors"
                  :class="isMainItemActive(item) ? 'text-[#6D28D9]' : 'text-slate-400 group-hover:text-slate-600'"
                />
                <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
              </router-link>

              <!-- Pointer Arrow Tooltip appearing on hover outside to the right -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 z-100 flex items-center gap-1.5"
              >
                <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>

            <!-- Boshqarish Item (Activates / Toggles the secondary "Menu" drawer) -->
            <div class="relative group">
              <button
                @click="toggleSubmenu"
                type="button"
                class="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200 cursor-pointer text-left"
                :class="[
                  submenuOpen
                    ? 'bg-violet-50 text-[#6D28D9] border border-violet-200/70 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : '',
                ]"
              >
                <Settings class="h-5 w-5 shrink-0" />
                <span v-if="!sidebarCollapsed" class="truncate">Boshqarish</span>
              </button>

              <!-- Pointer Arrow Tooltip for Boshqarish on hover -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 z-100 flex items-center gap-1.5"
              >
                <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                <span>Boshqarish</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Card: Mentor Status & Logout -->
        <div class="p-3.5">
          <div
            v-if="!sidebarCollapsed"
            class="rounded-2xl p-3.5 bg-indigo-50/70 border border-indigo-200/60 shadow-2xs text-left mb-2"
          >
            <div class="flex items-center gap-2.5">
              <div class="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {{ authStore.user?.firstName?.charAt(0) || 'U' }}
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-slate-900 block truncate leading-tight">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </span>
                <span class="text-[10px] text-indigo-700 font-semibold">O'qituvchi</span>
              </div>
            </div>
          </div>

          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut class="h-4 w-4" />
            <span v-if="!sidebarCollapsed">Chiqish</span>
          </button>
        </div>
      </div>

      <!-- 2. SECONDARY FLYOUT DRAWER PANEL (Fast exit sliding left) -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-x-full"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 -translate-x-full"
      >
        <div
          v-if="submenuOpen"
          class="absolute top-0 bottom-0 min-h-screen w-64 bg-white border-r border-slate-200/90 rounded-tr-3xl rounded-br-3xl flex flex-col z-10 shadow-none transition-[left] duration-300 overflow-visible"
          :class="sidebarCollapsed ? 'left-20' : 'left-64'"
        >
          <!-- Submenu Header: Title "Menu" with inset border that does not reach the ends -->
          <div class="relative h-17.5 flex items-center px-5">
            <h3 class="text-base font-extrabold text-slate-900">Menu</h3>
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-200/80"></div>
          </div>

          <!-- Submenu Items with matching styles, hovers, active, and tooltips -->
          <div class="px-3.5 py-3 space-y-2 flex-1 overflow-visible">
            <div
              v-for="item in submenuItems"
              :key="item.id"
              class="relative group"
            >
              <button
                @click="item.action ? item.action() : null"
                type="button"
                class="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200 cursor-pointer text-left"
                :class="[
                  item.checkActive && item.checkActive()
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
                ]"
              >
                <component :is="item.icon" class="h-5 w-5 shrink-0" />
                <span class="truncate">{{ item.label }}</span>
              </button>

              <!-- Pointer Tooltip on hover (appears outside to the right) -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 z-100 flex items-center gap-1.5"
              >
                <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </aside>

    <!-- ================= MOBILE SIDEBAR ================= -->
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 z-50 lg:hidden bg-slate-900/50 backdrop-blur-xs"
      @click="mobileSidebarOpen = false"
    >
      <div
        class="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col justify-between p-4 overflow-y-auto"
        @click.stop
      >
        <div>
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-3">
              <img :src="nyverLogo" alt="NyVer" class="h-11 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div>
                <span class="font-extrabold text-slate-900 leading-tight block text-base">NyVer Academy</span>
                <span class="text-[11px] text-emerald-600 font-semibold uppercase">Ustoz Kabineti</span>
              </div>
            </div>
            <button @click="mobileSidebarOpen = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="py-4 space-y-2">
            <router-link
              v-for="item in mainNavItems"
              :key="item.id"
              :to="item.to"
              @click="mobileSidebarOpen = false"
              class="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200"
              :class="[
                isMainItemActive(item)
                  ? 'bg-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100',
              ]"
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" />
              <span>{{ item.label }}</span>
            </router-link>
          </div>
        </div>

        <button
          @click="handleLogout"
          class="w-full flex items-center justify-center gap-2.5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
        >
          <LogOut class="h-4.5 w-4.5" />
          Tizimdan Chiqish
        </button>
      </div>
    </div>

    <!-- ================= MAIN CONTENT AREA ================= -->
    <div class="flex-1 flex flex-col min-w-0 min-h-screen overflow-y-auto">
      <!-- Top Header (Matching Image 3 - Enlarged) -->
      <header
        class="h-17.5 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs"
      >
        <!-- LEFT: Mobile Menu + Calendar + "+ Qo'shish" + Search Bar -->
        <div class="flex items-center gap-3 sm:gap-3.5 flex-1 max-w-xl">
          <!-- Mobile Menu trigger (lg:hidden) -->
          <button
            @click="mobileSidebarOpen = true"
            type="button"
            class="h-10 w-10 rounded-xl border border-slate-200 lg:hidden text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
          >
            <Menu class="h-5 w-5" />
          </button>

          <!-- Calendar Button -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showCalendarMenu = !showCalendarMenu; showQuickAddMenu = false; showLanguageMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-10 w-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Dars jadvali & sana"
            >
              <Calendar class="h-5 w-5 text-slate-700" />
            </button>

            <!-- Calendar Popover -->
            <div
              v-if="showCalendarMenu"
              class="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 text-left"
            >
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span class="text-xs font-bold text-slate-800">Ustoz Jadvali</span>
                <span class="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">Bugun</span>
              </div>
              <div class="py-2.5 text-xs text-slate-600 space-y-1.5">
                <div class="font-bold text-slate-900 text-sm">
                  {{ new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                </div>
                <div class="flex items-center gap-1.5 text-slate-500">
                  <Clock class="h-4 w-4 text-emerald-600" />
                  <span>Bugungi darslar: 2 ta guruh (09:30, 16:00)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- "+ Qo'shish" Dropdown Button -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showQuickAddMenu = !showQuickAddMenu; showCalendarMenu = false; showLanguageMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9 px-3.5 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus class="h-4 w-4" />
              <span>Qo'shish</span>
              <ChevronDown class="h-3 w-3 opacity-80" />
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showQuickAddMenu"
              class="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left"
            >
              <button
                @click="router.push('/teacher/homework'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>Yangi vazifa berish</span>
              </button>
              <button
                @click="router.push('/teacher/attendance'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>Davomat qilish</span>
              </button>
            </div>
          </div>

          <!-- Search Input: "Qidirish..." -->
          <div class="relative w-full max-w-sm hidden sm:block">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search class="h-4.5 w-4.5" />
            </div>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Qidirish..."
              class="w-full h-10 pl-10 pr-4 text-sm bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        <!-- RIGHT: Language + Bell + Moon + Teacher Avatar initial "T" (Image 3) -->
        <div class="flex items-center gap-2.5 sm:gap-3.5">
          <!-- Language Selector (2-letter codes: UZ / RU / EN) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showLanguageMenu = !showLanguageMenu; showCalendarMenu = false; showQuickAddMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9 inline-flex items-center gap-1.5 px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs bg-white"
              title="Tilni tanlash"
            >
              <span class="tracking-wider font-mono">{{ currentLang }}</span>
              <ChevronDown class="h-3 w-3 text-slate-400" />
            </button>

            <div
              v-if="showLanguageMenu"
              class="absolute right-0 mt-2 w-38 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-1.5 z-50 text-left text-xs"
            >
              <button
                v-for="lang in [
                  { code: 'UZ', label: 'O\'zbekcha' },
                  { code: 'RU', label: 'Русский' },
                  { code: 'EN', label: 'English' }
                ]"
                :key="lang.code"
                @click="currentLang = lang.code; showLanguageMenu = false;"
                class="w-full flex items-center justify-between px-3.5 py-2 hover:bg-violet-50 hover:text-[#6D28D9] transition cursor-pointer font-semibold"
                :class="currentLang === lang.code ? 'text-[#6D28D9] bg-violet-50/60 font-bold' : 'text-slate-700'"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 font-mono font-bold">{{ lang.code }}</span>
                  <span class="text-slate-500 font-normal">{{ lang.label }}</span>
                </div>
                <Check v-if="currentLang === lang.code" class="h-3.5 w-3.5 text-[#6D28D9]" />
              </button>
            </div>
          </div>

          <!-- Notification Bell -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showNotificationMenu = !showNotificationMenu; showCalendarMenu = false; showQuickAddMenu = false; showLanguageMenu = false; showProfileMenu = false;"
              type="button"
              class="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer"
              title="Bildirishnomalar"
            >
              <Bell class="h-5 w-5" />
              <span
                v-if="notificationsStore.teacherUnreadCount > 0"
                class="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white"
              >
                {{ notificationsStore.teacherUnreadCount }}
              </span>
            </button>

            <!-- Notification Dropdown -->
            <div
              v-if="showNotificationMenu"
              class="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 text-left text-xs space-y-3"
            >
              <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                <span class="font-bold text-slate-900 text-sm">Bildirishnomalar</span>
                <button
                  v-if="notificationsStore.teacherUnreadCount > 0"
                  @click="notificationsStore.markAllAsRead"
                  type="button"
                  class="text-[11px] text-[#6D28D9] font-bold hover:underline cursor-pointer"
                >
                  O'qilgan deb belgilash
                </button>
              </div>

              <div class="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                <div
                  v-if="notificationsStore.teacherNotifications.length === 0"
                  class="py-6 text-center text-slate-400"
                >
                  Yangi bildirishnomalar yo'q
                </div>
                <div
                  v-for="n in notificationsStore.teacherNotifications.slice(0, 6)"
                  :key="n.id"
                  @click="notificationsStore.markAsRead(n.id)"
                  class="p-2.5 rounded-xl border transition cursor-pointer"
                  :class="!n.read ? 'bg-violet-50/60 border-violet-100' : 'bg-white border-slate-100'"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-bold text-slate-900 truncate">{{ n.title }}</span>
                    <span class="text-[10px] text-slate-400 font-mono">
                      {{ new Date(n.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) }}
                    </span>
                  </div>
                  <p class="text-slate-600 line-clamp-2 leading-relaxed">{{ n.message }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Dark Mode Toggle -->
          <button
            @click="isDarkMode = !isDarkMode"
            type="button"
            class="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer"
          >
            <Sun v-if="isDarkMode" class="h-5 w-5 text-amber-500" />
            <Moon v-else class="h-5 w-5" />
          </button>

          <!-- Teacher Profile Avatar Initial "T" (Image 3) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showProfileMenu = !showProfileMenu; showCalendarMenu = false; showQuickAddMenu = false; showLanguageMenu = false; showNotificationMenu = false;"
              type="button"
              class="h-9 w-9 rounded-xl bg-violet-100 text-[#6D28D9] border border-violet-200 text-xs font-black flex items-center justify-center shadow-2xs cursor-pointer hover:bg-violet-200/70 transition"
              title="Profil menyusi"
            >
              {{ authStore.user?.firstName?.charAt(0) || 'T' }}
            </button>

            <div
              v-if="showProfileMenu"
              class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 text-left"
            >
              <div class="px-4 py-2.5 border-b border-slate-100">
                <p class="text-sm font-bold text-slate-800 truncate">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </p>
                <span class="text-xs text-emerald-600 font-semibold uppercase mt-0.5 block">O'qituvchi</span>
              </div>
              <button
                @click="handleLogout"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold"
              >
                <LogOut class="h-4 w-4" />
                <span>Tizimdan Chiqish</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <router-view></router-view>
      </main>
    </div>
  </div>
</template>
