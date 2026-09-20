"use client";

import { useEffect, useState } from "react";
import { careForCats, type CareKind } from "@/lib/cat-events";
import { BOWLS, BOWL_PALETTES, CHURU_ICON, OWNER_PALETTE } from "@/lib/cat-sprites";

/** 도트 그림을 작은 아이콘으로 */
function PixelIcon({ rows, palette, size }: { rows: string[]; palette: Record<string, string>; size: number }) {
  const w = rows[0].length;
  const h = rows.length;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={size}
      height={Math.round((size * h) / w)}
      shapeRendering="crispEdges"
      aria-hidden="true"
      className="shrink-0"
    >
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) =>
          palette[ch] ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={palette[ch]} /> : null,
        ),
      )}
    </svg>
  );
}

const ITEMS: { kind: CareKind; label: string; rows: string[]; palette: Record<string, string>; size: number }[] = [
  { kind: "food", label: "밥 주기", rows: BOWLS.food[3], palette: BOWL_PALETTES.food, size: 28 },
  { kind: "water", label: "물 주기", rows: BOWLS.water[3], palette: BOWL_PALETTES.water, size: 28 },
  { kind: "churu", label: "츄르 주기", rows: CHURU_ICON, palette: OWNER_PALETTE, size: 18 },
];

/**
 * 홈 화면의 돌보기 버튼.
 * 밥·물은 평소엔 그릇에 채워져 있고, **비었을 때만** [밥 주기]·[물 주기] 버튼이 나타난다.
 * [츄르 주기] 는 언제든 누를 수 있다.
 */
export default function CatCare() {
  const [bowls, setBowls] = useState<{ food: number; water: number } | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("docbox-bowls") ?? "null");
      if (saved && typeof saved.food === "number") setBowls(saved);
    } catch {
      // 저장된 값이 없으면 가득 찬 것으로 본다
    }
    const onBowls = (e: Event) => setBowls((e as CustomEvent<{ food: number; water: number }>).detail);
    window.addEventListener("docbox:bowls", onBowls);
    return () => window.removeEventListener("docbox:bowls", onBowls);
  }, []);

  const empty = { food: bowls?.food === 0, water: bowls?.water === 0 };
  const shown = ITEMS.filter((item) => item.kind === "churu" || empty[item.kind]);
  const notice =
    empty.food && empty.water
      ? "밥그릇과 물그릇이 비었어요"
      : empty.food
        ? "밥그릇이 비었어요"
        : empty.water
          ? "물그릇이 비었어요"
          : "";

  return (
    <div className="mt-auto px-5 pt-8 motion-reduce:hidden">
      <p className="mb-2 text-base font-semibold text-zinc-400">
        태리 · 제리
        {notice && <span className="ml-2 font-normal text-gold">{notice}</span>}
      </p>
      <div className="flex gap-2">
        {shown.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => careForCats(item.kind)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-base font-semibold shadow-[0_1px_2px_rgba(34,48,74,0.05)] sm:max-w-44 sm:py-2.5 ${
              item.kind === "churu"
                ? "border-zinc-200 bg-paper text-zinc-600 active:bg-zinc-100 sm:hover:bg-zinc-50"
                : "border-gold/40 bg-gold-soft text-ink active:brightness-95 sm:hover:brightness-95"
            }`}
          >
            <PixelIcon rows={item.rows} palette={item.palette} size={item.size} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
