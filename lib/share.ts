import { downloadFileName } from "./documents";

export type ShareItem = {
  id: string;
  title: string;
  file_type: string | null;
  fileUrl: string;
};

/** 확장자로 짐작한 파일 종류 — 받기 전에 "이 종류를 보낼 수 있나" 물어볼 때 쓴다 */
const MIME: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  hwp: "application/x-hwp",
  mp4: "video/mp4",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  webm: "video/webm",
  zip: "application/zip",
  "7z": "application/x-7z-compressed",
  rar: "application/vnd.rar",
};

/**
 * 이 기기가 이 종류의 파일을 공유시트로 보낼 수 있는지 — 파일을 받기 전에 확인한다.
 * 안드로이드 크롬은 PDF·사진·영상·소리·글 파일만 보내게 허락한다(압축·오피스 파일은 거절).
 * 아이폰은 대개 다 된다. 50MB 압축 파일을 다 받고 나서야 거절당하지 않게 미리 묻는다.
 */
export function canShareType(items: ShareItem[]): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = items.map((item) => {
      const t = (item.file_type ?? "").toLowerCase();
      return new File(["x"], downloadFileName(item.title, item.file_type), {
        type: MIME[t] ?? "application/octet-stream",
      });
    });
    return navigator.canShare({ files: probe });
  } catch {
    return false;
  }
}

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

/** 이미 받아 둔 파일 (앱 안 PDF 보기 화면이 같은 파일로 화면도 그리고 카톡도 보낸다 — 두 번 받지 않게) */
export function preparedFile(id: string): File | undefined {
  return cache.get(id);
}

export function isPrepared(items: ShareItem[]): boolean {
  return items.every((item) => cache.has(item.id));
}

/**
 * 파일이 멈춘 채로 기다려 주는 시간 — 이만큼 한 바이트도 안 오면 포기한다.
 * 없으면 신호가 나쁜 곳에서 버튼이 '준비 중…' 으로 영원히 멈춰 있어 고장난 것처럼 보인다.
 * (전체 시간이 아니라 '멈춘 시간'으로 잰다 — 큰 파일이 느리게라도 오고 있으면 끊지 않는다)
 */
const STALL_TIMEOUT = 30_000;

/** 받는 중 진행 알림 (받은 바이트, 전체 바이트 — 전체를 모르면 0) */
export type Progress = (received: number, total: number) => void;

/**
 * 지금 받고 있는 파일들.
 * 손가락이 닿는 순간(warmUp) 받기 시작하고, 손을 떼면(go) 또 받으려 했다 — 같은 파일을 두 번 동시에 받아
 * 둘 다 느려지고, 그 사이 폰의 '누른 직후' 시간이 지나 공유창이 막혔다("한 번 더 눌러 보내세요").
 * 이미 받고 있으면 그 받기를 같이 기다린다.
 */
const inflight = new Map<string, { done: Promise<void>; listeners: Set<Progress> }>();

function prepareOne(item: ShareItem, onProgress?: Progress): Promise<void> {
  if (cache.has(item.id)) return Promise.resolve();

  const running = inflight.get(item.id);
  if (running) {
    if (onProgress) running.listeners.add(onProgress);
    return running.done;
  }

  const listeners = new Set<Progress>(onProgress ? [onProgress] : []);
  const done = download(item, (r, t) => listeners.forEach((fn) => fn(r, t))).finally(() =>
    inflight.delete(item.id),
  );
  inflight.set(item.id, { done, listeners });
  return done;
}

async function download(item: ShareItem, report: Progress): Promise<void> {
  const stop = new AbortController();
  let timer = setTimeout(() => stop.abort(), STALL_TIMEOUT);
  const poke = () => {
    clearTimeout(timer);
    timer = setTimeout(() => stop.abort(), STALL_TIMEOUT);
  };

  try {
    const res = await fetch(item.fileUrl, { signal: stop.signal });
    if (!res.ok) {
      // 404 면 저장소에 파일이 없다 = 업로드가 중간에 끊긴 문서
      throw new Error(
        res.status === 404
          ? `"${item.title}" 의 파일이 저장소에 없습니다. 다시 올려 주세요.`
          : `"${item.title}" 을 받지 못했습니다. (오류 ${res.status})`,
      );
    }

    const total = Number(res.headers.get("content-length")) || 0;
    const type = res.headers.get("content-type") || "application/octet-stream";
    let blob: Blob;

    if (res.body) {
      // 조금씩 읽으며 진행률을 알린다 (버튼에 %로 보여 준다)
      const reader = res.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let received = 0;
      report(0, total);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value as Uint8Array<ArrayBuffer>);
        received += value.byteLength;
        poke();
        report(received, total);
      }
      blob = new Blob(chunks, { type });
    } else {
      blob = await res.blob();
    }

    if (blob.size === 0) {
      throw new Error(`"${item.title}" 파일이 비어 있습니다. 다시 올려 주세요.`);
    }

    remember(
      item.id,
      new File([blob], downloadFileName(item.title, item.file_type), {
        type: blob.type || "application/octet-stream",
      }),
    );
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error(`"${item.title}" 을 받는 데 너무 오래 걸립니다. 신호가 좋은 곳에서 다시 눌러 주세요.`);
    }
    if (e instanceof TypeError) {
      throw new Error(`"${item.title}" 을 받지 못했습니다. 인터넷 연결을 확인해 주세요.`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 파일을 받아서 기억해 둔다 (이미 받았으면 건너뛰고, 받고 있는 중이면 그걸 같이 기다린다) */
export async function prepareFiles(items: ShareItem[], onProgress?: Progress): Promise<void> {
  for (const item of items) await prepareOne(item, onProgress);
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
  /** 이 기기가 이 종류(압축 등)는 파일로 못 보낸다 → 링크로 보내야 한다 */
  | { status: "wrong-type" }
  | { status: "error"; message: string };

/**
 * 파일들을 기기 공유시트로 보낸다. 카톡을 고르면 파일이 그대로 전송된다.
 * 이미 받아 둔 파일이면 기다림 없이 곧바로 공유창을 띄운다.
 */
export async function shareFiles(items: ShareItem[], onProgress?: Progress): Promise<ShareResult> {
  if (items.length === 0) return { status: "error", message: "보낼 문서가 없습니다." };
  if (!canShareType(items)) return { status: "wrong-type" };

  const wasReady = isPrepared(items);

  try {
    if (!wasReady) await prepareFiles(items, onProgress);

    const files = items.map((item) => cache.get(item.id)!);

    // 용량이 크거나 개수가 많으면 기기가 거절한다 → 링크로 보내야 한다
    if (!navigator.canShare?.({ files })) return { status: "too-big" };

    // 파일만 싣는다. title·text 를 같이 넣으면 카톡이 그 글자를 메시지로 한 번 더 보낸다
    // (파일 아래에 파일 이름이 또 한 줄 찍혔다)
    await navigator.share({ files });
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
    .filter((item) => canShareType([item])) // 어차피 링크로 갈 종류는 미리 받지 않는다
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
