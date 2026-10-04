// 닉네임 없이 들어오면 입장 화면으로 보낸다
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server || to.path === '/') return
  const { nickname } = useNickname()
  if (!nickname.value) return navigateTo('/')
})
