/** 화면에 보여주는 값 다듬기 (서버·브라우저 양쪽에서 같은 결과가 나오게) */

const DATE_FMT = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  return DATE_FMT.format(new Date(iso));
}

export function formatSize(bytes: number | null): string {
  if (!bytes || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** 영상 파일 확장자 — 브라우저가 그 자리에서 재생할 수 있는 것들 */
const VIDEO_EXTS = ["mp4", "mov", "m4v", "webm"];

export function isVideo(fileType: string | null): boolean {
  return VIDEO_EXTS.includes((fileType ?? "").toLowerCase());
}

/** 파일 고르기 창에서 받아 주는 확장자 (업로드 화면·PC 올리기 영역이 함께 쓴다) */
export const ACCEPT_EXTS =
  ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.hwp,.hwpx," + VIDEO_EXTS.map((e) => "." + e).join(",");

/** 파일 종류별 배지 (색 + 짧은 라벨) */
export function fileBadge(fileType: string | null): { label: string; className: string } {
  const t = (fileType ?? "").toLowerCase();
  if (t === "pdf") return { label: "PDF", className: "bg-red-100 text-red-700" };
  if (t === "ppt" || t === "pptx") return { label: "PPT", className: "bg-orange-100 text-orange-700" };
  if (t === "doc" || t === "docx") return { label: "DOC", className: "bg-blue-100 text-blue-700" };
  if (t === "xls" || t === "xlsx") return { label: "XLS", className: "bg-emerald-100 text-emerald-700" };
  if (isVideo(t)) return { label: "영상", className: "bg-violet-100 text-violet-700" };
  return { label: (t || "파일").toUpperCase().slice(0, 4), className: "bg-zinc-100 text-zinc-600" };
}

/** "파일명.pdf" → "파일명" */
export function titleFromFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).trim() || name;
}

/** "파일명.pdf" → "pdf" */
export function extFromFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "";
  return name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
}

/** "그라인드, 백화점 , 2026" → ["그라인드","백화점","2026"] */
export function parseTags(input: string): string[] {
  const seen = new Set<string>();
  return input
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 20)
    .filter((t) => (seen.has(t) ? false : (seen.add(t), true)))
    .slice(0, 10);
}

/**
 * 폴더 이름을 보기 좋게 두 줄로 나눈다.
 * "체크리스트(벤더용)" → ["체크리스트", "(벤더용)"]
 * 괄호가 없으면 한 줄 그대로.
 */
export function folderNameLines(name: string): string[] {
  const i = name.indexOf("(");
  if (i > 0) return [name.slice(0, i).trim(), name.slice(i).trim()];
  return [name];
}

/** 어떤 폴더의 바로 아래 하위폴더들 (가나다순) */
export function childFolders<T extends { id: string; name: string; parent_id: string | null }>(
  folders: T[],
  parentId: string | null,
): T[] {
  return folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
}

/** 맨 위부터 그 폴더까지의 경로 (예: 제품소개서 › A브랜드) */
export function folderPath<T extends { id: string; parent_id: string | null }>(
  folders: T[],
  id: string | null,
): T[] {
  const path: T[] = [];
  let cur = folders.find((f) => f.id === id);
  let guard = 0;
  while (cur && guard++ < 10) {
    path.unshift(cur);
    cur = cur.parent_id ? folders.find((f) => f.id === cur!.parent_id) : undefined;
  }
  return path;
}

/** 그 폴더와 그 아래 모든 하위폴더의 id */
export function folderAndDescendants<T extends { id: string; parent_id: string | null }>(
  folders: T[],
  id: string,
): string[] {
  const out = [id];
  for (let i = 0; i < out.length; i++) {
    for (const f of folders) {
      if (f.parent_id === out[i] && !out.includes(f.id)) out.push(f.id);
    }
  }
  return out;
}

/** PC 목록용 짧은 날짜: 2026-09-16 */
const DATE_SHORT = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

export function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  return DATE_SHORT.format(new Date(iso));
}

/** 폴더를 트리 순서대로 펼친다 (상위 → 그 하위 → 다음 상위 …) */
export function flattenFolders<
  T extends { id: string; name: string; parent_id: string | null },
>(folders: T[], parentId: string | null = null, depth = 0): { folder: T; depth: number }[] {
  const here = folders
    .filter((f) => (f.parent_id ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));

  const out: { folder: T; depth: number }[] = [];
  for (const folder of here) {
    out.push({ folder, depth });
    if (depth < 5) out.push(...flattenFolders(folders, folder.id, depth + 1));
  }
  return out;
}

/** 폰 카드용 아주 짧은 날짜: 26.09.16 */
export function formatDateTiny(iso: string | null): string {
  const d = formatDateShort(iso); // 2026-09-16
  return d ? `${d.slice(2, 4)}.${d.slice(5, 7)}.${d.slice(8, 10)}` : "";
}

/* ---------------- 검색 (초성 지원) ---------------- */

const CHOSUNG = [
  "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
  "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
];

/** "소다산 제안서" → "ㅅㄷㅅ ㅈㅇㅅ" (한글이 아닌 글자는 그대로) */
export function toChosung(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) out += CHOSUNG[Math.floor((code - 0xac00) / 588)];
    else out += ch;
  }
  return out;
}

/** 검색어에 완성된 한글(가~힣)이 없고 초성 자음이 들어 있으면 초성 검색으로 본다 */
function isChosungQuery(q: string): boolean {
  return /[ㄱ-ㅎ]/.test(q) && !/[가-힣]/.test(q);
}

/**
 * 검색어가 글에 들어 있는지.
 * - "소다산" 처럼 그냥 치면 포함 여부
 * - "ㅅㄷㅅ" 처럼 초성만 치면 초성으로 비교 ("ㅅㄷㅅ 2025" 처럼 숫자·영문을 섞어도 된다)
 * - 띄어쓰기로 나눈 낱말은 모두 들어 있어야 한다 ("소다산 주방")
 */
export function matchesQuery(text: string, query: string): boolean {
  const hay = text.toLowerCase();
  const hayChosung = toChosung(hay);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return words.every((w) => (isChosungQuery(w) ? hayChosung.includes(w) : hay.includes(w)));
}

/**
 * 문서를 눌렀을 때 열 주소.
 * PDF 와 영상은 브라우저가 그 자리에서 보여 주고(영상은 탭에서 바로 재생된다),
 * 그 밖의 문서(엑셀·워드·PPT·한글)는 기기가 직접 열도록 제목이 붙은 파일 주소를 준다.
 * (오피스 온라인 뷰어는 열리기까지 10초가 넘게 걸려 안 열리는 것처럼 보였다)
 */
export function viewUrl(doc: { fileUrl: string; downloadUrl: string; file_type: string | null }): string {
  const t = (doc.file_type ?? "").toLowerCase();
  return t === "pdf" || isVideo(t) ? doc.fileUrl : doc.downloadUrl;
}
