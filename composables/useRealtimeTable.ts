import type { Ref } from 'vue'

// 테이블 전체를 불러오고, 변경(INSERT/UPDATE/DELETE)을 실시간으로 반영
export function useRealtimeTable<T extends { id: string | number }>(
  table: string,
  orderBy = 'created_at',
): { rows: Ref<T[]>; loading: Ref<boolean> } {
  const supabase = useSupabase()
  const rows = ref([]) as Ref<T[]>
  const loading = ref(true)

  async function load() {
    const { data } = await supabase.from(table).select('*').order(orderBy, { ascending: true })
    rows.value = (data ?? []) as T[]
    loading.value = false
  }

  const channel = supabase
    .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
      if (payload.eventType === 'INSERT') {
        rows.value = [...rows.value, payload.new as T]
      } else if (payload.eventType === 'UPDATE') {
        rows.value = rows.value.map((r) => (r.id === (payload.new as T).id ? (payload.new as T) : r))
      } else if (payload.eventType === 'DELETE') {
        rows.value = rows.value.filter((r) => r.id !== (payload.old as T).id)
      }
    })
    .subscribe()

  onMounted(load)
  onBeforeUnmount(() => supabase.removeChannel(channel))

  return { rows, loading }
}
