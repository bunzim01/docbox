import { downloadFileName } from "./documents";

export type ShareItem = {
  id: string;
  title: string;
  file_type: string | null;
  fileUrl: string;
};

/** 이 기기가 파일을 공유시트로 보낼 수 있는지 (폰이면 대개 가능) */
export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File(["x"], "t.txt", { type: "text/plain" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/**
 * 한 번 받은 파일은 기억해 둔다.
 * 폰은 "버튼을 누른 직후"에만 공유창을 허용하는데, 큰 파일은 받는 동안 그 시간이 지나 버린다.
 * 미리 받아 두면 누르는 즉시 공유창을 띄울 수 있다.
 */
const cache = new Map<string, File>();
const MAX_CACHED = 12;

function remember(id: string, file: File) {
  cache.delete(id);
  cache.set(id, file);
  while (cache.size > MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function isPrepared(items: ShareItem[]): boolean {
  return items.every((item) => cache.has(item.id));
}

/** 파일을 받아서 기억해 둔다 (이미 받았으면 건너뜀) */
export async function prepareFiles(items: ShareItem[]): Promise<void> {
  for (const item of items) {
    if (cache.has(item.id)) continue;
    const res = await fetch(item.fileUrl);
    if (!res.ok) throw new Error(`"${item.title}" 파일을 가져오지 못했습니다.`);
    const blob = await res.blob();
    remember(
      item.id,
      new File([blob], downloadFileName(item.title, item.file_type), {
        type: blob.type || "application/octet-stream",
      }),
    );
  }
}

export type ShareResult =
  | { status: "shared" }
  | { status: "cancelled" }
  /** 파일은 준비됐지만 기기가 공유창을 막았다 → 한 번 더 누르면 바로 된다 */
  | { status: "tap-again" }
  | { status: "unsupported" }
  | { status: "error"; message: string };

/**
 * 파일들을 기기 공유시트로 보낸다. 카톡을 고르면 파일이 그대로 전송된다.
 * 이미 받아 둔 파일이면 기다림 없이 곧바로 공유창을 띄운다.
 */
export async function shareFiles(items: ShareItem[]): Promise<ShareResult> {
  if (items.length === 0) return { status: "error", message: "보낼 문서가 없습니다." };

  const wasReady = isPrepared(items);

  try {
    if (!wasReady) await prepareFiles(items);

    const files = items.map((item) => cache.get(item.id)!);

    // 용량이 크거나 개수가 많으면 기기가 거절할 수 있다
    if (!navigator.canShare?.({ files })) return { status: "unsupported" };

    await navigator.share({
      files,
      title: items.length === 1 ? items[0].title : `문서 ${items.length}개`,
    });
    return { status: "shared" };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { status: "cancelled" };
    // 받는 데 오래 걸려 "누른 직후" 시간이 지난 경우 — 파일은 이미 준비돼 있다
    if (e instanceof DOMException && e.name === "NotAllowedError" && !wasReady) {
      return { status: "tap-again" };
    }
    return { status: "error", message: e instanceof Error ? e.message : "공유하지 못했습니다." };
  }
}

/** PC 용 — 공유 링크들을 클립보드에 복사 */
export async function copyShareLinks(ids: string[]): Promise<boolean> {
  const text = ids.map((id) => `${window.location.origin}/s/${id}`).join("\n");
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
