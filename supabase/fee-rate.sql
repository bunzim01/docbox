-- 수수료율 칸 추가 (체크리스트 문서의 % 표기)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요. 여러 번 돌려도 안전합니다.

alter table documents
  add column if not exists fee_rate numeric(5, 2);

comment on column documents.fee_rate is '수수료율(%). 비어 있으면 표시하지 않는다';
