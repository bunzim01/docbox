/** 홈(첫 화면) 아이콘 */
export default function HomeIcon({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 10.5L12 3.5l8.5 7" />
      <path d="M5.5 9.5V20h4.8v-5.5h3.4V20h4.8V9.5" />
    </svg>
  );
}
