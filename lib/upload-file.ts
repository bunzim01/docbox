/**
 * 파일 하나를 자료실에 올린다 — 업로드 화면과 PC 올리기 영역이 함께 쓴다.
 *
 * 세 단계가 모두 인터넷을 거친다: ① 1회용 업로드 주소 받기 ② 저장소에 파일 올리기 ③ 문서 정보 저장.
 * 폰에서는 신호가 잠깐 끊겨 한 번씩 실패했다("다시 하니 됐다"). 그래서
 * - 잠깐 끊긴 것으로 보이면 **한 번 자동으로 다시 해 본다**
 * - ③ 은 같은 파일을 두 번 저장하지 않으므로(서버 `saveDocument`) 다시 해도 중복이 생기지 않는다
 * - 실패해서 파일을 치울 때도, 이미 문서로 저장된 파일이면 서버가 지우지 않는다(`discardUploadedFile`)
 * - 영어 오류는 한국어로 바꿔 보여 준다
 */
import { discardUploadedFile, prepareUpload, saveDocument } from "@/app/actions";
import { supabaseBrowser } from "./supabase-browser";

export type UploadInfo = {
  title: string;
  fileType: string;
  tags: string[];
  memo: string;
  folderId: string | null;
  feeRate?: number | null;
};

const RETRY_WAIT = 1500;

function message(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

/** 잠깐 끊긴 것(다시 하면 될 법한 것)인지 */
function isTransient(e: unknown): boolean {
  if (e instanceof TypeError) return true; // fetch 자체가 실패 = 연결 끊김
  return /fetch|network|load failed|timed? ?out|timeout|unexpected response|50[234]|gateway|ECONN/i.test(
    message(e),
  );
}

/** 보여 줄 한국어 문구 */
function korean(e: unknown): string {
  const m = message(e);
  if (/exceeded the maximum allowed size|payload too large|too large|413/i.test(m)) {
    return "파일이 너무 커서 저장소가 받지 않았습니다 (50MB까지).";
  }
  if (/server action|unexpected response/i.test(m)) {
    return "앱이 방금 새로 바뀌었습니다. 화면을 새로고침한 뒤 다시 올려 주세요.";
  }
  if (/fetch|network|load failed|timed? ?out|timeout|ECONN|gateway|50[234]/i.test(m)) {
    return "인터넷이 잠깐 끊겨 올리지 못했습니다. 다시 눌러 주세요.";
  }
  if (/[가-힣]/.test(m)) return m; // 이미 한국어로 만든 문구
  return `올리지 못했습니다. 다시 눌러 주세요. (${m})`;
}

const wait = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** ①+② 저장소에 파일을 올리고 그 경로를 돌려준다 */
async function putFile(file: File): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    let path = "";
    try {
      const prepared = await prepareUpload(file.name);
      if (!prepared.ok) throw new Error(prepared.error);
      path = prepared.path;

      const { error } = await supabaseBrowser()
        .storage.from("docs")
        .uploadToSignedUrl(prepared.path, prepared.token, file, {
          contentType: file.type || undefined,
        });
      if (error) throw error;
      return path;
    } catch (e) {
      // 반쯤 올라갔을지 모르는 파일은 치운다 (문서로 저장된 적 없으니 지워도 안전)
      if (path) await discardUploadedFile(path).catch(() => {});
      if (attempt >= 2 || !isTransient(e)) throw e;
      await wait(RETRY_WAIT);
    }
  }
}

/** ③ 문서 정보 저장 (같은 파일은 서버가 한 번만 저장하므로 다시 해도 안전) */
async function save(path: string, file: File, info: UploadInfo): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    try {
      const saved = await saveDocument({
        title: info.title,
        filePath: path,
        fileType: info.fileType,
        fileSize: file.size,
        tags: info.tags,
        memo: info.memo,
        folderId: info.folderId,
        feeRate: info.feeRate ?? null,
      });
      if (!saved.ok) throw new Error(saved.error);
      return;
    } catch (e) {
      if (attempt >= 2 || !isTransient(e)) throw e;
      await wait(RETRY_WAIT);
    }
  }
}

/** 올리기 — 실패하면 한국어 문구를 담은 Error 를 던진다 */
export async function uploadFile(file: File, info: UploadInfo): Promise<void> {
  let path = "";
  try {
    path = await putFile(file);
    await save(path, file, info);
  } catch (e) {
    // 문서 정보까지 못 남겼으면 올라간 파일은 치운다 (이미 저장된 거면 서버가 안 지운다)
    if (path) await discardUploadedFile(path).catch(() => {});
    throw new Error(korean(e));
  }
}
