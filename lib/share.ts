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

export type ShareResult =
  | { status: "shared" }
  | { status: "cancelled" }
  | { status: "unsupported" }
  | { status: "error"; message: string };

/**
 * 파일들을 받아와서 기기 공유시트로 보낸다.
 * 카톡을 고르면 파일이 그대로 전송된다.
 */
export async function shareFiles(items: ShareItem[]): Promise<ShareResult> {
  if (items.length === 0) return { status: "error", message: "보낼 문서가 없습니다." };

  try {
    const files: File[] = [];
    for (const item of items) {
      const res = await fetch(item.fileUrl);
      if (!res.ok) throw new Error(`"${item.title}" 파일을 가져오지 못했습니다.`);
      const blob = await res.blob();
      files.push(
        new File([blob], downloadFileName(item.title, item.file_type), {
          type: blob.type || "application/octet-stream",
        }),
      );
    }

    // 용량이 크거나 개수가 많으면 기기가 거절할 수 있다
    if (!navigator.canShare?.({ files })) return { status: "unsupported" };

    await navigator.share({
      files,
      title: items.length === 1 ? items[0].title : `문서 ${items.length}개`,
    });
    return { status: "shared" };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return { status: "cancelled" };
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
