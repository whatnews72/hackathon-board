import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

// 교사 비밀번호를 검증하고 service key 클라이언트를 돌려준다
export async function adminClient(event: H3Event, password: string | undefined) {
  const cfg = useRuntimeConfig(event)
  if (!cfg.adminPassword || password !== cfg.adminPassword) {
    throw createError({ statusCode: 401, statusMessage: '교사 비밀번호가 올바르지 않습니다.' })
  }
  return createClient(cfg.public.supabaseUrl, cfg.supabaseServiceKey)
}
