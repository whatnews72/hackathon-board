// 교사 비밀번호를 세션에만 저장하고, 관리자 API 호출을 감싼다
export function useAdmin() {
  const password = useState<string>('adminPw', () => '')
  if (import.meta.client && !password.value) {
    password.value = sessionStorage.getItem('adminPw') ?? ''
  }

  async function call(action: string, extra: Record<string, unknown> = {}) {
    return await $fetch('/api/admin/action', {
      method: 'POST',
      body: { password: password.value, action, ...extra },
    })
  }

  async function login(pw: string) {
    password.value = pw
    try {
      await call('check')
      sessionStorage.setItem('adminPw', pw)
      return true
    } catch {
      password.value = ''
      return false
    }
  }

  const isAdmin = computed(() => !!password.value)
  return { isAdmin, login, call }
}
