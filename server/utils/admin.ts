import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

// 서버 전용 service key 클라이언트 (학생 요청도 서버를 거쳐 안전하게 처리할 때 사용)
export function serviceClient(event: H3Event) {
  const cfg = useRuntimeConfig(event)
  return createClient(cfg.public.supabaseUrl, cfg.supabaseServiceKey)
}

// 교사 비밀번호를 검증하고 service key 클라이언트를 돌려준다
export async function adminClient(event: H3Event, password: string | undefined) {
  const cfg = useRuntimeConfig(event)
  if (!cfg.adminPassword || password !== cfg.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: '교사 비밀번호가 올바르지 않습니다.' })
  }
  return serviceClient(event)
}

// Supabase 가 실패(error)를 돌려주면 성공처럼 넘기지 않고 화면에 오류를 보여준다
export function must<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) {
    throw createError({ statusCode: 500, statusMessage: `데이터베이스 오류: ${res.error.message}` })
  }
  return res
}
