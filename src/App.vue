<script setup lang="ts">
import { useAuthStore } from './stores/auth';
import { useRouter } from 'vue-router';
import { LogOut, ShieldAlert } from 'lucide-vue-next';

const authStore = useAuthStore();
const router = useRouter();

function handleExitImpersonation() {
  const returnUrl = authStore.stopImpersonating();
  router.push(returnUrl);
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
    <!-- Impersonation Floating Banner -->
    <div
      v-if="authStore.isImpersonating"
      class="bg-linear-to-r from-amber-600 via-amber-700 to-orange-700 text-white px-4 py-2.5 shadow-lg sticky top-0 z-100 flex items-center justify-between text-xs sm:text-sm font-semibold border-b border-amber-500/40"
    >
      <div class="flex items-center gap-2.5 min-w-0">
        <ShieldAlert class="h-4 w-4 shrink-0 text-amber-200 animate-pulse" />
        <span class="truncate">
          Siz hozir <b class="text-white underline underline-offset-2">{{ authStore.user?.firstName }} {{ authStore.user?.lastName }}</b> ({{ authStore.user?.role }}) nomidan tizimdasiz
        </span>
      </div>
      <button
        @click="handleExitImpersonation"
        type="button"
        class="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-50 text-amber-900 rounded-lg font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer active:scale-95"
      >
        <LogOut class="h-3.5 w-3.5" />
        <span>Adminga qaytish</span>
      </button>
    </div>

    <router-view />
  </div>
</template>
