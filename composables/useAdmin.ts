// 교사 비밀번호를 세션에만 저장하고, 관리자 API 호출을 감싼다
export function useAdmin() {
  const password = useState<string>('adminPw', () => '')

  // 브라우저 저장값은 화면이 뜬 뒤에 읽는다 (서버가 만든 화면과 처음 화면을 같게 맞추기 위함)
  onMounted(() => {
    if (!password.value) password.value = sessionStorage.getItem('adminPw') ?? ''
  })

  async function call(action: string, extra: Record<string, unknown> = {}) {
    return await $fetch('/api/admin/action', {
      method: 'POST',
      body: { password: password.value, action, ...extra },
    })
  }

  // 교사 비밀번호를 함께 보내는 일반 API 호출 (평가 제출, 결과 미리보기 등)
  async function api<T = unknown>(path: string, extra: Record<string, unknown> = {}) {
    return await $fetch<T>(path, { method: 'POST', body: { password: password.value, ...extra } })
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
  return { isAdmin, password, login, call, api }
}
