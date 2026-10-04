<script setup lang="ts">
import { cn } from '~/lib/utils'
const props = defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    :class="cn('min-h-24 w-full rounded-md border border-border bg-white p-3 outline-none focus:ring-2 focus:ring-primary', props.class)"
  />
</template>
