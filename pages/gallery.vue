<script setup lang="ts">
import { Heart, ExternalLink, Plus } from 'lucide-vue-next'
import type { Team, Project } from '~/types'

const supabase = useSupabase()
const { nickname, teamId } = useNickname()
const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: projects } = useRealtimeTable<Project>('projects')

const showForm = ref(false)
const form = reactive({ title: '', description: '', link: '' })
const file = ref<File | null>(null)
const saving = ref(false)
const errorMsg = ref('')
const chosenTeam = ref('')
const voted = ref<string[]>([])

// 내 팀이 아직 존재하면 기본 선택, 팀이 바뀌었거나 삭제됐으면 직접 고르게 한다
watch([teams, teamId], () => {
  if (!teams.value.some((t) => t.id === chosenTeam.value)) {
    chosenTeam.value = teams.value.some((t) => t.id === teamId.value) ? teamId.value : ''
  }
}, { immediate: true })

onMounted(() => {
  try { voted.value = JSON.parse(localStorage.getItem('votedProjects') ?? '[]') } catch { /* 무시 */ }
})

const teamOf = (id: string) => teams.value.find((t) => t.id === id)
const sorted = computed(() => [...projects.value].sort((a, b) => b.votes - a.votes))

async function submit() {
  if (saving.value) return
  errorMsg.value = ''
  if (!form.title.trim()) return (errorMsg.value = '작품 제목을 입력해 주세요.')
  if (!chosenTeam.value) return (errorMsg.value = '팀을 선택해 주세요.')
  saving.value = true
  try {
    let image_url = ''
    if (file.value) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.value.name.split('.').pop()}`
      const { error } = await supabase.storage.from('project-images').upload(path, file.value)
      if (error) throw new Error(`이미지를 올리지 못했어요. (${error.message})`)
      image_url = supabase.storage.from('project-images').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('projects').insert({
      team_id: chosenTeam.value, nickname: nickname.value, ...form, image_url,
    })
    if (error) throw new Error(`작품을 저장하지 못했어요. (${error.message})`)
    Object.assign(form, { title: '', description: '', link: '' })
    file.value = null
    showForm.value = false
  } catch (e: any) {
    // 실패하면 입력한 내용은 그대로 두고 이유를 보여준다
    errorMsg.value = e?.message ?? '알 수 없는 오류가 났어요. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

async function vote(p: Project) {
  if (voted.value.includes(p.id)) return
  voted.value.push(p.id)
  localStorage.setItem('votedProjects', JSON.stringify(voted.value))
  await supabase.rpc('vote_project', { p_id: p.id })
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-2xl font-extrabold">🖼️ 작품 갤러리</h1>
      <UiButton @click="showForm = !showForm"><Plus class="h-4 w-4" /> 작품 올리기</UiButton>
    </div>

    <UiCard v-if="showForm" class="mb-6 space-y-3">
      <select v-model="chosenTeam" class="h-11 w-full rounded-md border border-border bg-white px-4">
        <option value="" disabled>우리 팀을 선택하세요</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <UiInput v-model="form.title" maxlength="60" placeholder="작품 제목" />
      <UiTextarea v-model="form.description" placeholder="어떤 작품인지 설명해 주세요" />
      <UiInput v-model="form.link" placeholder="데모/자료 링크 (선택)" />
      <input type="file" accept="image/*" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" />
      <p v-if="errorMsg" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ errorMsg }}</p>
      <div><UiButton :disabled="saving" @click="submit">{{ saving ? '올리는 중…' : '올리기' }}</UiButton></div>
    </UiCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard v-for="p in sorted" :key="p.id" class="overflow-hidden p-0">
        <img v-if="p.image_url" :src="p.image_url" :alt="p.title" class="h-44 w-full object-cover" />
        <div v-else class="flex h-44 items-center justify-center bg-muted text-4xl">🎨</div>
        <div class="space-y-2 p-4">
          <span
            class="rounded px-2 py-0.5 text-xs font-bold"
            :style="{ background: (teamOf(p.team_id)?.color ?? '#999999') + '33' }"
          >{{ teamOf(p.team_id)?.name }}</span>
          <h3 class="text-lg font-extrabold">{{ p.title }}</h3>
          <p class="line-clamp-3 text-sm text-muted-foreground">{{ p.description }}</p>
          <div class="flex items-center justify-between pt-1">
            <a v-if="p.link" :href="p.link" target="_blank" rel="noopener" class="flex items-center gap-1 text-sm text-primary">
              <ExternalLink class="h-4 w-4" /> 링크
            </a>
            <span v-else />
            <button
              class="flex items-center gap-1 rounded-md px-3 py-1 font-semibold hover:bg-muted"
              :class="voted.includes(p.id) && 'text-destructive'" @click="vote(p)"
            ><Heart class="h-4 w-4" /> {{ p.votes }}</button>
          </div>
        </div>
      </UiCard>
    </div>
    <p v-if="!projects.length" class="py-10 text-center text-muted-foreground">아직 올라온 작품이 없어요.</p>
  </div>
</template>
