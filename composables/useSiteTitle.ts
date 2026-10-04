import type { SiteSettings } from '~/types'

const DEFAULT_TITLE = '해커톤 보드'

// 행사 제목을 불러오고 실시간으로 갱신, 브라우저 탭 제목에도 반영
export function useSiteTitle() {
  const title = useState<string>('siteTitle', () => DEFAULT_TITLE)

  if (import.meta.client) {
    const { rows } = useRealtimeTable<SiteSettings>('site_settings', 'id')
    watch(rows, (r) => { if (r[0]?.title) title.value = r[0].title }, { deep: true })
  }

  useHead({ title: computed(() => title.value) })
  return title
}
