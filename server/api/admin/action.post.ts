// 교사 전용 작업: 삭제, 팀 관리, 제목 변경, 발표 상태 변경, 평가 관리
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    password?: string
    action:
      | 'check' | 'deleteIdea' | 'deleteProject' | 'deleteAllIdeas' | 'deleteAllProjects'
      | 'addTeam' | 'updateTeam' | 'createTeams' | 'deleteTeam'
      | 'updateTitle' | 'present'
      | 'setEvalStatus' | 'setRevealed' | 'updateCriteria' | 'setTeacherWeight' | 'resetEvaluations'
    id?: string
    name?: string
    color?: string
    title?: string
    count?: number
    value?: string | number | boolean
    criteria?: unknown
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
  const bad = (message: string) => createError({ statusCode: 400, statusMessage: message })
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
    case 'deleteAllIdeas':
      must(await db.from('ideas').delete().not('id', 'is', null))
      break
    case 'deleteAllProjects': {
      // 작품을 지우기 전에 업로드한 이미지 파일 경로를 모아 둔다
      const { data: rows } = must(await db.from('projects').select('image_url'))
      // 작품을 지우면 평가 점수도 함께 지워지고, 발표 중이던 작품은 발표 대상에서 빠진다
      must(await db.from('projects').delete().not('id', 'is', null))
      const paths = (rows ?? [])
        .map((r) => String(r.image_url ?? '').split('/project-images/')[1])
        .filter(Boolean)
        .map((p) => decodeURIComponent(p.split('?')[0]))
      // 이미지 파일 정리는 실패해도 작품 삭제 결과에는 영향을 주지 않는다
      if (paths.length) await db.storage.from('project-images').remove(paths)
      break
    }
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

    // ---- 평가 관리 ----
    case 'setEvalStatus':
      if (body.value !== 'open' && body.value !== 'closed') throw bad('상태 값이 올바르지 않아요.')
      must(await db.from('eval_settings').upsert({ id: 1, status: body.value }))
      break
    case 'setRevealed':
      must(await db.from('eval_settings').upsert({ id: 1, revealed: body.value === true }))
      break
    case 'setTeacherWeight': {
      const weight = Number(body.value)
      if (!Number.isInteger(weight) || weight < 0 || weight > 100) throw bad('교사 비율은 0~100 사이 정수로 입력해 주세요.')
      must(await db.from('eval_settings').upsert({ id: 1, teacher_weight: weight }))
      break
    }
    case 'updateCriteria': {
      // 항목은 2~6개, 이름은 1~10자
      const list = Array.isArray(body.criteria) ? body.criteria.map((c) => String(c ?? '').trim()) : []
      if (list.length < 2 || list.length > 6) throw bad('평가 항목은 2~6개로 만들어 주세요.')
      if (list.some((c) => !c || c.length > 10)) throw bad('항목 이름은 1~10자로 입력해 주세요.')
      if (new Set(list).size !== list.length) throw bad('항목 이름이 서로 겹치지 않게 해 주세요.')
      // 이미 제출된 점수가 있으면 항목 수를 바꿀 수 없다 (이름만 변경 가능)
      const current = must(await db.from('eval_settings').select('criteria').eq('id', 1).maybeSingle()).data
      const currentCount = Array.isArray(current?.criteria) ? current.criteria.length : 4
      if (list.length !== currentCount) {
        const { count: submitted } = must(await db.from('evaluations').select('*', { count: 'exact', head: true }))
        if ((submitted ?? 0) > 0) throw bad('이미 제출된 평가가 있어 항목 수는 바꿀 수 없어요. 평가를 초기화한 뒤 바꿔 주세요.')
      }
      must(await db.from('eval_settings').upsert({ id: 1, criteria: list }))
      break
    }
    case 'resetEvaluations':
      // 모든 점수를 지우고 결과는 다시 비공개로 돌린다
      must(await db.from('evaluations').delete().not('id', 'is', null))
      must(await db.from('eval_settings').upsert({ id: 1, revealed: false }))
      break
  }
  return { ok: true }
})
