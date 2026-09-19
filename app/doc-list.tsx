"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { MAX_FOLDER_DEPTH, type DocView, type Folder } from "@/lib/documents";
import {
  childFolders,
  folderAndDescendants,
  folderNameLines,
  flattenFolders,
  folderPath,
  formatDate,
  formatDateShort,
  formatSize,
  parseTags,
} from "@/lib/format";
import { canShareFiles, copyShareLinks, shareFiles } from "@/lib/share";
import FileIcon from "./file-icon";
import KakaoIcon from "./kakao-icon";
import QuickUpload from "./quick-upload";
import ShareButton, { KakaoSheet } from "./share-button";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
  markSentMany,
  moveDocument,
  renameFolder,
  setFavorite,
  updateDocument,
} from "./actions";

/** 폴더가 지정되지 않은 문서를 모아두는 가짜 폴더 */
const NO_FOLDER = "none";

type Result = { ok: true } | { ok: false; error: string };

export default function DocList({
  documents,
  folders,
}: {
  documents: DocView[];
  folders: Folder[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const openFolder = params.get("f");

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<DocView | null>(null);
  const [moving, setMoving] = useState<DocView | null>(null);
  const [editFolders, setEditFolders] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [renaming, setRenaming] = useState<Folder | null>(null);
  const [sort, setSort] = useState<"recent" | "name">("name"); // 기본 가나다순
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [kakaoDocs, setKakaoDocs] = useState<DocView[] | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const searching = query.trim().length > 0;

  useEffect(() => {
    try {
      if (localStorage.getItem("docbox-sort") === "recent") setSort("recent");
    } catch {
      // 사생활 보호 모드 등에서 막히면 기본값(최신순)으로 둔다
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleSort() {
    const next = sort === "recent" ? "name" : "recent";
    setSort(next);
    try {
      localStorage.setItem("docbox-sort", next);
    } catch {
      // 저장 못 해도 이번 화면에서는 그대로 동작한다
    }
  }

  function run(fn: () => Promise<Result>) {
    setError("");
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  /** 주소만 바꿔서 폴더를 연다 — 폰 뒤로가기 버튼이 그대로 동작한다 */
  function goFolder(id: string | null) {
    const next = new URLSearchParams(params.toString());
    if (id) next.set("f", id);
    else next.delete("f");
    const qs = next.toString();
    window.history.pushState(null, "", qs ? `/?${qs}` : "/");
    setActiveTags([]);
    setMenuId(null);
    setEditFolders(false);
    setSelecting(false);
    setPicked([]);
  }

  /** 폴더별 문서 개수 — 하위폴더에 든 것까지 합쳐서 센다 */
  const counts = useMemo(() => {
    const direct = new Map<string, number>();
    for (const doc of documents) {
      const key = doc.folder_id ?? NO_FOLDER;
      direct.set(key, (direct.get(key) ?? 0) + 1);
    }
    const total = new Map<string, number>();
    for (const folder of folders) {
      const ids = folderAndDescendants(folders, folder.id);
      total.set(
        folder.id,
        ids.reduce((sum, id) => sum + (direct.get(id) ?? 0), 0),
      );
    }
    total.set(NO_FOLDER, direct.get(NO_FOLDER) ?? 0);
    return total;
  }, [documents, folders]);

  const currentFolder = folders.find((f) => f.id === openFolder) ?? null;
  const inNoFolder = openFolder === NO_FOLDER;
  const path = useMemo(() => folderPath(folders, openFolder), [folders, openFolder]);
  const children = useMemo(
    () => (inNoFolder ? [] : childFolders(folders, openFolder)),
    [folders, openFolder, inNoFolder],
  );
  /** 검색 중이면 폴더를 무시하고 전부 뒤진다 */
  const scoped = useMemo(() => {
    if (searching) return documents;
    if (inNoFolder) return documents.filter((d) => !d.folder_id);
    if (openFolder) return documents.filter((d) => d.folder_id === openFolder);
    return documents;
  }, [documents, openFolder, inNoFolder, searching]);

  const tagsHere = useMemo(() => {
    const count = new Map<string, number>();
    for (const doc of scoped) {
      for (const tag of doc.tags ?? []) count.set(tag, (count.get(tag) ?? 0) + 1);
    }
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
      .map(([tag]) => tag);
  }, [scoped]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return scoped.filter((doc) => {
      if (activeTags.length > 0 && !activeTags.every((t) => doc.tags?.includes(t))) return false;
      if (!q) return true;
      const haystack = [doc.title, doc.memo ?? "", ...(doc.tags ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [scoped, query, activeTags]);

  const sorted = useMemo(() => {
    if (sort === "recent") return shown; // 서버가 이미 최근 순으로 줬다
    return [...shown].sort(
      (a, b) =>
        Number(b.is_favorite) - Number(a.is_favorite) ||
        a.title.localeCompare(b.title, "ko"),
    );
  }, [shown, sort]);

  const atRoot = !openFolder && !searching;
  const recent = useMemo(() => documents.slice(0, 5), [documents]);
  const pickedDocs = useMemo(
    () => documents.filter((d) => picked.includes(d.id)),
    [documents, picked],
  );

  function togglePick(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  /** 고른 문서들을 한 번에 보낸다 */
  async function sharePicked() {
    if (pickedDocs.length === 0) return;
    setBusy(true);
    setError("");
    try {
      if (canShareFiles()) {
        const result = await shareFiles(pickedDocs);
        if (result.status === "shared") {
          await markSentMany(picked);
          setSelecting(false);
          setPicked([]);
          router.refresh();
          return;
        }
        if (result.status === "cancelled") return;
        if (result.status === "tap-again") {
          setToast("준비됐습니다. 한 번 더 눌러 보내세요");
          return;
        }
        if (result.status === "error") {
          setError(result.message);
          return;
        }
        setToast("한 번에 보내기엔 용량이 큽니다. 링크로 보냅니다.");
      }

      const copied = await copyShareLinks(picked);
      if (!copied) {
        setError("링크를 복사하지 못했습니다.");
        return;
      }
      setKakaoDocs(pickedDocs);
      await markSentMany(picked);
      setSelecting(false);
      setPicked([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const title = searching
    ? "전체 검색"
    : inNoFolder
      ? "분류 안 함"
      : (currentFolder?.name ?? "라이크웨이 자료실");

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col pb-28 sm:pb-8">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white px-5 pb-3 pt-3">
        <div className="mb-2 flex items-center gap-2">
          {(openFolder || searching) && (
            <button
              type="button"
              onClick={() =>
                searching
                  ? setQuery("")
                  : goFolder(currentFolder?.parent_id ?? null)
              }
              aria-label="뒤로"
              className="-ml-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl leading-none text-zinc-700 active:bg-zinc-100 sm:h-10 sm:w-10 sm:text-2xl sm:hover:bg-zinc-100"
            >
              ←
            </button>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{title}</h1>
            {path.length > 1 && !searching && (
              <p className="truncate text-base text-zinc-400">
                <button type="button" onClick={() => goFolder(null)} className="underline">
                  자료실
                </button>
                {path.slice(0, -1).map((f) => (
                  <span key={f.id}>
                    {" › "}
                    <button
                      type="button"
                      onClick={() => goFolder(f.id)}
                      className="underline"
                    >
                      {f.name}
                    </button>
                  </span>
                ))}
              </p>
            )}
          </div>

          <span className="shrink-0 text-base text-zinc-400">
            {searching ? `${shown.length}개` : `${scoped.length}개`}
          </span>

          {!searching && !inNoFolder && path.length < MAX_FOLDER_DEPTH && (
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="hidden shrink-0 rounded-lg bg-zinc-100 px-4 py-2 text-base text-zinc-600 sm:block sm:hover:bg-zinc-200"
            >
              새 폴더
            </button>
          )}

          <Link
            href="/upload"
            className="hidden shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-base font-semibold text-white active:bg-zinc-700 sm:block sm:hover:bg-zinc-700"
          >
            업로드
          </Link>

          {!atRoot && (
            <>
              <button
                type="button"
                onClick={toggleSort}
                className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-base text-zinc-600 active:bg-zinc-200 sm:hover:bg-zinc-200"
              >
                {sort === "name" ? "가나다순" : "최신순"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelecting((v) => !v);
                  setPicked([]);
                  setMenuId(null);
                }}
                className={`shrink-0 rounded-lg px-3 py-2 text-base ${
                  selecting ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {selecting ? "취소" : "선택"}
              </button>
            </>
          )}
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·태그·메모 검색 (폴더 상관없이 전체)"
          className="w-full rounded-xl bg-zinc-100 px-4 py-3.5 text-lg outline-none placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-2 focus:ring-zinc-900 sm:py-2.5"
        />

        {!atRoot && tagsHere.length > 0 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {tagsHere.map((tag) => {
              const on = activeTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setActiveTags((prev) =>
                      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
                    )
                  }
                  className={`shrink-0 rounded-full px-3 py-1.5 text-base ${
                    on ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
            {activeTags.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTags([])}
                className="shrink-0 px-2 py-1.5 text-base text-zinc-400 underline"
              >
                초기화
              </button>
            )}
          </div>
        )}
      </header>

      {error && (
        <p className="mx-5 mt-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-600">{error}</p>
      )}

      {!searching && !inNoFolder && (
        <FolderSection
          folders={children}
          counts={counts}
          noFolderCount={openFolder ? 0 : (counts.get(NO_FOLDER) ?? 0)}
          editMode={editFolders}
          pending={pending}
          onToggleEdit={() => setEditFolders((v) => !v)}
          onOpen={goFolder}
          onRename={(id, name) => run(() => renameFolder(id, name))}
          onDelete={(folder) => {
            const docCount = counts.get(folder.id) ?? 0;
            const subCount = childFolders(folders, folder.id).length;
            const parts = [`"${folder.name}" 폴더를 지울까요?`];
            if (subCount > 0) parts.push(`하위폴더 ${subCount}개도 같이 지워집니다.`);
            if (docCount > 0)
              parts.push(`안에 있던 문서 ${docCount}개는 지워지지 않고 '분류 안 함' 으로 갑니다.`);
            if (confirm(parts.join("\n"))) run(() => deleteFolder(folder.id));
          }}
        />
      )}

      <DocRows
        docs={atRoot ? [] : sorted}
        folders={folders}
        folderRows={searching || inNoFolder ? [] : children}
        folderCounts={counts}
        noFolderCount={openFolder ? 0 : (counts.get(NO_FOLDER) ?? 0)}
        onOpenNoFolder={() => goFolder(NO_FOLDER)}
        onOpenFolder={goFolder}
        onRenameFolder={(f) => setRenaming(f)}
        onDeleteFolder={(folder) => {
          const docCount = counts.get(folder.id) ?? 0;
          const subCount = childFolders(folders, folder.id).length;
          const parts = [`"${folder.name}" 폴더를 지울까요?`];
          if (subCount > 0) parts.push(`하위폴더 ${subCount}개도 같이 지워집니다.`);
          if (docCount > 0)
            parts.push(`안에 있던 문서 ${docCount}개는 지워지지 않고 '분류 안 함' 으로 갑니다.`);
          if (confirm(parts.join("\n"))) run(() => deleteFolder(folder.id));
        }}
        empty={
          documents.length === 0
            ? "아직 올린 문서가 없습니다.\n[업로드] 버튼으로 올려보세요."
            : "이 폴더에는 문서가 없습니다."
        }
        menuId={menuId}
        showFolderName={searching}
        selecting={selecting}
        picked={picked}
        onPick={togglePick}
        onMenu={(id) => setMenuId(menuId === id ? null : id)}
        onEdit={(doc) => {
          setEditing(doc);
          setMenuId(null);
        }}
        onMove={(doc) => {
          setMoving(doc);
          setMenuId(null);
        }}
        onFavorite={(doc) => {
          setMenuId(null);
          run(() => setFavorite(doc.id, !doc.is_favorite));
        }}
        onDelete={(doc) => {
          setMenuId(null);
          if (confirm(`"${doc.title}" 을(를) 삭제할까요?\n파일도 같이 지워집니다.`)) {
            run(() => deleteDocument(doc.id));
          }
        }}
        onShared={() => router.refresh()}
        onNotify={setToast}
      />

      {atRoot ? (
        recent.length > 0 && (
          <>
            <h2 className="border-t border-zinc-100 px-5 pb-1 pt-5 text-base font-semibold text-zinc-400">
              최근 문서
            </h2>
            <ul className="divide-y divide-zinc-100">
              {recent.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 px-5 py-3 sm:py-1.5 sm:hover:bg-zinc-100"
                >
                  <FileIcon fileType={doc.file_type} className="h-8 w-[26px] shrink-0" />
                  <a
                    href={`/s/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-lg hover:underline"
                  >
                    {doc.is_favorite && <span className="text-amber-400">★ </span>}
                    {doc.title}
                  </a>
                  <ShareButton doc={doc} onDone={() => router.refresh()} onNotify={setToast} />
                </li>
              ))}
            </ul>
          </>
        )
      ) : null}

      {!selecting && !searching && !inNoFolder && (
        <QuickUpload folderId={openFolder} />
      )}

      {!searching && !inNoFolder && path.length < MAX_FOLDER_DEPTH && !selecting && (
        <div className="px-5 pt-6 sm:hidden">
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            className="text-base text-zinc-400 underline"
          >
            + 새 폴더
          </button>
        </div>
      )}

      {!selecting && (
        <Link
          href="/upload"
          aria-label="문서 올리기"
          className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-3xl leading-none text-white shadow-lg active:bg-zinc-700 sm:hidden"
        >
          +
        </Link>
      )}

      {selecting && (
        <div className="fixed bottom-0 left-0 right-0 z-20 mx-auto flex w-full max-w-4xl items-center gap-3 border-t border-zinc-200 bg-white px-5 py-4">
          <span className="flex-1 text-lg font-semibold">{picked.length}개 선택</span>
          {picked.length > 0 && (
            <button
              type="button"
              onClick={() => setPicked([])}
              className="rounded-xl px-3 py-3 text-base text-zinc-500"
            >
              해제
            </button>
          )}
          <button
            type="button"
            disabled={picked.length === 0 || busy}
            onClick={sharePicked}
            className="flex items-center gap-2 rounded-xl bg-[#FEE500] px-5 py-3.5 text-lg font-bold text-[#191600] active:brightness-95 disabled:opacity-40 sm:py-2.5 sm:hover:brightness-95"
          >
            <KakaoIcon className="h-6 w-6" />
            {busy ? "준비 중…" : `카톡으로 ${picked.length}개 보내기`}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-28 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-lg text-white shadow-lg">
          {toast}
        </div>
      )}

      {newFolderOpen && (
        <NewFolderSheet
          parentName={currentFolder?.name ?? null}
          pending={pending}
          onClose={() => setNewFolderOpen(false)}
          onCreate={(name) =>
            run(async () => {
              const result = await createFolder(name, openFolder);
              if (result.ok) setNewFolderOpen(false);
              return result;
            })
          }
        />
      )}

      {renaming && (
        <RenameFolderSheet
          folder={renaming}
          pending={pending}
          onClose={() => setRenaming(null)}
          onSave={(name: string) =>
            run(async () => {
              const result = await renameFolder(renaming.id, name);
              if (result.ok) setRenaming(null);
              return result;
            })
          }
        />
      )}

      {kakaoDocs && <KakaoSheet docs={kakaoDocs} onClose={() => setKakaoDocs(null)} />}

      {editing && (
        <EditSheet
          doc={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(input) =>
            run(async () => {
              const result = await updateDocument(editing.id, input);
              if (result.ok) setEditing(null);
              return result;
            })
          }
        />
      )}

      {moving && (
        <MoveSheet
          doc={moving}
          folders={folders}
          onClose={() => setMoving(null)}
          onPick={(folderId) =>
            run(async () => {
              const result = await moveDocument(moving.id, folderId);
              if (result.ok) setMoving(null);
              return result;
            })
          }
        />
      )}
    </main>
  );
}

/* ---------------- 폴더 칸 ---------------- */

function FolderSection({
  folders,
  counts,
  noFolderCount,
  editMode,
  pending,
  onToggleEdit,
  onOpen,
  onRename,
  onDelete,
}: {
  folders: Folder[];
  counts: Map<string, number>;
  noFolderCount: number;
  editMode: boolean;
  pending: boolean;
  onToggleEdit: () => void;
  onOpen: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (folder: Folder) => void;
}) {
  if (folders.length === 0 && noFolderCount === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-4 sm:hidden">
        <h2 className="text-base font-semibold text-zinc-400">폴더</h2>
        {folders.length > 0 && (
          <button type="button" onClick={onToggleEdit} className="text-base text-zinc-400 underline">
            {editMode ? "완료" : "편집"}
          </button>
        )}
      </div>

      {editMode ? (
        <ul className="mt-2 sm:hidden">
          {folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="text-3xl leading-none">📁</span>
              <input
                defaultValue={folder.name}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== folder.name) onRename(folder.id, v);
                }}
                className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-lg outline-none focus:border-zinc-900"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => onDelete(folder)}
                className="shrink-0 rounded-lg px-3 py-2 text-base text-red-600 active:bg-red-50"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 grid grid-cols-3 gap-2 px-5 sm:hidden">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onOpen(folder.id)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-50 px-1 py-4 active:bg-zinc-100 sm:py-3 sm:hover:bg-zinc-100"
            >
              <span className="text-4xl leading-none">📁</span>
              <span className="text-center text-base font-semibold leading-tight">
                {folderNameLines(folder.name).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
              {(counts.get(folder.id) ?? 0) > 0 && (
                <span className="text-base text-zinc-400">{counts.get(folder.id)}</span>
              )}
            </button>
          ))}

          {noFolderCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen(NO_FOLDER)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-50 px-1 py-4 active:bg-zinc-100 sm:py-3 sm:hover:bg-zinc-100"
            >
              <span className="text-4xl leading-none">📁</span>
              <span className="text-center text-base font-semibold leading-tight text-zinc-500">
                분류 안 함
              </span>
              <span className="text-base text-zinc-400">{noFolderCount}</span>
            </button>
          )}

        </div>
      )}
    </>
  );
}

/* ---------------- 문서 목록 ---------------- */

function DocRows({
  docs,
  folders,
  folderRows,
  folderCounts,
  noFolderCount,
  onOpenNoFolder,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
  empty,
  menuId,
  showFolderName,
  selecting,
  picked,
  onPick,
  onMenu,
  onEdit,
  onMove,
  onFavorite,
  onDelete,
  onShared,
  onNotify,
}: {
  docs: DocView[];
  folders: Folder[];
  folderRows: Folder[];
  folderCounts: Map<string, number>;
  noFolderCount: number;
  onOpenNoFolder: () => void;
  onOpenFolder: (id: string) => void;
  onRenameFolder: (folder: Folder) => void;
  onDeleteFolder: (folder: Folder) => void;
  empty: string;
  menuId: string | null;
  showFolderName: boolean;
  selecting: boolean;
  picked: string[];
  onPick: (id: string) => void;
  onMenu: (id: string) => void;
  onEdit: (doc: DocView) => void;
  onMove: (doc: DocView) => void;
  onFavorite: (doc: DocView) => void;
  onDelete: (doc: DocView) => void;
  onShared: () => void;
  onNotify: (message: string) => void;
}) {
  const [folderMenu, setFolderMenu] = useState<string | null>(null);

  if (docs.length === 0 && folderRows.length === 0 && noFolderCount === 0) {
    return (
      <p className="whitespace-pre-line px-5 py-16 text-center text-base text-zinc-400">{empty}</p>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {/* PC 에서는 탐색기처럼 폴더도 같은 목록에 줄로 */}
      {folderRows.map((folder) => (
        <li
          key={folder.id}
          className="group relative hidden items-center gap-3 px-5 py-1.5 hover:bg-zinc-100 sm:flex"
        >
          <button
            type="button"
            onClick={() => onOpenFolder(folder.id)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="shrink-0 text-2xl leading-none">📁</span>
            <span className="truncate text-lg">{folder.name}</span>
            {(folderCounts.get(folder.id) ?? 0) > 0 && (
              <span className="shrink-0 text-base text-zinc-400">
                {folderCounts.get(folder.id)}
              </span>
            )}
          </button>

          <button
            type="button"
            aria-label="폴더 메뉴"
            onClick={() => setFolderMenu(folderMenu === folder.id ? null : folder.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-xl leading-none text-zinc-400 hover:bg-zinc-200 focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          >
            ⋯
          </button>

          <span className="hidden w-32 shrink-0 text-right text-base text-zinc-400 md:block">
            폴더
          </span>

          {folderMenu === folder.id && (
            <>
              <button
                type="button"
                aria-label="닫기"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setFolderMenu(null)}
              />
              <div className="absolute right-24 top-8 z-20 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                <MenuItem
                  label="이름 변경"
                  onClick={() => {
                    setFolderMenu(null);
                    onRenameFolder(folder);
                  }}
                />
                <MenuItem
                  label="삭제"
                  danger
                  onClick={() => {
                    setFolderMenu(null);
                    onDeleteFolder(folder);
                  }}
                />
              </div>
            </>
          )}
        </li>
      ))}

      {noFolderCount > 0 && (
        <li className="hidden items-center gap-3 px-5 py-1.5 hover:bg-zinc-100 sm:flex">
          <button
            type="button"
            onClick={onOpenNoFolder}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="shrink-0 text-2xl leading-none">📁</span>
            <span className="truncate text-lg text-zinc-500">분류 안 함</span>
            <span className="shrink-0 text-base text-zinc-400">{noFolderCount}</span>
          </button>
          <span className="hidden w-32 shrink-0 text-right text-base text-zinc-400 md:block">
            폴더
          </span>
        </li>
      )}

      {docs.map((doc) => {
        const folderName = folders.find((f) => f.id === doc.folder_id)?.name;
        const on = picked.includes(doc.id);

        return (
          <li
            key={doc.id}
            onClick={selecting ? () => onPick(doc.id) : undefined}
            className={`group relative flex items-center gap-3 px-5 py-4 sm:py-1.5 sm:hover:bg-zinc-100 ${
              selecting ? "cursor-pointer" : ""
            } ${on ? "bg-zinc-100" : ""}`}
          >
            {selecting && (
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-base ${
                  on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300"
                }`}
              >
                {on ? "✓" : ""}
              </span>
            )}

            <FileIcon fileType={doc.file_type} className="h-10 w-8 shrink-0 sm:h-7 sm:w-[22px]" />

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold text-zinc-900 sm:text-lg sm:font-normal">
                {doc.is_favorite && <span className="text-amber-400">★</span>}
                {selecting ? (
                  <span className="truncate">{doc.title}</span>
                ) : (
                  <a
                    href={`/s/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {doc.title}
                  </a>
                )}
              </p>

              {doc.tags?.length > 0 && (
                <p className="mt-0.5 truncate text-base text-zinc-500 sm:hidden">
                  {doc.tags.map((t) => `#${t}`).join(" ")}
                </p>
              )}

              <p className="mt-0.5 truncate text-base text-zinc-400 sm:hidden">
                {showFolderName && <span>📁 {folderName ?? "분류 안 함"} · </span>}
                {doc.last_sent_at
                  ? `${formatDate(doc.last_sent_at)} 보냄`
                  : `${formatDate(doc.created_at)} 올림`}
                {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
              </p>
            </div>

            {showFolderName && (
              <span className="hidden max-w-40 shrink-0 truncate text-base text-zinc-400 sm:block">
                📁 {folderName ?? "분류 안 함"}
              </span>
            )}

            {!selecting && (
              <>
                <div className="shrink-0 transition-opacity focus-within:opacity-100 sm:[@media(hover:hover)]:opacity-0 sm:[@media(hover:hover)]:group-hover:opacity-100">
                  <ShareButton doc={doc} onDone={onShared} onNotify={onNotify} />
                </div>

                <button
                  type="button"
                  aria-label="메뉴"
                  onClick={() => onMenu(doc.id)}
                  className="shrink-0 rounded-lg px-2 py-2 text-xl leading-none text-zinc-400 focus-visible:opacity-100 active:bg-zinc-100 sm:hover:bg-zinc-200 sm:[@media(hover:hover)]:opacity-0 sm:[@media(hover:hover)]:group-hover:opacity-100"
                >
                  ⋯
                </button>

                <span className="hidden w-32 shrink-0 text-right text-base text-zinc-400 md:block">
                  {formatDateShort(doc.last_sent_at ?? doc.created_at)}
                </span>
              </>
            )}

            {menuId === doc.id && !selecting && (
              <>
                <button
                  type="button"
                  aria-label="닫기"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => onMenu(doc.id)}
                />
                <div className="absolute right-4 top-14 z-20 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
                  <MenuItem label="수정" onClick={() => onEdit(doc)} />
                  <MenuItem label="폴더 이동" onClick={() => onMove(doc)} />
                  <MenuItem
                    label={doc.is_favorite ? "즐겨찾기 해제" : "즐겨찾기"}
                    onClick={() => onFavorite(doc)}
                  />
                  <MenuItem label="삭제" danger onClick={() => onDelete(doc)} />
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function MenuItem({
  label,
  danger,
  onClick,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-3.5 text-left text-lg active:bg-zinc-50 sm:py-2.5 sm:hover:bg-zinc-50 ${
        danger ? "border-t border-zinc-100 text-red-600 active:bg-red-50 sm:hover:bg-red-50" : ""
      }`}
    >
      {label}
    </button>
  );
}

/* ---------------- 아래에서 올라오는 창들 ---------------- */

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // PC 에서 Esc 로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-2xl bg-white p-5 pb-8 sm:max-w-md sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function NewFolderSheet({
  parentName,
  pending,
  onClose,
  onCreate,
}: {
  parentName: string | null;
  pending: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  return (
    <Sheet title={parentName ? `"${parentName}" 안에 새 폴더` : "새 폴더"} onClose={onClose}>
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        placeholder="폴더 이름"
        className="mb-5 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 sm:py-2.5"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600 sm:py-2.5 sm:hover:bg-zinc-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || !name.trim()}
          onClick={() => onCreate(name)}
          className="flex-[2] rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-40 sm:py-2.5 sm:hover:bg-zinc-700"
        >
          {pending ? "만드는 중…" : "만들기"}
        </button>
      </div>
    </Sheet>
  );
}

function RenameFolderSheet({
  folder,
  pending,
  onClose,
  onSave,
}: {
  folder: Folder;
  pending: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(folder.name);

  return (
    <Sheet title="폴더 이름 변경" onClose={onClose}>
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        className="mb-5 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 sm:py-2.5"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600 sm:py-2.5 sm:hover:bg-zinc-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || !name.trim() || name.trim() === folder.name}
          onClick={() => onSave(name)}
          className="flex-[2] rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-40 sm:py-2.5 sm:hover:bg-zinc-700"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </Sheet>
  );
}

function MoveSheet({
  doc,
  folders,
  onClose,
  onPick,
}: {
  doc: DocView;
  folders: Folder[];
  onClose: () => void;
  onPick: (folderId: string | null) => void;
}) {
  return (
    <Sheet title="폴더 이동" onClose={onClose}>
      <p className="mb-3 truncate text-base text-zinc-500">{doc.title}</p>
      <ul className="max-h-[50vh] overflow-y-auto">
        {flattenFolders(folders).map(({ folder, depth }) => (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onPick(folder.id)}
              style={{ paddingLeft: `${12 + depth * 20}px` }}
              className={`flex w-full items-center gap-2 rounded-xl py-3.5 pr-3 text-left text-lg active:bg-zinc-50 sm:py-2.5 sm:hover:bg-zinc-50 ${
                doc.folder_id === folder.id ? "font-bold" : ""
              }`}
            >
              <span>📁</span>
              <span className="flex-1 truncate">{folder.name}</span>
              {doc.folder_id === folder.id && <span className="text-base text-zinc-400">현재</span>}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-lg text-zinc-500 active:bg-zinc-50 sm:py-2.5 sm:hover:bg-zinc-50"
          >
            <span>📁</span>
            <span className="flex-1">분류 안 함</span>
          </button>
        </li>
      </ul>
    </Sheet>
  );
}

function EditSheet({
  doc,
  pending,
  onClose,
  onSave,
}: {
  doc: DocView;
  pending: boolean;
  onClose: () => void;
  onSave: (input: { title: string; tags: string[]; memo: string }) => void;
}) {
  const [title, setTitle] = useState(doc.title);
  const [tags, setTags] = useState((doc.tags ?? []).join(", "));
  const [memo, setMemo] = useState(doc.memo ?? "");

  return (
    <Sheet title="문서 수정" onClose={onClose}>
      <label className="mb-1 block text-base text-zinc-500">제목</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 sm:py-2.5"
      />

      <label className="mb-1 block text-base text-zinc-500">태그 (쉼표로 구분)</label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="그라인드, 백화점, 2026"
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900 sm:py-2.5"
      />

      <label className="mb-1 block text-base text-zinc-500">메모</label>
      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        rows={2}
        className="mb-5 w-full resize-none rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600 sm:py-2.5 sm:hover:bg-zinc-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave({ title, tags: parseTags(tags), memo })}
          className="flex-[2] rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-50 sm:py-2.5 sm:hover:bg-zinc-700"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </Sheet>
  );
}
