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
// 그루밍용 앞발: 가슴에서 비스듬히 올라와 입 앞에 닿는다 (두 마리 공용)
const J_PAW_UP = [
  "..OO.",
  ".OFFO",
  ".OFFO",
  "OBBO.",
  "OBO..",
  "OO...",
];
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
    groomA: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [T_HEAD_CLOSED, 12, 1], [J_PAW_UP, 20, 9]),
    groomB: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [T_HEAD_LICK, 12, 2], [J_PAW_UP, 20, 10]),
    stretch: compose([TAIL_UP, 0, 0], [STRETCH, 0, 4], [T_HEAD_CLOSED, 17, 5]),
    sleep: compose([T_SLEEP, 0, 7], [T_HEAD_CLOSED, 15, 7]),
    crouchA: compose([TAIL_BACK, 0, 9], [T_BODY, 3, 8], [LEG_SHORT, 5, 14], [LEG_SHORT, 9, 14], [LEG_SHORT, 16, 14], [LEG_SHORT, 20, 14], [T_HEAD, 17, 6]),
    crouchB: compose([TAIL_MID, 0, 7], [T_BODY, 2, 7], [LEG_SHORT, 4, 14], [LEG_SHORT, 8, 14], [LEG_SHORT, 16, 14], [LEG_SHORT, 20, 14], [T_HEAD, 17, 6]),
    eatA: compose([TAIL_UP, 0, 1], [T_BODY, 2, 6], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [T_HEAD_CLOSED, 17, 7]),
    eatB: compose([TAIL_MID, 0, 4], [T_BODY, 2, 6], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [T_HEAD_LICK, 17, 8]),
    jump: compose([TAIL_BACK, 0, 5], [T_BODY, 3, 3], [LEG_BACK, 1, 9], [LEG_BACK, 5, 9], [LEG_FRONT, 17, 9], [LEG_FRONT, 21, 9], [T_HEAD, 17, -1]),
    // 쓰다듬 받는 중 — 눈을 감고 손 쪽으로 머리를 비빈다. 꼬리도 살랑
    nuzzleA: compose([TAIL_GROUND, 0, 14], [T_SIT, 8, 7], [T_HEAD_CLOSED, 12, 0]),
    nuzzleB: compose([TAIL_GROUND, 0, 13], [T_SIT, 8, 7], [T_HEAD_CLOSED, 13, 1]),
  },
  jeri: {
    walkA: compose([TAIL_UP, 0, 3], [J_BODY, 2, 8], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [J_HEAD, 18, 1]),
    walkB: compose([TAIL_MID, 0, 6], [J_BODY, 2, 8], [LEG, 5, 13], [LEG_SHORT, 8, 13], [LEG_SHORT, 15, 13], [LEG, 18, 13], [J_HEAD, 18, 2]),
    sit: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [J_HEAD, 11, -1]),
    sitWag: compose([TAIL_UP, 4, 7], [J_SIT, 9, 7], [J_HEAD, 11, -1]),
    groomA: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [J_PAW_UP, 18, 8], [J_HEAD_CLOSED, 12, 0]),
    groomB: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [J_PAW_UP, 18, 9], [J_HEAD_LICK, 12, 1]),
    stretch: compose([TAIL_UP, 0, 0], [STRETCH, 0, 4], [J_HEAD_CLOSED, 18, 4]),
    sleep: compose([J_SLEEP, 0, 9], [J_HEAD_CLOSED, 15, 7]),
    crouchA: compose([TAIL_BACK, 0, 10], [J_BODY, 3, 10], [LEG_SHORT, 5, 14], [LEG_SHORT, 9, 14], [LEG_SHORT, 16, 14], [LEG_SHORT, 20, 14], [J_HEAD, 18, 5]),
    crouchB: compose([TAIL_MID, 0, 8], [J_BODY, 2, 9], [LEG_SHORT, 4, 14], [LEG_SHORT, 8, 14], [LEG_SHORT, 16, 14], [LEG_SHORT, 20, 14], [J_HEAD, 18, 5]),
    eatA: compose([TAIL_UP, 0, 3], [J_BODY, 2, 8], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [J_HEAD_CLOSED, 19, 6]),
    eatB: compose([TAIL_MID, 0, 6], [J_BODY, 2, 8], [LEG, 4, 13], [LEG, 8, 13], [LEG, 15, 13], [LEG, 19, 13], [J_HEAD_LICK, 19, 7]),
    jump: compose([TAIL_BACK, 0, 6], [J_BODY, 3, 5], [LEG_BACK, 1, 9], [LEG_BACK, 5, 9], [LEG_FRONT, 17, 9], [LEG_FRONT, 21, 9], [J_HEAD, 19, -1]),
    // 쓰다듬 받는 중 — 눈을 감고 손 쪽으로 머리를 비빈다. 꼬리도 살랑
    nuzzleA: compose([TAIL_GROUND, 1, 14], [J_SIT, 9, 7], [J_HEAD_CLOSED, 12, -1]),
    nuzzleB: compose([TAIL_GROUND, 1, 13], [J_SIT, 9, 7], [J_HEAD_CLOSED, 13, 0]),
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

