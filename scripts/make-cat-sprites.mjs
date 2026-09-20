// 픽셀 고양이 도트를 부품(머리·몸·다리·꼬리)으로 조립해 lib/cat-sprites.ts 를 만든다.
//   node scripts/make-cat-sprites.mjs
// 역할 글자: O 외곽선  B 몸  G 이마·눈가  H 밝은 털  S 줄무늬(머리·꼬리)  Y 몸 무늬  P 포인트(귀·꼬리)  M 얼굴 마스크  W 주둥이·가슴
//           F 발  E 눈동자색  K 동공  L 눈 반짝임  C 감은 눈  N 코  I 귀 안쪽  T 혀  . 투명
import fs from "node:fs";

const W = 30, H = 18;
const blank = () => Array.from({ length: H }, () => Array(W).fill("."));
function blit(canvas, part, x0, y0) {
  part.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const x = x0 + dx, y = y0 + dy;
    if (ch !== "." && x >= 0 && x < W && y >= 0 && y < H) canvas[y][x] = ch;
  }));
}
// 모든 부품을 한 칸 아래로(y+1) — 제리의 긴 귀가 잘리지 않게 위에 여유를 둔다
const compose = (...layers) => { const c = blank(); layers.forEach(([p, x, y]) => blit(c, p, x, y + 1)); return c.map((r) => r.join("")); };

/* ---------- 공통 부품 ---------- */
const LEG = ["OBO", "OBO", "OFO", "OOO"];
const LEG_SHORT = ["OBO", "OFO", "OOO"];
const TAIL_UP = ["..OO..", ".OPPO.", "OPSO..", "OPPO..", ".OPSO.", "..OPPO", "...OPO", "....OO"];
const TAIL_MID = [".OOO...", "OPSPO..", ".OOPPO.", "...OSPO", "....OPO", ".....OO"];
const TAIL_BACK = ["OOOOOO.", "OPSPPSO", ".OOOOOO"];
const TAIL_GROUND = [".OOOOOOOO", "OPPSPPSPP", ".OOOOOOOO"];
const PAW_UP = [".OO.", "OFFO", "OFFO", ".OBO", ".OBO"];
const LEG_BACK = ["..OBO", ".OBO.", "OFO..", "OO..."];
const LEG_FRONT = ["OBO..", ".OBO.", "..OFO", "...OO"];
const STRETCH = [
  "....OOOOOO....................",
  "...OHHHHHBOOO.................",
  "...OBBYBBBBBBOOO..............",
  "...OBBYBBBYBBBBBOOO...........",
  "...OBBBBBBYBBBYBBBBO..........",
  "...OBBBBBBBBBBYBBBBO..........",
  "...OBBOOOBBBBBBBBBBO..........",
  "...OBBO..OOBBBBBBBBO..........",
  "...OBBO....OOOBBBBBO..........",
  "...OBBO.......OOBBBBOOOOOOO...",
  "...OBBO.........OBBBBBBBBFFO..",
  "..OFFFO..........OOOOOOOOOO...",
  "..OOOOO.......................",
];

/* ---------- 태리: 넓고 둥근 얼굴 · 볼살 · 넓적한 턱 · 통통한 몸 ---------- */
const T_HEAD = [
  "..OO.....OO..",
  ".OPIO...OIPO.",
  ".OPPOOOOOPPO.",
  "OGGGSGMGSGGGO",
  "OGGKLGMGKLGGO",
  "OGGEEMNMEEGGO",
  "OBBBWWWWWBBBO",
  "OBBBWWWWWBBBO",
  ".OOOOOOOOOOO.",
];
const T_HEAD_CLOSED = [...T_HEAD.slice(0, 4), "OGGGGGMGGGGGO", "OGGCCMNMCCGGO", ...T_HEAD.slice(6)];
const T_HEAD_LICK = [...T_HEAD_CLOSED.slice(0, 7), "OBBBWWTWWBBBO", ".OOOOOTOOOOO."];
const T_BODY = [
  "..OOOOOOOOOOOOOOOO..",
  ".OHHHHHHHHHHHHHHHBO.",
  "OBBYBBBYBBBYBBBYBBBO",
  "OBBYBBBYBBBYBBBYBBBO",
  "OBBBBBBBBBBBBBBBBBBO",
  "OBBBBBBBBBBBBBBBBWWO",
  ".OBBBBBBBBBBBBBBWWO.",
  "..OOOOOOOOOOOOOOOO..",
];
const T_SIT = [
  ".....OOOOOO...",
  "...OOBBBBBBO..",
  "..OBBBYBBWWWO.",
  ".OBBBBBBBWWWO.",
  "OBBYBBBBBWWWWO",
  "OBBBBBBBBBWWWO",
  "OBBYBBBBBBBBBO",
  "OBBBBBBOBBOBBO",
  "OFFFBBBOFFOFFO",
  "OOOOOOOOOOOOOO",
];
const T_SLEEP = [
  ".......OOOOOOOOOOO............",
  ".....OOHHHHHHHHHHHOO..........",
  "....OBBBYBBBYBBBYBBBO.........",
  "...OBBBBYBBBYBBBYBBBBO........",
  "..OBBBBBBBBBBBBBBBBBBBO.......",
  "..OBBBBBBBBBBBBBBBBBBBO.......",
  "..OBBBBBBBBBBBBBBBBBBBO.......",
  "..OPPPPPPPPPPPPBBBBBBBO.......",
  "..OPSPPSPPSPPPPOOOOOOOO.......",
  "...OOOOOOOOOOOOO..............",
];

