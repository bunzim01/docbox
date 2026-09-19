-- 문서함(DocBox) — 폴더 기능 추가
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. 기존 문서는 그대로 남습니다.

-- 1) 폴더 테이블 ---------------------------------------------------------
create table if not exists public.folders (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null unique,
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

alter table public.folders enable row level security;

-- 2) 처음 쓸 폴더 4개 ----------------------------------------------------
insert into public.folders (name, sort_order) values
  ('제품소개서',          1),
  ('체크리스트(벤더용)',  2),
  ('체크리스트(셀러용)',  3),
  ('기타문서',            4)
on conflict (name) do nothing;

-- 3) 문서에 폴더 칸 추가 -------------------------------------------------
-- 폴더를 지워도 문서는 안 지워지고 '분류 안 함' 으로 빠진다.
alter table public.documents
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists documents_folder_idx on public.documents (folder_id);
