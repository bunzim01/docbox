"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Doc, Folder } from "@/lib/documents";
import { fileBadge, formatDate, formatSize, parseTags } from "@/lib/format";
import {
  createFolder,
  deleteDocument,
  deleteFolder,
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
  documents: Doc[];
  folders: Folder[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const openFolder = params.get("f");

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Doc | null>(null);
  const [moving, setMoving] = useState<Doc | null>(null);
  const [editFolders, setEditFolders] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const searching = query.trim().length > 0;

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
  }

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const doc of documents) {
      const key = doc.folder_id ?? NO_FOLDER;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [documents]);

  const currentFolder = folders.find((f) => f.id === openFolder) ?? null;
  const inNoFolder = openFolder === NO_FOLDER;

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

  const atRoot = !openFolder && !searching;
  const recent = useMemo(() => documents.slice(0, 5), [documents]);

  return (
    <main className="flex flex-1 flex-col pb-28">
      <header className="sticky top-0 z-10 border-b border-zinc-100 bg-white px-5 pb-3 pt-5">
        <div className="mb-3 flex items-center gap-2">
          {openFolder && !searching && (
            <button
              type="button"
              onClick={() => goFolder(null)}
              aria-label="문서함으로"
              className="-ml-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-4xl leading-none text-zinc-700 active:bg-zinc-100"
            >
              ←
            </button>
          )}
          <h1 className="flex-1 truncate text-3xl font-bold">
            {searching ? "전체 검색" : (currentFolder?.name ?? (inNoFolder ? "분류 안 함" : "문서함"))}
          </h1>
          <span className="shrink-0 text-base text-zinc-400">
            {searching ? `${shown.length}개` : `${scoped.length}개`}
          </span>
        </div>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·태그·메모 검색 (폴더 상관없이 전체)"
          className="w-full rounded-xl bg-zinc-100 px-4 py-3.5 text-lg outline-none placeholder:text-zinc-400 focus:bg-zinc-50 focus:ring-2 focus:ring-zinc-900"
        />

        {!atRoot && !searching && folders.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {folders.map((folder) => {
              const on = openFolder === folder.id;
              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => goFolder(folder.id)}
                  className={`rounded-xl px-2 py-2.5 text-base leading-tight ${
                    on ? "bg-zinc-900 font-semibold text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {folder.name}
                </button>
              );
            })}
            {(counts.get(NO_FOLDER) ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => goFolder(NO_FOLDER)}
                className={`rounded-xl px-2 py-2.5 text-base leading-tight ${
                  inNoFolder ? "bg-zinc-900 font-semibold text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                분류 안 함
              </button>
            )}
          </div>
        )}

        {!atRoot && tagsHere.length > 0 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
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

      {atRoot ? (
        <FolderHome
          folders={folders}
          counts={counts}
          recent={recent}
          editMode={editFolders}
          pending={pending}
          onToggleEdit={() => setEditFolders((v) => !v)}
          onOpen={goFolder}
          onCreate={(name) => run(() => createFolder(name))}
          onRename={(id, name) => run(() => renameFolder(id, name))}
          onDelete={(f) => {
            const n = counts.get(f.id) ?? 0;
            const warn =
              n > 0
                ? `"${f.name}" 폴더를 지울까요?\n안에 있던 문서 ${n}개는 지워지지 않고 '분류 안 함' 으로 갑니다.`
                : `"${f.name}" 폴더를 지울까요?`;
            if (confirm(warn)) run(() => deleteFolder(f.id));
          }}
        />
      ) : (
        <DocRows
          docs={shown}
          folders={folders}
          empty={
            documents.length === 0
              ? "아직 올린 문서가 없습니다.\n오른쪽 아래 + 를 눌러 올려보세요."
              : "찾는 문서가 없습니다."
          }
          menuId={menuId}
          showFolderName={searching}
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
        />
      )}

      <Link
        href="/upload"
        aria-label="문서 올리기"
        className="fixed bottom-6 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-3xl leading-none text-white shadow-lg active:bg-zinc-700"
      >
        +
      </Link>

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

/* ---------------- 첫 화면: 폴더 목록 ---------------- */

function FolderHome({
  folders,
  counts,
  recent,
  editMode,
  pending,
  onToggleEdit,
  onOpen,
  onCreate,
  onRename,
  onDelete,
}: {
  folders: Folder[];
  counts: Map<string, number>;
  recent: Doc[];
  editMode: boolean;
  pending: boolean;
  onToggleEdit: () => void;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (folder: Folder) => void;
}) {
  const [newName, setNewName] = useState("");
  const noFolderCount = counts.get(NO_FOLDER) ?? 0;

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 className="text-base font-semibold text-zinc-400">폴더</h2>
        <button
          type="button"
          onClick={onToggleEdit}
          className="text-base text-zinc-400 underline"
        >
          {editMode ? "완료" : "편집"}
        </button>
      </div>

      {editMode ? (
        <ul className="mt-2">
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
        <div className="mt-2 grid grid-cols-3 gap-3 px-5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => onOpen(folder.id)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-50 px-2 py-4 active:bg-zinc-100"
            >
              <span className="text-4xl leading-none">📁</span>
              <span className="text-center text-base font-semibold leading-tight">
                {folder.name}
              </span>
              <span className="text-base text-zinc-400">{counts.get(folder.id) ?? 0}</span>
            </button>
          ))}

          {noFolderCount > 0 && (
            <button
              type="button"
              onClick={() => onOpen(NO_FOLDER)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-zinc-50 px-2 py-4 active:bg-zinc-100"
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

      {editMode && (
        <div className="flex gap-2 px-5 pt-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 폴더 이름"
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900"
          />
          <button
            type="button"
            disabled={pending || !newName.trim()}
            onClick={() => {
              onCreate(newName);
              setNewName("");
            }}
            className="shrink-0 rounded-xl bg-zinc-900 px-5 text-lg font-semibold text-white disabled:opacity-40"
          >
            추가
          </button>
        </div>
      )}

      {recent.length > 0 && !editMode && (
        <>
          <h2 className="border-t border-zinc-100 px-5 pb-1 pt-6 text-base font-semibold text-zinc-400">
            최근 문서
          </h2>
          <ul className="divide-y divide-zinc-100">
            {recent.map((doc) => {
              const badge = fileBadge(doc.file_type);
              return (
                <li key={doc.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  <span className="truncate text-base">
                    {doc.is_favorite && <span className="text-amber-400">★ </span>}
                    {doc.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

/* ---------------- 문서 목록 ---------------- */

function DocRows({
  docs,
  folders,
  empty,
  menuId,
  showFolderName,
  onMenu,
  onEdit,
  onMove,
  onFavorite,
  onDelete,
}: {
  docs: Doc[];
  folders: Folder[];
  empty: string;
  menuId: string | null;
  showFolderName: boolean;
  onMenu: (id: string) => void;
  onEdit: (doc: Doc) => void;
  onMove: (doc: Doc) => void;
  onFavorite: (doc: Doc) => void;
  onDelete: (doc: Doc) => void;
}) {
  if (docs.length === 0) {
    return <p className="whitespace-pre-line px-5 py-16 text-center text-base text-zinc-400">{empty}</p>;
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {docs.map((doc) => {
        const badge = fileBadge(doc.file_type);
        const folderName = folders.find((f) => f.id === doc.folder_id)?.name;
        return (
          <li key={doc.id} className="relative flex items-center gap-3 px-5 py-4">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold ${badge.className}`}
            >
              {badge.label}
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold text-zinc-900">
                {doc.is_favorite && <span className="text-amber-400">★</span>}
                <span className="truncate">{doc.title}</span>
              </p>

              {doc.tags?.length > 0 && (
                <p className="mt-0.5 truncate text-base text-zinc-500">
                  {doc.tags.map((t) => `#${t}`).join(" ")}
                </p>
              )}

              <p className="mt-0.5 truncate text-base text-zinc-400">
                {showFolderName && <span>📁 {folderName ?? "분류 안 함"} · </span>}
                {doc.last_sent_at
                  ? `${formatDate(doc.last_sent_at)} 보냄`
                  : `${formatDate(doc.created_at)} 올림`}
                {doc.file_size ? ` · ${formatSize(doc.file_size)}` : ""}
              </p>
            </div>

            <button
              type="button"
              aria-label="메뉴"
              onClick={() => onMenu(doc.id)}
              className="shrink-0 rounded-lg px-3 py-2 text-xl leading-none text-zinc-400 active:bg-zinc-100"
            >
              ⋯
            </button>

            {menuId === doc.id && (
              <>
                <button
                  type="button"
                  aria-label="닫기"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => onMenu(doc.id)}
                />
                <div className="absolute right-4 top-14 z-20 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
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
      className={`block w-full px-4 py-3 text-left text-base active:bg-zinc-50 ${
        danger ? "border-t border-zinc-100 text-red-600 active:bg-red-50" : ""
      }`}
    >
      {label}
    </button>
  );
}

/* ---------------- 아래에서 올라오는 창들 ---------------- */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function MoveSheet({
  doc,
  folders,
  onClose,
  onPick,
}: {
  doc: Doc;
  folders: Folder[];
  onClose: () => void;
  onPick: (folderId: string | null) => void;
}) {
  return (
    <Sheet title="폴더 이동" onClose={onClose}>
      <p className="mb-3 truncate text-base text-zinc-500">{doc.title}</p>
      <ul className="max-h-[50vh] overflow-y-auto">
        {folders.map((folder) => (
          <li key={folder.id}>
            <button
              type="button"
              onClick={() => onPick(folder.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-lg active:bg-zinc-50 ${
                doc.folder_id === folder.id ? "font-bold" : ""
              }`}
            >
              <span>📁</span>
              <span className="flex-1 truncate">{folder.name}</span>
              {doc.folder_id === folder.id && <span className="text-zinc-400">현재</span>}
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onPick(null)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left text-lg text-zinc-500 active:bg-zinc-50"
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
  doc: Doc;
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
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900"
      />

      <label className="mb-1 block text-base text-zinc-500">태그 (쉼표로 구분)</label>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="그라인드, 백화점, 2026"
        className="mb-4 w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900"
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
          className="flex-1 rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave({ title, tags: parseTags(tags), memo })}
          className="flex-[2] rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "저장 중…" : "저장"}
        </button>
      </div>
    </Sheet>
  );
}
