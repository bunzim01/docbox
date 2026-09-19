"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { extFromFileName, titleFromFileName } from "@/lib/format";
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

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;

    setBusy(true);
    setError("");
    setTotal(list.length);
    setDone(0);

    let failed = 0;
    for (const file of list) {
      let uploadedPath = "";
      try {
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
    if (failed === 0) setError("");
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
            ? "border-zinc-900 bg-zinc-100"
            : "border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50"
        }`}
      >
        <span className="text-4xl leading-none text-zinc-300">+</span>
        <span className="mt-3 text-lg font-semibold text-zinc-700">
          {busy
            ? `올리는 중… (${done}/${total})`
            : dragging
              ? "여기에 놓으세요"
              : "파일 올리기"}
        </span>
        <span className="mt-1 text-base text-zinc-400">
          끌어다 놓거나 눌러서 선택하세요
        </span>
        {error && <span className="mt-2 text-base text-red-600">{error}</span>}

        <input
          type="file"
          multiple
          accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.hwp,.hwpx"
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
