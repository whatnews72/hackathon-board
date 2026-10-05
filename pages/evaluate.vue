<script setup lang="ts">
import type { Team, Project, ResultsResponse } from '~/types'

const { nickname, teamId, ready } = useNickname()
const { settings } = useEvalSettings()
const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: projects } = useRealtimeTable<Project>('projects')
const { isAdmin, api } = useAdmin()
const evaluatorKey = useEvaluatorKey()
// 닉네임으로 입장한 사람은 교사 비밀번호가 브라우저에 남아 있어도 학생으로 평가한다
const asTeacher = computed(() => isAdmin.value && !nickname.value)

const criteria = computed(() => settings.value.criteria)
const teacherName = ref('선생님')
const drafts = reactive<Record<string, number[]>>({}) // 작성 중인 별점
const mine = reactive<Record<string, number[]>>({}) // 이미 제출한 점수
const errors = reactive<Record<string, string>>({})
const sending = reactive<Record<string, boolean>>({})

const data = ref<ResultsResponse | null>(null)
const preview = ref(false) // 교사의 결과 미리보기
const resultsError = ref('')

const myTeamValid = computed(() => teams.value.some((t) => t.id === teamId.value))
const canEvaluate = computed(() =>
  asTeacher.value ? !!teacherName.value.trim() : !!nickname.value && myTeamValid.value,
)
// 학생은 우리 팀 작품을 평가할 수 없다 / 교사는 모든 작품 평가
const visible = computed(() => projects.value.filter((p) => asTeacher.value || p.team_id !== teamId.value))
const doneCount = computed(() => visible.value.filter((p) => mine[p.id]).length)
const showResults = computed(() => settings.value.revealed || (asTeacher.value && preview.value))
const teamOf = (id: string) => teams.value.find((t) => t.id === id)

// 화면에 보여 줄 별점: 작성 중인 값 -> 제출한 값 -> 0점 순서 (항목 수가 바뀌면 맞지 않는 값은 버림)
function scoresOf(id: string): number[] {
  const len = criteria.value.length
  if (drafts[id]?.length === len) return drafts[id]
  if (mine[id]?.length === len) return mine[id]
  return Array(len).fill(0)
}
function setScore(id: string, index: number, value: number) {
  const next = [...scoresOf(id)]
  next[index] = value
  drafts[id] = next
}

// 평가 요청 본문 (교사/학생 구분)
const who = () =>
  asTeacher.value
    ? { kind: 'teacher', name: teacherName.value.trim() }
    : { kind: 'student', key: evaluatorKey.value, name: nickname.value, teamId: teamId.value }

async function loadMine() {
  if (!asTeacher.value && !evaluatorKey.value) return
  try {
    const res = await api<{ items: { projectId: string; scores: number[] }[] }>('/api/my-evaluations', who())
    for (const k of Object.keys(mine)) delete mine[k]
    for (const item of res.items) mine[item.projectId] = item.scores
  } catch { /* 불러오지 못해도 새로 평가할 수 있다 */ }
}

async function submit(p: Project) {
  const scores = [...scoresOf(p.id)]
  if (scores.some((s) => s < 1)) return (errors[p.id] = '모든 항목에 별점을 눌러 주세요.')
  errors[p.id] = ''
  sending[p.id] = true
  try {
    await api('/api/evaluate', { ...who(), projectId: p.id, scores })
    mine[p.id] = [...scores]
    delete drafts[p.id]
    if (asTeacher.value) { try { localStorage.setItem('teacherName', teacherName.value.trim()) } catch { /* 무시 */ } }
  } catch (e: any) {
    errors[p.id] = e?.data?.statusMessage ?? '제출하지 못했어요. 다시 시도해 주세요.'
  } finally {
    sending[p.id] = false
  }
}

async function loadResults() {
  if (!showResults.value) { data.value = null; return }
  try {
    data.value = await api<ResultsResponse>('/api/results')
    resultsError.value = ''
  } catch (e: any) {
    resultsError.value = e?.data?.statusMessage ?? '결과를 불러오지 못했어요.'
  }
}

onMounted(() => {
  try { teacherName.value = localStorage.getItem('teacherName') || '선생님' } catch { /* 무시 */ }
})
watch([evaluatorKey, asTeacher], loadMine, { immediate: true })
watch([() => settings.value.revealed, preview, asTeacher], loadResults, { immediate: true })

