-- 문서함(DocBox) — 하위폴더 기능 추가
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. 기존 폴더와 문서는 그대로 남습니다.

-- 1) 폴더 안에 폴더 ------------------------------------------------------
-- parent_id 가 비어 있으면 맨 위 폴더, 값이 있으면 그 폴더의 하위폴더.
-- 폴더를 지우면 그 안의 하위폴더도 같이 지워진다(문서는 안 지워짐).
alter table public.folders
  add column if not exists parent_id uuid references public.folders(id) on delete cascade;

create index if not exists folders_parent_idx on public.folders (parent_id);

-- 2) 이름 중복 규칙 바꾸기 -----------------------------------------------
-- 전에는 폴더 이름이 전체에서 하나뿐이어야 했지만,
-- 이제는 "같은 폴더 안에서만" 이름이 겹치지 않으면 된다.
-- (예: 제품소개서/A브랜드 와 체크리스트/A브랜드 를 동시에 쓸 수 있게)
alter table public.folders drop constraint if exists folders_name_key;

create unique index if not exists folders_parent_name_idx
  on public.folders (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
