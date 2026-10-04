<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import type { Team, Project, PresentationState } from '~/types'

const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: projects } = useRealtimeTable<Project>('projects')
const { rows: states } = useRealtimeTable<PresentationState>('presentation_state', 'id')
const { isAdmin, call } = useAdmin()

const state = computed(() => states.value[0])
const current = computed(() => projects.value.find((p) => p.id === state.value?.project_id))
const team = computed(() => teams.value.find((t) => t.id === current.value?.team_id))
const index = computed(() => projects.value.findIndex((p) => p.id === current.value?.id))

// 발표 타이머: started_at 기준이라 모든 화면에서 같은 시간이 보인다
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => (now.value = Date.now()), 500) })
onBeforeUnmount(() => clearInterval(timer))
const elapsed = computed(() => {
  if (!state.value?.started_at) return '00:00'
  const s = Math.max(0, Math.floor((now.value - new Date(state.value.started_at).getTime()) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

function go(delta: number) {
  if (!isAdmin.value || !projects.value.length) return
  const len = projects.value.length
  const next = projects.value[(Math.max(index.value, -1) + delta + len) % len]
  call('present', { id: next.id })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  if (e.key === 'ArrowLeft') go(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">🎤 발표</h1>
      <div class="flex items-center gap-2">
        <span class="rounded-md bg-secondary px-4 py-2 font-mono text-2xl font-bold">⏱ {{ elapsed }}</span>
        <template v-if="isAdmin">
          <UiButton variant="outline" @click="go(-1)"><ChevronLeft class="h-5 w-5" /></UiButton>
          <UiButton variant="outline" @click="go(1)"><ChevronRight class="h-5 w-5" /></UiButton>
          <UiButton variant="secondary" @click="call('present')">발표 종료</UiButton>
        </template>
      </div>
    </div>

    <UiCard v-if="current" class="overflow-hidden p-0">
      <img v-if="current.image_url" :src="current.image_url" :alt="current.title" class="max-h-[50vh] w-full bg-muted object-contain" />
      <div class="space-y-3 p-8 text-center">
        <span class="rounded px-3 py-1 font-bold" :style="{ background: (team?.color ?? '#999999') + '33' }">{{ team?.name }}</span>
        <h2 class="text-4xl font-extrabold">{{ current.title }}</h2>
        <p class="mx-auto max-w-2xl whitespace-pre-wrap text-lg text-muted-foreground">{{ current.description }}</p>
        <a v-if="current.link" :href="current.link" target="_blank" rel="noopener" class="text-primary underline">{{ current.link }}</a>
        <p class="text-sm text-muted-foreground">만든 사람: {{ current.nickname }}</p>
      </div>
    </UiCard>
    <UiCard v-else class="py-20 text-center text-muted-foreground">
      <p class="text-xl">아직 발표 중인 작품이 없어요.</p>
      <p v-if="!isAdmin" class="mt-2 text-sm">선생님이 발표를 시작하면 이곳에 나타나요.</p>
      <UiButton v-else class="mt-4" @click="go(1)">첫 발표 시작</UiButton>
    </UiCard>
  </div>
</template>
