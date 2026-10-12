<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useNotificationsStore } from '../stores/notifications';
import {
  Home,
  CreditCard,
  Users,
  BarChart3,
  Trophy,
  ShoppingCart,
  Radio,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Coins,
} from 'lucide-vue-next';
import nyverLogo from '@/assets/logo.png';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const notificationsStore = useNotificationsStore();

const mobileSidebarOpen = ref(false);
const sidebarCollapsed = ref(false);

// Header dropdown states
const showCalendarMenu = ref(false);
const showQuickAddMenu = ref(false);
const showLanguageMenu = ref(false);
const showNotificationMenu = ref(false);
const showProfileMenu = ref(false);
const isDarkMode = ref(false);
const searchQuery = ref('');
const currentLang = ref('UZ');

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
}

function handleLogout() {
  authStore.logout();
  router.push('/');
}

// Student Navigation Items (Matching Image in screenshot: media_1789125805707.png)
const studentNavItems = [
  {
    id: 'home',
    label: 'Bosh sahifa',
    icon: Home,
    to: '/student/dashboard',
    checkActive: () => route.path === '/student/dashboard' && (!route.query.tab || route.query.tab === 'home'),
  },
  {
    id: 'payments',
    label: 'To\'lovlarim',
    icon: CreditCard,
    to: '/student/dashboard?tab=payments',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'payments',
  },
  {
    id: 'groups',
    label: 'Guruhlarim',
    icon: Users,
    to: '/student/dashboard?tab=groups',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'groups',
  },
  {
    id: 'stats',
    label: 'Ko\'rsatkichlarim',
    icon: BarChart3,
    to: '/student/dashboard?tab=stats',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'stats',
  },
  {
    id: 'rating',
    label: 'Reyting',
    icon: Trophy,
    to: '/student/dashboard?tab=rating',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'rating',
  },
  {
    id: 'shop',
    label: 'Do\'kon',
    icon: ShoppingCart,
    to: '/student/coins-shop',
    checkActive: () => route.path === '/student/coins-shop',
  },
  {
    id: 'extra',
    label: 'Qo\'shimcha darslar',
    icon: Radio,
    to: '/student/dashboard?tab=extra',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'extra',
  },
  {
    id: 'settings',
    label: 'Sozlamalar',
    icon: Settings,
    to: '/student/dashboard?tab=settings',
    checkActive: () => route.path === '/student/dashboard' && route.query.tab === 'settings',
  },
];

