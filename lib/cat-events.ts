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
