<script setup lang="ts">
import { Heart, ExternalLink, Plus } from 'lucide-vue-next'
import type { Team, Project } from '~/types'

const supabase = useSupabase()
const { nickname, teamId, ready } = useNickname()
const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: projects } = useRealtimeTable<Project>('projects')

const showForm = ref(false)
const form = reactive({ title: '', description: '', link: '' })
const file = ref<File | null>(null) // 대표 이미지
const docFile = ref<File | null>(null) // 발표 자료 (PPT/PDF)
const fileKey = ref(0) // 올리기가 끝나면 파일 선택칸을 비우기 위한 값
const docInput = ref<HTMLInputElement | null>(null)
const notice = ref('')
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

// 발표 자료 칸에서 파일을 골랐을 때: 올릴 수 없는 파일이면 바로 이유를 알려 준다
function pickDoc(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  errorMsg.value = ''
  notice.value = ''
  const problem = f ? validateDoc(f) : ''
  if (problem) { input.value = ''; docFile.value = null; errorMsg.value = problem; return }
  docFile.value = f
}

// 대표 이미지 칸에서 파일을 골랐을 때: PDF/PPT 를 골랐다면 발표 자료로 옮기고, 그림이 아니면 안내한다
function pickImage(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  errorMsg.value = ''
  notice.value = ''
  if (f && docContentType(f.name)) {
    const problem = validateDoc(f)
    input.value = ''
    file.value = null
    if (problem) { errorMsg.value = problem; return }
    docFile.value = f
    // 발표 자료 칸에도 같은 파일이 보이도록 채운다 (지원하지 않는 브라우저면 아래 안내 문구로 충분)
    try {
      const dt = new DataTransfer()
      dt.items.add(f)
      if (docInput.value) docInput.value.files = dt.files
    } catch { /* 무시 */ }
    notice.value = `'${f.name}'은 그림이 아니라서 발표 자료로 올릴게요.`
    return
  }
  if (f && !f.type.startsWith('image/')) {
    input.value = ''
    file.value = null
    errorMsg.value = '대표 이미지에는 그림 파일(JPG, PNG 등)만 올릴 수 있어요. PPT·PDF는 아래 발표 자료 칸에 올려 주세요.'
    return
  }
  file.value = f
}

async function submit() {
  if (saving.value) return
  errorMsg.value = ''
  notice.value = ''
  if (!nickname.value) return (errorMsg.value = '작품을 올리려면 먼저 닉네임으로 입장해 주세요.')
  if (!form.title.trim()) return (errorMsg.value = '작품 제목을 입력해 주세요.')
  if (!chosenTeam.value) return (errorMsg.value = '팀을 선택해 주세요.')
  if (docFile.value) {
    const problem = validateDoc(docFile.value)
    if (problem) return (errorMsg.value = problem)
  }
  saving.value = true
  try {
    let image_url = ''
    if (file.value) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${file.value.name.split('.').pop()}`
      const { error } = await supabase.storage.from('project-images').upload(path, file.value)
      if (error) throw new Error(`이미지를 올리지 못했어요. (${error.message})`)
      image_url = supabase.storage.from('project-images').getPublicUrl(path).data.publicUrl
    }
    // 발표 자료(PPT/PDF): 파일 이름은 한글이 있어도 되도록 따로 저장하고, 저장소에는 영문 이름으로 올린다
    let file_url = ''
    let file_name = ''
    if (docFile.value) {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${docExt(docFile.value.name)}`
      const { error } = await supabase.storage.from('project-files').upload(path, docFile.value, {
        contentType: docContentType(docFile.value.name),
      })
      if (error) throw new Error(`발표 자료를 올리지 못했어요. (${error.message})`)
      file_url = supabase.storage.from('project-files').getPublicUrl(path).data.publicUrl
      file_name = docFile.value.name.slice(0, 100)
    }
    const { error } = await supabase.from('projects').insert({
      team_id: chosenTeam.value, nickname: nickname.value, ...form, image_url, file_url, file_name,
    })
    if (error) throw new Error(`작품을 저장하지 못했어요. (${error.message})`)
    Object.assign(form, { title: '', description: '', link: '' })
    file.value = null
    docFile.value = null
    fileKey.value++
    showForm.value = false
  } catch (e: any) {
    // 실패하면 입력한 내용은 그대로 두고 이유를 보여준다
    errorMsg.value = e?.message ?? '알 수 없는 오류가 났어요. 다시 시도해 주세요.'
  } finally {
    saving.value = false
  }
}

