-- 해커톤 보드 스키마 (Supabase SQL Editor 에 붙여넣고 실행)

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  nickname text not null,
  content text not null check (char_length(content) <= 300),
  likes int not null default 0,
  created_at timestamptz default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references teams(id) on delete cascade,
  nickname text not null,
  title text not null check (char_length(title) <= 60),
  description text default '',
  link text default '',
  image_url text default '',
  votes int not null default 0,
  created_at timestamptz default now()
);

-- 발표 화면 동기화용 (항상 1행)
create table if not exists presentation_state (
  id int primary key default 1 check (id = 1),
  project_id uuid references projects(id) on delete set null,
  started_at timestamptz
);
insert into presentation_state (id) values (1) on conflict do nothing;

-- RLS: 누구나 읽기, 아이디어/작품 추가만 익명 허용
-- 삭제/팀 관리/발표 상태 변경은 서버 API(service key)로만 가능
alter table teams enable row level security;
alter table ideas enable row level security;
alter table projects enable row level security;
alter table presentation_state enable row level security;

create policy "읽기" on teams for select using (true);
create policy "읽기" on ideas for select using (true);
create policy "읽기" on projects for select using (true);
create policy "읽기" on presentation_state for select using (true);
create policy "아이디어 추가" on ideas for insert with check (true);
create policy "작품 추가" on projects for insert with check (true);

-- 좋아요/투표는 함수로만 +1 (직접 UPDATE 불가)
create or replace function like_idea(p_id uuid) returns void
language sql security definer as $$
  update ideas set likes = likes + 1 where id = p_id;
$$;
create or replace function vote_project(p_id uuid) returns void
language sql security definer as $$
  update projects set votes = votes + 1 where id = p_id;
$$;
grant execute on function like_idea(uuid), vote_project(uuid) to anon;

-- 실시간 구독 활성화
alter publication supabase_realtime add table teams, ideas, projects, presentation_state;

-- 작품 이미지 저장소 (공개 읽기, 익명 업로드)
insert into storage.buckets (id, name, public) values ('project-images', 'project-images', true)
  on conflict do nothing;
create policy "이미지 읽기" on storage.objects for select using (bucket_id = 'project-images');
create policy "이미지 업로드" on storage.objects for insert with check (bucket_id = 'project-images');

-- 행사 제목 설정 (항상 1행, 교사 화면에서 변경)
create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  title text not null default '해커톤 보드'
);
insert into site_settings (id) values (1) on conflict do nothing;
alter table site_settings enable row level security;
create policy "읽기" on site_settings for select using (true);
alter publication supabase_realtime add table site_settings;

-- 팀은 기본값 없이 시작합니다. 교사 화면(/admin)에서 팀 수와 이름을 정하세요.

-- ※ 이미 위 스크립트를 실행한 DB라면, 아래 "행사 제목 설정" 블록(create table ~ add table site_settings)만 따로 실행하세요.
