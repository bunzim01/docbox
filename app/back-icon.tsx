/** 뒤로가기 화살표 — 글자(←)는 가늘고 작게 보여서 직접 그린다 */
export default function BackIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
