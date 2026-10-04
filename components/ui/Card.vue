<script setup lang="ts">
import { cn } from '~/lib/utils'
const props = defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('rounded-lg border border-border bg-white p-4 shadow-sm', props.class)">
    <slot />
  </div>
</template>
