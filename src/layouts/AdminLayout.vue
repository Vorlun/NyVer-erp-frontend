<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import {
  Home,
  Layers,
  GraduationCap,
  Gift,
  Settings,
  Users,
  BookOpen,
  DoorOpen,
  Send,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  Menu,
  Check,
  Contact,
  CreditCard,
  User as UserIcon,
  Calendar,
  Plus,
  Gem,
  CircleDollarSign,
} from 'lucide-vue-next';
import nyverLogo from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();

// Sidebar States
const mobileSidebarOpen = ref(false);
const sidebarCollapsed = ref(false);
const submenuOpen = ref(false);

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function toggleSubmenu() {
  submenuOpen.value = !submenuOpen.value;
  if (submenuOpen.value) {
    showCalendarMenu.value = false;
    showQuickAddMenu.value = false;
    showLanguageMenu.value = false;
    showNotificationMenu.value = false;
    showProfileMenu.value = false;
  }
}

function closeSubmenu() {
  submenuOpen.value = false;
}

const isManagementActive = computed(() => {
  return route.path.startsWith('/management');
});

// Header Dropdown States
const showCalendarMenu = ref(false);
const showQuickAddMenu = ref(false);
const showLanguageMenu = ref(false);
const showNotificationMenu = ref(false);
const showProfileMenu = ref(false);
const isDarkMode = ref(false);
const searchQuery = ref('');
const currentLang = ref('O\'zbekcha');

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
  // Connect WebSocket with admin role
  notificationsStore.connectWebSocket('ADMIN', authStore.user?.id);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  notificationsStore.disconnectWebSocket();
});

// Primary Navigation Items (Matching user screenshot: Asosiy, O'qituvchilar, Guruhlar, Talabalar, Sovg'alar, Boshqarish)
const mainNavItems = [
  {
    id: 'dashboard',
    label: 'Asosiy',
    icon: Home,
    to: '/dashboard',
    exact: true,
  },
  {
    id: 'teachers',
    label: 'O\'qituvchilar',
    icon: UserIcon,
    to: '/dashboard/teachers',
    checkActive: () => route.path.includes('/teachers') || (route.path === '/admin/users' && route.query.role === 'TEACHER'),
  },
  {
    id: 'groups',
    label: 'Guruhlar',
    icon: Users,
    to: '/dashboard/groups',
    checkActive: () => route.path.startsWith('/dashboard/groups') || route.path.startsWith('/admin/groups'),
  },
  {
    id: 'students',
    label: 'Talabalar',
    icon: Gem,
    to: '/dashboard/students',
    checkActive: () => route.path.startsWith('/dashboard/students') || (route.path === '/admin/users' && route.query.role === 'STUDENT'),
  },
  {
    id: 'gifts',
    label: 'Sovg\'alar',
    icon: Gift,
    to: '/dashboard/gifts',
    checkActive: () => route.path.startsWith('/dashboard/gifts') || route.path.startsWith('/admin/prizes'),
  },
];