/* ---------- 제리: 좁은 얼굴 · 뾰족한 턱 · 쫑긋 긴 귀 · 날씬한 몸 ---------- */
const J_HEAD = [
  ".O.......O.",
  "OPO.....OPO",
  "OPIO...OIPO",
  "OPPOOOOOPPO",
  "OGGSGMGSGGO",
  "OGKLGMGKLGO",
  "OGEEMNMEEGO",
  ".OBWWWWWBO.",
  "..OOWWWOO..",
  "....OOO....",
];
const J_HEAD_CLOSED = [...J_HEAD.slice(0, 5), "OGGGGMGGGGO", "OGCCMNMCCGO", ...J_HEAD.slice(7)];
const J_HEAD_LICK = [...J_HEAD_CLOSED.slice(0, 8), "..OOWTWOO..", "....OTO...."];
const J_BODY = [
  "..OOOOOOOOOOOOOOOO..",
  ".OHHHHHHHHHHHHHHHBO.",
  "OBBYBBBYBBBYBBBYBBBO",
  "OBBBBBBBBBBBBBBBBWWO",
  ".OBBBBBBBBBBBBBBWWO.",
  "..OOOOOOOOOOOOOOOO..",
];
const J_SIT = [
  "....OOOOO....",
  "...OBBBBBO...",
  "..OBBYBWWO...",
  "..OBBBBWWWO..",
  ".OBYBBBWWWO..",
  ".OBBBBBBWWO..",
  "OBBYBBBBBBO..",
  "OBBBBOBBOBO..",
  "OFFFBOFFOFFO.",
  "OOOOOOOOOOOO.",
];
const J_SLEEP = [
  ".......OOOOOOOOOO.............",
  ".....OOHHHHHHHHHHOO...........",
  "....OBBBYBBBYBBBYBBO..........",
  "...OBBBBBBBBBBBBBBBBO.........",
  "..OBBBBBBBBBBBBBBBBBBO........",
  "..OPPPPPPPPPPPPBBBBBBO........",
  "..OPSPPSPPSPPPPOOOOOOO........",
  "...OOOOOOOOOOOOO..............",
];

/* ---------- 조립 ---------- */
const frames = {
  taeri: {
    walkA: compose([TAIL_UP, 0, 1], [T_BODY, 2, 6], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [T_HEAD, 17, 1]),
    walkB: compose([TAIL_MID, 0, 4], [T_BODY, 2, 6], [LEG, 5, 13], [LEG_SHORT, 8, 13], [LEG_SHORT, 15, 13], [LEG, 18, 13], [T_HEAD, 17, 2]),
    sit: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [T_HEAD, 11, 0]),
    sitWag: compose([TAIL_UP, 3, 7], [T_SIT, 8, 7], [T_HEAD, 11, 0]),
    groomA: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [PAW_UP, 22, 8], [T_HEAD_CLOSED, 12, 1]),
    groomB: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [PAW_UP, 22, 9], [T_HEAD_LICK, 12, 2]),
    stretch: compose([TAIL_UP, 0, 0], [STRETCH, 0, 4], [T_HEAD_CLOSED, 17, 5]),
    sleep: compose([T_SLEEP, 0, 7], [T_HEAD_CLOSED, 15, 7]),
    jump: compose([TAIL_BACK, 0, 5], [T_BODY, 3, 3], [LEG_BACK, 1, 9], [LEG_BACK, 5, 9], [LEG_FRONT, 17, 9], [LEG_FRONT, 21, 9], [T_HEAD, 17, -1]),
  },
  jeri: {
    walkA: compose([TAIL_UP, 0, 3], [J_BODY, 2, 8], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [J_HEAD, 18, 1]),
    walkB: compose([TAIL_MID, 0, 6], [J_BODY, 2, 8], [LEG, 5, 13], [LEG_SHORT, 8, 13], [LEG_SHORT, 15, 13], [LEG, 18, 13], [J_HEAD, 18, 2]),
    sit: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [J_HEAD, 11, -1]),
    sitWag: compose([TAIL_UP, 4, 7], [J_SIT, 9, 7], [J_HEAD, 11, -1]),
    groomA: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [PAW_UP, 21, 8], [J_HEAD_CLOSED, 12, 0]),
    groomB: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [PAW_UP, 21, 9], [J_HEAD_LICK, 12, 1]),
    stretch: compose([TAIL_UP, 0, 0], [STRETCH, 0, 4], [J_HEAD_CLOSED, 18, 4]),
    sleep: compose([J_SLEEP, 0, 9], [J_HEAD_CLOSED, 15, 7]),
    jump: compose([TAIL_BACK, 0, 6], [J_BODY, 3, 5], [LEG_BACK, 1, 9], [LEG_BACK, 5, 9], [LEG_FRONT, 17, 9], [LEG_FRONT, 21, 9], [J_HEAD, 19, -1]),
  },
};