/* ---------- 밥그릇 · 물그릇 (12x6칸, 채워진 정도 0~3) ---------- */
const bowl = (top0, top1, fill1, fill2) => [top0, top1, "RRRRRRRRRRRR", `R${fill1}R`, `.R${fill2}R.`, "..RRRRRRRR.."];
const bowls = {
  food: [
    bowl("............", "............", "DDDDDDDDDD", "DDDDDDDD"),
    bowl("............", "....KKKK....", "DDDDDDDDDD", "DDDDDDDD"),
    bowl("............", "..KKKKKKKK..", "DDDDDDDDDD", "DDDDDDDD"),
    bowl("....KKKK....", "..KJKKKJKK..", "DDDDDDDDDD", "DDDDDDDD"),
  ],
  water: [
    bowl("............", "............", "GGGGGGGGGG", "GGGGGGGG"),
    bowl("............", "............", "GGGGGGGGGG", "GWWWWWWG"),
    bowl("............", "............", "GGGGGGGGGG", "WWWWWWWW"),
    bowl("............", "............", "WWLWWWWWWW", "WWWWWWWW"),
  ],
};
const bowlPalettes = {
  // 밥그릇: 테라코타 그릇 + 갈색 사료
  food: { R: "#b96a45", D: "#e08f63", K: "#8a5a2b", J: "#a9743a" },
  // 물그릇: 유리처럼 비치는 하늘색 그릇 + 물
  water: { R: "#6f9cc4", G: "#dcebf7", W: "#8cc8f2", L: "#ffffff" },
};

