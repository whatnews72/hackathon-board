<script setup lang="ts">
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-vue-next'
import type { Team, Project, PresentationState } from '~/types'

const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: projects } = useRealtimeTable<Project>('projects')
const { rows: states } = useRealtimeTable<PresentationState>('presentation_state', 'id')
const { isAdmin, call } = useAdmin()

const message = ref('')
const state = computed(() => states.value[0])
const current = computed(() => projects.value.find((p) => p.id === state.value?.project_id))
const teamOf = (id: string) => teams.value.find((t) => t.id === id)
const team = computed(() => (current.value ? teamOf(current.value.team_id) : undefined))
const index = computed(() => projects.value.findIndex((p) => p.id === current.value?.id))
const firstTeamName = computed(() => (projects.value[0] ? teamOf(projects.value[0].team_id)?.name : ''))

// 팀 색상 위에서 글자가 잘 보이도록 밝은 색이면 검정, 어두운 색이면 흰색 글자
function readableText(hex: string | undefined) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '')
  if (!m) return '#ffffff'
  const n = parseInt(m[1], 16)
  const luminance = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return luminance > 0.6 ? '#111827' : '#ffffff'
}
const teamColor = computed(() => team.value?.color ?? '#6366f1')
// 발표 자료 (이미지 칸에 잘못 올라간 PDF/PPT 도 자료로 취급)
const material = computed(() => (current.value ? materialOf(current.value) : null))

// 초시계: 서버가 기록한 시작 시각(started_at) 기준이라 모든 화면에서 같은 시간이 보인다.
// 기기 시계가 틀려도 되도록 서버 시계와의 차이를 맞춘다.
const now = ref(Date.now())
const clockOffset = ref(0)
async function syncClock() {
  try {
    const t0 = Date.now()
    const res = await $fetch<{ now: number }>('/api/time')
    const t1 = Date.now()
    clockOffset.value = res.now - (t0 + t1) / 2
  } catch { /* 실패하면 기기 시계를 그대로 쓴다 */ }
}
let tick: ReturnType<typeof setInterval> | undefined
let sync: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  syncClock()
  tick = setInterval(() => (now.value = Date.now()), 250)
  sync = setInterval(syncClock, 60000)
})
onBeforeUnmount(() => { clearInterval(tick); clearInterval(sync) })

