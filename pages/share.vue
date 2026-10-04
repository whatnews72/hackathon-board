<script setup lang="ts">
// 교실 화면에 띄워 학생들이 QR 스캔 또는 주소 입력으로 접속하게 하는 화면
const siteTitle = useState<string>('siteTitle', () => '해커톤 보드')
</script>

<template>
  <div class="mx-auto max-w-xl py-6 text-center">
    <h1 class="mb-2 text-3xl font-extrabold">📱 {{ siteTitle }}</h1>
    <p class="mb-6 text-lg text-muted-foreground">카메라로 QR을 찍거나 아래 주소를 입력하세요!</p>
    <UiCard class="p-6">
      <ShareCard />
    </UiCard>
    <p class="mt-4 text-sm text-muted-foreground">
      QR은 지금 열어 둔 주소로 만들어져요. 학생용 주소(배포 주소)로 접속한 화면에서 보여 주세요.
    </p>
  </div>
</template>
