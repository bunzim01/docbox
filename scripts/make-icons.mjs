/**
 * 홈 화면 아이콘을 만든다 — 태리와 제리가 마주 앉아 있는 그림.
 * 크림 바탕(라이크웨이 톤) + lib/cat-sprites.ts 의 앉은 모습 그대로.
 *
 * 실행:  node scripts/make-icons.mjs
 * 결과:  public/icons/icon-192.png · icon-512.png · maskable-512.png · app/icon.png · app/apple-icon.png
 */
import fs from "node:fs";
import sharp from "sharp";

/* 생성된 도트 그림 파일에서 값만 꺼낸다 (타입 표기는 떼어낸다) */
const src = fs.readFileSync("lib/cat-sprites.ts", "utf8");
function grab(name) {
  const start = src.indexOf(`export const ${name}`);
  const eq = src.indexOf("= {", start);
  let depth = 0, i = eq + 2;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) break; }
  }
  return JSON.parse(src.slice(eq + 2, i + 1));
}
const FRAMES = grab("FRAMES");
const PALETTES = grab("PALETTES");

/* 그림에서 투명하지 않은 부분만 잘라낸다 */
function crop(rows) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === ".") return;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }));
  return { rows: rows.slice(y0, y1 + 1).map((r) => r.slice(x0, x1 + 1)), w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 도트를 <rect> 들로. flip 이면 좌우를 뒤집어 마주 보게 한다 */
function rects(cut, palette, ox, oy, flip) {
  let out = "";
  cut.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (!c) return;
      const px = ox + (flip ? cut.w - 1 - x : x);
      out += `<rect x="${px}" y="${oy + y}" width="1" height="1" fill="${c}"/>`;
    }),
  );
  return out;
}

const taeri = crop(FRAMES.taeri.sit);   // 통통한 크림색
const jeri = crop(FRAMES.jeri.sit);     // 얄쌍한 회색 포인트

/**
 * 둘을 살짝 겹쳐 놓는다(음수 = 겹침). 제리의 바닥 꼬리가 태리 쪽으로 들어가면서
 * 빈 공간이 줄어 아이콘 안에서 고양이가 더 크게 보인다.
 */
const GAP = -6;
const artW = taeri.w + GAP + jeri.w;
const artH = Math.max(taeri.h, jeri.h);

/**
 * pad = 그림 둘레 여백 비율. 안드로이드 maskable 은 바깥을 잘라내므로 더 크게 준다.
 */
function svg(size, pad, round) {
  const box = size * (1 - pad * 2);
  const scale = Math.min(box / artW, box / artH);
  const w = artW * scale, h = artH * scale;
  const ox = (size - w) / 2, oy = (size - h) / 2 + size * 0.03; // 살짝 아래 = 바닥에 앉은 느낌
  const art =
    rects(jeri, PALETTES.jeri, taeri.w + GAP, artH - jeri.h, false) +
    rects(taeri, PALETTES.taeri, 0, artH - taeri.h, false); // 태리를 나중에 = 앞쪽

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fffdf9"/>
      <stop offset="1" stop-color="#f3ead9"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#bg)"${round ? ` rx="${size * 0.22}"` : ""}/>
  <g transform="translate(${ox} ${oy}) scale(${scale})" shape-rendering="crispEdges">${art}</g>
</svg>`;
}

const out = async (file, size, pad, round) => {
  await sharp(Buffer.from(svg(size, pad, round))).png().toFile(file);
  console.log("만듦:", file);
};

await out("public/icons/icon-192.png", 192, 0.04, false);
await out("public/icons/icon-512.png", 512, 0.04, false);
await out("public/icons/maskable-512.png", 512, 0.18, false); // 둘레가 잘려도 고양이가 남게
await out("app/icon.png", 512, 0.04, false);
await out("app/apple-icon.png", 512, 0.04, false);            // iOS 가 알아서 모서리를 둥글린다
