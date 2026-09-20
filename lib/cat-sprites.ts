/**
 * 픽셀 고양이 도트 그림 (먼치킨 — 다리가 짧고 몸이 길다). 오른쪽을 보는 기준.
 * ⚠️ 이 파일은 scripts/make-cat-sprites.mjs 가 만든다. 직접 고치지 말고 그 스크립트를 고쳐서 다시 실행할 것.
 * 글자 = 역할:  O 외곽선  B 몸  H 밝은 털  S 줄무늬(머리·꼬리)  Y 몸 무늬  P 포인트  M 마스크  W 주둥이·가슴  F 발
 *              E 눈동자색  K 동공  L 눈 반짝임  C 감은 눈  N 코  I 귀 안쪽  T 혀  . 투명
 */
export type CatFrame = string[];

export const CAT_W = 30;
export const CAT_H = 17;

export type FrameName =
  | "walkA" | "walkB" | "sit" | "sitWag" | "sleep" | "jump"
  | "groomA" | "groomB" | "stretch";

export const FRAMES: Record<FrameName, CatFrame> = {
  "walkA": [
    "..............................",
    "...................OO.....OO..",
    "..OO..............OPIO...OIPO.",
    ".OPPO.............OPPOOOOOPPO.",
    "OPSO..............OGGSGMGSGGO.",
    "OPPO..............OGKLGMGKLGO.",
    ".OPSO.............OGEEMNMEEGO.",
    "..OPOOOOOOOOOOOOOOOBBWWWWWBBO.",
    "...OHHHHHHHHHHHHHHHOOWWWWWOO..",
    "..OBBYBBBYBBBYBBBYBBBOOOOO....",
    "..OBBYBBBYBBBYBBBYBBBO........",
    "..OBBBBBBBBBBBBBBBBWWO........",
    "...OBBBBBBBBBBBBBBWWO.........",
    "....OBOOOBOOOOOOBOOOBO........",
    "....OBO.OBO....OBO.OBO........",
    "....OFO.OFO....OFO.OFO........",
    "....OOO.OOO....OOO.OOO........"
  ],
  "walkB": [
    "..............................",
    "..............................",
    "...................OO.....OO..",
    "..................OPIO...OIPO.",
    "..................OPPOOOOOPPO.",
    ".OOO..............OGGSGMGSGGO.",
    "OPSPO.............OGKLGMGKLGO.",
    ".OOPOOOOOOOOOOOOOOOGEEMNMEEGO.",
    "...OHHHHHHHHHHHHHHOBBWWWWWBBO.",
    "..OBBYBBBYBBBYBBBYBOOWWWWWOO..",
    "..OBBYBBBYBBBYBBBYBBBOOOOO....",
    "..OBBBBBBBBBBBBBBBBWWO........",
    "...OBBBBBBBBBBBBBBWWO.........",
    "....OOBOOBOOOOOOBOOBO.........",
    ".....OBOOFO....OFOOBO.........",
    ".....OFOOOO....OOOOFO.........",
    ".....OOO..........OOO........."
  ],
  "sit": [
    ".............OO.....OO........",
    "............OPIO...OIPO.......",
    "............OPPOOOOOPPO.......",
    "............OGGSGMGSGGO.......",
    "............OGKLGMGKLGO.......",
    "............OGEEMNMEEGO.......",
    "............OBBWWWWWBBO.......",
    ".............OOWWWWWOO........",
    "............OBBOOOOO..........",
    "...........OBBYBBWWO..........",
    "..........OBBBBBBWWWO.........",
    "..........OBYBBBBWWWO.........",
    ".........OBBBBBBBBWWO.........",
    ".........OBBYBBBBBBBO.........",
    "..OOOOOOOOBBBBBOBBOBO.........",
    ".OPPSPPSPOFFFBBOFFOFFO........",
    "..OOOOOOOOOOOOOOOOOOOO........"
  ],
  "sitWag": [
    ".............OO.....OO........",
    "............OPIO...OIPO.......",
    "............OPPOOOOOPPO.......",
    "............OGGSGMGSGGO.......",
    "............OGKLGMGKLGO.......",
    "............OGEEMNMEEGO.......",
    "............OBBWWWWWBBO.......",
    "......OO.....OOWWWWWOO........",
    ".....OPPO...OBBOOOOO..........",
    "....OPSO...OBBYBBWWO..........",
    "....OPPO..OBBBBBBWWWO.........",
    ".....OPSO.OBYBBBBWWWO.........",
    "......OPPOBBBBBBBBWWO.........",
    ".......OPOBBYBBBBBBBO.........",
    "........OOBBBBBOBBOBO.........",
    ".........OFFFBBOFFOFFO........",
    ".........OOOOOOOOOOOOO........"
  ],
  "groomA": [
    "..............................",
    "..............OO.....OO.......",
    ".............OPIO...OIPO......",
    ".............OPPOOOOOPPO......",
    ".............OGGSGMGSGGO......",
    ".............OGGGGMGGGGO......",
    ".............OGCCMNMCCGO......",
    ".............OBBWWWWWBBO......",
    "............OBOOWWWWWOOOO.....",
    "...........OBBYBOOOOO.OFFO....",
    "..........OBBBBBBWWWO.OFFO....",
    "..........OBYBBBBWWWO..OBO....",
    ".........OBBBBBBBBWWO..OBO....",
    ".........OBBYBBBBBBBO.........",
    "..OOOOOOOOBBBBBOBBOBO.........",
    ".OPPSPPSPOFFFBBOFFOFFO........",
    "..OOOOOOOOOOOOOOOOOOOO........"
  ],
  "groomB": [
    "..............................",
    "..............................",
    "..............OO.....OO.......",
    ".............OPIO...OIPO......",
    ".............OPPOOOOOPPO......",
    ".............OGGSGMGSGGO......",
    ".............OGGGGMGGGGO......",
    ".............OGCCMNMCCGO......",
    "............OOBBWWWWWBBO......",
    "...........OBBOOWWTWWOOOO.....",
    "..........OBBBBBOOTOO.OFFO....",
    "..........OBYBBBBWWWO.OFFO....",
    ".........OBBBBBBBBWWO..OBO....",
    ".........OBBYBBBBBBBO..OBO....",
    "..OOOOOOOOBBBBBOBBOBO.........",
    ".OPPSPPSPOFFFBBOFFOFFO........",
    "..OOOOOOOOOOOOOOOOOOOO........"
  ],
  "stretch": [
    "..OO..........................",
    ".OPPO.........................",
    "OPSO..........................",
    "OPPO..........................",
    ".OPSOOOOOO....................",
    "..OOHHHHHBOOO......OO.....OO..",
    "...OBBYBBBBBBOOO..OPIO...OIPO.",
    "...OBBYBBBYBBBBBOOOPPOOOOOPPO.",
    "...OBBBBBBYBBBYBBBOGGSGMGSGGO.",
    "...OBBBBBBBBBBYBBBOGGGGMGGGGO.",
    "...OBBOOOBBBBBBBBBOGCCMNMCCGO.",
    "...OBBO..OOBBBBBBBOBBWWWWWBBO.",
    "...OBBO....OOOBBBBBOOWWWWWOO..",
    "...OBBO.......OOBBBBOOOOOOO...",
    "...OBBO.........OBBBBBBBBFFO..",
    "..OFFFO..........OOOOOOOOOO...",
    "..OOOOO......................."
  ],
  "sleep": [
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "..............................",
    "................OO.....OO.....",
    ".......OOOOOOOOOPIO...OIPO....",
    ".....OOHHHHHHHHOPPOOOOOPPO....",
    "....OBBBYBBBYBBOGGSGMGSGGO....",
    "...OBBBBYBBBYBBOGGGGMGGGGO....",
    "..OBBBBBBBBBBBBOGCCMNMCCGO....",
    "..OBBBBBBBBBBBBOBBWWWWWBBO....",
    "..OPPPPPPPPPPPPBOOWWWWWOO.....",
    "..OPYPPYPPYPPPPOOOOOOOO.......",
    "...OOOOOOOOOOOOO.............."
  ],
  "jump": [
    "....................OO.....OO.",
    "...................OPIO...OIPO",
    "...................OPPOOOOOPPO",
    "...................OGGSGMGSGGO",
    ".....OOOOOOOOOOOOOOOGKLGMGKLGO",
    "OOOOOHHHHHHHHHHHHHHOGEEMNMEEGO",
    "OPSOBBYBBBYBBBYBBBYOBBWWWWWBBO",
    ".OOOBBYBBBYBBBYBBBYBOOWWWWWOO.",
    "...OBBBBBBBBBBBBBBBBWWOOOOO...",
    "...OBOBOBOBBBBBBBOBOWOBO......",
    "..OBOOOBOOOOOOOOOOOBO.OBO.....",
    ".OFO.OFO...........OFO.OFO....",
    ".OO..OO.............OO..OO....",
    "..............................",
    "..............................",
    "..............................",
    ".............................."
  ]
};

