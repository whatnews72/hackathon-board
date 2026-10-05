import type { Ref } from 'vue'

// 테이블 전체를 불러오고, 변경(INSERT/UPDATE/DELETE)을 실시간으로 반영
// 실시간 연결이 막히거나 끊겨도(학교 네트워크 등) 주기적으로 다시 불러와 화면이 멈추지 않게 한다
export function useRealtimeTable<T extends { id: string | number }>(
  table: string,
  orderBy = 'created_at',
): { rows: Ref<T[]>; loading: Ref<boolean>; connected: Ref<boolean> } {
  const supabase = useSupabase()
  const rows = ref([]) as Ref<T[]>
  const loading = ref(true)
  const connected = ref(false)

  async function load() {
    const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending: true })
    if (!error) rows.value = (data ?? []) as T[]
    loading.value = false
  }

  let channel: ReturnType<typeof supabase.channel> | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false

  // 연결 상태에 따라 다시 불러오는 간격 조절 (연결됨 20초 / 안 됨 4초)
  function schedule() {
    timer = setTimeout(async () => {
      await load()
      if (!stopped) schedule()
    }, connected.value ? 20000 : 4000)
  }

  function onVisible() {
    if (document.visibilityState === 'visible') load()
  }

  // 서버 렌더링 중에는 연결하지 않고, 브라우저에서만 구독한다
  onMounted(() => {
    channel = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new as T
          // 이미 불러온 행이면 중복으로 넣지 않는다
          if (!rows.value.some((r) => r.id === row.id)) rows.value = [...rows.value, row]
        } else if (payload.eventType === 'UPDATE') {
          rows.value = rows.value.map((r) => (r.id === (payload.new as T).id ? (payload.new as T) : r))
        } else if (payload.eventType === 'DELETE') {
          rows.value = rows.value.filter((r) => r.id !== (payload.old as T).id)
        }
      })
      .subscribe((status) => {
        connected.value = status === 'SUBSCRIBED'
        // 연결(재연결) 직후 한 번 더 불러와 그 사이 놓친 변경을 채운다
        if (connected.value) load()
      })

    load()
    schedule()
    document.addEventListener('visibilitychange', onVisible)
  })

  onBeforeUnmount(() => {
    stopped = true
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
    if (channel) supabase.removeChannel(channel)
  })

  return { rows, loading, connected }
}
