import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { downloadFileName, fileUrl, getDocument } from "@/lib/documents";
import { formatSize, isVideo } from "@/lib/format";
import FileIcon from "@/app/file-icon";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  try {
    const doc = await getDocument(id);
    if (doc) return { title: doc.title, description: doc.memo ?? undefined };
  } catch {
    // 제목을 못 읽어도 페이지는 열리게 둔다
  }
  return { title: "문서" };
}

export default async function SharePage({ params }: Params) {
  const { id } = await params;

  let doc = null;
  try {
    doc = await getDocument(id);
  } catch {
    doc = null;
  }
  if (!doc) notFound();

  const name = downloadFileName(doc.title, doc.file_type);
  const viewUrl = fileUrl(doc.file_path);
  const downloadUrl = fileUrl(doc.file_path, name);
  const isPdf = (doc.file_type ?? "").toLowerCase() === "pdf";
  const video = isVideo(doc.file_type);
  const officeUrl = ["ppt", "pptx", "doc", "docx", "xls", "xlsx"].includes(
    (doc.file_type ?? "").toLowerCase(),
  )
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewUrl)}`
    : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
      <p className="px-5 pt-6 text-base font-semibold tracking-[0.18em] text-gold">LIKEWAY DOCBOX</p>
      <header className="flex items-start gap-3 px-5 pb-4 pt-2">
        <FileIcon fileType={doc.file_type} className="mt-0.5 h-12 w-10 shrink-0" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-snug">{doc.title}</h1>
          <p className="mt-1 text-base text-zinc-500">
            {(doc.file_type ?? "").toUpperCase()}
            {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
          </p>
        </div>
      </header>

      {video ? (
        <div className="px-5">
          {/* 받는 사람이 앱 설치 없이 그 자리에서 본다 */}
          <video
            src={viewUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full rounded-xl border border-zinc-200 bg-black shadow-sm"
          />
          <a
            href={downloadUrl}
            className="mt-4 block rounded-xl border border-zinc-300 bg-paper py-4 text-center text-xl font-semibold text-zinc-700 active:bg-zinc-100 sm:py-3 sm:hover:bg-zinc-50"
          >
            다운로드
          </a>
        </div>
      ) : isPdf ? (
        <>
          {/* PC·안드로이드는 브라우저 내장 뷰어로 바로 보인다 */}
          <iframe
            src={viewUrl}
            title={doc.title}
            className="mx-5 hidden h-[70vh] rounded-xl border border-zinc-200 bg-paper shadow-sm sm:block"
          />
          <div className="px-5 sm:mt-4">
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl bg-zinc-900 py-4 text-center text-xl font-semibold text-white active:bg-zinc-700 sm:py-3 sm:hover:bg-zinc-700"
            >
              문서 보기
            </a>
            <a
              href={downloadUrl}
              className="mt-3 block rounded-xl border border-zinc-300 bg-paper py-4 text-center text-xl font-semibold text-zinc-700 active:bg-zinc-100 sm:py-3 sm:hover:bg-zinc-50"
            >
              다운로드
            </a>
          </div>
        </>
      ) : (
        <div className="px-5">
          <a
            href={downloadUrl}
            className="block rounded-xl bg-zinc-900 py-5 text-center text-xl font-semibold text-white active:bg-zinc-700 sm:py-3 sm:hover:bg-zinc-700"
          >
            다운로드
          </a>

          {officeUrl && (
            <a
              href={officeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block rounded-xl border border-zinc-300 bg-paper py-4 text-center text-xl font-semibold text-zinc-700 active:bg-zinc-100 sm:py-3 sm:hover:bg-zinc-50"
            >
              브라우저에서 미리보기
            </a>
          )}
        </div>
      )}

      <p className="px-5 py-8 text-base text-zinc-400">
        {name}
      </p>
    </main>
  );
}