const palettes = {
  // 태리: 연한 크림·살구색. 줄무늬는 아주 은은하게. 흰 가슴과 발, 호박색 눈, 분홍 코
  taeri: { O: "#a9794a", B: "#f4d3ab", G: "#f4d3ab", H: "#fbe6cb", S: "#eabf91", P: "#f1cb9f", M: "#f8dcb9", W: "#fffaf1", F: "#fffaf1",
           E: "#d08a2e", K: "#2a1c10", L: "#ffffff", C: "#a9794a", N: "#ee9d90", I: "#f6bfb6", T: "#f08f9a", Y: "#eec79c" },
  // 제리: 크림빛 몸에 회색 포인트(귀·눈가·꼬리). 이마 가운데 밝은 줄, 흰 주둥이와 가슴, 하늘색 눈
  jeri: { O: "#5a4f57", B: "#ecdfd2", G: "#9d9199", H: "#f8f0e6", S: "#8a7e87", P: "#93878f", M: "#d9cdc6", W: "#fffdf8", F: "#d5c9c8",
          E: "#5fb0ea", K: "#1d3b55", L: "#ffffff", C: "#463c43", N: "#b08a8c", I: "#c9a9ad", T: "#ec8fa0", Y: "#e3d4c6" },
};

/* ---------- 파일로 쓰기 ---------- */
const body = `/**
 * 픽셀 고양이 도트 그림 (먼치킨 — 다리가 짧고 몸이 길다). 오른쪽을 보는 기준.
 * ⚠️ 이 파일은 scripts/make-cat-sprites.mjs 가 만든다. 직접 고치지 말고 그 스크립트를 고쳐서 다시 실행할 것.
 * 글자 = 역할:  O 외곽선  B 몸  H 밝은 털  S 줄무늬(머리·꼬리)  Y 몸 무늬  P 포인트  M 마스크  W 주둥이·가슴  F 발
 *              E 눈동자색  K 동공  L 눈 반짝임  C 감은 눈  N 코  I 귀 안쪽  T 혀  . 투명
 */
export type CatFrame = string[];

export const CAT_W = ${W};
export const CAT_H = ${H};

export type FrameName =
  | "walkA" | "walkB" | "sit" | "sitWag" | "sleep" | "jump"
  | "groomA" | "groomB" | "stretch";

export type CatKind = "taeri" | "jeri";

/** 고양이마다 그림이 다르다 — 태리는 둥글고 통통하게, 제리는 얼굴이 갸름하고 날씬하게 */
export const FRAMES: Record<CatKind, Record<FrameName, CatFrame>> = ${JSON.stringify(frames, null, 2)};

/** 고양이 이름 (실제 고양이 태리·제리) */
export const CAT_NAMES: Record<CatKind, string> = { taeri: "태리", jeri: "제리" };

/** 역할 글자 → 색 */
export const PALETTES: Record<CatKind, Record<string, string>> = ${JSON.stringify(palettes, null, 2)};
`;
fs.writeFileSync("lib/cat-sprites.ts", body);

/* ---------- 미리보기 HTML ---------- */
if (process.argv[2]) {
  const px = 7;
  let html = '<body style="margin:0;background:#faf6ee;font-family:sans-serif"><div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px">';
  for (const kind of ["taeri", "jeri"]) for (const [name, rows] of Object.entries(frames[kind])) {
    let rects = "";
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = palettes[kind][ch]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
    html += `<div><svg width="${W * px}" height="${H * px}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" style="background:#fffdf9;border:1px solid #e4dccb">${rects}</svg><div style="font-size:12px;color:#555">${kind} · ${name}</div></div>`;
  }
  // 실제 크기(2배)로도 한 줄
  html += '</div><div style="display:flex;gap:16px;padding:10px;align-items:flex-end">';
  for (const kind of ["taeri", "jeri"]) for (const [name, rows] of Object.entries(frames[kind])) {
    let rects = "";
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = palettes[kind][ch]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
    html += `<svg width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${rects}</svg>`;
  }
  fs.writeFileSync(process.argv[2], html + "</div></body>");
}
console.log("lib/cat-sprites.ts 생성:", Object.keys(frames.taeri).length, "장면 × 2마리,", W + "x" + H);