// 결과를 보는 동안에는 점수가 바뀌어도 따라가도록 주기적으로 다시 불러온다
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { timer = setInterval(() => { if (showResults.value) loadResults() }, 8000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-4 text-2xl font-extrabold">⭐ 평가하기</h1>

    <!-- 진행 상태 -->
    <p v-if="settings.revealed" class="mb-4 rounded-md bg-amber-100 p-3 text-center font-bold">🏆 최종 결과가 공개됐어요!</p>
    <p v-else-if="settings.status === 'open'" class="mb-4 rounded-md bg-green-100 p-3 text-center font-bold">⭐ 평가가 진행 중이에요. 작품마다 별점을 눌러 주세요!</p>
    <p v-else class="mb-4 rounded-md bg-secondary p-3 text-center font-bold">지금은 평가 시간이 아니에요. 선생님이 시작하면 이곳에 작품이 나타나요.</p>

    <!-- 교사 도구 -->
    <UiCard v-if="asTeacher" class="mb-4 space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <span class="font-semibold">🧑‍🏫 교사 평가</span>
        <UiInput v-model="teacherName" maxlength="20" placeholder="교사 이름" class="max-w-[10rem]" @change="loadMine" />
        <UiButton v-if="!settings.revealed" variant="outline" size="sm" @click="preview = !preview">
          {{ preview ? '미리보기 닫기' : '결과 미리보기' }}
        </UiButton>
      </div>
      <p class="text-sm text-muted-foreground">교사로 로그인한 상태에서는 교사 점수로 제출돼요. 시작/마감/공개는 교사 메뉴에서 해요.</p>
    </UiCard>

    <!-- 입장 안내 -->
    <p v-if="ready && !asTeacher && !nickname" class="mb-4 rounded-md bg-secondary p-3 text-sm font-semibold">
      평가하려면 먼저 <NuxtLink to="/" class="text-primary underline">닉네임으로 입장하기</NuxtLink>
    </p>
    <p v-else-if="ready && !asTeacher && nickname && teams.length && !myTeamValid" class="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">
      팀 정보가 바뀌었어요. <NuxtLink to="/" class="underline">처음 화면에서 다시 입장</NuxtLink>해 주세요.
    </p>

    <!-- 결과 -->
    <section v-if="showResults" class="mb-8">
      <p v-if="preview && !settings.revealed" class="mb-2 text-center text-sm font-semibold text-destructive">교사에게만 보이는 미리보기예요. 아직 학생에게는 공개되지 않았어요.</p>
      <ResultsBoard v-if="data" :data="data" />
      <p v-else-if="resultsError" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ resultsError }}</p>
      <p v-else class="py-6 text-center text-muted-foreground">결과를 불러오는 중…</p>
    </section>

    <!-- 평가 목록 -->
    <section v-if="settings.status === 'open' && canEvaluate">
      <p class="mb-3 text-center text-sm font-semibold text-muted-foreground">
        {{ doneCount }} / {{ visible.length }}개 평가 완료
        <span v-if="!asTeacher"> (우리 팀 작품은 평가할 수 없어요)</span>
      </p>

      <div class="space-y-4">
        <UiCard v-for="p in visible" :key="p.id" class="space-y-3 overflow-hidden p-0">
          <img v-if="thumbOf(p)" :src="thumbOf(p)" :alt="p.title" class="h-40 w-full object-cover" />
          <div class="space-y-3 p-4">
            <div>
              <span class="rounded px-2 py-0.5 text-xs font-bold" :style="{ background: (teamOf(p.team_id)?.color ?? '#999999') + '33' }">{{ teamOf(p.team_id)?.name }}</span>
              <h3 class="text-lg font-extrabold">{{ p.title }}</h3>
              <p v-if="p.description" class="line-clamp-2 text-sm text-muted-foreground">{{ p.description }}</p>
              <a
                v-if="materialOf(p)" :href="materialOf(p)!.url" target="_blank" rel="noopener"
                class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >{{ docIcon(materialOf(p)!.url) }} {{ materialOf(p)!.name }} 보기</a>
            </div>

            <StarRating
              v-for="(c, i) in criteria" :key="c" :label="c" :disabled="sending[p.id]"
              :model-value="scoresOf(p.id)[i]" @update:model-value="setScore(p.id, i, $event)"
            />

            <p v-if="errors[p.id]" class="rounded-md bg-red-50 p-2 text-sm font-semibold text-destructive">{{ errors[p.id] }}</p>
            <div class="flex items-center gap-3">
              <UiButton :disabled="sending[p.id]" @click="submit(p)">
                {{ sending[p.id] ? '제출 중…' : mine[p.id] ? '점수 수정하기' : '제출하기' }}
              </UiButton>
              <span v-if="mine[p.id]" class="text-sm font-semibold text-green-600">✅ 제출했어요</span>
            </div>
          </div>
        </UiCard>
      </div>
      <p v-if="!visible.length" class="py-10 text-center text-muted-foreground">평가할 작품이 아직 없어요.</p>
    </section>
  </div>
</template>
