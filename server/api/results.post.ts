import { aggregate, type EvalRow } from '../utils/scoring'
import { adminClient, serviceClient, must } from '../utils/admin'

// 평가 결과 집계. 결과가 공개된 뒤에는 누구나, 공개 전에는 교사 비밀번호가 있을 때만 볼 수 있다.
export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: string }>(event)
  const db = serviceClient(event)

  const settings = must(await db.from('eval_settings').select('*').eq('id', 1).maybeSingle()).data
  const criteria = ((settings?.criteria ?? []) as string[]) || []
  const teacherWeight = Number(settings?.teacher_weight ?? 50)
  const revealed = settings?.revealed === true

  // 공개 전에는 교사 비밀번호 확인 (틀리면 401, 없으면 403)
  if (!revealed) {
    if (!body.password) {
      throw createError({ statusCode: 403, statusMessage: '결과는 아직 공개되지 않았어요.' })
    }
    await adminClient(event, body.password)
  }

  const [projects, teams, evals] = await Promise.all([
    db.from('projects').select('id, team_id, title, nickname, image_url, created_at').order('created_at'),
    db.from('teams').select('id, name, color').order('created_at'),
    db.from('evaluations').select('project_id, evaluator_type, scores'),
  ])
  const projectRows = must(projects).data ?? []
  const teamRows = must(teams).data ?? []
  const evalRows = (must(evals).data ?? []) as EvalRow[]

  const ranked = aggregate(projectRows.map((p) => p.id as string), evalRows, criteria.length, teacherWeight)

  const results = ranked.map((r) => {
    const p = projectRows.find((x) => x.id === r.projectId)
    const t = teamRows.find((x) => x.id === p?.team_id)
    return {
      ...r,
      title: (p?.title as string) ?? '',
      nickname: (p?.nickname as string) ?? '',
      // 이미지 칸에 잘못 올라간 PDF/PPT 는 그림이 아니므로 제외
      imageUrl: /\.(pdf|pptx?)(\?|$)/i.test(String(p?.image_url ?? '')) ? '' : ((p?.image_url as string) ?? ''),
      teamId: (p?.team_id as string) ?? '',
      teamName: (t?.name as string) ?? '(삭제된 팀)',
      teamColor: (t?.color as string) ?? '#999999',
    }
  })

  return { criteria, teacherWeight, revealed, results }
})
