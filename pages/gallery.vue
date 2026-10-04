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
const voted = ref<string[]>([])

onMounted(() => {
  try { voted.value = JSON.parse(localStorage.getItem('votedProjects') ?? '[]') } catch { /* 무시 */ }
})

const teamOf = (id: string) => teams.value.find((t) => t.id === id)
const sorted = computed(() => [...projects.value].sort((a, b) => b.votes - a.votes))

async function submit() {
  if (!form.title.trim() || saving.value) return
  saving.value = true
  let image_url = ''
  if (file.value) {
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.value.name.split('.').pop()}`
    const { error } = await supabase.storage.from('project-images').upload(path, file.value)
    if (!error) image_url = supabase.storage.from('project-images').getPublicUrl(path).data.publicUrl
  }
  await supabase.from('projects').insert({
    team_id: teamId.value, nickname: nickname.value, ...form, image_url,
  })
  Object.assign(form, { title: '', description: '', link: '' })
  file.value = null
  showForm.value = false
  saving.value = false
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
      <UiInput v-model="form.title" maxlength="60" placeholder="작품 제목" />
      <UiTextarea v-model="form.description" placeholder="어떤 작품인지 설명해 주세요" />
      <UiInput v-model="form.link" placeholder="데모/자료 링크 (선택)" />
      <input type="file" accept="image/*" @change="file = ($event.target as HTMLInputElement).files?.[0] ?? null" />
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
