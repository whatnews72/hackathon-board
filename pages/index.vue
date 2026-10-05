<script setup lang="ts">
import type { Team } from '~/types'

const supabase = useSupabase()
const { nickname, login } = useNickname()
const name = ref(nickname.value)
// 저장된 닉네임은 화면이 뜬 뒤에 읽히므로, 아직 비어 있으면 채워 준다
watch(nickname, (v) => { if (!name.value) name.value = v })
const teamId = ref('')
const teams = ref<Team[]>([])
const error = ref('')
const siteTitle = useState<string>('siteTitle', () => '해커톤 보드')

onMounted(async () => {
  const { data } = await supabase.from('teams').select('*').order('created_at')
  teams.value = (data ?? []) as Team[]
})

function enter() {
  if (name.value.trim().length < 1) return (error.value = '닉네임을 입력해 주세요!')
  if (!teamId.value) return (error.value = '팀을 선택해 주세요!')
  login(name.value, teamId.value)
  navigateTo('/board')
}
</script>

<template>
  <div class="mx-auto mt-10 max-w-md">
    <h1 class="mb-2 text-center text-4xl font-extrabold text-primary">🚀 {{ siteTitle }}</h1>
    <p class="mb-6 text-center text-muted-foreground">닉네임과 팀을 정하고 아이디어를 모아 보세요!</p>
    <UiCard class="space-y-4 p-6">
      <div>
        <label class="mb-1 block font-semibold">닉네임</label>
        <UiInput v-model="name" maxlength="12" placeholder="예) 코딩왕" @keyup.enter="enter" />
      </div>
      <div>
        <label class="mb-2 block font-semibold">우리 팀</label>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="t in teams" :key="t.id"
            class="rounded-md border-2 p-3 font-bold transition"
            :style="{ borderColor: teamId === t.id ? t.color : 'transparent', background: t.color + '22' }"
            @click="teamId = t.id"
          >{{ t.name }}</button>
        </div>
        <p v-if="!teams.length" class="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          선생님이 아직 팀을 만들지 않았어요. 잠시 후 다시 확인해 주세요!
        </p>
      </div>
      <p v-if="error" class="text-sm font-semibold text-destructive">{{ error }}</p>
      <UiButton size="lg" class="w-full" :disabled="!teams.length" @click="enter">입장하기</UiButton>
    </UiCard>
    <p class="mt-4 flex justify-center gap-4 text-sm">
      <NuxtLink to="/share" class="text-muted-foreground underline">접속 QR·주소 보기</NuxtLink>
      <NuxtLink to="/admin" class="text-muted-foreground underline">교사 메뉴</NuxtLink>
    </p>
  </div>
</template>
