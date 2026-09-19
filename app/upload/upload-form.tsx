"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { discardUploadedFile, prepareUpload, saveDocument } from "@/app/actions";
import type { Folder } from "@/lib/documents";
import { extFromFileName, formatSize, parseTags, titleFromFileName } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase-browser";

const ACCEPT = ".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx";

type Row = {
  file: File;
  title: string;
  state: "대기" | "올리는 중" | "완료" | "실패";
  error?: string;
};

export default function UploadForm({
  suggestedTags,
  folders,
}: {
  suggestedTags: string[];
  folders: Folder[];
}) {
  const router = useRouter();
  const [folderId, setFolderId] = useState<string | null>(
    folders[0]?.id ?? null,
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [tags, setTags] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pickFiles(fileList: FileList | null) {
    if (!fileList) return;
    const picked = [...fileList].map<Row>((file) => ({
      file,
      title: titleFromFileName(file.name),
      state: "대기",
    }));
    setRows((prev) => [...prev, ...picked]);
    setError("");
  }

  function addTag(tag: string) {
    const current = parseTags(tags);
    if (current.includes(tag)) return;
    setTags([...current, tag].join(", "));
  }

  function patch(index: number, change: Partial<Row>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...change } : row)));
  }

  async function uploadAll() {
    if (rows.length === 0) return;
    setBusy(true);
    setError("");

    const parsedTags = parseTags(tags);
    let failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.state === "완료") continue;

      patch(i, { state: "올리는 중", error: undefined });

      let uploadedPath = "";
      try {
        const prepared = await prepareUpload(row.file.name);
        if (!prepared.ok) throw new Error(prepared.error);

        const { error: uploadError } = await supabaseBrowser()
          .storage.from("docs")
          .uploadToSignedUrl(prepared.path, prepared.token, row.file, {
            contentType: row.file.type || undefined,
          });
        if (uploadError) throw new Error(uploadError.message);
        uploadedPath = prepared.path;

        const saved = await saveDocument({
          title: row.title,
          filePath: prepared.path,
          fileType: extFromFileName(row.file.name),
          fileSize: row.file.size,
          tags: parsedTags,
          memo,
          folderId,
        });
        if (!saved.ok) throw new Error(saved.error);

        patch(i, { state: "완료" });
      } catch (e) {
        failed += 1;
        // 파일만 올라가고 정보 저장에 실패하면 찌꺼기가 남으므로 치운다
        if (uploadedPath) await discardUploadedFile(uploadedPath).catch(() => {});
        patch(i, { state: "실패", error: e instanceof Error ? e.message : String(e) });
      }
    }

    setBusy(false);

    if (failed === 0) {
      router.push("/");
      router.refresh();
    } else {
      setError(`${failed}개가 실패했습니다. 아래에서 확인해 주세요.`);
    }
  }

  return (
    <main className="flex flex-1 flex-col px-5 pb-10 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href="/"
          aria-label="문서함으로"
          className="-ml-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl leading-none text-zinc-700 active:bg-zinc-100"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold">문서 올리기</h1>
      </header>

      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 py-10 active:bg-zinc-50">
        <span className="text-3xl text-zinc-300">+</span>
        <span className="mt-2 text-lg font-semibold text-zinc-700">파일 선택</span>
        <span className="mt-1 text-base text-zinc-400">PDF · PPT · DOC · XLS · 여러 개 가능</span>
        <input
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {rows.length > 0 && (
        <ul className="mb-5 space-y-3">
          {rows.map((row, i) => (
            <li key={`${row.file.name}-${i}`} className="rounded-xl border border-zinc-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-base text-zinc-400">
                  {row.file.name} · {formatSize(row.file.size)}
                </span>
                {row.state === "대기" ? (
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 text-base text-zinc-400 underline"
                  >
                    빼기
                  </button>
                ) : (
                  <span
                    className={`shrink-0 text-base font-semibold ${
                      row.state === "완료"
                        ? "text-emerald-600"
                        : row.state === "실패"
                          ? "text-red-600"
                          : "text-zinc-500"
                    }`}
                  >
                    {row.state}
                  </span>
                )}
              </div>

              <input
                value={row.title}
                onChange={(e) => patch(i, { title: e.target.value })}
                placeholder="제목"
                disabled={busy}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-lg outline-none focus:border-zinc-900 disabled:bg-zinc-50"
              />

              {row.error && <p className="mt-2 break-words text-base text-red-600">{row.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {folders.length > 0 && (
        <>
          <label className="mb-2 block text-lg text-zinc-500">폴더</label>
          <div className="mb-5 flex flex-wrap gap-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                disabled={busy}
                onClick={() => setFolderId(folder.id)}
                className={`rounded-xl px-4 py-2.5 text-lg ${
                  folderId === folder.id
                    ? "bg-zinc-900 font-semibold text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {folder.name}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => setFolderId(null)}
              className={`rounded-xl px-4 py-2.5 text-lg ${
                folderId === null ? "bg-zinc-900 font-semibold text-white" : "bg-zinc-100 text-zinc-500"
              }`}
            >
              분류 안 함
            </button>
          </div>
        </>
      )}

      <label className="mb-1 block text-base text-zinc-500">태그 (쉼표로 구분)</label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="그라인드, 백화점, 2026"
        disabled={busy}
        className="w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 disabled:bg-zinc-50"
      />

      {suggestedTags.length > 0 && (
        <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              disabled={busy}
              className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-base text-zinc-600 active:bg-zinc-200"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      <label className="mb-1 mt-4 block text-base text-zinc-500">메모</label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        placeholder="나중에 검색할 때 도움이 될 한 줄"
        disabled={busy}
        className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 disabled:bg-zinc-50"
      />

      <p className="mt-2 text-base text-zinc-400">태그와 메모는 선택한 파일 전체에 똑같이 들어갑니다.</p>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-600">{error}</p>}

      <button
        type="button"
        onClick={uploadAll}
        disabled={busy || rows.length === 0}
        className="mt-6 w-full rounded-xl bg-zinc-900 py-4 text-lg font-semibold text-white active:bg-zinc-700 disabled:opacity-40"
      >
        {busy ? "올리는 중…" : rows.length > 0 ? `${rows.length}개 저장` : "파일을 선택해 주세요"}
      </button>
    </main>
  );
}
