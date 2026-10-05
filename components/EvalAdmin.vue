<script setup lang="ts">
import type { ResultsResponse } from '~/types'

// 교사 화면의 평가 관리 카드: 시작/마감, 결과 공개, 기준·비율 설정, 제출 현황, CSV, 초기화
const { settings } = useEvalSettings()
const { call, api } = useAdmin()
const siteTitle = useState<string>('siteTitle', () => '해커톤 보드')

const message = ref('')
const data = ref<ResultsResponse | null>(null)
const criteriaDraft = ref<string[]>([])
const weightDraft = ref(50)

// 서버에 저장된 값이 바뀌면 입력칸도 맞춘다
watch(() => settings.value.criteria.join('|'), () => { criteriaDraft.value = [...settings.value.criteria] }, { immediate: true })
watch(() => settings.value.teacher_weight, (v) => { weightDraft.value = v }, { immediate: true })

async function loadData() {
  try { data.value = await api<ResultsResponse>('/api/results') } catch { /* 교사 비밀번호가 없거나 일시 오류면 건너뜀 */ }
}

// 실패 시 서버 메시지를 보여 주는 호출 래퍼
async function run(action: string, extra: Record<string, unknown> = {}, okMessage = '') {
  try {
    await call(action, extra)
    message.value = okMessage
    await loadData()
    return true
  } catch (e: any) {
    message.value = e?.data?.statusMessage ?? '실패했어요. 다시 시도해 주세요.'
    return false
  }
}

const isOpen = computed(() => settings.value.status === 'open')
const toggleStatus = () =>
  run('setEvalStatus', { value: isOpen.value ? 'closed' : 'open' }, isOpen.value ? '평가를 마감했어요.' : '평가를 시작했어요.')
function toggleReveal() {
  if (!settings.value.revealed && !confirm('결과를 공개할까요?\n모든 화면에 순위가 바로 나타나요.')) return
  run('setRevealed', { value: !settings.value.revealed }, settings.value.revealed ? '결과를 숨겼어요.' : '결과를 공개했어요.')
}
const saveWeight = () => run('setTeacherWeight', { value: Number(weightDraft.value) }, '교사 반영 비율을 저장했어요.')
const saveCriteria = () => run('updateCriteria', { criteria: criteriaDraft.value }, '평가 항목을 저장했어요.')
const addCriterion = () => { if (criteriaDraft.value.length < 6) criteriaDraft.value.push('') }
const removeCriterion = (i: number) => { if (criteriaDraft.value.length > 2) criteriaDraft.value.splice(i, 1) }

function resetAll() {
  if (confirm('제출된 모든 평가 점수를 지울까요?\n되돌릴 수 없고, 결과는 다시 비공개가 돼요.')) {
    run('resetEvaluations', {}, '평가 점수를 모두 지웠어요.')
  }
}

function exportResults() {
  if (!data.value) return
  const c = data.value.criteria
  const headers = [
    '순위', '팀', '작품', '제작자', '학생 인원', '교사 인원', '학생 평균(5점)', '교사 평균(5점)', '최종 점수(100점)',
    ...c.map((x) => `학생-${x}`), ...c.map((x) => `교사-${x}`),
  ]
  const rows = data.value.results.map((r) => [
    r.rank ?? '', r.teamName, r.title, r.nickname, r.studentCount, r.teacherCount,
    r.studentMean ?? '', r.teacherMean ?? '', r.final ?? '',
    ...c.map((_, i) => r.studentAvg?.[i] ?? ''), ...c.map((_, i) => r.teacherAvg?.[i] ?? ''),
  ])
  const date = formatKst(new Date().toISOString()).slice(0, 10).replace(/-/g, '')
  downloadCsv(`${safeFileName(siteTitle.value)}_평가결과_${date}.csv`, headers, rows)
  message.value = `평가 결과 ${rows.length}건을 CSV로 내려받았어요.`
}

