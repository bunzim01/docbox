"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-server";
import { BUCKET, supabase } from "@/lib/supabase";
import { MAX_FOLDER_DEPTH } from "@/lib/documents";
import { extFromFileName } from "@/lib/format";

export type Result = { ok: true } | { ok: false; error: string };

/** fee_rate 칸이 아직 없을 때 (supabase/fee-rate.sql 을 안 돌린 상태) */
function noFeeRateColumn(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42703" || /fee_rate/.test(error.message ?? ""));
}

const FEE_RATE_HINT =
  "수수료율 칸이 아직 없습니다. Supabase SQL Editor 에서 supabase/fee-rate.sql 을 한 번 실행해 주세요.";

/**
 * 업로드 1단계: 브라우저가 파일을 바로 올릴 수 있는 1회용 주소를 만든다.
 * 파일명은 추측할 수 없게 uuid 로 바꾼다.
 */
export async function prepareUpload(
  fileName: string,
): Promise<{ ok: true; path: string; token: string } | { ok: false; error: string }> {
  await requireAuth();

  const ext = extFromFileName(fileName);
  const path = ext ? `${crypto.randomUUID()}.${ext}` : crypto.randomUUID();

  const { data, error } = await supabase().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: error?.message ?? "업로드 주소를 만들지 못했습니다." };
  }
  return { ok: true, path: data.path, token: data.token };
}

