// 평가 점수 집계 (순수 함수: DB 없이 테스트할 수 있다)

export interface EvalRow {
  project_id: string
  evaluator_type: 'student' | 'teacher'
  scores: number[]
}

export interface ProjectResult {
  projectId: string
  studentCount: number
  teacherCount: number
  studentAvg: number[] | null // 기준별 평균 (5점 만점)
  teacherAvg: number[] | null
  studentMean: number | null // 기준 평균들의 평균 (5점 만점)
  teacherMean: number | null
  final: number | null // 최종 점수 (100점 만점)
  rank: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

// 같은 그룹의 점수들을 기준별 평균으로 만든다. 기준 개수가 다른 옛 데이터는 건너뛴다
function groupAverage(rows: EvalRow[], criteriaCount: number) {
  const valid = rows.filter((r) => Array.isArray(r.scores) && r.scores.length === criteriaCount)
  if (!valid.length) return { count: 0, avg: null as number[] | null, mean: null as number | null }
  const avg = Array.from({ length: criteriaCount }, (_, i) =>
    round2(valid.reduce((sum, r) => sum + Number(r.scores[i]), 0) / valid.length),
  )
  return { count: valid.length, avg, mean: round2(avg.reduce((a, b) => a + b, 0) / criteriaCount) }
}

/**
 * 작품별 점수를 집계한다.
 * - 학생/교사 각각 기준별 평균 -> 전체 평균(5점 만점)
 * - 최종 = (교사 평균 x 교사비율 + 학생 평균 x 학생비율) x 20  (100점 만점)
 * - 한쪽 그룹에 평가가 없으면 있는 쪽 점수만 반영한다
 * - 같은 점수는 같은 순위(1, 1, 3 ...), 평가가 없는 작품은 순위 없음
 * 결과는 순위순(순위 없음은 맨 뒤)이며, 동점은 projectIds 순서를 유지한다.
 */
export function aggregate(
  projectIds: string[],
  rows: EvalRow[],
  criteriaCount: number,
  teacherWeight: number,
): ProjectResult[] {
  const w = Math.min(100, Math.max(0, teacherWeight)) / 100

  const list: ProjectResult[] = projectIds.map((projectId) => {
    const mine = rows.filter((r) => r.project_id === projectId)
    const s = groupAverage(mine.filter((r) => r.evaluator_type === 'student'), criteriaCount)
    const t = groupAverage(mine.filter((r) => r.evaluator_type === 'teacher'), criteriaCount)

    let mean: number | null = null
    if (s.mean !== null && t.mean !== null) mean = t.mean * w + s.mean * (1 - w)
    else if (s.mean !== null) mean = s.mean
    else if (t.mean !== null) mean = t.mean

    return {
      projectId,
      studentCount: s.count,
      teacherCount: t.count,
      studentAvg: s.avg,
      teacherAvg: t.avg,
      studentMean: s.mean,
      teacherMean: t.mean,
      final: mean === null ? null : round2(mean * 20),
      rank: null,
    }
  })

  const sorted = list
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.final === null && b.item.final === null) return a.index - b.index
      if (a.item.final === null) return 1
      if (b.item.final === null) return -1
      return b.item.final - a.item.final || a.index - b.index
    })
    .map((x) => x.item)

  sorted.forEach((item, i) => {
    if (item.final === null) return
    const prev = sorted[i - 1]
    item.rank = prev && prev.final === item.final && prev.rank !== null ? prev.rank : i + 1
  })
  return sorted
}
