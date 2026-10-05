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

// 작품에 딸린 이미지/발표 자료 파일을 저장소에서 지운다 (실패해도 작품 삭제 결과에는 영향 없음)
export async function removeStoredFiles(
  db: ReturnType<typeof serviceClient>,
  rows: { image_url?: string | null; file_url?: string | null }[],
) {
  const pathOf = (url: string | null | undefined, bucket: string) => {
    const part = String(url ?? '').split(`/${bucket}/`)[1]
    return part ? decodeURIComponent(part.split('?')[0]) : ''
  }
  const images = rows.map((r) => pathOf(r.image_url, 'project-images')).filter(Boolean)
  const files = rows.map((r) => pathOf(r.file_url, 'project-files')).filter(Boolean)
  try {
    if (images.length) await db.storage.from('project-images').remove(images)
    if (files.length) await db.storage.from('project-files').remove(files)
  } catch { /* 파일 정리 실패는 무시 */ }
}

// Supabase 가 실패(error)를 돌려주면 성공처럼 넘기지 않고 화면에 오류를 보여준다
export function must<T extends { error: { message: string } | null }>(res: T): T {
  if (res.error) {
    throw createError({ statusCode: 500, statusMessage: `데이터베이스 오류: ${res.error.message}` })
  }
  return res
}
