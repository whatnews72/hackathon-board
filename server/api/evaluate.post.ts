// 평가 제출 (학생/교사). 같은 평가자가 같은 작품에 다시 제출하면 점수가 수정된다.
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    kind?: 'student' | 'teacher'
    key?: string
    name?: string
    teamId?: string
    projectId?: string
    scores?: unknown
    password?: string
  }>(event)
  const bad = (message: string, statusCode = 400) => createError({ statusCode, statusMessage: message })

  const isTeacher = body.kind === 'teacher'
  // 교사는 비밀번호 확인, 학생은 서버 권한으로만 저장 (학생에게 DB 쓰기 권한을 주지 않는다)
  const db = isTeacher ? await adminClient(event, body.password) : serviceClient(event)

  const settings = must(await db.from('eval_settings').select('*').eq('id', 1).maybeSingle()).data
  if (!settings || settings.status !== 'open') throw bad('지금은 평가 시간이 아니에요.', 403)

  const criteria = (settings.criteria ?? []) as string[]
  const scores = body.scores
  const scoresOk =
    Array.isArray(scores) &&
    scores.length === criteria.length &&
    scores.every((s) => Number.isInteger(s) && s >= 1 && s <= 5)
  if (!scoresOk) throw bad('모든 항목에 1~5점을 매겨 주세요.')

  const name = String(body.name ?? '').trim()
  if (!name || name.length > 20) throw bad('이름을 1~20자로 입력해 주세요.')

  let evaluatorKey: string
  if (isTeacher) {
    evaluatorKey = `teacher:${name}`
  } else {
    evaluatorKey = String(body.key ?? '')
    if (evaluatorKey.length < 8 || evaluatorKey.length > 64) throw bad('평가자 정보를 확인할 수 없어요. 새로고침 후 다시 시도해 주세요.')
    if (!body.teamId) throw bad('팀 정보가 없어요. 처음 화면에서 다시 입장해 주세요.')
  }

  const project = must(await db.from('projects').select('id, team_id').eq('id', body.projectId ?? '').maybeSingle()).data
  if (!project) throw bad('작품을 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.', 404)
  if (!isTeacher && project.team_id === body.teamId) throw bad('우리 팀 작품은 평가할 수 없어요.', 403)

  must(
    await db.from('evaluations').upsert(
      {
        project_id: project.id,
        evaluator_type: isTeacher ? 'teacher' : 'student',
        evaluator_key: evaluatorKey,
        evaluator_name: name,
        team_id: isTeacher ? null : body.teamId,
        scores,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,evaluator_key' },
    ),
  )
  return { ok: true }
})
