import type { EvalSettings } from '~/types'

const DEFAULTS: EvalSettings = {
  id: 1,
  criteria: ['창의성', '완성도', '발표력', '협력'],
  teacher_weight: 50,
  status: 'closed',
  revealed: false,
}

// 평가 설정(기준, 교사 비율, 진행 상태, 결과 공개 여부)을 실시간으로 가져온다
export function useEvalSettings() {
  const { rows, loading } = useRealtimeTable<EvalSettings>('eval_settings', 'id')
  const settings = computed<EvalSettings>(() => ({ ...DEFAULTS, ...(rows.value[0] ?? {}) }))
  return { settings, loading }
}
