<script setup lang="ts">
import { Star } from 'lucide-vue-next'

// 별점 입력 (1~5). 휴대폰에서 누르기 쉽도록 버튼을 크게 만든다
const model = defineModel<number>({ default: 0 })
defineProps<{ label: string; disabled?: boolean }>()
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <span class="w-20 shrink-0 font-semibold">{{ label }}</span>
    <div class="flex gap-1">
      <button
        v-for="n in 5" :key="n" type="button" :disabled="disabled"
        :aria-label="`${label} ${n}점`" :aria-pressed="model >= n"
        class="rounded-md p-1.5 transition active:scale-90 disabled:opacity-50"
        @click="model = n"
      >
        <Star class="h-8 w-8" :class="model >= n ? 'fill-amber-400 text-amber-400' : 'text-border'" />
      </button>
    </div>
    <span class="w-10 text-right text-sm text-muted-foreground">{{ model ? `${model}점` : '-' }}</span>
  </div>
</template>
