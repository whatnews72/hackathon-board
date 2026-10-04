// 닉네임 없이 들어오면 입장 화면으로 보낸다 (교사 화면과 QR 공유 화면은 닉네임 없이도 열 수 있다)
const OPEN_PATHS = ['/', '/admin', '/share']

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || OPEN_PATHS.includes(to.path)) return
  const { nickname } = useNickname()
  if (!nickname.value) return navigateTo('/')
})
