<script setup lang="ts">
import { cva } from 'class-variance-authority'
import { cn } from '~/lib/utils'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  class?: string
}>(), { variant: 'default', size: 'default' })

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:opacity-90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        outline: 'border border-border bg-white hover:bg-muted',
        destructive: 'bg-destructive text-white hover:opacity-90',
        ghost: 'hover:bg-muted',
      },
      size: { default: 'h-11 px-5', sm: 'h-8 px-3 text-sm', lg: 'h-14 px-8 text-lg' },
    },
  },
)
</script>

<template>
  <button :class="cn(styles({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </button>
</template>
