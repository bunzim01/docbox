import { supabase } from "./supabase";

export type Folder = {
  id: string;
  name: string;
  sort_order: number;
};

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
    .select("id, name, sort_order")
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