export type CatKind = "taeri" | "jeri";

/** 고양이 이름 (실제 고양이 태리·제리) */
export const CAT_NAMES: Record<CatKind, string> = { taeri: "태리", jeri: "제리" };

/** 역할 글자 → 색 */
export const PALETTES: Record<CatKind, Record<string, string>> = {
  "taeri": {
    "O": "#a9794a",
    "B": "#f4d3ab",
    "G": "#f4d3ab",
    "H": "#fbe6cb",
    "S": "#eabf91",
    "P": "#f1cb9f",
    "M": "#f8dcb9",
    "W": "#fffaf1",
    "F": "#fffaf1",
    "E": "#d08a2e",
    "K": "#2a1c10",
    "L": "#ffffff",
    "C": "#a9794a",
    "N": "#ee9d90",
    "I": "#f6bfb6",
    "T": "#f08f9a",
    "Y": "#eec79c"
  },
  "jeri": {
    "O": "#5a4f57",
    "B": "#ecdfd2",
    "G": "#9d9199",
    "H": "#f8f0e6",
    "S": "#8a7e87",
    "P": "#93878f",
    "M": "#d9cdc6",
    "W": "#fffdf8",
    "F": "#d5c9c8",
    "E": "#5fb0ea",
    "K": "#1d3b55",
    "L": "#ffffff",
    "C": "#463c43",
    "N": "#b08a8c",
    "I": "#c9a9ad",
    "T": "#ec8fa0",
    "Y": "#e3d4c6"
  }
};
