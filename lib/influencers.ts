/**
 * '인플루언서' 폴더에 보여 줄 셀러 목록 — 카드를 누르면 그 사람 인스타그램 계정이 열린다.
 * 사용자가 준 표(셀러명·인스타그램 링크)를 그대로 옮겼다. 사람을 더하거나 빼려면 여기만 고치면 된다.
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
