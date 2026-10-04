<script setup lang="ts">
import { Lightbulb, Image, Presentation, Settings } from 'lucide-vue-next'

const { nickname, logout } = useNickname()
const route = useRoute()
const siteTitle = useSiteTitle() // 앱 전체에서 한 번만 구독 (다른 곳은 useState('siteTitle') 로 읽기)

const links = [
  { to: '/board', label: '아이디어 보드', icon: Lightbulb },
  { to: '/gallery', label: '작품 갤러리', icon: Image },
  { to: '/present', label: '발표', icon: Presentation },
  { to: '/admin', label: '교사', icon: Settings },
]

function leave() {
  logout()
  navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen">
    <header v-if="route.path !== '/'" class="sticky top-0 z-10 border-b border-border bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <NuxtLink to="/board" class="mr-4 text-xl font-extrabold text-primary">🚀 {{ siteTitle }}</NuxtLink>
        <nav class="flex flex-1 flex-wrap gap-1">
          <NuxtLink
            v-for="l in links" :key="l.to" :to="l.to"
            class="flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold hover:bg-muted"
            active-class="bg-secondary text-primary"
          >
            <component :is="l.icon" class="h-4 w-4" /> {{ l.label }}
          </NuxtLink>
        </nav>
        <span v-if="nickname" class="text-sm text-muted-foreground">👤 {{ nickname }}</span>
        <UiButton variant="ghost" size="sm" @click="leave">{{ nickname ? '나가기' : '처음으로' }}</UiButton>
      </div>
    </header>
    <main class="mx-auto max-w-6xl p-4">
      <NuxtPage />
    </main>
  </div>
</template>
