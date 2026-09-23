<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "../../stores/auth";
import { Eye, EyeOff, AlertCircle, RefreshCw, KeyRound, ArrowLeft, ArrowRight } from "lucide-vue-next";
import StudentStudyIllustration from "../../components/auth/StudentStudyIllustration.vue";
import nyverLogo from "@/assets/logo.png";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

// Superadmin seed credentials (default)
const loginInput = ref("one.humoyun@gmail.com");
const passwordInput = ref("Kuchli@Parol99");
const showPassword = ref(false);
const showDemoMenu = ref(false);
const demoMenuRef = ref<HTMLElement | null>(null);

// Aniq prisma/seed.ts dan olingan test hisoblari
const seedAccounts = [
  {
    roleName: "Superadministrator",
    badge: "Superadmin",
    badgeClass: "bg-indigo-100 text-indigo-700",
    name: "Humoyun",
    login: "one.humoyun@gmail.com",
    password: "Kuchli@Parol99",
  },
  {
    roleName: "Administrator",
    badge: "Admin",
    badgeClass: "bg-blue-100 text-blue-700",
    name: "Sanjar Aliyev",
    login: "admin@nyver.uz",
    password: "123456",
  },
  {
    roleName: "O'qituvchi",
    badge: "Teacher",
    badgeClass: "bg-emerald-100 text-emerald-700",
    name: "Rustam Qodirov",
    login: "+998931112233",
    password: "123456",
  },
  {
    roleName: "Talaba (O'quvchi)",
    badge: "Student",
    badgeClass: "bg-amber-100 text-amber-700",
    name: "Jasur Bekmirzayev",
    login: "+998971239988",
    password: "123456",
  },
];

function handleClickOutside(event: MouseEvent) {
  if (demoMenuRef.value && !demoMenuRef.value.contains(event.target as Node)) {
    showDemoMenu.value = false;
  }
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);

  const role = route.query.role as string | undefined;
  if (role === "teacher") {
    selectDemoAccount("+998931112233", "123456", false);
  } else if (role === "student") {
    selectDemoAccount("+998971239988", "123456", false);
  } else if (role === "admin") {
    selectDemoAccount("admin@nyver.uz", "123456", false);
  } else if (role === "superadmin") {
    selectDemoAccount("one.humoyun@gmail.com", "Kuchli@Parol99", false);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});

async function handleLogin() {
  if (!loginInput.value) return;

  const success = await authStore.login(loginInput.value, passwordInput.value);
  if (success) {
    if (authStore.isAdmin) {
      router.push("/dashboard");
    } else if (authStore.isTeacher) {
      router.push("/teacher/dashboard");
    } else if (authStore.isStudent) {
      router.push("/student/dashboard");
    }
  }
}

async function selectDemoAccount(login: string, pass: string, autoLogin = true) {
  loginInput.value = login;
  passwordInput.value = pass;
  showDemoMenu.value = false;
  authStore.error = null;
  if (autoLogin) {
    await handleLogin();
  }
}

function reloadForm() {
  loginInput.value = "";
  passwordInput.value = "";
  authStore.error = null;
}
</script>

