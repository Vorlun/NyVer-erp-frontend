<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'blue';
}>();

const colorStyles = computed(() => {
  switch (props.color) {
    case 'emerald':
      return {
        bg: 'bg-emerald-50 border-emerald-100 text-emerald-600',
        badge: 'text-emerald-700 bg-emerald-100/60',
      };
    case 'amber':
      return {
        bg: 'bg-amber-50 border-amber-100 text-amber-600',
        badge: 'text-amber-700 bg-amber-100/60',
      };
    case 'rose':
      return {
        bg: 'bg-rose-50 border-rose-100 text-rose-600',
        badge: 'text-rose-700 bg-rose-100/60',
      };
    case 'purple':
      return {
        bg: 'bg-purple-50 border-purple-100 text-purple-600',
        badge: 'text-purple-700 bg-purple-100/60',
      };
    case 'blue':
      return {
        bg: 'bg-blue-50 border-blue-100 text-blue-600',
        badge: 'text-blue-700 bg-blue-100/60',
      };
    case 'indigo':
    default:
      return {
        bg: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        badge: 'text-indigo-700 bg-indigo-100/60',
      };
  }
});
</script>

<template>
  <div class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-slate-500">{{ title }}</span>
      <div
        class="flex h-10 w-10 items-center justify-center rounded-xl border"
        :class="colorStyles.bg"
      >
        <slot name="icon"></slot>
      </div>
    </div>

    <div class="mt-4 flex items-baseline justify-between">
      <div class="text-2xl font-bold tracking-tight text-slate-900">{{ value }}</div>
      <div
        v-if="trend"
        class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
        :class="trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'"
      >
        {{ trend }}
      </div>
    </div>

    <p v-if="subtitle" class="mt-1 text-xs text-slate-500">
      {{ subtitle }}
    </p>
  </div>
</template>
