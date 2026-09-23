<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import {
  Home,
  UserCheck,
  Layers,
  GraduationCap,
  Gift,
  Settings,
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
  Coins,
  Contact,
  CreditCard,
  MessageSquare,
  User as UserIcon,
} from 'lucide-vue-next';
import nyverLogo from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Sidebar States
const mobileSidebarOpen = ref(false);
const sidebarCollapsed = ref(false); // Collapsed icon-only mode toggle (w-20 vs w-64)
const submenuOpen = ref(false); // Vertical accordion submenu for Boshqarish

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function toggleSubmenu() {
  if (sidebarCollapsed.value) {
    sidebarCollapsed.value = false;
    submenuOpen.value = true;
  } else {
    submenuOpen.value = !submenuOpen.value;
  }
}

function closeSubmenu() {
  submenuOpen.value = false;
}

const isManagementActive = computed(() => {
  return route.path.startsWith('/management');
});

watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/management')) {
      submenuOpen.value = true;
    }
  },
  { immediate: true }
);

// Header Dropdown States
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
    showLanguageMenu.value = false;
    showNotificationMenu.value = false;
    showProfileMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

// Primary Navigation Items
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
    icon: UserCheck,
    to: '/dashboard/teachers',
    checkActive: () => route.path.startsWith('/dashboard/teachers') || (route.path === '/admin/users' && route.query.role === 'TEACHER'),
  },
  {
    id: 'groups',
    label: 'Guruhlar',
    icon: Layers,
    to: '/dashboard/groups',
    checkActive: () => route.path.startsWith('/dashboard/groups') || route.path.startsWith('/admin/groups'),
  },
  {
    id: 'students',
    label: 'Talabalar',
    icon: GraduationCap,
    to: '/dashboard/students',
    checkActive: () => route.path.startsWith('/dashboard/students') || (route.path === '/admin/users' && route.query.role === 'STUDENT'),
  },
  {
    id: 'payments',
    label: "To'lovlar",
    icon: CreditCard,
    to: '/dashboard/payments',
    checkActive: () => route.path.startsWith('/dashboard/payments') || route.path.startsWith('/admin/payments'),
  },
  {
    id: 'gifts',
    label: 'Sovg\'alar',
    icon: Gift,
    to: '/dashboard/gifts',
    checkActive: () => route.path.startsWith('/dashboard/gifts') || route.path.startsWith('/admin/prizes'),
  },
  {
    id: 'contacts',
    label: 'Murojaatlar',
    icon: MessageSquare,
    to: '/dashboard/contacts',
    checkActive: () => route.path.startsWith('/dashboard/contacts'),
  },
];

// Submenu Items for 2-Sidebar (Boshqarish bo'limi - matching user screenshot exactly)
const submenuItems = [
  {
    id: 'courses',
    label: 'Kurslar',
    icon: BookOpen,
    to: '/management/course',
    checkActive: () => route.path.startsWith('/management/course'),
  },
  {
    id: 'rooms',
    label: 'Xonalar',
    icon: DoorOpen,
    to: '/management/rooms',
    checkActive: () => route.path.startsWith('/management/rooms'),
  },
  {
    id: 'staff',
    label: 'Hodimlar',
    icon: Contact,
    to: '/management/staff',
    checkActive: () => route.path.startsWith('/management/staff'),
  },
  {
    id: 'coins',
    label: 'Coin',
    icon: Coins,
    to: '/management/coins',
    checkActive: () => route.path.startsWith('/management/coins') || (route.path === '/admin/users' && route.query.tab === 'coins'),
  },
  {
    id: 'broadcast',
    label: 'Xabar Yuborish',
    icon: Send,
    to: '/management/broadcast',
    checkActive: () => route.path.startsWith('/management/broadcast'),
  },
];

function handleSubmenuClick(item: any) {
  router.push(item.to);
  closeSubmenu();
  mobileSidebarOpen.value = false;
}

