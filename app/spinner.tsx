/** 빙글빙글 도는 로딩 표시 — 파일을 여는 중이라는 걸 보여 준다 (아무 반응이 없어 열리는지 모르겠다는 말이 나와서) */
export default function Spinner({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="여는 중"
      className={`inline-block animate-spin rounded-full border-4 border-zinc-200 border-t-gold ${className}`}
    />
  );
}
