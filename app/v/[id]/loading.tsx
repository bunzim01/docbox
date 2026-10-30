import Spinner from "@/app/spinner";

/**
 * 폰에서 PDF 를 누른 순간 바로 보이는 화면 — 서버가 문서 정보를 찾는 동안 아무것도 안 보이면
 * 눌린 줄 몰라 여러 번 누르게 된다.
 */
export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-100 py-24">
      <Spinner className="h-12 w-12" />
      <p className="text-lg text-zinc-500">문서 여는 중…</p>
    </main>
  );
}
