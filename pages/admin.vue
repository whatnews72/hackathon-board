<script setup lang="ts">
import type { Team, Idea, Project } from '~/types'

const { isAdmin, login, call } = useAdmin()
const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: ideas } = useRealtimeTable<Idea>('ideas')
const { rows: projects } = useRealtimeTable<Project>('projects')
const siteTitle = useState<string>('siteTitle', () => '해커톤 보드')

const pw = ref('')
const error = ref('')
const message = ref('')
const titleDraft = ref('')
const bulkCount = ref(4)
const newTeam = reactive({ name: '', color: '#6366f1' })
// 팀별 수정 중인 값 (저장 전까지 화면에만 보관)
const edits = reactive<Record<string, { name: string; color: string }>>({})

const palette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// 팀 목록이 바뀌면 수정 값을 채운다 (입력 중인 값은 유지)
watch(teams, (list) => {
  for (const t of list) edits[t.id] ??= { name: t.name, color: t.color }
}, { immediate: true, deep: true })
watch(siteTitle, (v) => { if (!titleDraft.value) titleDraft.value = v }, { immediate: true })

// 실패 시 서버 메시지를 보여주는 호출 래퍼
async function run(action: string, extra: Record<string, unknown> = {}, okMessage = '') {
  try {
    await call(action, extra)
    message.value = okMessage
    return true
  } catch (e: any) {
    message.value = e?.data?.statusMessage ?? '실패했어요. 다시 시도해 주세요.'
    return false
  }
}

async function doLogin() {
  error.value = (await login(pw.value)) ? '' : '비밀번호가 틀렸어요.'
}

const saveTitle = () => run('updateTitle', { title: titleDraft.value }, '제목을 저장했어요.')
const createTeams = () => run('createTeams', { count: bulkCount.value }, `${bulkCount.value}개 팀을 만들었어요.`)
const saveTeam = (t: Team) => run('updateTeam', { id: t.id, ...edits[t.id] }, `${edits[t.id].name} 저장 완료`)

async function addTeam() {
  const color = newTeam.color || palette[teams.value.length % palette.length]
  if (await run('addTeam', { name: newTeam.name, color }, '팀을 추가했어요.')) newTeam.name = ''
}

// 팀 삭제: 함께 지워질 카드 수를 알려 준다
function removeTeam(t: Team) {
  const ideaCount = ideas.value.filter((i) => i.team_id === t.id).length
  const projectCount = projects.value.filter((p) => p.team_id === t.id).length
  if (confirm(`"${t.name}" 팀을 삭제할까요?\n이 팀의 아이디어 ${ideaCount}개, 작품 ${projectCount}개도 함께 삭제됩니다.`)) {
    run('deleteTeam', { id: t.id }, '팀을 삭제했어요.')
  }
}

// 확인창 후 삭제
function remove(action: string, id: string, label: string) {
  if (confirm(`"${label}" 을(를) 삭제할까요?`)) run(action, { id })
}

async function startPresent(id: string) {
  await run('present', { id })
  navigateTo('/present')
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-extrabold">🧑‍🏫 교사 관리</h1>

    <UiCard v-if="!isAdmin" class="mx-auto max-w-sm space-y-3">
      <label class="font-semibold">교사 비밀번호</label>
      <UiInput v-model="pw" type="password" @keyup.enter="doLogin" />
      <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
      <UiButton class="w-full" @click="doLogin">확인</UiButton>
    </UiCard>

    <div v-else class="space-y-6">
      <p v-if="message" class="rounded-md bg-secondary p-3 text-sm font-semibold">{{ message }}</p>

      <UiCard class="space-y-3">
        <h2 class="font-extrabold">행사 제목</h2>
        <div class="flex gap-2">
          <UiInput v-model="titleDraft" maxlength="30" placeholder="예) 부춘중 해커톤" @keyup.enter="saveTitle" />
          <UiButton @click="saveTitle">저장</UiButton>
        </div>
        <p class="text-sm text-muted-foreground">모든 화면의 제목과 브라우저 탭 이름이 바로 바뀝니다.</p>
      </UiCard>

      <UiCard class="space-y-4">
        <h2 class="font-extrabold">팀 관리 ({{ teams.length }}팀)</h2>

        <div class="flex flex-wrap items-center gap-2 rounded-md bg-muted p-3">
          <span class="font-semibold">팀 한 번에 만들기</span>
          <input v-model.number="bulkCount" type="number" min="1" max="20" class="h-11 w-20 rounded-md border border-border px-3" />
          <span>개</span>
          <UiButton variant="secondary" @click="createTeams">만들기</UiButton>
          <span class="text-sm text-muted-foreground">(현재 팀 뒤에 "N팀" 이름으로 추가)</span>
        </div>

        <div v-for="t in teams" :key="t.id" class="flex flex-wrap items-center gap-2">
          <input v-if="edits[t.id]" v-model="edits[t.id].color" type="color" class="h-11 w-14 rounded-md" />
          <UiInput v-if="edits[t.id]" v-model="edits[t.id].name" maxlength="20" class="max-w-xs flex-1" @keyup.enter="saveTeam(t)" />
          <UiButton size="sm" @click="saveTeam(t)">저장</UiButton>
          <UiButton size="sm" variant="destructive" @click="removeTeam(t)">삭제</UiButton>
        </div>
        <p v-if="!teams.length" class="text-sm text-muted-foreground">아직 팀이 없어요. 위에서 팀을 만들어 주세요.</p>

        <div class="flex gap-2 border-t border-border pt-3">
          <UiInput v-model="newTeam.name" maxlength="20" placeholder="팀 하나 직접 추가 (예: 불꽃팀)" @keyup.enter="addTeam" />
          <input v-model="newTeam.color" type="color" class="h-11 w-14 rounded-md" />
          <UiButton @click="addTeam">추가</UiButton>
        </div>
      </UiCard>

      <UiCard class="space-y-2">
        <h2 class="font-extrabold">작품 ({{ projects.length }})</h2>
        <div v-for="p in projects" :key="p.id" class="flex items-center justify-between gap-2 border-b border-border py-2">
          <span>{{ p.title }} <small class="text-muted-foreground">- {{ p.nickname }}</small></span>
          <span class="flex gap-1">
            <UiButton size="sm" variant="secondary" @click="startPresent(p.id)">발표</UiButton>
            <UiButton size="sm" variant="destructive" @click="remove('deleteProject', p.id, p.title)">삭제</UiButton>
          </span>
        </div>
      </UiCard>

      <UiCard class="space-y-2">
        <h2 class="font-extrabold">아이디어 ({{ ideas.length }})</h2>
        <div v-for="i in ideas" :key="i.id" class="flex items-center justify-between gap-2 border-b border-border py-2">
          <span class="break-words">{{ i.content }} <small class="text-muted-foreground">- {{ i.nickname }}</small></span>
          <UiButton size="sm" variant="destructive" @click="remove('deleteIdea', i.id, i.content)">삭제</UiButton>
        </div>
      </UiCard>
    </div>
  </div>
</template>