// 제출 현황은 주기적으로 갱신
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => { loadData(); timer = setInterval(loadData, 10000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <UiCard class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-extrabold">⭐ 평가 관리</h2>
      <div class="flex flex-wrap items-center gap-2 text-sm font-bold">
        <span class="rounded px-2 py-1" :class="isOpen ? 'bg-green-100' : 'bg-secondary'">{{ isOpen ? '평가 진행 중' : '평가 마감' }}</span>
        <span class="rounded px-2 py-1" :class="settings.revealed ? 'bg-amber-100' : 'bg-secondary'">{{ settings.revealed ? '결과 공개됨' : '결과 비공개' }}</span>
      </div>
    </div>

    <p v-if="message" class="rounded-md bg-secondary p-3 text-sm font-semibold">{{ message }}</p>

    <div class="flex flex-wrap gap-2">
      <UiButton :variant="isOpen ? 'secondary' : 'default'" @click="toggleStatus">{{ isOpen ? '평가 마감하기' : '평가 시작하기' }}</UiButton>
      <UiButton :variant="settings.revealed ? 'secondary' : 'default'" @click="toggleReveal">{{ settings.revealed ? '결과 숨기기' : '결과 공개하기' }}</UiButton>
      <NuxtLink to="/evaluate"><UiButton variant="outline">교사 평가·결과 미리보기</UiButton></NuxtLink>
    </div>

    <div class="space-y-2 rounded-md bg-muted p-3">
      <div class="font-semibold">평가 항목 (별점 1~5)</div>
      <div v-for="(_, i) in criteriaDraft" :key="i" class="flex gap-2">
        <UiInput v-model="criteriaDraft[i]" maxlength="10" placeholder="항목 이름" />
        <UiButton variant="ghost" size="sm" :disabled="criteriaDraft.length <= 2" @click="removeCriterion(i)">✕</UiButton>
      </div>
      <div class="flex flex-wrap gap-2">
        <UiButton variant="outline" size="sm" :disabled="criteriaDraft.length >= 6" @click="addCriterion">+ 항목 추가</UiButton>
        <UiButton size="sm" @click="saveCriteria">항목 저장</UiButton>
      </div>
      <p class="text-xs text-muted-foreground">2~6개. 이미 점수가 제출됐다면 이름만 바꿀 수 있고, 개수를 바꾸려면 평가를 초기화하세요.</p>
    </div>

    <div class="flex flex-wrap items-center gap-2 rounded-md bg-muted p-3">
      <span class="font-semibold">교사 반영 비율</span>
      <input v-model.number="weightDraft" type="number" min="0" max="100" class="h-11 w-24 rounded-md border border-border px-3" />
      <span>% (학생 {{ 100 - (Number(weightDraft) || 0) }}%)</span>
      <UiButton variant="secondary" size="sm" @click="saveWeight">저장</UiButton>
    </div>

    <div class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="font-semibold">제출 현황 (현재 점수)</div>
        <div class="flex gap-2">
          <UiButton variant="outline" size="sm" :disabled="!data?.results.length" @click="exportResults">📥 결과 CSV</UiButton>
          <UiButton variant="destructive" size="sm" @click="resetAll">평가 초기화</UiButton>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-border text-left text-muted-foreground">
              <th class="py-1">순위</th><th>작품</th><th class="text-center">학생</th><th class="text-center">교사</th><th class="text-right">점수</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data?.results ?? []" :key="r.projectId" class="border-b border-border">
              <td class="py-1.5">{{ r.rank ?? '-' }}</td>
              <td>{{ r.title }} <small class="text-muted-foreground">({{ r.teamName }})</small></td>
              <td class="text-center">{{ r.studentCount }}명</td>
              <td class="text-center">{{ r.teacherCount }}명</td>
              <td class="text-right font-bold">{{ r.final === null ? '-' : r.final.toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!data?.results.length" class="text-sm text-muted-foreground">아직 작품이 없어요.</p>
    </div>
  </UiCard>
</template>
