// 교사 전용 작업: 삭제, 팀 관리, 제목 변경, 발표 상태 변경
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    password?: string
    action:
      | 'check' | 'deleteIdea' | 'deleteProject'
      | 'addTeam' | 'updateTeam' | 'createTeams' | 'deleteTeam'
      | 'updateTitle' | 'present'
    id?: string
    name?: string
    color?: string
    title?: string
    count?: number
  }>(event)
  const db = await adminClient(event, body.password)

  // 이름 검증: 공백 제거 후 1~maxLen 자
  const cleanName = (value: string | undefined, maxLen: number) => {
    const v = (value ?? '').trim()
    if (!v || v.length > maxLen) {
      throw createError({ statusCode: 400, statusMessage: `1~${maxLen}자로 입력해 주세요.` })
    }
    return v
  }
  // Supabase 가 실패(error)를 돌려주면 성공처럼 넘기지 않고 화면에 오류를 보여준다
  const must = <T extends { error: { message: string } | null }>(res: T) => {
    if (res.error) {
      throw createError({ statusCode: 500, statusMessage: `데이터베이스 오류: ${res.error.message}` })
    }
    return res
  }
  const palette = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

  switch (body.action) {
    case 'check':
      return { ok: true }
    case 'deleteIdea':
      must(await db.from('ideas').delete().eq('id', body.id))
      break
    case 'deleteProject':
      must(await db.from('projects').delete().eq('id', body.id))
      break
    case 'addTeam':
      must(await db.from('teams').insert({ name: cleanName(body.name, 20), color: body.color ?? '#6366f1' }))
      break
    case 'updateTeam':
      must(await db.from('teams').update({ name: cleanName(body.name, 20), color: body.color }).eq('id', body.id))
      break
    case 'createTeams': {
      // 현재 팀 수 다음 번호부터 "N팀" 이름으로 일괄 생성
      const count = Math.floor(Number(body.count))
      if (!(count >= 1 && count <= 20)) {
        throw createError({ statusCode: 400, statusMessage: '팀 수는 1~20 사이로 입력해 주세요.' })
      }
      const { count: existing } = must(await db.from('teams').select('*', { count: 'exact', head: true }))
      const start = existing ?? 0
      const rows = Array.from({ length: count }, (_, i) => ({
        name: `${start + i + 1}팀`,
        color: palette[(start + i) % palette.length],
      }))
      must(await db.from('teams').insert(rows))
      break
    }
    case 'deleteTeam':
      must(await db.from('teams').delete().eq('id', body.id))
      break
    case 'updateTitle':
      // 행이 없어도 만들어지도록 upsert 사용
      must(await db.from('site_settings').upsert({ id: 1, title: cleanName(body.title, 30) }))
      break
    case 'present':
      // id 가 없으면 발표 종료
      must(await db
        .from('presentation_state')
        .upsert({ id: 1, project_id: body.id ?? null, started_at: body.id ? new Date().toISOString() : null }))
      break
  }
  return { ok: true }
})