function isMainItemActive(item: any): boolean {
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
  <div class="h-screen bg-slate-50 flex font-sans text-slate-800">
    <!-- ================= DESKTOP SIDEBAR ================= -->
    <aside
      class="hidden lg:flex select-none z-50 shrink-0 relative transition-all duration-300"
      :class="sidebarCollapsed ? 'w-22' : 'w-72'"
    >
      <!-- 50% OVERLAPPING TOGGLE BUTTON ON RIGHT BORDER LINE (Half inside, half outside: exactly 50% position) -->
      <button
        @click="toggleSidebarCollapse"
        type="button"
        class="absolute right-0 translate-x-1/2 top-6 h-8 w-8 rounded-xl bg-white hover:bg-violet-50 text-[#6D28D9] hover:text-[#5B21B6] border border-slate-200/90 hover:border-violet-300 flex items-center justify-center shadow-xs cursor-pointer z-50 transition-all hover:scale-105 active:scale-95 shrink-0"
        :title="sidebarCollapsed ? 'Sidebar ochish' : 'Sidebar yopish'"
      >
        <ChevronRight v-if="sidebarCollapsed" class="h-4.5 w-4.5" />
        <ChevronLeft v-else class="h-4.5 w-4.5" />
      </button>

      <!-- 1. PRIMARY SIDEBAR PANEL (Rounded right edge) -->
      <div
        class="w-full bg-white border-r border-slate-200/80 rounded-tr-3xl rounded-br-3xl flex flex-col justify-between h-screen relative z-40 shadow-none transition-all duration-300 overflow-visible"
        :class="sidebarCollapsed ? 'w-22' : 'w-72'"
      >
        <!-- Top Section: Logo & Nav -->
        <div>
          <!-- Logo Header with inset bottom border line that does not reach the ends -->
          <div
            class="relative h-20 flex items-center transition-all duration-300"
            :class="sidebarCollapsed ? 'justify-center px-2' : 'px-5'"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <img :src="nyverLogo" alt="NyVer" class="h-12 w-auto object-contain shrink-0 drop-shadow-xs transition-all" />
              <div v-if="!sidebarCollapsed" class="min-w-0 transition-opacity">
                <span class="text-xl font-black tracking-tight text-slate-900 block truncate leading-tight">
                  NyVer<span class="text-[#6D28D9]">Edu</span>
                </span>
                <span class="text-[11px] font-bold text-slate-400 block uppercase tracking-wider mt-0.5">
                  Academy ERP
                </span>
              </div>
            </div>
            <!-- Inset border line under logo (oxirigacha yetmagan) -->
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-200/80"></div>
          </div>

          <!-- Main Nav Links (Enlarged, prominent, comfortable) -->
          <div class="px-4 py-3.5 space-y-2">
            <div
              v-for="item in mainNavItems"
              :key="item.id"
              class="relative group"
            >
              <router-link
                :to="item.to"
                @click="closeSubmenu()"
                class="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] sm:text-base transition-all duration-200 cursor-pointer relative"
                :class="[
                  isMainItemActive(item)
                    ? 'bg-violet-50 text-violet-700 font-extrabold'
                    : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900',
                  sidebarCollapsed ? 'justify-center px-0 py-3.5' : '',
                ]"
              >
                <component
                  :is="item.icon"
                  class="h-5.5 w-5.5 shrink-0 transition-colors"
                  :class="isMainItemActive(item) ? 'text-violet-600' : 'text-slate-500 group-hover:text-slate-700'"
                />
                <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
              </router-link>

              <!-- Pointer Arrow Tooltip appearing on the right on hover (only when collapsed) -->
              <div
                v-if="sidebarCollapsed"
                class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1.5 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center"
              >
                <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>

            <!-- Boshqarish Item with Inline Accordion Tree Submenu (Enlarged) -->
            <div class="relative">
              <div class="relative group">
                <button
                  @click="toggleSubmenu"
                  type="button"
                  class="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] sm:text-base transition-all duration-200 cursor-pointer text-left relative"
                  :class="[
                    isManagementActive
                      ? 'bg-violet-50 text-violet-700 font-extrabold'
                      : submenuOpen
                      ? 'bg-slate-50 text-slate-900 font-bold'
                      : 'text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-900',
                    sidebarCollapsed ? 'justify-center px-0 py-3.5' : '',
                  ]"
                >
                  <div class="flex items-center gap-3.5 min-w-0">
                    <Settings
                      class="h-5.5 w-5.5 shrink-0 transition-colors"
                      :class="isManagementActive ? 'text-violet-600' : 'text-slate-500 group-hover:text-slate-700'"
                    />
                    <span v-if="!sidebarCollapsed" class="truncate">Boshqarish</span>
                  </div>
                  <ChevronDown
                    v-if="!sidebarCollapsed"
                    class="h-4.5 w-4.5 shrink-0 text-slate-400 transition-transform duration-200"
                    :class="{ 'rotate-180 text-[#6D28D9]': submenuOpen }"
                  />
                </button>

                <!-- Pointer Arrow Tooltip for Boshqarish (when collapsed) -->
                <div
                  v-if="sidebarCollapsed"
                  class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1.5 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center"
                >
                  <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                  <span>Boshqarish</span>
                </div>
              </div>

              <!-- Accordion Tree Submenu (Opens directly underneath inside sidebar) -->
              <Transition
                enter-active-class="transition-all duration-200 ease-out overflow-hidden"
                enter-from-class="max-h-0 opacity-0"
                enter-to-class="max-h-96 opacity-100"
                leave-active-class="transition-all duration-150 ease-in overflow-hidden"
                leave-from-class="max-h-96 opacity-100"
                leave-to-class="max-h-0 opacity-0"
              >
                <div
                  v-if="submenuOpen && !sidebarCollapsed"
                  class="relative ml-5 pl-3.5 pr-1 pt-2 pb-1 space-y-1.5"
                >
                  <!-- Continuous vertical tree connector line -->
                  <div class="absolute left-1.5 top-0 bottom-3 w-px bg-slate-200"></div>

                  <!-- Submenu items -->
                  <router-link
                    v-for="sub in submenuItems"
                    :key="sub.id"
                    :to="sub.to"
                    class="group/sub relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all duration-150"
                    :class="[
                      sub.checkActive && sub.checkActive()
                        ? 'bg-violet-50/50 text-violet-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50',
                    ]"
                  >
                    <!-- Horizontal tree branch connector line (softer) -->
                    <span
                      class="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-px transition-colors"
                      :class="sub.checkActive && sub.checkActive() ? 'bg-violet-300' : 'bg-slate-200 group-hover/sub:bg-slate-300'"
                    ></span>

                    <component
                      :is="sub.icon"
                      class="h-4.5 w-4.5 shrink-0 transition-colors"
                      :class="sub.checkActive && sub.checkActive() ? 'text-violet-500' : 'text-slate-400 group-hover/sub:text-slate-600'"
                    />
                    <span class="truncate">{{ sub.label }}</span>
                  </router-link>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- Bottom Clean Spacer (no purchase card) -->
        <div class="p-3.5"></div>
      </div>

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
            <div class="flex items-center gap-3">
              <img :src="nyverLogo" alt="NyVer" class="h-12 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div>
                <span class="font-black text-slate-900 leading-tight block text-base">
                  NyVer<span class="text-[#6D28D9]">Edu</span>
                </span>
                <span class="text-[11px] text-[#6D28D9] font-bold uppercase tracking-wider">Academy ERP</span>
              </div>
            </div>
            <button
              @click="mobileSidebarOpen = false"
              class="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Mobile Nav Items (Enlarged) -->
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
                  ? 'bg-violet-50 text-[#6D28D9] border border-violet-200/60 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
              ]"
            >
              <component
                :is="item.icon"
                class="h-5 w-5 shrink-0 transition-colors"
                :class="isMainItemActive(item) ? 'text-[#6D28D9]' : 'text-slate-400'"
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
              @click="handleSubmenuClick(sub)"
              class="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-[14px] font-semibold transition-all duration-150 text-left"
              :class="[
                sub.checkActive && sub.checkActive()
                  ? 'bg-violet-50 text-[#6D28D9] font-bold border border-violet-200/70 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900',
              ]"
            >
              <component
                :is="sub.icon"
                class="h-4.5 w-4.5 shrink-0 transition-colors"
                :class="sub.checkActive && sub.checkActive() ? 'text-[#6D28D9]' : 'text-slate-400'"
              />
              {{ sub.label }}
            </button>
          </div>
        </div>

        <!-- Mobile Bottom Logout (clean, no obuna) -->
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

    <!-- ================= MAIN LAYOUT AREA (Scrollable Content, Fixed Header) ================= -->
    <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
      <!-- ================= TOP HEADER (Permanently Fixed Header, Enlarged) ================= -->
      <header
        class="h-20 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs shrink-0"
      >
        <!-- LEFT: Mobile Menu Toggle + Search Bar (Enlarged) -->
        <div class="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
          <!-- Mobile Menu trigger (lg:hidden) -->
          <button
            @click="mobileSidebarOpen = true"
            type="button"
            class="h-11 w-11 rounded-2xl border border-slate-200/80 bg-white lg:hidden text-slate-600 hover:bg-slate-50 flex items-center justify-center cursor-pointer shadow-2xs transition-colors shrink-0"
            title="Menyu"
          >
            <Menu class="h-5.5 w-5.5" />
          </button>

          <!-- Search Input: "Qidirish..." (Enlarged, comfortable) -->
          <div class="relative w-full max-w-lg">
            <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search class="h-5 w-5" />
            </div>
            <input
              v-model="searchQuery"
              @keydown.enter="handleSearch"
              type="text"
              placeholder="Qidirish..."
              class="w-full h-11 sm:h-12 pl-11.5 pr-4 text-sm sm:text-base bg-slate-50 hover:bg-slate-100 focus:bg-white border-2 border-transparent focus:border-violet-100 focus:ring-4 focus:ring-violet-500/5 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none transition-all shadow-none"
            />
          </div>
        </div>

        <!-- RIGHT: Language selector + Notifications Bell + Dark mode Toggle + User Profile (Enlarged) -->
        <div class="flex items-center gap-2.5 sm:gap-3">
          <!-- Language Selector (2-letter codes: UZ / RU / EN) -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showLanguageMenu = !showLanguageMenu; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-11 inline-flex items-center gap-2 px-3.5 text-sm font-bold text-slate-700 hover:bg-slate-100 rounded-2xl transition-colors cursor-pointer border border-slate-200/80 shadow-2xs bg-white"
              title="Tilni tanlash"
            >
              <span class="tracking-wider font-mono uppercase">{{ currentLang }}</span>
              <ChevronDown class="h-4 w-4 text-slate-400 transition-transform duration-150" :class="{ 'rotate-180': showLanguageMenu }" />
            </button>

            <!-- Language Dropdown -->
            <div
              v-if="showLanguageMenu"
              class="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left text-sm"
            >
              <button
                v-for="lang in [
                  { code: 'UZ', label: 'O\'zbekcha' },
                  { code: 'RU', label: 'Русский' },
                  { code: 'EN', label: 'English' }
                ]"
                :key="lang.code"
                @click="currentLang = lang.code; showLanguageMenu = false;"
                class="w-full flex items-center justify-between px-4 py-2.5 hover:bg-violet-50 hover:text-[#6D28D9] transition cursor-pointer font-semibold"
                :class="currentLang === lang.code ? 'text-[#6D28D9] bg-violet-50/60 font-bold' : 'text-slate-700'"
              >
                <div class="flex items-center gap-2.5">
                  <span class="w-6 font-mono font-bold">{{ lang.code }}</span>
                  <span class="text-slate-500 font-normal">{{ lang.label }}</span>
                </div>
                <Check v-if="currentLang === lang.code" class="h-4 w-4 text-[#6D28D9]" />
              </button>
            </div>
          </div>

          <!-- Notification Bell with dot -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showNotificationMenu = !showNotificationMenu; showLanguageMenu = false; showProfileMenu = false;"
              type="button"
              class="h-11 w-11 rounded-2xl hover:bg-slate-100 border border-slate-200/80 bg-white flex items-center justify-center text-slate-600 relative transition-colors cursor-pointer shadow-2xs"
              title="Bildirishnomalar"
            >
              <Bell class="h-5 w-5" />
              <span class="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>

            <!-- Notifications Dropdown -->
            <div
              v-if="showNotificationMenu"
              class="absolute right-0 mt-2 w-84 sm:w-92 bg-white rounded-2xl shadow-xl border border-slate-200/90 p-4.5 z-50 text-left"
            >
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <span class="text-sm font-bold text-slate-800">Bildirishnomalar</span>
                <span class="text-xs text-[#6D28D9] font-medium cursor-pointer hover:underline">Barchasini o'qilgan deb belgilash</span>
              </div>
              <div class="divide-y divide-slate-100 py-1 text-xs">
                <div class="py-2.5 hover:bg-slate-50 px-2 rounded-xl transition">
                  <div class="font-semibold text-slate-800 text-sm">Yangi talaba ro'yxatdan o'tdi</div>
                  <div class="text-xs text-slate-500">Frontend Foundation guruhiga talaba qo'shildi</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">15 daqiqa oldin</div>
                </div>
                <div class="py-2.5 hover:bg-slate-50 px-2 rounded-xl transition">
                  <div class="font-semibold text-slate-800 text-sm">To'lov muddati eslatmasi</div>
                  <div class="text-xs text-slate-500">3 ta talabaning to'lov muddati yetib keldi</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">1 soat oldin</div>
                </div>
                <div class="py-2.5 hover:bg-slate-50 px-2 rounded-xl transition">
                  <div class="font-semibold text-slate-800 text-sm">Yangi dars jadvali tasdiqlandi</div>
                  <div class="text-xs text-slate-500">Audit-1 xonasi soat 14:00 ga band qilindi</div>
                  <div class="text-[10px] text-slate-400 mt-0.5">Bugun</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Dark Mode / Theme Toggle -->
          <button
            @click="isDarkMode = !isDarkMode"
            type="button"
            class="h-11 w-11 rounded-2xl hover:bg-slate-100 border border-slate-200/80 bg-white flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Mavzu (Tungi/Kunduzgi rejim)"
          >
            <Sun v-if="isDarkMode" class="h-5 w-5 text-amber-500" />
            <Moon v-else class="h-5 w-5" />
          </button>

          <!-- Subtle Vertical Divider -->
          <div class="h-6 w-px bg-slate-200/80 mx-1"></div>

          <!-- Clean User Profile Button & Dropdown -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showProfileMenu = !showProfileMenu; showLanguageMenu = false; showNotificationMenu = false;"
              type="button"
              class="h-11 pl-2 pr-3.5 inline-flex items-center gap-2.5 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200/80 bg-white shadow-2xs"
              title="Profil menyusi"
            >
              <div class="h-8.5 w-8.5 rounded-xl overflow-hidden bg-violet-100 text-[#6D28D9] text-sm font-black flex items-center justify-center shadow-2xs shrink-0">
                <img
                  v-if="authStore.user?.photo"
                  :src="authStore.user.photo"
                  alt="Avatar"
                  class="h-full w-full object-cover"
                />
                <span v-else>{{ authStore.user?.firstName?.charAt(0) || 'A' }}</span>
              </div>
              <span class="hidden md:block text-sm font-bold text-slate-800 leading-none truncate max-w-32">
                {{ authStore.user?.firstName || 'Admin' }}
              </span>
              <ChevronDown class="h-4 w-4 text-slate-400 transition-transform duration-150" :class="{ 'rotate-180': showProfileMenu }" />
            </button>

            <!-- Profile Dropdown (Only actual project features) -->
            <div
              v-if="showProfileMenu"
              class="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-100 text-left"
              style="box-shadow: 0 10px 40px rgba(0,0,0,0.12);"
            >
              <!-- User Info Card Header -->
              <div class="px-4 py-3 border-b border-slate-100">
                <p class="text-sm font-bold text-slate-900 truncate">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </p>
                <div class="flex items-center gap-2 mt-1.5">
                  <span class="px-2 py-0.5 rounded-md bg-violet-50 text-[#6D28D9] text-[10px] font-extrabold uppercase tracking-wide">
                    {{ authStore.user?.role || 'Admin' }}
                  </span>
                  <span class="text-xs text-slate-400 font-mono truncate">
                    {{ authStore.user?.phone || authStore.user?.email }}
                  </span>
                </div>
              </div>

              <!-- Menu Items (Only used features) -->
              <div class="p-2 space-y-1">
                <!-- 1. Profile -> navigates to dedicated page -->
                <button
                  @click="router.push('/dashboard/profile'); showProfileMenu = false;"
                  class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] rounded-xl transition cursor-pointer font-medium"
                >
                  <UserIcon class="h-4.5 w-4.5 text-[#6D28D9]" />
                  <span>Profilni tahrirlash</span>
                </button>

                <!-- 2. Messages / Broadcast -->
                <button
                  @click="router.push('/management/broadcast'); showProfileMenu = false;"
                  class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] rounded-xl transition cursor-pointer font-medium"
                >
                  <Send class="h-4.5 w-4.5 text-slate-500" />
                  <span>Xabarnomalar</span>
                </button>

                <!-- 3. Management / Settings -->
                <button
                  @click="router.push('/management'); showProfileMenu = false;"
                  class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-[#6D28D9] rounded-xl transition cursor-pointer font-medium"
                >
                  <Settings class="h-4.5 w-4.5 text-slate-500" />
                  <span>Sozlamalar</span>
                </button>

                <div class="my-1 border-t border-slate-100"></div>

                <!-- 4. Logout -->
                <button
                  @click="handleLogout(); showProfileMenu = false;"
                  class="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer font-bold"
                >
                  <LogOut class="h-4.5 w-4.5" />
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