async function vote(p: Project) {
  if (!nickname.value) return (errorMsg.value = '투표하려면 먼저 닉네임으로 입장해 주세요.')
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

    <p v-if="ready && !nickname" class="mb-4 rounded-md bg-secondary p-3 text-sm font-semibold">
      지금은 보기만 할 수 있어요. 작품을 올리거나 투표하려면 <NuxtLink to="/" class="text-primary underline">닉네임으로 입장하기</NuxtLink>
    </p>
    <p v-if="errorMsg && !showForm" class="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ errorMsg }}</p>

    <UiCard v-if="showForm" class="mb-6 space-y-3">
      <select v-model="chosenTeam" class="h-11 w-full rounded-md border border-border bg-white px-4">
        <option value="" disabled>우리 팀을 선택하세요</option>
        <option v-for="t in teams" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <UiInput v-model="form.title" maxlength="60" placeholder="작품 제목" />
      <UiTextarea v-model="form.description" placeholder="어떤 작품인지 설명해 주세요" />
      <UiInput v-model="form.link" placeholder="데모/자료 링크 (선택)" />
      <div :key="fileKey" class="space-y-3">
        <label class="block space-y-1">
          <span class="text-sm font-semibold">🖼️ 대표 이미지 (선택)</span>
          <input type="file" accept="image/*" class="block w-full text-sm" @change="pickImage" />
        </label>
        <label class="block space-y-1">
          <span class="text-sm font-semibold">📎 발표 자료 - PPT 또는 PDF (선택, {{ DOC_MAX_MB }}MB까지)</span>
          <input ref="docInput" type="file" :accept="DOC_ACCEPT" class="block w-full text-sm" @change="pickDoc" />
        </label>
        <p v-if="docFile" class="rounded-md bg-green-50 p-2 text-sm font-semibold text-green-700">
          {{ docIcon(docFile.name) }} 발표 자료로 올릴 파일: {{ docFile.name }}
        </p>
        <p v-if="notice" class="rounded-md bg-secondary p-2 text-sm font-semibold">{{ notice }}</p>
      </div>
      <p v-if="errorMsg" class="rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ errorMsg }}</p>
      <div><UiButton :disabled="saving" @click="submit">{{ saving ? '올리는 중…' : '올리기' }}</UiButton></div>
    </UiCard>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiCard v-for="p in sorted" :key="p.id" class="overflow-hidden p-0">
        <img v-if="thumbOf(p)" :src="thumbOf(p)" :alt="p.title" class="h-44 w-full object-cover" />
        <div v-else class="flex h-44 items-center justify-center bg-muted text-4xl">{{ materialOf(p) ? docIcon(materialOf(p)!.url) : '🎨' }}</div>
        <div class="space-y-2 p-4">
          <span
            class="rounded px-2 py-0.5 text-xs font-bold"
            :style="{ background: (teamOf(p.team_id)?.color ?? '#999999') + '33' }"
          >{{ teamOf(p.team_id)?.name }}</span>
          <h3 class="text-lg font-extrabold">{{ p.title }}</h3>
          <p class="line-clamp-3 text-sm text-muted-foreground">{{ p.description }}</p>
          <a
            v-if="materialOf(p)" :href="materialOf(p)!.url" target="_blank" rel="noopener"
            class="flex items-center gap-1 text-sm font-semibold text-primary"
          >{{ docIcon(materialOf(p)!.url) }} <span class="truncate">{{ materialOf(p)!.name }}</span></a>
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
