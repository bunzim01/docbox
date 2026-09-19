import { connection } from "next/server";
import { Suspense } from "react";

import { requireAuth } from "@/lib/auth-server";
import { listDocuments, listFolders, withFileUrl } from "@/lib/documents";
import DocList from "./doc-list";
import { logout } from "./login/actions";

export default async function HomePage() {
  await connection();
  await requireAuth();

  try {
    const [docs, folders] = await Promise.all([listDocuments(), listFolders()]);
    const documents = docs.map(withFileUrl);
    return (
      <>
        <Suspense>
          <DocList documents={documents} folders={folders} />
        </Suspense>
        <form action={logout} className="mx-auto w-full max-w-4xl px-5 pb-8 pt-2">
          <button type="submit" className="text-base text-zinc-400 underline">
            나가기
          </button>
        </form>
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
