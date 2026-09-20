import { supabase } from "./supabase";

export type Folder = {
  id: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
};

/** 폴더 깊이 제한 — 맨 위(1차) / 2차 / 3차 까지만 */
export const MAX_FOLDER_DEPTH = 3;

export type DocView = Doc & { fileUrl: string; downloadUrl: string };

/** 휴지통에 보관하는 기간 */
export const TRASH_DAYS = 30;

/** trash.sql 을 아직 실행하지 않은 상태(deleted_at 칸 없음)인지 */
function noTrashColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /deleted_at/.test(error.message ?? ""));
}

export type Doc = {
  id: string;
  title: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  tags: string[];
  memo: string | null;
  is_favorite: boolean;
  sent_count: number;
  last_sent_at: string | null;
  created_at: string;
  folder_id: string | null;
  /** 휴지통에 들어간 시각. 비어 있으면 정상 문서 */
  deleted_at?: string | null;
};

export async function listFolders(): Promise<Folder[]> {
  const { data, error } = await supabase()
    .from("folders")
    .select("id, name, sort_order, parent_id")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Folder[];
}

/** 문서함 목록: 즐겨찾기 먼저 → 최근 보낸 순 → 최근 올린 순 (휴지통에 있는 것은 제외) */
export async function listDocuments(): Promise<Doc[]> {
  const query = () =>
    supabase()
      .from("documents")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("last_sent_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  let { data, error } = await query().is("deleted_at", null);
  // 휴지통 SQL 을 아직 안 돌렸어도 앱은 열리게 한다
  if (noTrashColumn(error)) ({ data, error } = await query());

  if (error) throw new Error(error.message);
  return (data ?? []) as Doc[];
}

/** 휴지통 목록 (최근에 지운 순) */
export async function listTrashed(): Promise<Doc[]> {
  const { data, error } = await supabase()
    .from("documents")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (noTrashColumn(error)) return [];
  if (error) throw new Error(error.message);
  return (data ?? []) as Doc[];
}

/** 휴지통에서 보관 기간이 지난 문서를 파일까지 완전히 지운다 */
export async function purgeExpiredTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const sb = supabase();
  const { data, error } = await sb
    .from("documents")
    .select("id, file_path")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff);

  if (error || !data || data.length === 0) return;

  const paths = data.map((d) => d.file_path).filter(Boolean);
  if (paths.length > 0) await sb.storage.from("docs").remove(paths);
  await sb.from("documents").delete().in("id", data.map((d) => d.id)).not("deleted_at", "is", null);
}

export async function getDocument(id: string): Promise<Doc | null> {
  const { data, error } = await supabase()
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const doc = (data as Doc) ?? null;
  // 휴지통에 있는 문서는 받는 사람에게 열리지 않는다
  return doc?.deleted_at ? null : doc;
}

/**
 * 받는 사람이 열 수 있는 파일 주소.
 * downloadName 을 주면 그 이름으로 저장된다 (uuid 대신 제목으로).
 */
export function fileUrl(filePath: string, downloadName?: string): string {
  const { data } = supabase()
    .storage.from("docs")
    .getPublicUrl(filePath, downloadName ? { download: downloadName } : undefined);
  return data.publicUrl;
}

/** "그라인드 제안서" + "pdf" → "그라인드 제안서.pdf" */
export function downloadFileName(title: string, fileType: string | null): string {
  const clean = title.replace(/[\\/:*?"<>|]/g, "").trim() || "문서";
  return fileType ? `${clean}.${fileType}` : clean;
}

/** 화면에 내려보낼 때 파일 주소를 같이 붙인다 */
export function withFileUrl(doc: Doc): DocView {
  return {
    ...doc,
    fileUrl: fileUrl(doc.file_path),
    downloadUrl: fileUrl(doc.file_path, downloadFileName(doc.title, doc.file_type)),
  };
}