/** 업로드 2단계: 파일이 올라간 뒤 문서 정보를 저장한다. */
export async function saveDocument(input: {
  title: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  tags: string[];
  memo: string;
  folderId: string | null;
  /** 수수료율(%) — 안 쓰면 비워 둔다 */
  feeRate?: number | null;
}): Promise<Result> {
  await requireAuth();

  const title = input.title.trim();
  if (!title) return { ok: false, error: "제목을 입력해 주세요." };
  if (!input.filePath) return { ok: false, error: "파일 경로가 없습니다." };

  const row = {
    title,
    file_path: input.filePath,
    file_type: input.fileType || null,
    file_size: input.fileSize || null,
    tags: input.tags,
    memo: input.memo.trim() || null,
    folder_id: input.folderId,
  };

  let { error } = await supabase()
    .from("documents")
    .insert({ ...row, fee_rate: input.feeRate ?? null });

  // 수수료율 칸을 아직 안 만들었으면, 수수료율만 빼고 문서는 저장되게 한다
  if (noFeeRateColumn(error)) {
    ({ error } = await supabase().from("documents").insert(row));
    if (!error && input.feeRate !== null && input.feeRate !== undefined) {
      return { ok: false, error: FEE_RATE_HINT };
    }
  }

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** 올리다 실패했을 때 남은 파일 치우기 */
export async function discardUploadedFile(path: string): Promise<void> {
  await requireAuth();
  if (path) await supabase().storage.from(BUCKET).remove([path]);
}

export async function updateDocument(
  id: string,
  input: { title: string; tags: string[]; memo: string; feeRate?: number | null },
): Promise<Result> {
  await requireAuth();

  const title = input.title.trim();
  if (!title) return { ok: false, error: "제목을 입력해 주세요." };

  const row = { title, tags: input.tags, memo: input.memo.trim() || null };

  let { error } = await supabase()
    .from("documents")
    .update({ ...row, fee_rate: input.feeRate ?? null })
    .eq("id", id);

  // 수수료율 칸이 아직 없으면 나머지는 저장하고 무엇을 해야 하는지 알려 준다
  if (noFeeRateColumn(error)) {
    ({ error } = await supabase().from("documents").update(row).eq("id", id));
    if (!error) return { ok: false, error: FEE_RATE_HINT };
  }

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function setFavorite(id: string, value: boolean): Promise<Result> {
  await requireAuth();

  const { error } = await supabase().from("documents").update({ is_favorite: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** 문서를 휴지통으로 옮긴다 — 파일은 그대로 두고 표시만 한다 (30일간 복원 가능) */
export async function deleteDocument(id: string): Promise<Result> {
  await requireAuth();

  const { error } = await supabase()
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    // 휴지통 SQL 을 아직 안 돌린 상태에서는 지우지 않는다 (복구할 수 없게 되므로)
    if (error.code === "42703" || /deleted_at/.test(error.message)) {
      return { ok: false, error: "휴지통 준비가 안 됐습니다. supabase/trash.sql 을 먼저 실행해 주세요." };
    }
    return { ok: false, error: error.message };
  }
  revalidatePath("/");
  return { ok: true };
}

/** 휴지통에서 되살린다 (원래 폴더가 사라졌으면 '분류 안 함' 으로) */
export async function restoreDocument(id: string): Promise<Result> {
  await requireAuth();

  const { error } = await supabase().from("documents").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** 휴지통에 있는 문서 하나를 파일까지 완전히 지운다 */
export async function purgeDocument(id: string): Promise<Result> {
  await requireAuth();

  const sb = supabase();
  const { data: doc, error: findError } = await sb
    .from("documents")
    .select("file_path, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (findError) return { ok: false, error: findError.message };
  if (!doc) return { ok: true };
  // 휴지통에 있는 것만 완전 삭제할 수 있다
  if (!doc.deleted_at) return { ok: false, error: "휴지통에 있는 문서만 완전히 지울 수 있습니다." };

  if (doc.file_path) {
    const { error: fileError } = await sb.storage.from(BUCKET).remove([doc.file_path]);
    if (fileError) return { ok: false, error: `파일 삭제 실패: ${fileError.message}` };
  }

  const { error } = await sb.from("documents").delete().eq("id", id).not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

/** 휴지통 비우기 — 휴지통에 있는 것만 지운다 */
export async function emptyTrash(): Promise<Result> {
  await requireAuth();

  const sb = supabase();
  const { data, error: findError } = await sb
    .from("documents")
    .select("id, file_path")
    .not("deleted_at", "is", null);

  if (findError) return { ok: false, error: findError.message };
  if (!data || data.length === 0) return { ok: true };

  const paths = data.map((d) => d.file_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: fileError } = await sb.storage.from(BUCKET).remove(paths);
    if (fileError) return { ok: false, error: `파일 삭제 실패: ${fileError.message}` };
  }

  const { error } = await sb
    .from("documents")
    .delete()
    .in("id", data.map((d) => d.id))
    .not("deleted_at", "is", null);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  return { ok: true };
}

/* ---------------- 폴더 ---------------- */

export async function createFolder(
  name: string,
  parentId: string | null = null,
): Promise<Result> {
  await requireAuth();

  const clean = name.trim();
  if (!clean) return { ok: false, error: "폴더 이름을 입력해 주세요." };
  if (clean.length > 30) return { ok: false, error: "폴더 이름이 너무 깁니다." };

  const sb = supabase();

  // 3차까지만 허용 — 너무 깊어지면 폰에서 찾기 어렵다
  if (parentId) {
    let depth = 1;
    let cur: string | null = parentId;
    while (cur && depth < 10) {
      const found: { parent_id: string | null } | null = (
        await sb.from("folders").select("parent_id").eq("id", cur).maybeSingle()
      ).data;
      if (!found) break;
      depth += 1;
      cur = found.parent_id;
    }
    if (depth >= MAX_FOLDER_DEPTH + 1) {
      return { ok: false, error: `폴더는 ${MAX_FOLDER_DEPTH}단계까지만 만들 수 있습니다.` };
    }
  }

  const { data: last } = await sb
    .from("folders")
    .select("sort_order")
    .eq("parent_id", parentId as never)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await sb
    .from("folders")
    .insert({ name: clean, sort_order: (last?.sort_order ?? 0) + 1, parent_id: parentId });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "같은 위치에 같은 이름의 폴더가 있습니다." : error.message,
    };
  }
  revalidatePath("/");
  return { ok: true };
}

export async function renameFolder(id: string, name: string): Promise<Result> {
  await requireAuth();

  const clean = name.trim();
  if (!clean) return { ok: false, error: "폴더 이름을 입력해 주세요." };

  const { error } = await supabase().from("folders").update({ name: clean }).eq("id", id);
  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? "같은 이름의 폴더가 이미 있습니다." : error.message,
    };
  }
  revalidatePath("/");
  return { ok: true };
}

/** 폴더만 지운다. 안에 있던 문서는 '분류 안 함' 으로 빠진다. */
export async function deleteFolder(id: string): Promise<Result> {
  await requireAuth();

  const { error } = await supabase().from("folders").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

export async function moveDocument(id: string, folderId: string | null): Promise<Result> {
  await requireAuth();

  const { error } = await supabase().from("documents").update({ folder_id: folderId }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** 공유에 성공했을 때 보낸 횟수·시각 기록 */
export async function markSent(id: string): Promise<Result> {
  await requireAuth();

  const sb = supabase();
  const { data: doc, error: findError } = await sb
    .from("documents")
    .select("sent_count")
    .eq("id", id)
    .maybeSingle();

  if (findError) return { ok: false, error: findError.message };
  if (!doc) return { ok: false, error: "문서를 찾을 수 없습니다." };

  const { error } = await sb
    .from("documents")
    .update({ sent_count: (doc.sent_count ?? 0) + 1, last_sent_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/");
  return { ok: true };
}

/** 여러 개를 한 번에 보냈을 때 */
export async function markSentMany(ids: string[]): Promise<Result> {
  await requireAuth();
  if (ids.length === 0) return { ok: true };

  const sb = supabase();
  const { data: docs, error: findError } = await sb
    .from("documents")
    .select("id, sent_count")
    .in("id", ids);

  if (findError) return { ok: false, error: findError.message };

  const now = new Date().toISOString();
  for (const doc of docs ?? []) {
    const { error } = await sb
      .from("documents")
      .update({ sent_count: (doc.sent_count ?? 0) + 1, last_sent_at: now })
      .eq("id", doc.id);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}
