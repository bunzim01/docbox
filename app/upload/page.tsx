import { connection } from "next/server";

import { requireAuth } from "@/lib/auth-server";
import { listDocuments, listFolders } from "@/lib/documents";
import UploadForm from "./upload-form";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  await connection();
  await requireAuth();

  let suggestedTags: string[] = [];
  let folders: Awaited<ReturnType<typeof listFolders>> = [];

  try {
    const [documents, folderList] = await Promise.all([listDocuments(), listFolders()]);
    folders = folderList;

    // 기존에 쓰던 태그를 추천해 주기 위해 모아둔다
    const count = new Map<string, number>();
    for (const doc of documents) {
      for (const tag of doc.tags ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
    }
    suggestedTags = [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .slice(0, 20)
      .map(([tag]) => tag);
  } catch {
    // 목록을 못 불러와도 업로드 자체는 되게 둔다
  }

  // 방금 보던 폴더를 기본으로 골라 둔다
  const { f } = await searchParams;
  const fromFolder = folders.some((x) => x.id === f) ? (f as string) : null;

  return <UploadForm suggestedTags={suggestedTags} folders={folders} fromFolder={fromFolder} />;
}
