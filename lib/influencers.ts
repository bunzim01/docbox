/**
 * '인플루언서' 폴더의 셀러 — 카드를 누르면 그 사람 인스타그램 계정이 열린다.
 * 실제 명단은 저장소의 `_data/influencers.json` 에 있고(lib/influencer-store.ts), 앱에서 더하고 뺀다.
 * 아래 INFLUENCERS 는 처음 한 번 그 파일을 만들 때 넣는 시작 명단(사용자가 준 표)이다.
 * handle 은 인스타그램 주소 끝의 아이디 (instagram.com/<handle>).
 */
export type Influencer = { name: string; handle: string };

export const INFLUENCER_FOLDER_NAME = "인플루언서";

/** 이 폴더가 '인플루언서' 폴더인지 — 띄어쓰기·한글 조합 방식(NFC/NFD) 차이는 무시한다 */
export function isInfluencerFolder(name: string | null | undefined): boolean {
  if (!name) return false;
  const clean = (v: string) => v.normalize("NFC").replace(/\s+/g, "");
  return clean(name) === clean(INFLUENCER_FOLDER_NAME);
}

/** 시작 명단 — 저장 파일이 아직 없을 때만 쓴다 */
export const INFLUENCERS: Influencer[] = [
  { name: "별쌤", handle: "b.saem" },
  { name: "서유진", handle: "zinga.173" },
  { name: "쏜언니", handle: "sson__s" },
  { name: "센스홍", handle: "sensehong" },
  { name: "빠나나", handle: "bba_na_na" },
  { name: "최희재", handle: "hjballet80" },
  { name: "조아요그램", handle: "joayogram" },
  { name: "예레브", handle: "jj.pearl" },
  { name: "조이풀", handle: "joyful_youngeun" },
  { name: "이정하", handle: "ofjeonga" },
  { name: "샵봉", handle: "_shopbong" },
  { name: "까리남", handle: "ggarinam" },
  { name: "까사림", handle: "casa_rim" },
  { name: "알밤로그", handle: "albam_log" },
  { name: "오인스", handle: "saedek_oins" },
  { name: "드엘리사", handle: "de_elisa_shop" },
  { name: "제이로하", handle: "jroha0210" },
  { name: "응엘", handle: "eungelll" },
  { name: "홍메리", handle: "hongmerry__" },
  { name: "쏭뜰리에", handle: "ssongtelier" },
  { name: "권작가", handle: "booth108kwon" },
  { name: "조윤주", handle: "joutique600" },
  { name: "트윙클써니", handle: "twinkle_sunny7" },
  { name: "르꼬르망", handle: "le_cormang" },
];

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`;
}

/**
 * 사용자가 넣은 링크·아이디에서 인스타 아이디만 뽑는다. 못 뽑으면 null.
 * 받는 모양: https://www.instagram.com/abc/?igsh=… · instagram.com/abc · @abc · abc
 */
export function parseInstagramHandle(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const fromUrl = text.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = (fromUrl ? fromUrl[1] : text.replace(/^@/, "")).trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  if (["p", "reel", "reels", "stories", "explore"].includes(handle.toLowerCase())) return null; // 게시물 주소
  return handle;
}
