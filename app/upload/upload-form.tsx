"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { discardUploadedFile, prepareUpload, saveDocument } from "@/app/actions";
import { MAX_FILE_BYTES, type Folder } from "@/lib/documents";
import {
  ACCEPT_EXTS,
  extFromFileName,
  flattenFolders,
  formatSize,
  parseFeeRate,
  parseTags,
  titleFromFileName,
} from "@/lib/format";
import { tellCats } from "@/lib/cat-events";
import { supabaseBrowser } from "@/lib/supabase-browser";
import BackIcon from "@/app/back-icon";
import FileIcon from "@/app/file-icon";

const ACCEPT = ACCEPT_EXTS;

type Row = {
  file: File;
  title: string;
  /** 수수료율(%) — 체크리스트 문서에만 쓴다. 파일마다 다르므로 줄마다 따로 받는다 */
  fee: string;
  state: "대기" | "올리는 중" | "완료" | "실패";
  error?: string;
};

export default function UploadForm({
  suggestedTags,
  folders,
  fromFolder,
}: {
  suggestedTags: string[];
  folders: Folder[];
  fromFolder: string | null;
}) {
  const router = useRouter();
  const [folderId, setFolderId] = useState<string | null>(
    fromFolder ?? flattenFolders(folders)[0]?.folder.id ?? null,
  );
  const backHref = fromFolder ? `/?f=${fromFolder}` : "/";
  const [rows, setRows] = useState<Row[]>([]);
  const [tags, setTags] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  function pickFiles(fileList: FileList | null) {
    if (!fileList) return;
    const all = [...fileList];
    // 저장소가 50MB 까지만 받는다 — 올리기 전에 걸러 준다 (영상은 여기 걸리기 쉽다)
    const tooBig = all.filter((f) => f.size > MAX_FILE_BYTES);
    const picked = all
      .filter((f) => f.size <= MAX_FILE_BYTES)
      .map<Row>((file) => ({ file, title: titleFromFileName(file.name), fee: "", state: "대기" }));

    setRows((prev) => [...prev, ...picked]);
    setError(
      tooBig.length
        ? `${tooBig.map((f) => f.name).join(", ")} — ${formatSize(MAX_FILE_BYTES)}보다 커서 올릴 수 없습니다.`
        : "",
    );
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!busy) pickFiles(e.dataTransfer.files);
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
          feeRate: parseFeeRate(row.fee),
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
      // 자료실로 돌아가면 고양이들이 구경하러 온다
      tellCats("upload", { afterNavigation: true });
      // 올린 폴더로 돌아가서 바로 확인
      router.push(folderId ? `/?f=${folderId}` : "/");
      router.refresh();
    } else {
      setError(`${failed}개가 실패했습니다. 아래에서 확인해 주세요.`);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10 pt-5">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href={backHref}
          aria-label="자료실로"
          className="-ml-3 flex h-14 w-12 shrink-0 items-center justify-center rounded-2xl text-ink active:bg-zinc-100 sm:-ml-2 sm:h-10 sm:w-10 sm:hover:bg-zinc-100"
        >
          <BackIcon className="h-8 w-8 sm:h-6 sm:w-6" />
        </Link>
        <h1 className="text-xl font-bold">문서 올리기</h1>
      </header>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-8 active:bg-zinc-50 sm:py-6 sm:hover:border-zinc-400 sm:hover:bg-zinc-50 ${
          dragging ? "border-gold bg-gold-soft" : "border-zinc-300 bg-paper"
        }`}
      >
        <span className="text-3xl leading-none text-gold">+</span>
        <span className="mt-2 text-lg font-semibold text-zinc-700">
          {dragging ? "여기에 놓으세요" : "파일 선택"}
        </span>
        <span className="mt-1 text-base text-zinc-400">
          PDF · PPT · DOC · XLS · HWP · 영상
          <span className="hidden sm:inline"> · 끌어다 놓아도 됩니다</span>
        </span>
        <span className="mt-1 text-base text-zinc-400">
          한 개당 {formatSize(MAX_FILE_BYTES)}까지
        </span>
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
            <li key={`${row.file.name}-${i}`} className="rounded-xl border border-zinc-200 bg-paper p-3">
              <div className="mb-2 flex items-center gap-2">
                <FileIcon
                  fileType={extFromFileName(row.file.name)}
                  className="h-7 w-[22px] shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-base text-zinc-400">
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

              <div className="flex gap-2">
                <input
                  value={row.title}
                  onChange={(e) => patch(i, { title: e.target.value })}
                  placeholder="제목"
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2.5 text-lg bg-paper outline-none focus:border-gold disabled:bg-zinc-50 sm:py-2"
                />
                {/* 수수료율 — 체크리스트가 아니면 비워 두면 된다 */}
                <div className="flex shrink-0 items-center gap-1">
                  <input
                    value={row.fee}
                    onChange={(e) => patch(i, { fee: e.target.value })}
                    inputMode="decimal"
                    placeholder="수수료"
                    disabled={busy}
                    className="w-24 rounded-lg border border-zinc-300 px-3 py-2.5 text-lg bg-paper outline-none focus:border-gold disabled:bg-zinc-50 sm:py-2"
                  />
                  <span className="text-lg text-zinc-400">%</span>
                </div>
              </div>

              {row.error && <p className="mt-2 break-words text-base text-red-600">{row.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {folders.length > 0 && (
        <>
          <label htmlFor="folder" className="mb-1 block text-base text-zinc-500">
            폴더
          </label>
          <select
            id="folder"
            value={folderId ?? ""}
            disabled={busy}
            onChange={(e) => setFolderId(e.target.value || null)}
            className="mb-5 w-full rounded-xl border border-zinc-300 bg-paper px-4 py-3.5 text-lg bg-paper outline-none focus:border-gold disabled:bg-zinc-50 sm:py-2.5"
          >
            {flattenFolders(folders).map(({ folder, depth }) => (
              <option key={folder.id} value={folder.id}>
                {"\u00A0\u00A0\u00A0".repeat(depth)}
                {depth > 0 ? "└ " : ""}
                {folder.name}
              </option>
            ))}
            <option value="">분류 안 함</option>
          </select>
        </>
      )}

      <label className="mb-1 block text-base text-zinc-500">
        태그 <span className="text-zinc-400">· 쉼표로 구분, 파일 전체에 똑같이 들어갑니다</span>
      </label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="그라인드, 백화점, 2026"
        disabled={busy}
        className="w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg bg-paper outline-none focus:border-gold disabled:bg-zinc-50"
      />

      {suggestedTags.length > 0 && (
        <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {suggestedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              disabled={busy}
              className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-base text-zinc-600 active:bg-zinc-200 sm:hover:bg-zinc-200"
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
        className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3.5 text-lg bg-paper outline-none focus:border-gold disabled:bg-zinc-50"
      />

      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-600">{error}</p>}

      <button
        type="button"
        onClick={uploadAll}
        disabled={busy || rows.length === 0}
        className="mt-6 w-full rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-40 sm:py-3 sm:hover:bg-zinc-700"
      >
        {busy ? "올리는 중…" : rows.length > 0 ? `${rows.length}개 저장` : "파일을 선택해 주세요"}
      </button>
    </main>
  );
}
