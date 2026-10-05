<script setup lang="ts">
import { ThumbsUp, Plus } from 'lucide-vue-next'
import type { Team, Idea } from '~/types'

const supabase = useSupabase()
const { nickname, teamId, ready } = useNickname()
const { rows: teams } = useRealtimeTable<Team>('teams')
const { rows: ideas } = useRealtimeTable<Idea>('ideas')
const drafts = reactive<Record<string, string>>({})
const liked = ref<string[]>([])
const errorMsg = ref('')

onMounted(() => {
  try { liked.value = JSON.parse(localStorage.getItem('likedIdeas') ?? '[]') } catch { /* 무시 */ }
})

const byTeam = (id: string) =>
  ideas.value.filter((i) => i.team_id === id).sort((a, b) => b.likes - a.likes)

async function add(team: Team) {
  const content = (drafts[team.id] ?? '').trim()
  if (!content) return
  if (!nickname.value) return (errorMsg.value = '글을 쓰려면 먼저 닉네임으로 입장해 주세요.')
  errorMsg.value = ''
  const { error } = await supabase.from('ideas').insert({ team_id: team.id, nickname: nickname.value, content })
  if (error) {
    // 실패하면 쓴 글은 그대로 두고 이유를 알려 준다
    errorMsg.value = `아이디어를 저장하지 못했어요. (${error.message})`
    return
  }
  drafts[team.id] = ''
}

async function like(idea: Idea) {
  if (!nickname.value) return (errorMsg.value = '좋아요를 누르려면 먼저 닉네임으로 입장해 주세요.')
  if (liked.value.includes(idea.id)) return // 한 아이디어에 한 번만
  liked.value.push(idea.id)
  localStorage.setItem('likedIdeas', JSON.stringify(liked.value))
  await supabase.rpc('like_idea', { p_id: idea.id })
}
</script>

<template>
  <div>
    <h1 class="mb-4 text-2xl font-extrabold">💡 팀별 아이디어 보드</h1>
    <p v-if="ready && !nickname" class="mb-4 rounded-md bg-secondary p-3 text-sm font-semibold">
      지금은 보기만 할 수 있어요. 글을 쓰려면 <NuxtLink to="/" class="text-primary underline">닉네임으로 입장하기</NuxtLink>
    </p>
    <p v-if="errorMsg" class="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-destructive">{{ errorMsg }}</p>
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <section
        v-for="t in teams" :key="t.id"
        class="rounded-lg p-3" :style="{ background: t.color + '18' }"
      >
        <h2 class="mb-3 flex items-center gap-2 text-lg font-extrabold">
          <span class="h-3 w-3 rounded-full" :style="{ background: t.color }" />
          {{ t.name }}
          <span v-if="t.id === teamId" class="rounded bg-white px-2 text-xs">우리 팀</span>
        </h2>
        <div class="mb-3 flex gap-2">
          <UiInput v-model="drafts[t.id]" maxlength="300" placeholder="아이디어를 적어요" @keyup.enter="add(t)" />
          <UiButton @click="add(t)"><Plus class="h-5 w-5" /></UiButton>
        </div>
        <div class="space-y-2">
          <UiCard v-for="i in byTeam(t.id)" :key="i.id" class="p-3">
            <p class="whitespace-pre-wrap break-words">{{ i.content }}</p>
            <div class="mt-2 flex items-center justify-between text-sm text-muted-foreground">
              <span>{{ i.nickname }}</span>
              <button
                class="flex items-center gap-1 rounded-md px-2 py-1 font-semibold hover:bg-muted"
                :class="liked.includes(i.id) && 'text-primary'" @click="like(i)"
              ><ThumbsUp class="h-4 w-4" /> {{ i.likes }}</button>
            </div>
          </UiCard>
          <p v-if="!byTeam(t.id).length" class="py-4 text-center text-sm text-muted-foreground">첫 아이디어를 올려 보세요!</p>
        </div>
      </section>
    </div>
  </div>
</template>
