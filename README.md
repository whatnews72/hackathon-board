# 🚀 해커톤 보드

중학생 해커톤 수업용 실시간 웹페이지입니다. (Nuxt 3 + Vue + Tailwind CSS + shadcn 스타일 UI + Supabase + Vercel)

## 기능
- 닉네임 + 팀 선택으로 입장 (가입 없음)
- 팀별 아이디어 보드 (실시간 카드, 좋아요)
- 작품 갤러리 (이미지 업로드, 링크, 투표)
- 발표 모드 (교사가 넘기면 모든 화면이 동기화, 공통 타이머)
- 교사 관리자 (행사 제목 변경, 팀 수·이름·색상 변경, 부적절한 카드 삭제, 발표 시작)

## 1. Supabase 설정
1. https://supabase.com 에서 새 프로젝트를 만든다.
2. SQL Editor 에 `supabase/schema.sql` 전체를 붙여넣고 실행한다.
3. Project Settings > API 에서 URL, anon key, service_role key 를 확인한다.

> 팀은 기본값 없이 시작합니다. 제목과 팀은 배포 후 교사 메뉴(`/admin`)에서 정합니다.
> 이미 예전 `schema.sql`을 실행했다면, 새 파일의 "행사 제목 설정" 블록(`site_settings` 테이블 생성 ~ `add table site_settings`)만 SQL Editor에서 추가로 실행하세요.

## 2. 로컬 실행
```bash
npm install
cp .env.example .env   # 값을 채운다
npm run dev
```
http://localhost:3000 에서 확인한다.

## 3. Vercel 배포
1. 프로젝트를 GitHub 에 올리고 Vercel 에서 Import 한다. (Nuxt 자동 인식)
2. Environment Variables 에 `.env.example` 의 4개 값을 등록한다.
3. Deploy 후 나온 주소를 학생들에게 공유한다.

> `NUXT_SUPABASE_SERVICE_KEY`, `NUXT_ADMIN_PASSWORD` 는 서버 전용이므로 절대 공개하지 않는다.

## 수업 진행 팁
1. 교사 메뉴에서 행사 제목(예: 부춘중 해커톤)을 정하고 팀 수·이름을 만든다 → 2. 학생들이 닉네임과 팀을 골라 입장 → 3. 아이디어 보드에서 브레인스토밍 → 4. 작품을 갤러리에 올림 → 5. 교사 메뉴 또는 발표 화면에서 ←/→ 키로 발표를 진행한다.
