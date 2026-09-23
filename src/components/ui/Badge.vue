<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
    size?: 'sm' | 'md';
  }>(),
  {
    variant: 'default',
    size: 'sm',
  }
);

const variantClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'bg-amber-50 text-amber-700';
    case 'danger':
      return 'bg-rose-50 text-rose-700';
    case 'info':
      return 'bg-blue-50 text-blue-700';
    case 'purple':
      return 'bg-purple-50 text-purple-700';
    case 'default':
    default:
      return 'bg-slate-100 text-slate-700';
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-extrabold leading-none tracking-wide"
    :class="[
      variantClass,
      size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
    ]"
  >
    <slot></slot>
  </span>
</template>
