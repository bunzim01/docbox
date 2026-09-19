-- 문서함(DocBox) — 휴지통 기능 추가
-- Supabase 대시보드 > SQL Editor 에 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전합니다. 기존 문서는 그대로 남습니다.

-- 삭제한 시각. 비어 있으면 정상 문서, 값이 있으면 휴지통에 있는 문서.
alter table public.documents
  add column if not exists deleted_at timestamptz;

create index if not exists documents_deleted_idx on public.documents (deleted_at);
