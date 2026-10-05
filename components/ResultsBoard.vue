<script setup lang="ts">
import type { ResultsResponse } from '~/types'

// 평가 결과 순위표 (교실 화면에 띄워도 보이도록 큼직하게)
const props = defineProps<{ data: ResultsResponse }>()

const medal = (rank: number | null) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank ? `${rank}위` : '-')
const fmt = (n: number | null | undefined, digits = 1) => (n === null || n === undefined ? '-' : n.toFixed(digits))
const studentWeight = computed(() => 100 - props.data.teacherWeight)
</script>

<template>
  <div class="space-y-4">
    <p class="text-center text-sm text-muted-foreground">
      최종 점수 = 교사 {{ data.teacherWeight }}% + 학생 {{ studentWeight }}% (100점 만점)
    </p>

    <UiCard
      v-for="r in data.results" :key="r.projectId"
      class="space-y-3 p-5" :class="r.rank === 1 && 'border-2 border-amber-400 bg-amber-50'"
    >
      <div class="flex items-center gap-4">
        <div class="w-16 shrink-0 text-center text-4xl font-extrabold">{{ medal(r.rank) }}</div>
        <img v-if="r.imageUrl" :src="r.imageUrl" :alt="r.title" class="hidden h-16 w-16 rounded-md object-cover sm:block" />
        <div class="min-w-0 flex-1">
          <span class="rounded px-2 py-0.5 text-xs font-bold" :style="{ background: r.teamColor + '33' }">{{ r.teamName }}</span>
          <h3 class="truncate text-xl font-extrabold sm:text-2xl">{{ r.title }}</h3>
        </div>
        <div class="text-right">
          <div class="text-3xl font-extrabold text-primary sm:text-4xl">{{ r.final === null ? '-' : r.final.toFixed(1) }}</div>
          <div class="text-xs text-muted-foreground">{{ r.final === null ? '평가 없음' : '점 / 100' }}</div>
        </div>
      </div>

      <div v-if="r.final !== null" class="h-3 overflow-hidden rounded-full bg-muted">
        <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${r.final}%` }" />
      </div>

      <div class="grid gap-2 text-sm sm:grid-cols-2">
        <div class="rounded-md bg-muted p-3">
          <div class="font-bold">👩‍🎓 학생 평균 {{ fmt(r.studentMean) }} / 5 <span class="font-normal text-muted-foreground">({{ r.studentCount }}명)</span></div>
        </div>
        <div class="rounded-md bg-muted p-3">
          <div class="font-bold">🧑‍🏫 교사 평균 {{ fmt(r.teacherMean) }} / 5 <span class="font-normal text-muted-foreground">({{ r.teacherCount }}명)</span></div>
        </div>
      </div>

      <div v-if="r.studentAvg || r.teacherAvg" class="overflow-x-auto">
        <table class="w-full text-center text-sm">
          <thead>
            <tr class="text-muted-foreground">
              <th class="py-1 text-left font-semibold">항목</th>
              <th v-for="c in data.criteria" :key="c" class="px-2 py-1 font-semibold">{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-1 text-left">학생</td>
              <td v-for="(c, i) in data.criteria" :key="c" class="px-2 py-1">{{ fmt(r.studentAvg?.[i]) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-left">교사</td>
              <td v-for="(c, i) in data.criteria" :key="c" class="px-2 py-1">{{ fmt(r.teacherAvg?.[i]) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UiCard>

    <p v-if="!data.results.length" class="py-10 text-center text-muted-foreground">아직 평가할 작품이 없어요.</p>
  </div>
</template>
