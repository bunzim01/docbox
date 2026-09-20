import { useId } from "react";

/**
 * 폴더 아이콘 — 밝은 골드 그라데이션 + 살짝 보이는 종이.
 * (기기마다 모양이 다른 이모지 대신 직접 그린다)
 */
export default function FolderIcon({ className = "h-8 w-8" }: { className?: string }) {
  const id = useId();
  const back = `${id}-back`;
  const front = `${id}-front`;

  return (
    <svg viewBox="0 0 48 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={back} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9b44c" />
          <stop offset="1" stopColor="#d99a2b" />
        </linearGradient>
        <linearGradient id={front} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffdf8e" />
          <stop offset="1" stopColor="#f4b942" />
        </linearGradient>
      </defs>

      {/* 뒤판 + 탭 */}
      <path
        d="M3 8.5A4.5 4.5 0 0 1 7.5 4h10.3c1.3 0 2.5.5 3.4 1.5l2 2.2c.6.6 1.4 1 2.3 1h15A4.5 4.5 0 0 1 45 13.2V32a4.5 4.5 0 0 1-4.5 4.5h-33A4.5 4.5 0 0 1 3 32z"
        fill={`url(#${back})`}
      />
      {/* 살짝 보이는 종이 */}
      <rect x="8" y="11" width="32" height="14" rx="2.5" fill="#fffdf9" />
      {/* 앞판 */}
      <path
        d="M3 18.5A4.5 4.5 0 0 1 7.5 14h33a4.5 4.5 0 0 1 4.5 4.5V32a4.5 4.5 0 0 1-4.5 4.5h-33A4.5 4.5 0 0 1 3 32z"
        fill={`url(#${front})`}
      />
      {/* 윗면 반사광 */}
      <path
        d="M7.5 14h33a4.5 4.5 0 0 1 4.5 4.5v.8a4.5 4.5 0 0 0-4.5-3.8h-33A4.5 4.5 0 0 0 3 19.3v-.8A4.5 4.5 0 0 1 7.5 14z"
        fill="#fff6d6"
        opacity=".85"
      />
    </svg>
  );
}