/* ---------- 주인 이윤 (20x24칸) — 긴 머리, 분홍 니트, 남색 치마. 오른쪽을 보는 기준 ---------- */
// 글자: O 외곽선  H 머리  h 머리 윤기  S 피부  s 볼터치·입  E 눈  W 눈 반짝임  T 윗옷  t 윗옷 그늘  K 치마  B 신발
//       C 츄르 봉지  c 츄르 끝(내용물)  Z 베개  z 베개 밝은 면  e 감은 눈
const O_HEAD = [
  ".....OOOOOO.....",
  "....OHHhhHHO....",
  "...OHHhHHHHHO...",
  "...OHHHHHHHHO...",
  "..OHHHHHHHHHHO..",
  "..OHHSSHSSSHHO..",
  "..OHSSSSSSSSHO..",
  "..OHSEWSSEWSHO..",
  "..OHSsSSSSsSHO..",
  "..OHHSSSsSSHHO..",
  "..OHHOSSSSOHHO..",
];
const O_TORSO = [
  "..OHHOTTTTOHHO..",
  "..OHOTTTTTTOHO..",
  ".OOTTTTTTTTTTOO.",
  ".OTTOTTTTTTOTTO.",
  ".OSSOTTTTTTOSSO.",
  ".OSSOKKKKKKOSSO.",
  "..OOKKKKKKKKOO..",
  "...OOOOOOOOOO...",
];
const O_LEGS_STAND = [".....OSOOSO.....", ".....OSOOSO.....", ".....OSOOSO.....", "....OBBOOBBO....", "....OOOOOOOO...."];
const O_LEGS_A = ["....OSO..OSO....", "...OSO....OSO...", "...OSO....OSO...", "..OBBO....OBBO..", "..OOOO....OOOO.."];
const O_LEGS_B = ["......OSSO......", "......OSSO......", "......OSSO......", ".....OBBBBO.....", ".....OOOOOO....."];
// 쪼그려 앉아 츄르를 내민다 (팔과 츄르가 오른쪽으로 뻗는다)
const O_TORSO_GIVE = [
  "..OHHOTTTTOHHO......",
  "..OHOTTTTTTOOOOOOO..",
  ".OOTTTTTTTTTTTTSSCCc",
  ".OTTOTTTTTTOOOOSSCCc",
  ".OSSOTTTTTTO...OO...",
  "..OKKKKKKKKKO.......",
  ".OKKKKKKKKKKKO......",
  ".OBBOOOOOOOBBO......",
  ".OOOOOOOOOOOOO......",
];
// 쓰다듬기 — 쪼그려 앉아 팔을 위로 뻗어 고양이 머리에 손을 얹는다.
// 고양이 머리가 쪼그린 이윤의 얼굴만큼 높아서, 팔은 어깨보다 위로 올라가야 닿는다.
// 그래서 이 부품은 윗줄 3칸이 팔뿐이고, composeOwner 에서 y=12 에 놓는다. A/B 로 손이 오르내린다.
const O_TORSO_PET_A = [
  "................OOO.",
  "...............OSSSO",
  "..............OSSSO.",
  "..OHHOTTTTOHHOOTTO..",
  "..OHOTTTTTTOTTTTO...",
  ".OOTTTTTTTTTTTTO....",
  ".OTTOTTTTTTOTTO.....",
  ".OSSOTTTTTTOSSO.....",
  "..OKKKKKKKKKO.......",
  ".OKKKKKKKKKKKO......",
  ".OBBOOOOOOOBBO......",
  ".OOOOOOOOOOOOO......",
];
const O_TORSO_PET_B = [
  "....................",
  "................OOO.",
  "...............OSSSO",
  "..OHHOTTTTOHHOOSSSO.",
  "..OHOTTTTTTOTTTTO...",
  ".OOTTTTTTTTTTTTO....",
  ".OTTOTTTTTTOTTO.....",
  ".OSSOTTTTTTOSSO.....",
  "..OKKKKKKKKKO.......",
  ".OKKKKKKKKKKKO......",
  ".OBBOOOOOOOBBO......",
  ".OOOOOOOOOOOOO......",
];
// 손 흔들기 (한쪽 팔을 든다)
const O_TORSO_WAVE = [
  "..OHHOTTTTOHHO.SSO",
  "..OHOTTTTTTOHOOTTO",
  ".OOTTTTTTTTTTOTTO.",
  ".OTTOTTTTTTOTTO...",
  ".OSSOTTTTTTOSO....",
  ".OSSOKKKKKKOO.....",
  "..OOKKKKKKKKO.....",
  "...OOOOOOOOOO.....",
];
const OW = 20, OH = 24;
// 낮잠 장면은 가로로 길어서 따로 그린다 (베개 벤 이윤)
const NAP_W = 46, NAP_H = 14;
const pad = (rows, w) => rows.map((r) => (r + ".".repeat(w)).slice(0, w));
const O_NAP = pad([
  "",
  "....ZZZZZZZZZZ",
  "...ZzzzzzzzzzzZ",
  "...ZzOHHHHHHHHOZ",
  "...ZzOHHHHHHHHHOOOOOOOOOOOOOOOOOOOOOOOOOO",
  "...ZzOHHSSSSSSHOTTTTTTTTTTTTKKKKKKKKSSSSSSO",
  "...ZzOHeSSSSSeHOTTTTTTTTTTTTKKKKKKKKSSSSSSSO",
  "...ZzOHSSSSSSSHOTTTTTTTTTTTTKKKKKKKKSSSSSSSO",
  "....ZOHHSSSSSHHOTTTTTTTTTTTTKKKKKKKKSSSSSSO",
  "....ZZOHHHHHHHOOOOOOOOOOOOOOOOOOOOOOOOOOO",
  ".....ZZZZZZZZZZ",
  "",
  "",
], NAP_W);

