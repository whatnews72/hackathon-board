// 내가 이미 제출한 점수 조회 (화면에 점수를 다시 채워 주기 위함)
export default defineEventHandler(async (event) => {
  const body = await readBody<{ kind?: 'student' | 'teacher'; key?: string; name?: string; password?: string }>(event)
  const isTeacher = body.kind === 'teacher'
  const db = isTeacher ? await adminClient(event, body.password) : serviceClient(event)

  const evaluatorKey = isTeacher ? `teacher:${String(body.name ?? '').trim()}` : String(body.key ?? '')
  if (evaluatorKey.length < 8 && !isTeacher) return { items: [] }

  const { data } = must(
    await db.from('evaluations').select('project_id, scores').eq('evaluator_key', evaluatorKey),
  )
  return { items: (data ?? []).map((r) => ({ projectId: r.project_id as string, scores: r.scores as number[] })) }
})
