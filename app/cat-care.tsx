"use client";

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

/** 홈 화면의 돌보기 버튼 — 누르면 이윤이 와서 밥·물을 채우거나 츄르를 준다 */
export default function CatCare() {
  return (
    <div className="mt-auto px-5 pt-8 motion-reduce:hidden">
      <p className="mb-2 text-base font-semibold text-zinc-400">태리 · 제리</p>
      <div className="grid grid-cols-3 gap-2">
        {ITEMS.map((item) => (
          <button
            key={item.kind}
            type="button"
            onClick={() => careForCats(item.kind)}
            className="flex flex-col items-center justify-end gap-1.5 rounded-2xl border border-zinc-200 bg-paper px-1 pb-2.5 pt-3 text-base font-semibold text-zinc-600 shadow-[0_1px_2px_rgba(34,48,74,0.05)] active:bg-zinc-100 sm:flex-row sm:justify-center sm:gap-2 sm:py-2.5 sm:hover:bg-zinc-50"
          >
            <span className="flex h-5 items-end">
              <PixelIcon rows={item.rows} palette={item.palette} size={item.size} />
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
