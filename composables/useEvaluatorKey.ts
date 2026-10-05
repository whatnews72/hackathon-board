// 학생 평가자를 구분하는 키: 팀 + 닉네임으로 만든다.
// 기기가 달라도(폰/PC) 같은 팀·닉네임으로 다시 입장하면 같은 키가 되어, 이전에 남긴 점수를 불러와 수정할 수 있다.
export function useEvaluatorKey() {
  const { nickname, teamId } = useNickname()
  return computed(() => (nickname.value && teamId.value ? `s:${teamId.value}:${nickname.value}` : ''))
}
