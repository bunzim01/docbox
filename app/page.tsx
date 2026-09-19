import { connection } from "next/server";

import { supabase } from "@/lib/supabase";
import { logout } from "./login/actions";

/** Supabase 에 실제로 연결되는지 확인한다 (M1 점검용) */
async function checkSupabase(): Promise<{ ok: boolean; message: string }> {
  try {
    const { error, count } = await supabase()
      .from("documents")
      .select("id", { count: "exact", head: true });

    if (error) return { ok: false, message: error.message };
    return { ok: true, message: `documents 테이블 확인됨 (문서 ${count ?? 0}개)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export default async function HomePage() {
  // 빌드 때가 아니라 실제 접속할 때 확인한다
  await connection();
  const status = await checkSupabase();

  return (
    <main className="flex flex-1 flex-col px-5 py-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">문서함</h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg px-3 py-2 text-sm text-zinc-500 active:bg-zinc-100"
          >
            나가기
          </button>
        </form>
      </header>

      <div
        className={`rounded-2xl border p-4 ${
          status.ok
            ? "border-emerald-200 bg-emerald-50"
            : "border-amber-200 bg-amber-50"
        }`}
      >
        <p className="text-sm font-semibold text-zinc-900">
          {status.ok ? "Supabase 연결 OK" : "Supabase 연결 안 됨"}
        </p>
        <p className="mt-1 break-words text-sm text-zinc-600">{status.message}</p>
        {!status.ok && (
          <p className="mt-3 text-sm text-zinc-600">
            .env.local 값을 채우고 supabase/schema.sql 을 실행했는지 확인해 주세요.
          </p>
        )}
      </div>

      <p className="mt-8 text-sm text-zinc-400">
        여기에 문서 목록이 들어갑니다. (다음 단계 M2)
      </p>
    </main>
  );
}
