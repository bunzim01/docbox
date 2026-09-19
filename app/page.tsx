import { connection } from "next/server";
import { Suspense } from "react";

import { requireAuth } from "@/lib/auth-server";
import {
  TRASH_DAYS,
  listDocuments,
  listFolders,
  listTrashed,
  purgeExpiredTrash,
  withFileUrl,
} from "@/lib/documents";
import DocList from "./doc-list";

export default async function HomePage() {
  await connection();
  await requireAuth();

  try {
    // 보관 기간이 지난 휴지통 문서는 들어올 때 정리한다
    await purgeExpiredTrash().catch(() => {});

    const [docs, folders, trashedDocs] = await Promise.all([
      listDocuments(),
      listFolders(),
      listTrashed(),
    ]);
    const documents = docs.map(withFileUrl);

    // 남은 날짜는 서버에서 계산해 내려준다 (브라우저와 시각이 달라 화면이 어긋나지 않게)
    const now = Date.now();
    const trashed = trashedDocs.map((doc) => ({
      ...withFileUrl(doc),
      daysLeft: Math.max(
        0,
        TRASH_DAYS - Math.floor((now - new Date(doc.deleted_at!).getTime()) / 86400000),
      ),
    }));
    return (
      <>
        <Suspense>
          <DocList documents={documents} folders={folders} trashed={trashed} />
        </Suspense>
      </>
    );
  } catch (e) {
    return (
      <main className="flex flex-1 flex-col px-5 py-6">
        <h1 className="mb-6 text-3xl font-bold">라이크웨이 자료실</h1>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-lg font-semibold">문서를 불러오지 못했습니다</p>
          <p className="mt-1 break-words text-lg text-zinc-600">
            {e instanceof Error ? e.message : String(e)}
          </p>
        </div>
      </main>
    );
  }
}
