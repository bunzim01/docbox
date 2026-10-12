"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { DocView } from "@/lib/documents";
import { prepareFiles, preparedFile } from "@/lib/share";
import BackIcon from "@/app/back-icon";
import ShareButton from "@/app/share-button";

/** 쪽 하나를 그릴 가로 픽셀 — 손가락으로 확대해도 글자가 읽히게 화면보다 넉넉히, 그래도 너무 크지 않게 */
function targetWidth(cssWidth: number): number {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.min(Math.round(cssWidth * dpr * 1.25), 2400);
}

export default function PdfViewer({ doc }: { doc: DocView }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[]>([]); // 다 그린 쪽 그림 (blob 주소)
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    let stopped = false;
    const made: string[] = [];
    let destroy: (() => Promise<void>) | null = null;

    (async () => {
      try {
        // 카톡 버튼과 같은 파일을 쓴다 — 한 번만 받고, 받고 나면 카톡 버튼도 바로 보낼 수 있다
        await prepareFiles([doc]);
        const file = preparedFile(doc.id);
        if (!file) throw new Error("파일을 받지 못했습니다.");

        // legacy 판을 쓴다 — 기본 판은 최신 크롬에만 있는 기능을 써서 업데이트가 덜 된 폰에서 열리지 않았다
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        // pdf.js 가 버퍼를 가져가 버리므로 매번 새로 꺼낸 복사본을 넘긴다 (기억해 둔 파일은 그대로 남는다)
        const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        destroy = () => task.destroy();
        const pdf = await task.promise;
        if (stopped) return;
        setTotal(pdf.numPages);

        const cssWidth = box.current?.clientWidth || window.innerWidth;
        for (let n = 1; n <= pdf.numPages; n++) {
          if (stopped) return;
          const page = await pdf.getPage(n);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: targetWidth(cssWidth) / base.width });

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("이 기기에서 그림을 그리지 못했습니다.");
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;

          // 캔버스를 쌓아 두면 쪽이 많을 때 폰 메모리가 터진다 → 그림 파일로 바꾸고 캔버스는 버린다
          const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
          canvas.width = 0;
          canvas.height = 0;
          page.cleanup();
          if (!blob || stopped) return;

          const url = URL.createObjectURL(blob);
          made.push(url);
          setPages((prev) => [...prev, url]);
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error && e.message ? e.message : "문서를 열지 못했습니다.");
        }
      }
    })();

    return () => {
      stopped = true;
      destroy?.().catch(() => {});
      made.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [doc]);

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  const loading = !error && pages.length < Math.max(total, 1);

  return (
    <main className="flex flex-1 flex-col bg-zinc-100">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-zinc-200 bg-paper px-3 py-2.5 shadow-sm">
        <button
          type="button"
          onClick={goBack}
          aria-label="뒤로"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-zinc-100"
        >
          <BackIcon />
        </button>
        <h1 className="line-clamp-2 min-w-0 flex-1 text-lg font-semibold leading-snug [overflow-wrap:anywhere]">
          {doc.title}
        </h1>
        <ShareButton doc={doc} onDone={() => {}} onNotify={setToast} />
      </header>

      <div ref={box} className="flex flex-col gap-2 py-2">
        {pages.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 방금 그린 그림이라 next/image 를 쓸 수 없다
          <img
            key={src}
            src={src}
            alt={`${i + 1}쪽`}
            className="block h-auto w-full bg-paper shadow-sm"
          />
        ))}

        {loading && (
          <p className="py-10 text-center text-lg text-zinc-500">
            {total > 0 ? `여는 중… (${pages.length}/${total}쪽)` : "여는 중…"}
          </p>
        )}

        {error && (
          <div className="mx-4 my-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-lg font-semibold">문서를 보여 주지 못했습니다</p>
            <p className="mt-1 break-words text-base text-zinc-600">{error}</p>
            <p className="mt-3 text-base text-zinc-600">
              위의 노란 카톡 버튼으로 보내는 것은 그대로 됩니다.
            </p>
            <a
              href={doc.downloadUrl}
              className="mt-3 block rounded-xl border border-zinc-300 bg-paper py-3 text-center text-lg font-semibold text-zinc-700"
            >
              다른 앱으로 열기
            </a>
          </div>
        )}
      </div>

      {toast && (
        <div className="sheet-in fixed bottom-10 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-6 py-3 text-lg text-white shadow-xl">
          {toast}
        </div>
      )}
    </main>
  );
}