const elapsed = computed(() => {
  if (!state.value?.started_at || !current.value) return '00:00'
  const start = new Date(state.value.started_at).getTime()
  const s = Math.max(0, Math.floor((now.value + clockOffset.value - start) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
})

// 발표 대상 바꾸기(초시계가 0부터 다시 시작). id 가 없으면 발표 종료
async function present(id?: string) {
  if (!isAdmin.value) return
  try {
    await call('present', id ? { id } : {})
    message.value = ''
  } catch (e: any) {
    message.value = e?.data?.statusMessage ?? '실패했어요. 다시 시도해 주세요.'
  }
}

function go(delta: number) {
  if (!isAdmin.value || !projects.value.length) return
  const len = projects.value.length
  present(projects.value[(Math.max(index.value, -1) + delta + len) % len].id)
}
const restartTimer = () => { if (current.value) present(current.value.id) }

function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  if (e.key === 'ArrowLeft') go(-1)
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-2xl font-extrabold">🎤 발표</h1>
      <div v-if="isAdmin" class="flex flex-wrap items-center gap-2">
        <UiButton variant="outline" aria-label="이전 팀" @click="go(-1)"><ChevronLeft class="h-5 w-5" /></UiButton>
        <UiButton variant="outline" aria-label="다음 팀" @click="go(1)"><ChevronRight class="h-5 w-5" /></UiButton>
        <UiButton variant="outline" :disabled="!current" @click="restartTimer"><RotateCcw class="h-4 w-4" /> 초시계 다시 시작</UiButton>
        <UiButton variant="secondary" @click="present()">발표 종료</UiButton>
      </div>
    </div>

    <p v-if="message" class="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ message }}</p>

    <!-- 발표 순서: 팀 이름 칩 (지난 팀 ✅, 지금 팀 ▶) -->
    <div v-if="projects.length" class="mb-4">
      <div class="mb-1 text-sm font-semibold text-muted-foreground">발표 순서{{ isAdmin ? ' (눌러서 바로 이동)' : '' }}</div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(p, i) in projects" :key="p.id" type="button" :disabled="!isAdmin" :title="p.title"
          class="flex items-center gap-1 rounded-full border-2 px-3 py-1 text-sm font-bold transition disabled:cursor-default"
          :class="p.id === current?.id ? 'scale-105 shadow-md' : 'opacity-80'"
          :style="{
            borderColor: teamOf(p.team_id)?.color ?? '#999999',
            background: p.id === current?.id ? (teamOf(p.team_id)?.color ?? '#999999') : (teamOf(p.team_id)?.color ?? '#999999') + '22',
            color: p.id === current?.id ? readableText(teamOf(p.team_id)?.color) : undefined,
          }"
          @click="present(p.id)"
        >
          <span>{{ p.id === current?.id ? '▶' : index >= 0 && i < index ? '✅' : i + 1 }}</span>
          {{ teamOf(p.team_id)?.name ?? '(팀 없음)' }}
        </button>
      </div>
    </div>

    <UiCard v-if="current" class="overflow-hidden p-0">
      <!-- 발표 중인 팀 이름 + 초시계 -->
      <div
        class="flex flex-wrap items-center justify-between gap-4 px-6 py-5"
        :style="{ background: teamColor, color: readableText(teamColor) }"
      >
        <div>
          <div class="text-sm font-semibold opacity-90">🎤 지금 발표 중인 팀</div>
          <div class="text-4xl font-extrabold sm:text-5xl">{{ team?.name ?? '(팀 없음)' }}</div>
        </div>
        <div class="rounded-lg bg-black/30 px-5 py-3 text-center text-white">
          <div class="text-xs opacity-90">⏱ 초시계</div>
          <div class="font-mono text-4xl font-extrabold sm:text-5xl">{{ elapsed }}</div>
        </div>
      </div>

      <img v-if="thumbOf(current)" :src="thumbOf(current)" :alt="current.title" class="max-h-[50vh] w-full bg-muted object-contain" />
      <div class="space-y-3 p-8 text-center">
        <h2 class="text-4xl font-extrabold">{{ current.title }}</h2>
        <p class="mx-auto max-w-2xl whitespace-pre-wrap text-lg text-muted-foreground">{{ current.description }}</p>
        <a v-if="current.link" :href="current.link" target="_blank" rel="noopener" class="text-primary underline">{{ current.link }}</a>
        <p class="text-sm text-muted-foreground">만든 사람: {{ current.nickname }}</p>
      </div>

      <!-- 발표 자료: PDF 는 화면 안에서 바로 보여주고, PPT 는 다운로드/웹 뷰어로 연다 -->
      <div v-if="material" class="space-y-3 border-t border-border p-6">
        <div class="flex flex-wrap items-center justify-center gap-2">
          <span class="font-bold">{{ docIcon(material.url) }} 발표 자료: {{ material.name }}</span>
          <a
            :href="material.url" target="_blank" rel="noopener"
            class="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted"
          >{{ material.kind === 'pdf' ? '새 탭에서 열기' : '다운로드' }}</a>
          <a
            v-if="material.kind === 'ppt'" :href="officeViewerUrl(material.url)" target="_blank" rel="noopener"
            class="rounded-md border border-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-muted"
          >브라우저에서 보기</a>
        </div>
        <iframe
          v-if="material.kind === 'pdf'" :src="material.url" :title="material.name"
          class="h-[75vh] w-full rounded-md border border-border"
        />
        <p v-else class="text-center text-xs text-muted-foreground">
          PPT는 다운로드해서 열거나 '브라우저에서 보기'(Microsoft Office 웹 뷰어)를 쓰세요. 용량이 큰 파일은 웹 뷰어에서 안 열릴 수 있어요.
        </p>
      </div>
    </UiCard>

    <UiCard v-else class="space-y-3 py-14 text-center">
      <p class="text-xl text-muted-foreground">아직 발표 중인 작품이 없어요.</p>
      <div class="font-mono text-5xl font-extrabold text-muted-foreground">⏱ 00:00</div>
      <template v-if="isAdmin && projects.length">
        <p class="text-sm text-muted-foreground">첫 발표 팀: <b>{{ firstTeamName }}</b> · 시작 버튼을 누르면 초시계가 바로 시작돼요.</p>
        <UiButton size="lg" @click="go(1)">▶ 첫 발표 시작</UiButton>
      </template>
      <p v-else-if="isAdmin" class="text-sm text-muted-foreground">발표할 작품이 아직 없어요. 작품 갤러리에 작품이 올라오면 시작할 수 있어요.</p>
      <p v-else class="text-sm text-muted-foreground">
        선생님이 발표를 시작하면 이곳에 팀 이름과 초시계가 나타나요.
        <NuxtLink to="/admin" class="text-primary underline">교사 로그인</NuxtLink>
      </p>
    </UiCard>
  </div>
</template>
