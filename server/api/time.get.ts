// 서버 현재 시각 (발표 초시계를 기기 시계와 상관없이 맞추는 데 사용)
export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return { now: Date.now() }
})
