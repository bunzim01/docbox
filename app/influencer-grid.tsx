/**
 * '인플루언서' 폴더 맨 위에 보이는 셀러 카드 — 누르면 그 사람 인스타그램 계정이 열린다.
 * 폰에서는 인스타그램 앱이 설치돼 있으면 앱으로 바로 열린다(인스타그램 주소가 원래 그렇게 동작한다).
 * 인스타그램 로고는 상표라 따라 그리지 않고, 프로필 동그라미 + @아이디 로 "인스타 계정"임을 알린다.
 */
import { INFLUENCERS, instagramUrl } from "@/lib/influencers";

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="inf-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9a54a" />
          <stop offset="1" stopColor="#a97c2f" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="none" stroke="url(#inf-ring)" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="18" fill="#f3ead9" />
      <circle cx="24" cy="20" r="6.5" fill="#c9b48e" />
      <path d="M12.5 35.5c2.2-5.6 6.6-8.5 11.5-8.5s9.3 2.9 11.5 8.5a18 18 0 0 1-23 0z" fill="#c9b48e" />
    </svg>
  );
}

export default function InfluencerGrid() {
  return (
    <section className="px-5 pb-2 pt-4">
      <h2 className="mb-2 text-base text-zinc-500">셀러 {INFLUENCERS.length}명 · 누르면 인스타그램이 열립니다</h2>
      {/* 폰 2칸 · PC 4칸. 아이콘 왼쪽 + 이름·@아이디 오른쪽 (3칸 세로 카드는 아이디가 거의 다 잘렸다) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {INFLUENCERS.map((p) => (
          <a
            key={p.handle}
            href={instagramUrl(p.handle)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-zinc-200 bg-paper px-3 py-3 shadow-[0_1px_2px_rgba(34,48,74,0.05)] active:bg-zinc-50 sm:py-2.5 sm:hover:bg-zinc-50"
          >
            <ProfileIcon className="h-11 w-11 shrink-0" />
            <span className="block min-w-0 flex-1">
              <span className="line-clamp-2 block text-base font-semibold leading-snug [overflow-wrap:anywhere]">
                {p.name}
              </span>
              <span className="block truncate text-base leading-snug text-zinc-400">@{p.handle}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
