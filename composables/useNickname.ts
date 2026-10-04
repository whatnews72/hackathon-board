// 닉네임/팀을 localStorage 에 저장 (가입 없는 입장 방식)
export function useNickname() {
  const nickname = useState<string>('nickname', () => '')
  const teamId = useState<string>('teamId', () => '')

  if (import.meta.client && !nickname.value) {
    nickname.value = localStorage.getItem('nickname') ?? ''
    teamId.value = localStorage.getItem('teamId') ?? ''
  }

  function login(name: string, team: string) {
    nickname.value = name.trim()
    teamId.value = team
    localStorage.setItem('nickname', nickname.value)
    localStorage.setItem('teamId', team)
  }

  function logout() {
    nickname.value = ''
    teamId.value = ''
    localStorage.removeItem('nickname')
    localStorage.removeItem('teamId')
  }

  return { nickname, teamId, login, logout }
}
