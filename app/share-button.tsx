"use client";

import { useEffect, useState } from "react";
import type { Doc } from "@/lib/documents";
import { downloadFileName } from "@/lib/documents";
import { markSent } from "./actions";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (settings: Record<string, unknown>) => void };
    };
  }
}

/** 이 기기가 파일을 공유시트로 보낼 수 있는지 (폰이면 대개 가능) */
function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || !navigator.canShare) return false;
  try {
    const probe = new File(["x"], "t.txt", { type: "text/plain" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export default function ShareButton({
  doc,
  fileUrl,
  onDone,
}: {
  doc: Doc;
  fileUrl: string;
  onDone: () => void;
}) {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  const [mode, setMode] = useState<"unknown" | "file" | "link">("unknown");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const [showLinkSheet, setShowLinkSheet] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // 기기 판별은 브라우저에서만 가능하므로 화면이 뜬 뒤에 정한다
  useEffect(() => {
    setMode(canShareFiles() ? "file" : "link");
    setShareUrl(`${window.location.origin}/s/${doc.id}`);
  }, [doc.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function done() {
    await markSent(doc.id);
    onDone();
  }

  /** 폰: 파일 자체를 공유시트로 → 카톡 선택 */
  async function shareFile() {
    setBusy(true);
    try {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error("파일을 가져오지 못했습니다.");
      const blob = await res.blob();
      const name = downloadFileName(doc.title, doc.file_type);
      const file = new File([blob], name, { type: blob.type || "application/octet-stream" });

      if (!navigator.canShare?.({ files: [file] })) {
        // 용량이 커서 거절당하는 경우 → 링크 방식으로 넘어간다
        await copyLink();
        return;
      }

      await navigator.share({ files: [file], title: doc.title });
      await done();
    } catch (e) {
      // 사용자가 공유를 취소한 것은 실패가 아니다
      if (e instanceof DOMException && e.name === "AbortError") return;
      setToast(e instanceof Error ? e.message : "공유하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  /** PC: 링크 복사 → 카톡에 붙여넣기 */
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToast("링크 복사됨");
    } catch {
      setToast("링크를 복사하지 못했습니다");
    }
    setShowLinkSheet(true);
    await done();
  }

  function sendKakao() {
    if (!kakaoKey) return;
    const kakao = window.Kakao;
    if (!kakao) {
      setToast("카카오 기능을 불러오지 못했습니다");
      return;
    }
    if (!kakao.isInitialized()) kakao.init(kakaoKey);
    kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: doc.title,
        description: doc.memo ?? `${(doc.file_type ?? "").toUpperCase()} 문서`,
        imageUrl: "",
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        { title: "문서 열기", link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
      ],
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={busy || mode === "unknown"}
        onClick={() => (mode === "file" ? shareFile() : copyLink())}
        className="shrink-0 rounded-xl bg-zinc-900 px-5 py-3 text-lg font-semibold text-white active:bg-zinc-700 disabled:opacity-40"
      >
        {busy ? "준비 중…" : mode === "link" ? "링크 복사" : "공유"}
      </button>

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-xl bg-zinc-900 px-5 py-3 text-lg text-white shadow-lg">
          {toast}
        </div>
      )}

      {showLinkSheet && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/40"
          onClick={() => setShowLinkSheet(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-xl font-bold">링크가 복사되었습니다</h2>
            <p className="mb-4 truncate text-base text-zinc-500">{shareUrl}</p>

            {kakaoKey ? (
              <button
                type="button"
                onClick={() => {
                  sendKakao();
                  setShowLinkSheet(false);
                }}
                className="w-full rounded-xl bg-[#FEE500] py-4 text-xl font-semibold text-[#191600] active:brightness-95"
              >
                카카오톡으로 보내기
              </button>
            ) : (
              <p className="rounded-xl bg-zinc-100 px-4 py-4 text-base text-zinc-600">
                카톡 대화창에 붙여넣기(Ctrl+V) 하시면 됩니다.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowLinkSheet(false)}
              className="mt-3 w-full rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
