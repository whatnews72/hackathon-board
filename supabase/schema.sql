-- 해커톤 보드 스키마 (Supabase SQL Editor 에 전체를 붙여넣고 Run)
-- 여러 번 실행해도 안전합니다. (이미 있는 것은 건너뛰거나 다시 만듭니다)

-- 1. 테이블 ---------------------------------------------------------------

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

-- 발표 자료(PPT/PDF) 첨부용 컬럼 (이미 만들어 둔 테이블에도 추가됩니다)
alter table projects add column if not exists file_url text default '';
alter table projects add column if not exists file_name text default '';

-- 발표 화면 동기화용 (항상 1행)
create table if not exists presentation_state (
  id int primary key default 1 check (id = 1),
  project_id uuid references projects(id) on delete set null,
  started_at timestamptz
);
insert into presentation_state (id) values (1) on conflict do nothing;

-- 행사 제목 설정 (항상 1행, 교사 화면에서 변경)
create table if not exists site_settings (
  id int primary key default 1 check (id = 1),
  title text not null default '해커톤 보드'
);
insert into site_settings (id) values (1) on conflict do nothing;

-- 2. 접근 권한 ------------------------------------------------------------
-- 학생(anon): 모두 읽기, 아이디어/작품 추가만 가능
-- 삭제/팀 관리/제목/발표 상태 변경은 서버 API(service_role)로만 가능

grant usage on schema public to anon, authenticated, service_role;
grant select on teams, ideas, projects, presentation_state, site_settings to anon, authenticated;
grant insert on ideas, projects to anon, authenticated;
grant all on all tables in schema public to service_role;

alter table teams enable row level security;
alter table ideas enable row level security;
alter table projects enable row level security;
alter table presentation_state enable row level security;
alter table site_settings enable row level security;

drop policy if exists "읽기" on teams;
drop policy if exists "읽기" on ideas;
drop policy if exists "읽기" on projects;
drop policy if exists "읽기" on presentation_state;
drop policy if exists "읽기" on site_settings;
drop policy if exists "아이디어 추가" on ideas;
drop policy if exists "작품 추가" on projects;

create policy "읽기" on teams for select using (true);
create policy "읽기" on ideas for select using (true);
create policy "읽기" on projects for select using (true);
create policy "읽기" on presentation_state for select using (true);
create policy "읽기" on site_settings for select using (true);
create policy "아이디어 추가" on ideas for insert with check (true);
create policy "작품 추가" on projects for insert with check (true);

-- 3. 좋아요/투표 (함수로만 +1, 직접 UPDATE 불가) ----------------------------

create or replace function like_idea(p_id uuid) returns void
language sql security definer as $$
  update ideas set likes = likes + 1 where id = p_id;
$$;
create or replace function vote_project(p_id uuid) returns void
language sql security definer as $$
  update projects set votes = votes + 1 where id = p_id;
$$;
grant execute on function like_idea(uuid), vote_project(uuid) to anon, authenticated;

-- 4. 실시간 구독 (이미 등록된 테이블은 건너뜀) -------------------------------

do $$
declare t text;
begin
  foreach t in array array['teams', 'ideas', 'projects', 'presentation_state', 'site_settings'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null;
    end;
  end loop;
end $$;

-- 5. 작품 이미지 저장소 (공개 읽기, 익명 업로드) -----------------------------

insert into storage.buckets (id, name, public) values ('project-images', 'project-images', true)
  on conflict do nothing;

drop policy if exists "이미지 읽기" on storage.objects;
drop policy if exists "이미지 업로드" on storage.objects;
create policy "이미지 읽기" on storage.objects for select using (bucket_id = 'project-images');
create policy "이미지 업로드" on storage.objects for insert with check (bucket_id = 'project-images');

-- 발표 자료 저장소 (PPT, PPTX, PDF 만 허용, 파일당 30MB 까지, 공개 읽기, 익명 업로드)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files', 'project-files', true, 31457280,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "자료 읽기" on storage.objects;
drop policy if exists "자료 업로드" on storage.objects;
create policy "자료 읽기" on storage.objects for select using (bucket_id = 'project-files');
create policy "자료 업로드" on storage.objects for insert with check (bucket_id = 'project-files');

-- 6. 평가하기 -------------------------------------------------------------
-- eval_settings: 평가 기준/교사 반영 비율/진행 상태/결과 공개 여부 (학생도 읽기 가능)
-- evaluations  : 학생·교사의 점수. 학생에게는 읽기·쓰기 권한을 주지 않고 서버 API 로만 접근
--                (결과 공개 전에 다른 사람의 점수를 볼 수 없도록 함)

create table if not exists eval_settings (
  id int primary key default 1 check (id = 1),
  criteria jsonb not null default '["창의성","완성도","발표력","협력"]'::jsonb,
  teacher_weight int not null default 50 check (teacher_weight between 0 and 100),
  status text not null default 'closed' check (status in ('closed', 'open')),
  revealed boolean not null default false
);
insert into eval_settings (id) values (1) on conflict do nothing;

create table if not exists evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  evaluator_type text not null check (evaluator_type in ('student', 'teacher')),
  evaluator_key text not null,
  evaluator_name text not null default '',
  team_id uuid,
  scores jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (project_id, evaluator_key)
);

alter table eval_settings enable row level security;
alter table evaluations enable row level security;

drop policy if exists "읽기" on eval_settings;
create policy "읽기" on eval_settings for select using (true);

revoke all on evaluations from anon, authenticated;
grant select on eval_settings to anon, authenticated;
grant all on eval_settings, evaluations to service_role;

do $$
begin
  alter publication supabase_realtime add table public.eval_settings;
exception when duplicate_object then
  null;
end $$;

-- 팀은 기본값 없이 시작합니다. 교사 화면(/admin)에서 제목과 팀을 정하세요.
