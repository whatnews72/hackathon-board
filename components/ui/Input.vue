<script setup lang="ts">
import { cn } from '~/lib/utils'
const props = defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    :class="cn('h-11 w-full rounded-md border border-border bg-white px-4 outline-none focus:ring-2 focus:ring-primary', props.class)"
  />
</template>
