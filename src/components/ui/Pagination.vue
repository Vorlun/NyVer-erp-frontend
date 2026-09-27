<script setup lang="ts">
import { computed } from 'vue';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';

interface Props {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  totalItems: 0,
  pageSize: 10,
});

const emit = defineEmits<{
  (e: 'update:currentPage', page: number): void;
  (e: 'change', page: number): void;
}>();

function goToPage(page: number) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return;
  emit('update:currentPage', page);
  emit('change', page);
}

// Generate pagination items: numbers and '...'
const visiblePages = computed<(number | string)[]>(() => {
  const current = props.currentPage;
  const total = props.totalPages;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];

  if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push('...');
    pages.push(total);
  } else if (current >= total - 3) {
    pages.push(1);
    pages.push('...');
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    pages.push('...');
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push('...');
    pages.push(total);
  }

  return pages;
});

const startItem = computed(() => {
  if (!props.totalItems) return 0;
  return (props.currentPage - 1) * props.pageSize + 1;
});

const endItem = computed(() => {
  if (!props.totalItems) return 0;
  return Math.min(props.currentPage * props.pageSize, props.totalItems);
});
</script>

<template>
  <div v-if="totalPages > 1" class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 text-xs">
    <!-- Summary info (left) -->
    <div class="text-slate-500 font-medium">
      <span v-if="totalItems > 0">
        Jami <strong class="text-slate-800 font-bold">{{ totalItems }}</strong> tadan
        <strong class="text-slate-800 font-bold">{{ startItem }}-{{ endItem }}</strong> ko'rsatilmoqda
      </span>
      <span v-else>
        Sahifa <strong class="text-slate-800 font-bold">{{ currentPage }}</strong> / {{ totalPages }}
      </span>
    </div>

    <!-- Numeric Page Buttons (right) -->
    <div class="inline-flex items-center gap-1 self-center sm:self-auto">
      <!-- Previous button -->
      <button
        type="button"
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage <= 1"
        class="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
        title="Oldingi sahifa"
      >
        <ChevronLeft class="h-3.5 w-3.5" />
        <span class="hidden sm:inline">Oldingi</span>
      </button>

      <!-- Page Numbers -->
      <template v-for="(p, idx) in visiblePages" :key="idx">
        <span
          v-if="p === '...'"
          class="h-8 w-8 flex items-center justify-center text-slate-400 font-bold select-none"
        >
          ...
        </span>
        <button
          v-else
          type="button"
          @click="goToPage(Number(p))"
          class="h-8 min-w-8 px-2 rounded-lg font-bold transition-colors cursor-pointer text-xs"
          :class="
            p === currentPage
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950'
          "
        >
          {{ p }}
        </button>
      </template>

      <!-- Next button -->
      <button
        type="button"
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage >= totalPages"
        class="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors cursor-pointer flex items-center gap-1"
        title="Keyingi sahifa"
      >
        <span class="hidden sm:inline">Keyingi</span>
        <ChevronRight class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