<template>
  <div
    class="min-h-screen w-full flex flex-col md:flex-row bg-white text-slate-800 select-none overflow-x-hidden font-sans"
  >
    <!-- LEFT PANEL: Dark Navy Blue Background (40% width) with Student Study Illustration (80% width) - Hidden on mobile/small screens -->
    <div
      class="hidden md:flex md:w-[40%] min-h-screen bg-[#1d2d5b] items-center justify-center p-6 relative overflow-hidden"
    >
      <!-- Vector Illustration occupying 80% of the blue panel -->
      <div class="w-[80%] flex items-center justify-center z-10">
        <StudentStudyIllustration
          class="w-full min-h-0! [&>svg]:w-full [&>svg]:max-w-none"
        />
      </div>
    </div>

    <!-- RIGHT PANEL: Light UI Form (60% width) -->
    <div
      class="w-full md:w-[60%] min-h-screen bg-white flex flex-col justify-between px-6 sm:px-12 lg:px-20 py-6 sm:py-8 relative"
    >
      <!-- Top Bar: Back to Home + Demo Accounts Helper Toggle -->
      <div class="w-full flex justify-between items-center h-8">
        <router-link
          to="/"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft class="w-3.5 h-3.5" />
          <span>Bosh sahifaga qaytish</span>
        </router-link>

        <div class="relative" ref="demoMenuRef">
          <button
            @click.stop="showDemoMenu = !showDemoMenu"
            type="button"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors cursor-pointer"
            title="Sinov hisoblarini tanlash"
          >
            <KeyRound class="w-3.5 h-3.5 text-indigo-600" />
            <span>Test hisoblar</span>
          </button>

          <!-- Demo Accounts Menu -->
          <div
            v-if="showDemoMenu"
            class="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 z-50 text-left divide-y divide-slate-100"
          >
            <div class="px-2 py-1.5">
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Sinov hisoblari (Seed):
              </div>
              <div class="text-[11px] text-slate-500 mt-0.5">
                Bosganda avtomatik tizimga kiradi
              </div>
            </div>

            <div class="py-1 space-y-1">
              <button
                v-for="acc in seedAccounts"
                :key="acc.login"
                @click="selectDemoAccount(acc.login, acc.password, true)"
                type="button"
                class="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-50 transition flex items-center justify-between group cursor-pointer"
              >
                <div class="min-w-0 pr-2">
                  <div class="flex items-center gap-1.5">
                    <span class="text-xs font-semibold text-slate-800">{{ acc.roleName }}</span>
                    <span
                      class="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      :class="acc.badgeClass"
                    >
                      {{ acc.badge }}
                    </span>
                  </div>
                  <div class="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                    {{ acc.login }}
                  </div>
                </div>
                <ArrowRight class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center Container: Form & NyVer Academy Header (Enlarged) -->
      <div class="w-full max-w-md sm:max-w-105 mx-auto my-auto py-4">
        <!-- Logo & Header Text -->
        <div class="text-center mb-6">
          <div class="flex justify-center mb-4">
            <img
              :src="nyverLogo"
              alt="NyVer Academy"
              class="h-32 sm:h-36 md:h-40 w-auto object-contain drop-shadow-xs"
            />
          </div>

          <!-- NyVer Academy 2026 Title -->
          <h1
            class="text-lg sm:text-xl font-bold text-slate-800 tracking-wide uppercase"
          >
            NyVer Academy
          </h1>
          <p class="text-xs text-slate-500 mt-1">
            O'quv markazi boshqaruv tizimiga kirish
          </p>
        </div>

        <!-- Error Alert -->
        <div
          v-if="authStore.error"
          class="mb-3.5 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          <AlertCircle class="h-4 w-4 shrink-0 text-red-500" />
          <span>{{ authStore.error }}</span>
        </div>

        <!-- Login Form (Enlarged inputs & button) -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          <!-- Login Field -->
          <div>
            <label
              for="login"
              class="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5"
            >
              Login
            </label>
            <input
              id="login"
              v-model="loginInput"
              type="text"
              required
              autocomplete="username"
              class="w-full h-11 sm:h-12 rounded-sm border border-[#cbd5e1] bg-[#e8f0fe] px-3.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
            />
          </div>

          <!-- Parol Field with Eye Toggle -->
          <div>
            <label
              for="password"
              class="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5"
            >
              Parol
            </label>
            <div class="relative">
              <input
                id="password"
                v-model="passwordInput"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                class="w-full h-11 sm:h-12 rounded-sm border border-[#cbd5e1] bg-[#e8f0fe] px-3.5 pr-10 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition shadow-2xs"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-700 cursor-pointer"
                title="Parolni ko'rsatish"
              >
                <EyeOff v-if="showPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Kirish Button -->
          <button
            type="submit"
            :disabled="authStore.loading"
            class="w-full mt-4 h-11 sm:h-12 rounded-sm bg-[#1d2d5b] hover:bg-[#162347] active:bg-[#111c3a] text-white text-sm sm:text-base font-semibold transition cursor-pointer flex items-center justify-center shadow-xs disabled:opacity-60"
          >
            <span v-if="authStore.loading">Kirilmoqda...</span>
            <span v-else>Kirish</span>
          </button>

        </form>
      </div>

      <!-- Bottom Footer: Copyright (Centered) & Refresh Button (Bottom-Right) -->
      <div
        class="w-full pt-4 pb-1 relative flex items-center justify-center text-slate-500 text-[11px]"
      >
        <span class="text-center pr-8 sm:pr-0"
          >Copyright © 2026 NyVer Academy. Barcha huquqlar himoyalangan.</span
        >

        <!-- Reload / Sync Icon Button -->
        <button
          type="button"
          @click="reloadForm"
          title="Formani tozalash"
          class="absolute right-0 bottom-0 h-8 w-8 rounded-[3px] border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-[#2563eb] hover:text-[#1d4ed8] shadow-2xs transition cursor-pointer"
        >
          <RefreshCw class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>
