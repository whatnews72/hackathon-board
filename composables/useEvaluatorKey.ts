// 학생 평가자를 구분하는 랜덤 키 (닉네임이 같아도 서로 다른 사람으로 처리, 한 사람이 한 작품에 한 번만 점수 제출)
export function useEvaluatorKey() {
  const key = useState<string>('evaluatorKey', () => '')

  onMounted(() => {
    if (key.value) return
    try {
      let saved = localStorage.getItem('evaluatorKey')
      if (!saved) {
        saved = crypto.randomUUID()
        localStorage.setItem('evaluatorKey', saved)
      }
      key.value = saved
    } catch {
      // 저장소를 쓸 수 없으면 이 화면을 연 동안만 쓰는 임시 키
      key.value = crypto.randomUUID()
    }
  })

  return key
}
