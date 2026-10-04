import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

// 브라우저에서 하나의 Supabase 클라이언트를 재사용
export function useSupabase() {
  if (!client) {
    const { public: cfg } = useRuntimeConfig()
    client = createClient(cfg.supabaseUrl, cfg.supabaseKey)
  }
  return client
}