// Submenu Items for 2nd Sidebar Flyout Drawer ("Menu") matching user screenshot
const submenuItems = [
  {
    id: 'courses',
    label: 'Kurslar',
    icon: BookOpen,
    to: '/management/course',
    action: () => {
      router.push('/management/course');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path.startsWith('/management/course'),
  },
  {
    id: 'rooms',
    label: 'Xonalar',
    icon: DoorOpen,
    to: '/management/rooms',
    action: () => {
      router.push('/management/rooms');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path.startsWith('/management/rooms'),
  },
  {
    id: 'staff',
    label: 'Hodimlar',
    icon: Contact,
    to: '/management/staff',
    action: () => {
      router.push('/management/staff');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path.startsWith('/management/staff'),
  },
  {
    id: 'coins',
    label: 'Coin',
    icon: CircleDollarSign,
    to: '/management/coins',
    action: () => {
      router.push('/management/coins');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path.startsWith('/management/coins') || (route.path === '/admin/users' && route.query.tab === 'coins'),
  },
  {
    id: 'broadcast',
    label: 'Xabar Yuborish',
    icon: Send,
    to: '/management/broadcast',
    action: () => {
      router.push('/management/broadcast');
      closeSubmenu();
      mobileSidebarOpen.value = false;
    },
    checkActive: () => route.path.startsWith('/management/broadcast'),
  },
];

function isMainItemActive(item: any): boolean {
  if (submenuOpen.value) {
    return false;
  }
  if (isManagementActive.value) {
    return false;
  }
  if (item.checkActive) {
    return item.checkActive();
  }
  if (item.exact) {
    return (route.path === item.to || route.path === '/admin/dashboard') && !route.query.role;
  }
  return route.path.startsWith(item.to);
}

// Search submit
function handleSearch() {
  if (!searchQuery.value.trim()) return;
  router.push({
    path: '/admin/users',
    query: { search: searchQuery.value.trim() },
  });
}

function handleLogout() {
  authStore.logout();
  router.push('/');
}
</script>

<template>
  <div class="h-screen bg-slate-50 flex font-sans text-slate-800 overflow-hidden relative">

    <!-- Darkened Backdrop Overlay when 2nd Sidebar is open (Prevents editing, darkens bg, click to close) -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="submenuOpen"
        @click="closeSubmenu"
        class="fixed inset-0 bg-slate-950/35 backdrop-blur-[1.5px] z-30 cursor-pointer hidden lg:block"
        title="Menyuni yopish"
      ></div>
    </Transition>

    <!-- ================= DESKTOP SIDEBAR AREA ================= -->
    <aside
      class="hidden lg:flex select-none z-50 shrink-0 relative transition-all duration-300 overflow-visible"
      :class="sidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <!-- 1. PRIMARY SIDEBAR (Overflow visible so toggle button and tooltips render outside cleanly) -->
      <div
        class="w-full bg-white border-r border-slate-200/80 rounded-tr-3xl rounded-br-3xl flex flex-col justify-between h-screen relative z-40 shadow-none transition-all duration-300 overflow-visible"
      >
        <!-- 50% Overlapping Collapse Toggle Button (Purple square button matching user screenshot) -->
        <button
          @click="toggleSidebarCollapse"
          type="button"
          class="absolute -right-3.5 top-6 h-7 w-7 rounded-lg bg-[#6D28D9] hover:bg-[#5b21b6] text-white flex items-center justify-center shadow-lg shadow-purple-500/25 cursor-pointer z-50 transition-all hover:scale-105 active:scale-95 shrink-0 border border-white/40"
          :title="sidebarCollapsed ? 'Sidebar ochish' : 'Sidebar yopish'"
        >
          <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" />
          <ChevronLeft v-else class="h-4 w-4" />
        </button>

        <!-- Top Section: Logo & Nav -->
        <div class="overflow-visible">
          <!-- Logo Header with inset bottom border line (NyverEdu bold title) -->
          <div
            class="relative h-17.5 flex items-center transition-all duration-300 shrink-0"
            :class="sidebarCollapsed ? 'justify-center px-2' : 'px-4.5'"
          >
            <div class="flex items-center gap-2.5 overflow-hidden">
              <img :src="nyverLogo" alt="Nyver" class="h-9 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div v-if="!sidebarCollapsed" class="min-w-0 transition-opacity">
                <span class="text-lg font-black tracking-tight text-slate-900 block truncate leading-tight">
                  Nyver<span class="text-[#6D28D9]">Edu</span>
                </span>
              </div>
            </div>
            <!-- Inset border line under logo (oxirigacha yetmagan) -->
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-100"></div>
          </div>

          <!-- Main Nav Links with User Selection Style (Solid purple for active, dark slate for inactive) -->
          <div class="px-3.5 py-3 space-y-1.5 overflow-visible">
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
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : 'text-slate-800 hover:bg-slate-100/80 hover:text-slate-900',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : '',
                ]"
              >
                <component
                  :is="item.icon"
                  class="h-5 w-5 shrink-0 transition-colors"
                  :class="isMainItemActive(item) ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'"
                />
                <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
              </router-link>

              <!-- Pointer Arrow Tooltip appearing outside on hover (Cursor can enter and select text) -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 pl-2.5 z-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out -translate-x-1 group-hover:translate-x-0"
              >
                <div
                  class="relative px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap select-text flex items-center gap-1.5 cursor-default"
                >
                  <span
                    class="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900 pointer-events-none"
                  ></span>
                  <span class="select-text">{{ item.label }}</span>
                </div>
              </div>
            </div>

            <!-- Boshqarish Item (Activates / Toggles the secondary "Menu" drawer) -->
            <div class="relative group">
              <button
                @click="toggleSubmenu"
                type="button"
                class="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200 cursor-pointer text-left"
                :class="[
                  (submenuOpen || isManagementActive)
                    ? 'bg-[#6D28D9] text-white shadow-xs'
                    : 'text-slate-800 hover:bg-slate-100/80 hover:text-slate-900',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : '',
                ]"
              >
                <Settings
                  class="h-5 w-5 shrink-0 transition-colors"
                  :class="(submenuOpen || isManagementActive) ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'"
                />
                <span v-if="!sidebarCollapsed" class="truncate">Boshqarish</span>
              </button>

              <!-- Pointer Arrow Tooltip for Boshqarish on hover -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 pl-2.5 z-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out -translate-x-1 group-hover:translate-x-0"
              >
                <div
                  class="relative px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap select-text flex items-center gap-1.5 cursor-default"
                >
                  <span
                    class="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900 pointer-events-none"
                  ></span>
                  <span class="select-text">Boshqarish</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Area: Clean User Profile & Logout (No Obuna) -->
        <div class="p-3 shrink-0 border-t border-slate-100">
          <div
            v-if="!sidebarCollapsed"
            class="flex items-center justify-between gap-2 p-2 rounded-2xl hover:bg-slate-50 transition-colors"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="h-9 w-9 rounded-xl bg-[#6D28D9] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                {{ authStore.user?.firstName?.charAt(0) || 'A' }}
              </div>
              <div class="min-w-0">
                <span class="text-xs font-bold text-slate-900 block truncate leading-tight">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName || '' }}
                </span>
                <span class="text-[10px] text-slate-400 font-semibold block truncate leading-tight mt-0.5">
                  {{ authStore.user?.role || 'Admin' }}
                </span>
              </div>
            </div>
            <button
              @click="handleLogout"
              type="button"
              class="h-8 w-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
              title="Tizimdan chiqish"
            >
              <LogOut class="h-4.5 w-4.5" />
            </button>
          </div>

          <!-- Chiqish button for collapsed icon mode -->
          <button
            v-else
            @click="handleLogout"
            class="w-full flex items-center justify-center py-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Tizimdan chiqish"
          >
            <LogOut class="h-5 w-5" />
          </button>
        </div>
      </div>

      <!-- 2. SECONDARY FLYOUT DRAWER PANEL ("Menu" - Boshqarish) -->
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
          class="absolute top-0 bottom-0 h-screen w-64 bg-white border-r border-slate-200/90 rounded-tr-3xl rounded-br-3xl flex flex-col z-30 shadow-2xl shadow-slate-900/10 transition-[left] duration-300 overflow-visible"
          :class="sidebarCollapsed ? 'left-20' : 'left-64'"
        >
          <!-- Submenu Header: Title "Menu" with inset border line and close button -->
          <div class="relative h-17.5 flex items-center justify-between px-6 shrink-0">
            <h3 class="text-base font-extrabold text-slate-900">Menu</h3>
            <button
              @click="closeSubmenu"
              type="button"
              class="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              title="Menyuni yopish"
            >
              <X class="h-4 w-4" />
            </button>
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-100"></div>
          </div>

          <!-- Submenu Items: With hover pointer tooltips coming out on the right -->
          <div class="px-3.5 py-3 space-y-1.5 flex-1 overflow-visible">
            <div
              v-for="item in submenuItems"
              :key="item.id"
              class="relative group"
            >
              <button
                @click="item.action ? item.action() : closeSubmenu()"
                type="button"
                class="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200 cursor-pointer text-left"
                :class="[
                  item.checkActive && item.checkActive()
                    ? 'bg-violet-50 text-[#6D28D9] shadow-2xs font-extrabold'
                    : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900',
                ]"
              >
                <component
                  :is="item.icon"
                  class="h-5 w-5 shrink-0 transition-colors"
                  :class="item.checkActive && item.checkActive() ? 'text-[#6D28D9]' : 'text-slate-500 group-hover:text-[#6D28D9]'"
                />
                <span class="truncate">{{ item.label }}</span>
              </button>

              <!-- Pointer Arrow Tooltip appearing outside on hover (Cursor can enter and select text) -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 pl-2.5 z-100 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-150 ease-out -translate-x-1 group-hover:translate-x-0"
              >
                <div
                  class="relative px-3.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-2xl whitespace-nowrap select-text flex items-center gap-1.5 cursor-default"
                >
                  <span
                    class="absolute right-full top-1/2 -translate-y-1/2 border-y-[5px] border-y-transparent border-r-[6px] border-r-slate-900 pointer-events-none"
                  ></span>
                  <span class="select-text">{{ item.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>


    </aside>

    <!-- ================= MOBILE SIDEBAR DRAWER ================= -->
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
          <!-- Header -->
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <div class="flex items-center gap-2.5">
              <img :src="nyverLogo" alt="Nyver" class="h-9 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div>
                <span class="font-black text-slate-900 leading-tight block text-base">
                  Nyver<span class="text-[#6D28D9]">Edu</span>
                </span>
              </div>
            </div>
            <button
              @click="mobileSidebarOpen = false"
              class="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Mobile Nav Items -->
          <div class="py-4 space-y-2">
            <div class="px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Asosiy Bo'limlar
            </div>
            <router-link
              v-for="item in mainNavItems"
              :key="item.id"
              :to="item.to"
              @click="mobileSidebarOpen = false"
              class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-bold transition-all duration-150"
              :class="[
                isMainItemActive(item)
                  ? 'bg-[#6D28D9] text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900',
              ]"
            >
              <component
                :is="item.icon"
                class="h-5 w-5 shrink-0 transition-colors"
                :class="isMainItemActive(item) ? 'text-white' : 'text-slate-400'"
              />
              {{ item.label }}
            </router-link>

            <!-- Mobile Management Sections -->
            <div class="pt-2 px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              Boshqarish
            </div>
            <button
              v-for="sub in submenuItems"
              :key="sub.id"
              @click="sub.action ? sub.action() : null"
              class="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[14px] font-semibold transition-all duration-150 text-left cursor-pointer"
              :class="[
                sub.checkActive && sub.checkActive()
                  ? 'bg-[#6D28D9] text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900',
              ]"
            >
              <component
                :is="sub.icon"
                class="h-4.5 w-4.5 shrink-0 transition-colors"
                :class="sub.checkActive && sub.checkActive() ? 'text-white' : 'text-slate-400'"
              />
              {{ sub.label }}
            </button>
          </div>
        </div>

        <!-- Mobile Bottom Logout -->
        <div class="pt-4 border-t border-slate-100">
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2.5 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer transition-colors"
          >
            <LogOut class="h-4.5 w-4.5" />
            Tizimdan Chiqish
          </button>
        </div>
      </div>
    </div>

    <!-- ================= MAIN LAYOUT AREA ================= -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
      <!-- ================= TOP HEADER (Matching user screenshot: Calendar + "+ Qo'shish" + Search + Lang + Bell + Moon + Avatar) ================= -->
      <header
        class="h-17.5 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs shrink-0"
      >
        <!-- LEFT: Mobile Menu Toggle + Calendar Button + "+ Qo'shish" Button + Search Bar -->
        <div class="flex items-center gap-2.5 sm:gap-3 flex-1 max-w-2xl">
          <!-- Mobile Menu trigger (lg:hidden) -->
          <button
            @click="mobileSidebarOpen = true"
            type="button"
            class="h-9 w-9 rounded-xl border border-slate-200 bg-white lg:hidden text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0"
            title="Menyu"
          >
            <Menu class="h-5 w-5" />
          </button>

          <!-- Calendar Button (Matching screenshot) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showCalendarMenu = !showCalendarMenu; showQuickAddMenu = false; showLanguageMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9 w-9 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-700 transition cursor-pointer shrink-0 shadow-2xs"
              title="Dars jadvali & Sana"
            >
              <Calendar class="h-4.5 w-4.5 text-slate-700" />
            </button>

            <!-- Calendar Popover -->
            <div
              v-if="showCalendarMenu"
              class="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 text-left"
            >
              <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                <span class="text-xs font-bold text-slate-800">Taqvim</span>
                <span class="text-[10px] bg-violet-50 text-[#6D28D9] px-2 py-0.5 rounded-md font-semibold">Bugun</span>
              </div>
              <div class="py-2 text-xs text-slate-600">
                <div class="font-bold text-slate-900 text-sm">
                  {{ new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                </div>
              </div>
            </div>
          </div>

          <!-- "+ Qo'shish" Dropdown Button (Matching user screenshot: Purple button with plus and chevron) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showQuickAddMenu = !showQuickAddMenu; showCalendarMenu = false; showLanguageMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9.5 px-3.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 select-none active:scale-95"
            >
              <Plus class="h-4 w-4" />
              <span>Qo'shish</span>
              <ChevronDown class="h-3.5 w-3.5 opacity-80 transition-transform duration-200" :class="{ 'rotate-180': showQuickAddMenu }" />
            </button>

            <!-- Quick Add Popover -->
            <div
              v-if="showQuickAddMenu"
              class="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left text-xs"
            >
              <button
                @click="router.push('/dashboard/students'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-violet-50 hover:text-[#6D28D9] transition font-semibold text-slate-700 cursor-pointer"
              >
                <GraduationCap class="h-4 w-4 text-[#6D28D9]" />
                <span>Yangi talaba qo'shish</span>
              </button>
              <button
                @click="router.push('/dashboard/groups'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-violet-50 hover:text-[#6D28D9] transition font-semibold text-slate-700 cursor-pointer"
              >
                <Layers class="h-4 w-4 text-emerald-600" />
                <span>Yangi guruh ochish</span>
              </button>
              <button
                @click="router.push('/dashboard/payments'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-2.5 px-4 py-2 hover:bg-violet-50 hover:text-[#6D28D9] transition font-semibold text-slate-700 cursor-pointer"
              >
                <CreditCard class="h-4 w-4 text-amber-600" />
                <span>To'lov qabul qilish</span>
              </button>
            </div>
          </div>

          <!-- Search Input: "Qidirish..." (Matching user screenshot: white background, clean border) -->
          <div class="relative w-48 sm:w-64">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search class="h-4 w-4" />
            </div>
            <input
              v-model="searchQuery"
              @keydown.enter="handleSearch"
              type="text"
              placeholder="Qidirish..."
              class="w-full h-9 pl-9 pr-3 text-xs bg-white hover:bg-slate-50 focus:bg-white border border-slate-200/90 focus:border-[#6D28D9] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        <!-- RIGHT: Language selector "O'zbekcha" + Notifications Bell + Dark mode Toggle + User Profile Avatar -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <!-- Language Selector: "O'zbekcha" (Matching user screenshot) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showLanguageMenu = !showLanguageMenu; showCalendarMenu = false; showQuickAddMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9 inline-flex items-center gap-1.5 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition cursor-pointer border border-slate-200 bg-white shadow-2xs"
              title="Tilni tanlash"
            >
              <span>{{ currentLang }}</span>
              <ChevronDown class="h-3.5 w-3.5 text-slate-400 transition-transform duration-150" :class="{ 'rotate-180': showLanguageMenu }" />
            </button>

            <!-- Language Dropdown -->
            <div
              v-if="showLanguageMenu"
              class="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left text-xs"
            >
              <button
                v-for="lang in [
                  { label: 'O\'zbekcha' },
                  { label: 'Русский' },
                  { label: 'English' }
                ]"
                :key="lang.label"
                @click="currentLang = lang.label; showLanguageMenu = false;"
                class="w-full flex items-center justify-between px-4 py-2 hover:bg-violet-50 hover:text-[#6D28D9] transition cursor-pointer font-semibold"
                :class="currentLang === lang.label ? 'text-[#6D28D9] bg-violet-50/60 font-bold' : 'text-slate-700'"
              >
                <span>{{ lang.label }}</span>
                <Check v-if="currentLang === lang.label" class="h-3.5 w-3.5 text-[#6D28D9]" />
              </button>
            </div>
          </div>

          <!-- Notification Bell with red badge -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showNotificationMenu = !showNotificationMenu; showCalendarMenu = false; showQuickAddMenu = false; showLanguageMenu = false; showProfileMenu = false;"
              type="button"
              class="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 relative transition cursor-pointer"
              title="Bildirishnomalar"
            >
              <Bell class="h-4.5 w-4.5" />
              <span
                v-if="notificationsStore.unreadCount > 0"
                class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white"
              >
                {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
              </span>
            </button>

            <!-- Notifications Dropdown -->
            <div
              v-if="showNotificationMenu"
              class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4 z-50 text-left"
            >
              <div class="flex items-center justify-between pb-2.5 border-b border-slate-100">
                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  Bildirishnomalar
                  <span v-if="notificationsStore.unreadCount > 0" class="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-50 text-rose-600">
                    {{ notificationsStore.unreadCount }} ta
                  </span>
                </span>
                <button
                  @click="notificationsStore.markAllAsRead()"
                  type="button"
                  class="text-[11px] text-[#6D28D9] font-medium cursor-pointer hover:underline"
                >
                  O'qilgan deb belgilash
                </button>
              </div>

              <div class="divide-y divide-slate-100 py-1 text-xs max-h-72 overflow-y-auto">
                <div
                  v-for="notif in notificationsStore.recentNotifications.slice(0, 5)"
                  :key="notif.id"
                  @click="notificationsStore.markAsRead(notif.id)"
                  class="py-2 px-1 hover:bg-slate-50 rounded-lg cursor-pointer transition flex items-start gap-2.5"
                  :class="{ 'opacity-60': notif.read }"
                >
                  <span
                    class="h-2 w-2 rounded-full mt-1.5 shrink-0"
                    :class="notif.read ? 'bg-slate-300' : 'bg-[#6D28D9] ring-2 ring-violet-200'"
                  ></span>
                  <div class="flex-1 min-w-0">
                    <div class="font-bold text-slate-800 text-xs truncate">{{ notif.title }}</div>
                    <div class="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{{ notif.message }}</div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] text-slate-400">
                        {{ new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
                      </span>
                      <span
                        v-if="notif.priority === 'URGENT'"
                        class="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-700"
                      >
                        Shoshilinch
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="notificationsStore.recentNotifications.length === 0" class="py-5 text-center text-xs text-slate-400">
                  Bildirishnomalar mavjud emas
                </div>
              </div>

              <div class="pt-2 border-t border-slate-100">
                <router-link
                  to="/management/broadcast"
                  @click="showNotificationMenu = false"
                  class="text-[11px] text-[#6D28D9] hover:underline font-semibold block text-center"
                >
                  Barcha xabarlar va jo'natish &rarr;
                </router-link>
              </div>
            </div>
          </div>

          <!-- Dark Mode Toggle (Matching screenshot: Moon icon) -->
          <button
            @click="isDarkMode = !isDarkMode"
            type="button"
            class="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer"
            title="Tungi rejim"
          >
            <Sun v-if="isDarkMode" class="h-4.5 w-4.5 text-amber-500" />
            <Moon v-else class="h-4.5 w-4.5" />
          </button>

          <!-- User Profile Avatar (Matching screenshot: purple circle with letter 'S') -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showProfileMenu = !showProfileMenu; showCalendarMenu = false; showQuickAddMenu = false; showLanguageMenu = false; showNotificationMenu = false;"
              type="button"
              class="h-8.5 w-8.5 rounded-full bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-black flex items-center justify-center shadow-xs cursor-pointer transition ml-1"
              title="Profil"
            >
              {{ authStore.user?.firstName?.charAt(0) || 'S' }}
            </button>

            <!-- Profile Dropdown -->
            <div
              v-if="showProfileMenu"
              class="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 text-left"
            >
              <div class="px-4 py-2.5 border-b border-slate-100">
                <p class="text-sm font-bold text-slate-900 truncate">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </p>
                <span class="text-[10px] text-[#6D28D9] font-bold uppercase tracking-wider mt-0.5 block">
                  {{ authStore.user?.role || 'Admin' }}
                </span>
              </div>

              <div class="p-1.5 space-y-0.5 text-xs">
                <button
                  @click="router.push('/dashboard/profile'); showProfileMenu = false;"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] rounded-xl transition cursor-pointer font-medium"
                >
                  <UserIcon class="h-4 w-4 text-[#6D28D9]" />
                  <span>Profilni tahrirlash</span>
                </button>
                <button
                  @click="router.push('/management/broadcast'); showProfileMenu = false;"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] rounded-xl transition cursor-pointer font-medium"
                >
                  <Send class="h-4 w-4 text-slate-500" />
                  <span>Xabarnomalar</span>
                </button>
                <div class="my-1 border-t border-slate-100"></div>
                <button
                  @click="handleLogout(); showProfileMenu = false;"
                  class="w-full flex items-center gap-2.5 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer font-bold"
                >
                  <LogOut class="h-4 w-4" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content Area -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <router-view></router-view>
      </main>
    </div>

  </div>
</template>
