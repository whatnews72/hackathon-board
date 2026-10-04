// Nuxt 설정: Tailwind 모듈 + Supabase 공개 키 + 교사용 비밀 키
export default defineNuxtConfig({
  compatibilityDate: '2024-09-01',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      title: '해커톤 보드',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  runtimeConfig: {
    // 서버 전용 (브라우저에 노출되지 않음)
    supabaseServiceKey: '',
    adminPassword: '',
    public: {
      supabaseUrl: '',
      supabaseKey: '',
    },
  },
})
