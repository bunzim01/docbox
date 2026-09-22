"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { compressPdf, shouldCompress } from "@/lib/compress-pdf";
import { MAX_FILE_BYTES } from "@/lib/documents";
import { ACCEPT_EXTS, extFromFileName, formatSize, titleFromFileName } from "@/lib/format";
import { tellCats } from "@/lib/cat-events";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { discardUploadedFile, prepareUpload, saveDocument } from "./actions";

/**
 * PC 화면 가운데의 올리기 영역.
 * 끌어다 놓으면 지금 보고 있는 폴더로 바로 올라간다.
 * 제목·태그·메모를 손보려면 눌러서 업로드 화면으로 간다.
 */
export default function QuickUpload({ folderId }: { folderId: string | null }) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [busyNote, setBusyNote] = useState("");

  async function upload(files: FileList | File[]) {
    const all = [...files];
    // 큰 PDF 는 올리면서 줄이므로 여기서 자르지 않는다. PDF 가 아니면 줄일 방법이 없다
    const tooBig = all.filter((f) => f.size > MAX_FILE_BYTES && !shouldCompress(f));
    const list = all.filter((f) => !tooBig.includes(f));
    if (tooBig.length) {
      setError(`${tooBig.length}개가 ${formatSize(MAX_FILE_BYTES)}보다 커서 빠졌습니다.`);
    }
    if (list.length === 0) return;

    setBusy(true);
    if (!tooBig.length) setError("");
    setTotal(list.length);
    setDone(0);

    let failed = 0;
    let shrank = 0;
    for (const original of list) {
      let file = original;
      let uploadedPath = "";
      try {
        // 큰 PDF 는 올리기 전에 줄인다
        if (shouldCompress(file)) {
          setBusyNote("용량 줄이는 중…");
          const smaller = await compressPdf(file);
          if (smaller) {
            file = smaller.file;
            shrank += 1;
          }
          setBusyNote("");
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${formatSize(file.size)} — 줄여도 ${formatSize(MAX_FILE_BYTES)}를 넘습니다.`);
        }

        const prepared = await prepareUpload(file.name);
        if (!prepared.ok) throw new Error(prepared.error);

        const { error: uploadError } = await supabaseBrowser()
          .storage.from("docs")
          .uploadToSignedUrl(prepared.path, prepared.token, file, {
            contentType: file.type || undefined,
          });
        if (uploadError) throw new Error(uploadError.message);
        uploadedPath = prepared.path;

        const saved = await saveDocument({
          title: titleFromFileName(file.name),
          filePath: prepared.path,
          fileType: extFromFileName(file.name),
          fileSize: file.size,
          tags: [],
          memo: "",
          folderId,
        });
        if (!saved.ok) throw new Error(saved.error);
      } catch (e) {
        failed += 1;
        if (uploadedPath) await discardUploadedFile(uploadedPath).catch(() => {});
        setError(e instanceof Error ? e.message : "올리지 못했습니다.");
      }
      setDone((n) => n + 1);
    }

    setBusy(false);
    setTotal(0);
    setBusyNote("");
    if (failed === 0 && !tooBig.length) setError(shrank ? `${shrank}개는 용량을 줄여서 올렸습니다.` : "");
    if (failed < list.length) tellCats("upload");
    router.refresh();
  }

  return (
    <div className="hidden flex-1 items-center justify-center px-5 py-10 sm:flex">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) upload(e.dataTransfer.files);
        }}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          dragging
            ? "border-gold bg-gold-soft"
            : "border-zinc-300 bg-paper hover:border-gold hover:bg-gold-soft/40"
        }`}
      >
        <span className="text-4xl leading-none text-gold">+</span>
        <span className="mt-3 text-lg font-semibold text-zinc-700">
          {busy
            ? busyNote || `올리는 중… (${done}/${total})`
            : dragging
              ? "여기에 놓으세요"
              : "파일 올리기"}
        </span>
        <span className="mt-1 text-base text-zinc-400">
          끌어다 놓거나 눌러서 선택하세요 · 영상도 됩니다 (한 개당 {formatSize(MAX_FILE_BYTES)}까지)
        </span>
        {error && <span className="mt-2 text-base text-red-600">{error}</span>}

        <input
          type="file"
          multiple
          accept={ACCEPT_EXTS}
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            upload(e.target.files ?? []);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
