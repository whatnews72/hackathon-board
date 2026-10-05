// 투표/좋아요 기록 키 (입장·퇴장 시 초기화)
const EVAL_KEYS = ['votedProjects', 'likedIdeas']

// 투표/좋아요 기록만 초기화 (평가하기 점수는 서버에 남겨 다시 입장해도 수정할 수 있다)
function resetEvaluations() {
  for (const key of EVAL_KEYS) localStorage.removeItem(key)
}

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
    resetEvaluations() // 새로 입장하면 평가 화면도 처음 상태로
  }

  function logout() {
    nickname.value = ''
    teamId.value = ''
    localStorage.removeItem('nickname')
    localStorage.removeItem('teamId')
    resetEvaluations()
  }

  return { nickname, teamId, ready, login, logout }
}
