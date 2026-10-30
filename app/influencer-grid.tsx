"use client";

/**
 * '인플루언서' 폴더 맨 위의 셀러 목록 — 누르면 그 사람 인스타그램 계정이 열린다.
 * 폰에서는 인스타그램 앱이 설치돼 있으면 앱으로 바로 열린다(인스타그램 주소가 원래 그렇게 동작한다).
 * 한 화면에 많이 보이게 작은 칸으로 (폰 3칸 · PC 6칸, 이름 한 줄). 사용자가 더 작게 해 달라고 했다.
 * 인스타그램 로고는 상표라 따라 그리지 않고, 작은 '@' 배지로 "인스타 계정"임을 알린다.
 * [편집] 을 누르면 카드마다 ✕ 가 생겨 뺄 수 있다. 추가는 + 버튼(폰)·[셀러 추가](PC) → AddSellerSheet.
 */
import { useState } from "react";
import { instagramUrl, type Influencer } from "@/lib/influencers";

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

export default function InfluencerGrid({
  influencers,
  pending,
  onRemove,
}: {
  influencers: Influencer[];
  pending: boolean;
  onRemove: (p: Influencer) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <section className="px-5 pb-2 pt-3">
      <div className="mb-2 flex items-center gap-3">
        <h2 className="min-w-0 flex-1 text-base text-zinc-500">
          셀러 {influencers.length}명{editing ? " · ✕ 누르면 빠짐" : " · 누르면 인스타 열림"}
        </h2>
        {influencers.length > 0 && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={`shrink-0 text-base underline ${editing ? "font-semibold text-ink" : "text-zinc-500"}`}
          >
            {editing ? "완료" : "편집"}
          </button>
        )}
      </div>

      {influencers.length === 0 ? (
        <p className="py-6 text-center text-base text-zinc-400">+ 버튼으로 셀러를 추가하세요.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 pl-1 pt-1 sm:grid-cols-6">
          {influencers.map((p) =>
            editing ? (
              <button
                key={p.handle}
                type="button"
                disabled={pending}
                onClick={() => {
                  if (confirm(`"${p.name}" 을(를) 목록에서 뺄까요?`)) onRemove(p);
                }}
                className="relative flex min-w-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-1.5 py-2.5 disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[12px] font-bold leading-none text-white"
                >
                  ✕
                </span>
                <span className="min-w-0 truncate text-base font-semibold tracking-tight text-red-700">
                  {p.name}
                </span>
              </button>
            ) : (
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
            ),
          )}
        </div>
      )}
    </section>
  );
}
