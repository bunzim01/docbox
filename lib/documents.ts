import { supabase } from "./supabase";

export type Folder = {
  id: string;
  name: string;
  sort_order: number;
  parent_id: string | null;
};

/** 폴더 깊이 제한 — 맨 위(1차) / 2차 / 3차 까지만 */
export const MAX_FOLDER_DEPTH = 3;

export type DocView = Doc & { fileUrl: string };

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

/** 문서함 목록: 즐겨찾기 먼저 → 최근 보낸 순 → 최근 올린 순 */
export async function listDocuments(): Promise<Doc[]> {
  const { data, error } = await supabase()
    .from("documents")
    .select("*")
    .order("is_favorite", { ascending: false })
    .order("last_sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Doc[];
}

export async function getDocument(id: string): Promise<Doc | null> {
  const { data, error } = await supabase()
    .from("documents")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Doc) ?? null;
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
  return { ...doc, fileUrl: fileUrl(doc.file_path) };
}
