// 닉네임/팀을 localStorage 에 저장 (가입 없는 입장 방식)
export function useNickname() {
  const nickname = useState<string>('nickname', () => '')
  const teamId = useState<string>('teamId', () => '')
  // 브라우저에서 저장값을 읽어 온 뒤 true (서버가 만든 화면과 처음 화면을 같게 맞추기 위함)
  const ready = useState<boolean>('nicknameReady', () => false)

  onMounted(() => {
    if (!nickname.value) {
      nickname.value = localStorage.getItem('nickname') ?? ''
      teamId.value = localStorage.getItem('teamId') ?? ''
    }
    ready.value = true
  })

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

  return { nickname, teamId, ready, login, logout }
}
