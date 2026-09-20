/**
 * 픽셀 고양이 도트 그림 (먼치킨 — 다리가 짧고 몸이 길다). 오른쪽을 보는 기준.
 * 글자 = 역할:  B 몸  S 무늬  P 포인트(귀·다리·꼬리)  M 얼굴 마스크  W 주둥이·가슴
 *              E 눈  C 감은 눈  N 코  I 귀 안쪽  . 투명
 */
export type CatFrame = string[];

export const CAT_W = 20;
export const CAT_H = 11;

export type FrameName =
  | "walkA" | "walkB" | "sit" | "sitWag" | "sleep" | "jump"
  | "groomA" | "groomB" | "stretch";

export const FRAMES: Record<FrameName, CatFrame> = {
  walkA: [
    "....................",
    ".............P...P..",
    "..P..........PI.IP..",
    ".P...........BBBBB..",
    ".P...........BEMEB..",
    ".P..BBBBBBBBBBMNMB..",
    ".PBBBSBBSBBSBBWWWB..",
    "..BBBBBBBBBBBBBWW...",
    "..BBBBBBBBBBBBBB....",
    "..PP..PP...PP..PP...",
    "....................",
  ],
  walkB: [
    "....................",
    ".............P...P..",
    ".P...........PI.IP..",
    ".P...........BBBBB..",
    "..P..........BEMEB..",
    "..P.BBBBBBBBBBMNMB..",
    "..PBBSBBSBBSBBWWWB..",
    "..BBBBBBBBBBBBBWW...",
    "..BBBBBBBBBBBBBB....",
    "...PP.PP....PP.PP...",
    "....................",
  ],
  sit: [
    "..........P...P.....",
    "..........PI.IP.....",
    "..........BBBBB.....",
    "..........BEMEB.....",
    "..........BMNMB.....",
    ".........BBWWWB.....",
    "........BBSBWWB.....",
    ".P......BBBBBBB.....",
    ".PP....BBSBBBBB.....",
    "..PPPPPBBBBBBBB.....",
    ".......PP..PP.PP....",
  ],
  // 앉아서 꼬리를 위로 (sit 과 번갈아 보여주면 꼬리 흔들기)
  sitWag: [
    "..........P...P.....",
    "..........PI.IP.....",
    "..........BBBBB.....",
    "..........BEMEB.....",
    "P.........BMNMB.....",
    "P........BBWWWB.....",
    ".P......BBSBWWB.....",
    ".P......BBBBBBB.....",
    "..P....BBSBBBBB.....",
    "..PPPPPBBBBBBBB.....",
    ".......PP..PP.PP....",
  ],
  // 그루밍: 눈을 감고 앞발을 들어 핥는다 (A/B 를 번갈아)
  groomA: [
    "....................",
    "...........P...P....",
    "...........PI.IP....",
    "...........BBBBB....",
    "...........BCMCB....",
    ".........BBBMNMBP...",
    "........BBSBWWWPP...",
    ".P......BBBBBBBP....",
    ".PP....BBSBBBBB.....",
    "..PPPPPBBBBBBBB.....",
    ".......PP..PP.......",
  ],
  groomB: [
    "....................",
    "....................",
    "...........P...P....",
    "...........PI.IP....",
    "...........BBBBB....",
    ".........BBBCMCBP...",
    "........BBSBMNMPP...",
    ".P......BBBBWWWP....",
    ".PP....BBSBBBBB.....",
    "..PPPPPBBBBBBBB.....",
    ".......PP..PP.......",
  ],
  // 기지개: 엉덩이는 들고 앞발은 쭉
  stretch: [
    "....................",
    ".P..................",
    ".P..................",
    "..P.BBBB............",
    "..PBBBBBBB..........",
    "..BBBSBBBBBB.P...P..",
    "..BBBBBBSBBBBPI.IP..",
    "..PP.BBBBBBBBBBBBB..",
    "..PP...BBBBBBBCMCB..",
    "..PP.....BBBBBMNMB..",
    ".PPP.....PPPPPPWWPP.",
  ],
  sleep: [
    "....................",
    "....................",
    "....................",
    "....................",
    "....................",
    "............P..P....",
    ".....BBBBBBBPIIP....",
    "...BBBSBBSBBBBBBB...",
    "..BBBBBBBBBBMCMCB...",
    ".PBBSBBSBBBBBMNMB...",
    ".PPPPBBBBBBBBWWW....",
  ],
  jump: [
    ".............P...P..",
    "P............PI.IP..",
    ".P...........BBBBB..",
    ".P...........BEMEB..",
    "..P.BBBBBBBBBBMNMB..",
    "..PBBSBBSBBSBBWWWB..",
    "..BBBBBBBBBBBBBWW...",
    "..BBBBBBBBBBBBBB....",
    ".PP.............PP..",
    "P................PP.",
    "....................",
  ],
};

export type CatKind = "cheese" | "siamese";

/** 역할 글자 → 색 */
export const PALETTES: Record<CatKind, Record<string, string>> = {
  // 치즈 태비: 주황 몸 + 진한 줄무늬 + 흰 주둥이
  cheese: {
    B: "#f6ad46", S: "#d9822b", P: "#eb9a35", M: "#f6ad46", W: "#fff4e0",
    E: "#2b2118", C: "#7a4a18", N: "#f08a8a", I: "#f7b7b0",
  },
  // 샴: 크림 몸 + 짙은 갈색 포인트(귀·얼굴·다리·꼬리) + 파란 눈
  siamese: {
    B: "#eedfc6", S: "#dcc7a3", P: "#5b3d2e", M: "#6b4a38", W: "#7a5744",
    E: "#3aa0e6", C: "#2e1f17", N: "#2e1f17", I: "#8a6553",
  },
};
