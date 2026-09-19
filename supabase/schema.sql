-- 문서함(DocBox) 스키마
-- Supabase 대시보드 > SQL Editor 에 이 파일 내용을 통째로 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. 이미 있던 테이블/버킷도 알아서 맞춰줍니다.

-- 1) 문서 테이블 ---------------------------------------------------------
create table if not exists public.documents (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- 이미 테이블이 있었던 경우를 대비해, 빠진 컬럼만 채워 넣는다
alter table public.documents
  add column if not exists title        text,
  add column if not exists file_path    text,
  add column if not exists file_type    text,
  add column if not exists file_size    int,
  add column if not exists tags         text[]      not null default '{}',
  add column if not exists memo         text,
  add column if not exists is_favorite  boolean     not null default false,
  add column if not exists sent_count   int         not null default 0,
  add column if not exists last_sent_at timestamptz,
  add column if not exists created_at   timestamptz not null default now();

-- 제목과 파일경로는 반드시 있어야 한다
update public.documents set title = '제목 없음' where title is null;
update public.documents set file_path = '' where file_path is null;
alter table public.documents alter column title     set not null;
alter table public.documents alter column file_path set not null;

-- 정렬/검색용 인덱스
create index if not exists documents_sort_idx
  on public.documents (is_favorite desc, last_sent_at desc nulls last, created_at desc);
create index if not exists documents_tags_idx
  on public.documents using gin (tags);

-- 2) 테이블 잠그기 -------------------------------------------------------
-- 이 앱은 서버에서 service_role 키로만 DB에 접근합니다(service_role 은 RLS 를 통과).
-- RLS 를 켜고 정책을 하나도 만들지 않으면 외부에서 anon 키로는 아무것도 못 읽습니다.
alter table public.documents enable row level security;

-- 3) 파일 저장용 버킷 ----------------------------------------------------
-- 공개 읽기 = 공유 링크를 받은 사람이 로그인 없이 파일을 열 수 있어야 하므로.
-- 파일 이름은 추측 불가능한 uuid 로 저장합니다.
insert into storage.buckets (id, name, public)
values ('docs', 'docs', true)
on conflict (id) do update set public = true;   -- 이미 있으면 공개로 바꾼다

-- 버킷 안의 파일을 누구나 읽을 수 있게 (업로드/삭제는 서버의 service_role 만 가능)
drop policy if exists "docs 공개 읽기" on storage.objects;
create policy "docs 공개 읽기"
  on storage.objects for select
  to public
  using (bucket_id = 'docs');
