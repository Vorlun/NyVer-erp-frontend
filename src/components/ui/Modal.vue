<script setup lang="ts">
import { X } from 'lucide-vue-next';

defineProps<{
  show: boolean;
  title: string;
  description?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs"
      @click.self="emit('close')"
    >
      <div
        class="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
        :class="{
          'max-w-sm': maxWidth === 'sm',
          'max-w-md': maxWidth === 'md' || !maxWidth,
          'max-w-lg': maxWidth === 'lg',
          'max-w-xl': maxWidth === 'xl',
          'max-w-2xl': maxWidth === '2xl',
        }"
      >
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 class="text-base font-semibold text-slate-900">{{ title }}</h3>
            <p v-if="description" class="mt-0.5 text-xs text-slate-500">{{ description }}</p>
          </div>
          <button
            @click="emit('close')"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X class="h-5 w-5" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="px-6 py-4 max-h-[80vh] overflow-y-auto">
          <slot></slot>
        </div>

        <!-- Modal Footer -->
        <div v-if="$slots.footer" class="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-3">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Transition>
</template>
