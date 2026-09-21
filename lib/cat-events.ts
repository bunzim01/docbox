/**
 * 앱에서 일어난 일을 고양이에게 알려준다.
 *  - "upload": 파일을 올렸다 → 달려와서 구경
 *  - "sent":   카톡을 보냈다 → 기뻐서 폴짝폴짝
 * 화면이 바뀌면서(업로드 화면 → 자료실) 전달돼야 할 때를 위해 잠깐 기억해 둔다.
 */
export type CatEvent = "upload" | "sent";

const KEY = "docbox-cat-event";

export function tellCats(type: CatEvent, opts: { afterNavigation?: boolean } = {}) {
  if (typeof window === "undefined") return;
  try {
    if (opts.afterNavigation) sessionStorage.setItem(KEY, type);
  } catch {
    // 저장이 막혀 있어도 고양이가 반응을 안 할 뿐이다
  }
  window.dispatchEvent(new CustomEvent("docbox:cat", { detail: type }));
}

/** 다른 화면에서 남겨 둔 소식이 있으면 꺼내 온다 */
export function takePendingCatEvent(): CatEvent | null {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) sessionStorage.removeItem(KEY);
    return v === "upload" || v === "sent" ? v : null;
  } catch {
    return null;
  }
}

/**
 * 돌보기 버튼 → 이윤을 불러 밥·물을 채우거나, 츄르를 주거나, 낚싯대로 놀아주거나, 쓰다듬어 준다.
 * ("nap" 같이 낮잠자기는 자는 모습이 어색해서 버튼을 빼 뒀다 — 동작은 app/cats.tsx 에 그대로 있다)
 */
export type CareKind = "food" | "water" | "churu" | "play" | "nap" | "pet";

export function careForCats(kind: CareKind) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("docbox:care", { detail: kind }));
}
