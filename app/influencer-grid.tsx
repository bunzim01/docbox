/**
 * '인플루언서' 폴더 맨 위의 셀러 목록 — 누르면 그 사람 인스타그램 계정이 열린다.
 * 폰에서는 인스타그램 앱이 설치돼 있으면 앱으로 바로 열린다(인스타그램 주소가 원래 그렇게 동작한다).
 * 한 화면에 많이 보이게 작은 칸으로 (폰 3칸 · PC 6칸, 이름 한 줄). 사용자가 더 작게 해 달라고 했다.
 * 인스타그램 로고는 상표라 따라 그리지 않고, 작은 '@' 배지로 "인스타 계정"임을 알린다.
 */
import { INFLUENCERS, instagramUrl } from "@/lib/influencers";

/** 카드 왼쪽 위 모서리에 붙는 작은 '@' 배지 (장식 — 이름 자리를 뺏지 않게 모서리로 뺐다) */
function AtBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[12px] font-bold leading-none text-white shadow-sm"
    >
      @
    </span>
  );
}

export default function InfluencerGrid() {
  return (
    <section className="px-5 pb-2 pt-3">
      <h2 className="mb-2 text-base text-zinc-500">셀러 {INFLUENCERS.length}명 · 누르면 인스타그램이 열립니다</h2>
      <div className="grid grid-cols-3 gap-2 pl-1 pt-1 sm:grid-cols-6">
        {INFLUENCERS.map((p) => (
          <a
            key={p.handle}
            href={instagramUrl(p.handle)}
            target="_blank"
            rel="noopener noreferrer"
            title={`${p.name} · @${p.handle}`}
            className="relative flex min-w-0 items-center justify-center rounded-xl border border-zinc-200 bg-paper px-1.5 py-2.5 active:bg-zinc-50 sm:hover:bg-zinc-50"
          >
            <AtBadge />
            <span className="min-w-0 truncate text-base font-semibold tracking-tight">{p.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