// 들어올 때 품에 안고 오는 베개
const PILLOW = [
  ".OOOOOO.",
  "OZzzzzZO",
  "OZzzzzZO",
  "OZZZZZZO",
  ".OOOOOO.",
];
function composeOwner(layers) {
  const c = Array.from({ length: OH }, () => Array(OW).fill("."));
  layers.forEach(([part, x0, y0]) => part.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const x = x0 + dx, y = y0 + dy;
    if (ch !== "." && x >= 0 && x < OW && y >= 0 && y < OH) c[y][x] = ch;
  })));
  return c.map((r) => r.join(""));
}
const PILLOW_W = PILLOW[0].length, PILLOW_H = PILLOW.length;
const owner = {
  stand: composeOwner([[O_HEAD, 0, 0], [O_TORSO, 0, 11], [O_LEGS_STAND, 0, 19]]),
  walkA: composeOwner([[O_HEAD, 0, 0], [O_TORSO, 0, 11], [O_LEGS_A, 0, 19]]),
  walkB: composeOwner([[O_HEAD, 0, 1], [O_TORSO, 0, 12], [O_LEGS_B, 0, 19]]),
  give: composeOwner([[O_HEAD, 0, 4], [O_TORSO_GIVE, 0, 15]]),
  petA: composeOwner([[O_HEAD, 0, 4], [O_TORSO_PET_A, 0, 12]]),
  petB: composeOwner([[O_HEAD, 0, 4], [O_TORSO_PET_B, 0, 12]]),
  wave: composeOwner([[O_HEAD, 0, 0], [O_TORSO_WAVE, 0, 11], [O_LEGS_STAND, 0, 19]]),
};
const ownerPalette = {
  O: "#3a2a2a", H: "#4a3028", Z: "#cfe0f2", z: "#eaf3fc", h: "#7a5443", S: "#fbdcc4", s: "#f4a09a", E: "#2a1c1c", W: "#ffffff",
  T: "#f7b8c8", t: "#ec9bb0", K: "#2f3f63", B: "#7a4a3a", C: "#f39a3d", c: "#fff1d6", e: "#3a2a2a",
  V: "#ef6f8f",
};
// 츄르 아이콘 (누르면 이윤이 츄르를 주러 온다)
const churuIcon = ["......Oc", ".....OCc", "....OCCO", "...OCCO.", "..OCCO..", ".OCCO...", "OCCO....", "OOO....."];

// 쓰다듬기 아이콘 (손 위에 하트)
const petIcon = [
  "..V.V...",
  ".VVVVV..",
  "..VVV...",
  "...V....",
  "........",
  ".OSSSO..",
  "OSSSSSO.",
  ".OOOOO..",
];

/* ---------- 낚싯대 장난감 (16x12칸) — 오른쪽 아래가 손잡이. A/B 를 번갈아 흔든다 ---------- */
// 글자: S 막대  r 줄  F 깃털  f 깃털 끝
const toy = {
  // 손(오른쪽 아래)에서 막대가 왼쪽 위로 뻗고, 끝에서 줄이 내려와 깃털이 달린다
  toyA: [
    "....S...........",
    "....rS..........",
    "....r.S.........",
    "....r..S........",
    "...fFf..S.......",
    "..fFFFf..S......",
    "...fFf....S.....",
    "....f......S....",
    "............S...",
    ".............S..",
    "..............S.",
    "...............S",
  ],
  // 줄이 왼쪽으로 흔들린 모습
  toyB: [
    "....S...........",
    "...r.S..........",
    "..r...S.........",
    ".r.....S........",
    "fFf.....S.......",
    "FFFf.....S......",
    "fFf.......S.....",
    ".f.........S....",
    "............S...",
    ".............S..",
    "..............S.",
    "...............S",
  ],
};
const toyPalette = { S: "#8a5a2b", r: "#8a8175", F: "#ef6f8f", f: "#f9b3c4" };
const toyIcon = ["..fFf.", ".fFFFf", "..fFf.", "...r..", "..r...", ".r....", "S....."];

