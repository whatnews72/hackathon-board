// 학생이 입장/퇴장할 때 이전에 제출한 점수를 모두 지운다 (평가자 키를 아는 본인만 가능)
export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: string }>(event)
  const key = String(body.key ?? '')
  if (key.length < 8 || key.length > 64) return { ok: true } // 지울 기록이 없다

  const db = serviceClient(event)
  must(await db.from('evaluations').delete().eq('evaluator_key', key).eq('evaluator_type', 'student'))
  return { ok: true }
})
