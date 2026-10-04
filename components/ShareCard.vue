<script setup lang="ts">
import QRCode from 'qrcode'

// 현재 접속 주소로 QR 코드를 만들고, 주소 글자와 복사 버튼을 함께 보여준다
const url = ref('')
const qr = ref('')
const copied = ref(false)

onMounted(async () => {
  url.value = window.location.origin
  qr.value = await QRCode.toDataURL(url.value, { width: 600, margin: 2 })
})

async function copy() {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch { /* 복사 권한이 없으면 무시 */ }
}
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <img v-if="qr" :src="qr" alt="접속 QR 코드" class="w-full max-w-sm rounded-lg border border-border bg-white p-2" />
    <div v-else class="h-64 w-64 animate-pulse rounded-lg bg-muted" />
    <p class="break-all text-center text-2xl font-extrabold text-primary sm:text-3xl">{{ url }}</p>
    <UiButton variant="outline" @click="copy">{{ copied ? '복사했어요!' : '주소 복사' }}</UiButton>
  </div>
</template>
