<script setup lang="ts">
import { useRouter } from 'vue-router';
import { HelpCircle, ArrowLeft } from 'lucide-vue-next';
import nyverLogo from '@/assets/logo.png';

const router = useRouter();
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 select-none">
    <div class="max-w-md w-full text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
      <div class="flex justify-center mb-5">
        <img :src="nyverLogo" alt="NyVer Academy" class="h-20 w-auto object-contain" />
      </div>

      <div class="h-14 w-14 bg-violet-50 text-[#6D28D9] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-violet-100">
        <HelpCircle class="h-7 w-7 text-[#6D28D9]" />
      </div>

      <h1 class="text-xl font-bold text-slate-900 mb-1.5">Sahifa Topilmadi (404)</h1>
      <p class="text-xs sm:text-sm text-slate-500 mb-6">
        Siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko'chirilgan.
      </p>

      <button
        @click="router.push('/')"
        class="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] active:bg-[#4C1D95] text-white font-semibold text-sm transition-colors cursor-pointer shadow-xs"
      >
        <ArrowLeft class="h-4 w-4" />
        Bosh Sahifaga Qaytish
      </button>
    </div>
  </div>
</template>
