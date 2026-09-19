/** 폴더 아이콘 — 기기마다 모양이 다른 이모지 대신 직접 그린 골드 톤 폴더 */
export default function FolderIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 28" className={className} aria-hidden="true">
      <path
        d="M2 5.5A3.5 3.5 0 0 1 5.5 2h6.2c1 0 1.9.4 2.6 1.1l1.5 1.6c.4.4.9.6 1.4.6h9.3A3.5 3.5 0 0 1 30 8.8V9H2z"
        fill="#c79a45"
      />
      <rect x="2" y="7" width="28" height="19" rx="3.5" fill="#e2b85c" />
      <rect x="2" y="7" width="28" height="5" rx="2.5" fill="#edc873" />
    </svg>
  );
}