/* ---------- 따라 주는 것: 사료 봉지 · 생수병 (14x14, 기울여 따르는 모습) ---------- */
// K 봉지  k 봉지 라벨  d 사료 알갱이  Q 병  q 물  c 뚜껑  b 물줄기
const POUR_W = 16, POUR_H = 17;
const kibble = (a, b, c) => [a, b, c];
const bag = (drop) => pad([
  "...OOOOOOO",
  "..OKKKKKKKO",
  "..OKKKKKKKO",
  "..OKkkkkkKO",
  "..OKkddkkKO",
  "..OKkkkkkKO",
  "..OKKKKKKKO",
  "..OKKKKKKKO",
  "...OKKKKKO",
  "....OKKKO",
  ".....OOO",
  ...drop,
], POUR_W);
const bottle = (drop) => pad([
  "...PPPPPP",
  "..PQqqqqQP",
  "..PQqqqqQP",
  "..PQwwwwQP",
  "..PQwwwwQP",
  "..PQqqqqQP",
  "..PQqqqqQP",
  "...PQqqQP",
  "....PqqP",
  "....PqqP",
  ".....PP",
  ...drop,
], POUR_W);
const pourFrames = {
  foodA: bag(kibble("....d..d", ".....d..", "....d.d.", "")),
  foodB: bag(kibble(".....d.d", "....d...", ".....d.d", "")),
  waterA: bottle(kibble(".....b", ".....b", "....b", "....b")),
  waterB: bottle(kibble(".....b", "....b", "....b", ".....b")),
};
const pourPalette = {
  O: "#6b4a25", K: "#c98f4e", k: "#f0dcc0", d: "#7a4a18",
  P: "#4d86b8", Q: "#eaf6ff", q: "#8ccdf2", w: "#ffffff", b: "#7cc4ef",
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
  | "groomA" | "groomB" | "stretch" | "eatA" | "eatB" | "crouchA" | "crouchB"
  | "nuzzleA" | "nuzzleB";

export type CatKind = "taeri" | "jeri";

/** 고양이마다 그림이 다르다 — 태리는 둥글고 통통하게, 제리는 얼굴이 갸름하고 날씬하게 */
export const FRAMES: Record<CatKind, Record<FrameName, CatFrame>> = ${JSON.stringify(frames, null, 2)};

/** 고양이 이름 (실제 고양이 태리·제리) */
export const CAT_NAMES: Record<CatKind, string> = { taeri: "태리", jeri: "제리" };

/** 역할 글자 → 색 */
export const PALETTES: Record<CatKind, Record<string, string>> = ${JSON.stringify(palettes, null, 2)};

/** 밥그릇·물그릇 — 채워진 정도(0~3)별 그림 */
export type BowlKind = "food" | "water";
export const BOWL_W = 12;
export const BOWL_H = 6;
export const BOWLS: Record<BowlKind, CatFrame[]> = ${JSON.stringify(bowls, null, 2)};
export const BOWL_PALETTES: Record<BowlKind, Record<string, string>> = ${JSON.stringify(bowlPalettes, null, 2)};

/** 주인 이윤 — 츄르를 주러 온다 */
export type OwnerFrame = "stand" | "walkA" | "walkB" | "give" | "petA" | "petB" | "wave";
export const OWNER_NAME = "이윤";
export const OWNER_W = ${OW};
export const OWNER_H = ${OH};
export const OWNER_FRAMES: Record<OwnerFrame, CatFrame> = ${JSON.stringify(owner, null, 2)};
export const OWNER_PALETTE: Record<string, string> = ${JSON.stringify(ownerPalette, null, 2)};
export const CHURU_ICON: CatFrame = ${JSON.stringify(churuIcon, null, 2)};

/** 낮잠 — 베개 베고 누운 이윤 (가로로 길어서 따로) */
export const NAP_W = ${NAP_W};
export const NAP_H = ${NAP_H};
export const OWNER_NAP: CatFrame = ${JSON.stringify(O_NAP, null, 2)};
export const PILLOW_W = ${PILLOW_W};
export const PILLOW_H = ${PILLOW_H};
export const PILLOW: CatFrame = ${JSON.stringify(PILLOW, null, 2)};

/** 밥·물을 따라 주는 모습 — 기울인 사료 봉지 / 생수병과 떨어지는 줄기 */
export const POUR_W = ${POUR_W};
export const POUR_H = ${POUR_H};
export const POUR_FRAMES: Record<"foodA" | "foodB" | "waterA" | "waterB", CatFrame> =
  ${JSON.stringify(pourFrames, null, 2)};
export const POUR_PALETTE: Record<string, string> = ${JSON.stringify(pourPalette, null, 2)};
export const NAP_ICON: CatFrame = ${JSON.stringify([
  "..OOOO..",
  ".OZzzZO.",
  "OZzOHOzZO".slice(0, 8),
  "OZzHSSHO",
  "OZzHCCHO",
  ".OZzzZO.",
  "..OOOO..",
], null, 2)};

/** 낚싯대 장난감 — 놀아줄 때 이윤이 흔든다 */
export const TOY_W = 16;
export const TOY_H = 12;
export const TOY_FRAMES: Record<"toyA" | "toyB", CatFrame> = ${JSON.stringify(toy, null, 2)};
export const TOY_PALETTE: Record<string, string> = ${JSON.stringify(toyPalette, null, 2)};
export const TOY_ICON: CatFrame = ${JSON.stringify(toyIcon, null, 2)};

/** 쓰다듬기 아이콘 (손 + 하트) */
export const PET_ICON: CatFrame = ${JSON.stringify(petIcon, null, 2)};
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
  html += '</div><div style="display:flex;gap:12px;padding:10px">';
  for (const kind of ["food", "water"]) bowls[kind].forEach((rows, level) => {
    let rects = "";
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = bowlPalettes[kind][ch]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
    html += `<div><svg width="96" height="48" viewBox="0 0 12 6" shape-rendering="crispEdges" style="background:#fffdf9;border:1px solid #e4dccb">${rects}</svg><div style="font-size:12px;color:#555">${kind} ${level}</div></div>`;
  });
  html += '</div><div style="display:flex;gap:12px;padding:10px;align-items:flex-end">';
  for (const [name, rows] of Object.entries(owner)) {
    let rects = "";
    rows.forEach((row, y) => [...row].forEach((ch, x) => { const c = ownerPalette[ch]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
    html += `<div><svg width="${OW * 7}" height="${OH * 7}" viewBox="0 0 ${OW} ${OH}" shape-rendering="crispEdges" style="background:#fffdf9;border:1px solid #e4dccb">${rects}</svg><div style="font-size:12px;color:#555">이윤 · ${name}</div></div>`;
  }
  { let rects = ""; churuIcon.forEach((row, y) => [...row].forEach((ch, x) => { const c = ownerPalette[ch]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; }));
    html += `<div><svg width="64" height="64" viewBox="0 0 8 8" shape-rendering="crispEdges" style="background:#fffdf9;border:1px solid #e4dccb">${rects}</svg><div style="font-size:12px;color:#555">츄르</div></div>`; }
  fs.writeFileSync(process.argv[2], html + "</div></body>");
}
console.log("lib/cat-sprites.ts 생성:", Object.keys(frames.taeri).length, "장면 × 2마리,", W + "x" + H);
