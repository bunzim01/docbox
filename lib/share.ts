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

/**
 * 파일 하나를 받는 데 기다려 주는 시간.
 * 없으면 신호가 나쁜 곳에서 버튼이 '준비 중…' 으로 영원히 멈춰 있어 고장난 것처럼 보인다.
 */
const FETCH_TIMEOUT = 60_000;

/** 파일을 받아서 기억해 둔다 (이미 받았으면 건너뜀) */
export async function prepareFiles(items: ShareItem[]): Promise<void> {
  for (const item of items) {
    if (cache.has(item.id)) continue;

    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), FETCH_TIMEOUT);
    let res: Response;
    try {
      res = await fetch(item.fileUrl, { signal: stop.signal });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        throw new Error(`"${item.title}" 을 받는 데 너무 오래 걸립니다. 신호가 좋은 곳에서 다시 눌러 주세요.`);
      }
      throw new Error(`"${item.title}" 을 받지 못했습니다. 인터넷 연결을 확인해 주세요.`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      // 404 면 저장소에 파일이 없다 = 업로드가 중간에 끊긴 문서
      throw new Error(
        res.status === 404
          ? `"${item.title}" 의 파일이 저장소에 없습니다. 다시 올려 주세요.`
          : `"${item.title}" 을 받지 못했습니다. (오류 ${res.status})`,
      );
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      throw new Error(`"${item.title}" 파일이 비어 있습니다. 다시 올려 주세요.`);
    }

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
  /** 이 기기가 파일 공유 자체를 못 한다 (PC 등) */
  | { status: "unsupported" }
  /** 파일이 너무 커서 기기가 공유를 거절했다 → 링크로 보내야 한다 */
  | { status: "too-big" }
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

    // 용량이 크거나 개수가 많으면 기기가 거절한다 → 링크로 보내야 한다
    if (!navigator.canShare?.({ files })) return { status: "too-big" };

    await navigator.share({
      files,
      title: items.length === 1 ? items[0].title : `문서 ${items.length}개`,
    });
    return { status: "shared" };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { status: "cancelled" };

    if (e instanceof DOMException && e.name === "NotAllowedError") {
      // 받는 데 오래 걸려 "누른 직후" 시간이 지난 경우 — 파일은 이미 준비돼 있으니 한 번 더 누르면 된다
      if (!wasReady) return { status: "tap-again" };
      // 준비된 파일로도 막혔다면 이 기기로는 안 되는 것이다 → 링크로 넘긴다
      return { status: "too-big" };
    }

    // 파일 받기 단계에서 낸 우리 메시지는 이미 한국어다. 그 밖의 것은 영어가 새어 나오지 않게 감싼다.
    // 원인 글자는 괄호에만 남겨 둔다 — 또 나면 무엇이 막혔는지 알 수 있어야 한다.
    if (e instanceof Error && !(e instanceof DOMException)) {
      return { status: "error", message: e.message };
    }
    const code = e instanceof DOMException ? ` (${e.name})` : "";
    return { status: "error", message: `보내지 못했습니다${code}. 잠시 뒤 다시 눌러 주세요.` };
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

/**
 * 자주 보내는 파일을 미리 받아 둔다 — 누르는 즉시 공유창이 뜨게.
 * 데이터 요금을 아끼려고: 절약 모드면 안 받고, 와이파이가 확실할 때만 큰 파일을 받는다.
 * (아이폰은 연결 종류를 알려주지 않아 작은 파일만 받는다)
 */
export function prefetchForShare(items: (ShareItem & { file_size: number | null })[]): void {
  if (!canShareFiles()) return; // PC 는 링크 복사라 필요 없다

  const conn = (navigator as Navigator & {
    connection?: { saveData?: boolean; type?: string; effectiveType?: string };
  }).connection;
  if (conn?.saveData) return;

  const onWifi = conn?.type === "wifi" || conn?.type === "ethernet";
  const slow = conn?.effectiveType === "2g" || conn?.effectiveType === "slow-2g";
  if (slow) return;

  const maxBytes = onWifi ? 30 * 1024 * 1024 : 5 * 1024 * 1024;
  const targets = items
    .filter((item) => !cache.has(item.id) && (item.file_size ?? Infinity) <= maxBytes)
    .slice(0, onWifi ? 4 : 2);
  if (targets.length === 0) return;

  const run = () => {
    // 하나씩 차례로, 실패해도 조용히 넘어간다 (누를 때 다시 받으면 된다)
    targets
      .reduce((p, item) => p.then(() => prepareFiles([item]).catch(() => {})), Promise.resolve())
      .catch(() => {});
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 1500);
}
