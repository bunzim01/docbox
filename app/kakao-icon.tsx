/** 카카오톡 말풍선 모양 아이콘 */
export default function KakaoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 3C6.9 3 2.8 6.3 2.8 10.3c0 2.5 1.7 4.7 4.2 6l-1 3.6c-.1.3.2.6.5.4l4.3-2.8c.4 0 .8.1 1.2.1 5.1 0 9.2-3.3 9.2-7.3S17.1 3 12 3z" />
    </svg>
  );
}