function isItemActive(item: any): boolean {
  if (item.checkActive) {
    return item.checkActive();
  }
  return route.path === item.to;
}

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
  notificationsStore.connectWebSocket('STUDENT', authStore.user?.id);
});

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
  notificationsStore.disconnectWebSocket();
});
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex overflow-x-hidden font-sans text-slate-800">
    <!-- ================= DESKTOP SIDEBAR (Student - Exact colors from media_1789125805707.png) ================= -->
    <aside
      class="hidden lg:flex select-none z-50 shrink-0 relative transition-all duration-300"
      :class="sidebarCollapsed ? 'w-20' : 'w-64'"
    >
      <div
        class="w-full bg-white border-r border-slate-200/80 rounded-tr-3xl rounded-br-3xl flex flex-col justify-between min-h-screen relative z-40 shadow-none transition-all duration-300"
      >
        <!-- 50% Overlapping Collapse Toggle Button: Caramel brown bg-[#b86b35] as seen in screenshot -->
        <button
          @click="toggleSidebarCollapse"
          type="button"
          class="absolute -right-3.5 top-6 h-7.5 w-7.5 rounded-xl bg-[#b86b35] text-white hover:bg-[#a65d2a] flex items-center justify-center shadow-md cursor-pointer z-50 border-2 border-white transition-all active:scale-95"
          :title="sidebarCollapsed ? 'Sidebar ochish' : 'Sidebar yopish'"
        >
          <ChevronRight v-if="sidebarCollapsed" class="h-4 w-4" />
          <ChevronLeft v-else class="h-4 w-4" />
        </button>

        <!-- Top: Logo & Navigation Items -->
        <div>
          <!-- Logo Header with inset bottom border line that does not reach the ends -->
          <div
            class="relative h-20 flex items-center transition-all duration-300"
            :class="sidebarCollapsed ? 'justify-center px-2' : 'px-4.5'"
          >
            <div class="flex items-center gap-3 overflow-hidden">
              <img :src="nyverLogo" alt="NyVer" class="h-11 w-auto object-contain shrink-0 drop-shadow-xs" />
              <div v-if="!sidebarCollapsed" class="min-w-0 transition-opacity">
                <span class="text-lg font-black tracking-tight text-slate-900 block truncate leading-tight">
                  NyVer<span class="text-[#c26224]">Edu</span>
                </span>
                <span class="text-[11px] font-bold text-[#c26224] block uppercase tracking-wider mt-0.5">
                  Talaba Kabineti
                </span>
              </div>
            </div>
            <!-- Inset border line under logo (oxirigacha yetmagan) -->
            <div class="absolute bottom-0 left-4 right-4 h-px bg-slate-200/80"></div>
          </div>

          <!-- Student Navigation Links (Matching Image: Peach highlight, rust orange text) -->
          <div class="px-3.5 py-3 space-y-2">
            <div
              v-for="item in studentNavItems"
              :key="item.id"
              class="relative group"
            >
              <router-link
                :to="item.to"
                class="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] transition-all duration-200 cursor-pointer"
                :class="[
                  isItemActive(item)
                    ? 'bg-[#fff4ed] text-[#c26224] border border-[#fed7aa]/50 shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-[#fff7ed]/60 hover:text-slate-900 font-semibold',
                  sidebarCollapsed ? 'justify-center px-0 py-3' : '',
                ]"
              >
                <component
                  :is="item.icon"
                  class="h-5 w-5 shrink-0"
                  :class="isItemActive(item) ? 'text-[#c26224]' : 'text-slate-500'"
                />
                <span v-if="!sidebarCollapsed" class="truncate">{{ item.label }}</span>
              </router-link>

              <!-- Pointer Tooltip on hover -->
              <div
                class="absolute left-full top-1/2 -translate-y-1/2 ml-3.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-xl whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 -translate-x-1.5 group-hover:translate-x-0 transition-all duration-150 z-50 flex items-center"
              >
                <span class="absolute right-full top-1/2 -translate-y-1/2 -mr-px border-y-4 border-y-transparent border-r-6 border-r-slate-900"></span>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom: Student Coin Balance & Logout -->
        <div class="p-3 border-t border-slate-100">
          <div v-if="!sidebarCollapsed" class="rounded-2xl p-2.5 bg-[#fff7ed] border border-[#fed7aa] mb-2 text-left">
            <div class="flex items-center justify-between text-xs text-[#9a3412] font-bold">
              <span class="flex items-center gap-1.5">
                <Coins class="h-3.5 w-3.5 text-[#c26224]" />
                Tangalarim:
              </span>
              <span>{{ authStore.user?.coins || 0 }} coin</span>
            </div>
          </div>

          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut class="h-3.5 w-3.5" />
            <span v-if="!sidebarCollapsed">Chiqish</span>
          </button>
        </div>
      </div>
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
              <img :src="nyverLogo" alt="NyVer" class="h-9 w-auto object-contain shrink-0 drop-shadow-2xs" />
              <div>
                <span class="font-extrabold text-slate-900 leading-tight block text-base">NyVerEdu</span>
                <span class="text-[11px] text-[#c26224] font-semibold uppercase">Talaba Kabineti</span>
              </div>
            </div>
            <button @click="mobileSidebarOpen = false" class="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="py-4 space-y-2">
            <router-link
              v-for="item in studentNavItems"
              :key="item.id"
              :to="item.to"
              @click="mobileSidebarOpen = false"
              class="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-[15px] font-bold transition-all duration-200"
              :class="[
                isItemActive(item)
                  ? 'bg-[#fff4ed] text-[#c26224] font-bold border border-[#fed7aa]/50 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100',
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
      <!-- Top Header (Matching media_1789125805707.png: purple + Qo'shish button, purple avatar circle) -->
      <header
        class="h-17.5 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs"
      >
        <!-- LEFT: Mobile Menu + Calendar + Purple "+ Qo'shish" + Search Bar -->
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
                <span class="text-xs font-bold text-slate-800">Dars Rejam</span>
                <span class="text-[10px] bg-[#fff4ed] text-[#c26224] border border-[#fed7aa] px-2 py-0.5 rounded-md font-semibold">Bugun</span>
              </div>
              <div class="py-2.5 text-xs text-slate-600 space-y-1.5">
                <div class="font-bold text-slate-900 text-sm">
                  {{ new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                </div>
                <div class="flex items-center gap-1.5 text-slate-500">
                  <Clock class="h-4 w-4 text-[#c26224]" />
                  <span>Dars vaqti: 14:00 - 16:00 (MFactor)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- "+ Qo'shish" Dropdown Button: Warm caramel brown matching theme -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showQuickAddMenu = !showQuickAddMenu; showCalendarMenu = false; showLanguageMenu = false; showNotificationMenu = false; showProfileMenu = false;"
              type="button"
              class="h-10 px-4 rounded-xl bg-[#c26224] hover:bg-[#a6521a] active:bg-[#8c4314] text-white text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs shrink-0"
            >
              <Plus class="h-4.5 w-4.5" />
              <span>Qo'shish</span>
              <ChevronDown class="h-3.5 w-3.5 opacity-80" />
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="showQuickAddMenu"
              class="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-left"
            >
              <button
                @click="router.push('/student/homework'); showQuickAddMenu = false;"
                class="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <span>Vazifa topshirish</span>
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
              class="w-full h-10 pl-10 pr-4 text-sm bg-slate-100/90 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-slate-800 placeholder-slate-400 focus:bg-white focus:border-[#c26224] focus:outline-none transition-all shadow-2xs"
            />
          </div>
        </div>

        <!-- RIGHT: Language + Bell + Moon + Student Avatar initial "S" in purple (media_1789125805707.png) -->
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
                class="w-full flex items-center justify-between px-3.5 py-2 hover:bg-orange-50 hover:text-[#c26224] transition cursor-pointer font-semibold"
                :class="currentLang === lang.code ? 'text-[#c26224] bg-orange-50/60 font-bold' : 'text-slate-700'"
              >
                <div class="flex items-center gap-2">
                  <span class="w-6 font-mono font-bold">{{ lang.code }}</span>
                  <span class="text-slate-500 font-normal">{{ lang.label }}</span>
                </div>
                <Check v-if="currentLang === lang.code" class="h-3.5 w-3.5 text-[#c26224]" />
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
                v-if="notificationsStore.studentUnreadCount > 0"
                class="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white"
              >
                {{ notificationsStore.studentUnreadCount }}
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
                  v-if="notificationsStore.studentUnreadCount > 0"
                  @click="notificationsStore.markAllAsRead"
                  type="button"
                  class="text-[11px] text-[#c26224] font-bold hover:underline cursor-pointer"
                >
                  O'qilgan deb belgilash
                </button>
              </div>

              <div class="max-h-72 overflow-y-auto space-y-2 pr-0.5">
                <div
                  v-if="notificationsStore.studentNotifications.length === 0"
                  class="py-6 text-center text-slate-400"
                >
                  Yangi bildirishnomalar yo'q
                </div>
                <div
                  v-for="n in notificationsStore.studentNotifications.slice(0, 6)"
                  :key="n.id"
                  @click="notificationsStore.markAsRead(n.id)"
                  class="p-2.5 rounded-xl border transition cursor-pointer"
                  :class="!n.read ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-100'"
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

          <!-- Student Profile Avatar Initial in warm brown -->
          <div class="relative dropdown-container">
            <button
              @click.stop="showProfileMenu = !showProfileMenu; showCalendarMenu = false; showQuickAddMenu = false; showLanguageMenu = false; showNotificationMenu = false;"
              type="button"
              class="h-10 w-10 rounded-full bg-[#c26224] text-white text-sm font-extrabold flex items-center justify-center shadow-xs cursor-pointer hover:ring-2 hover:ring-orange-300/50 transition"
              title="Profil menyusi"
            >
              {{ authStore.user?.firstName?.charAt(0) || 'J' }}
            </button>

            <div
              v-if="showProfileMenu"
              class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2.5 z-50 text-left"
            >
              <div class="px-4 py-2.5 border-b border-slate-100">
                <p class="text-sm font-bold text-slate-800 truncate">
                  {{ authStore.user?.firstName }} {{ authStore.user?.lastName }}
                </p>
                <span class="text-[10px] text-[#c26224] font-semibold uppercase">Talaba</span>
              </div>
              <button
                @click="handleLogout"
                class="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer font-semibold"
              >
                <LogOut class="h-3.5 w-3.5" />
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
