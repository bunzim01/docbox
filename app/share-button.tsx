"use client";

import { useEffect, useState } from "react";
import type { DocView } from "@/lib/documents";
import { canShareFiles, copyShareLinks, shareFiles } from "@/lib/share";
import { markSent } from "./actions";
import KakaoIcon from "./kakao-icon";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (settings: Record<string, unknown>) => void };
    };
  }
}

export default function ShareButton({
  doc,
  onDone,
  onNotify,
}: {
  doc: DocView;
  onDone: () => void;
  onNotify: (message: string) => void;
}) {
  const [mode, setMode] = useState<"unknown" | "file" | "link">("unknown");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false); // 파일 준비 끝 — 한 번 더 누르면 바로 전송

  useEffect(() => {
    setMode(canShareFiles() ? "file" : "link");
  }, []);

  async function go() {
    setBusy(true);
    try {
      if (mode === "file") {
        const result = await shareFiles([doc]);
        if (result.status === "shared") {
          setReady(false);
          await markSent(doc.id);
          onDone();
          return;
        }
        if (result.status === "cancelled") return;
        if (result.status === "tap-again") {
          setReady(true);
          onNotify("준비됐습니다. 한 번 더 눌러 보내세요");
          return;
        }
        if (result.status === "error") {
          onNotify(result.message);
          return;
        }
        // 기기가 거절하면 링크 방식으로 넘어간다
      }

      const copied = await copyShareLinks([doc.id]);
      onNotify(copied ? "링크 복사됨" : "링크를 복사하지 못했습니다");
      if (copied) {
        await markSent(doc.id);
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy || mode === "unknown"}
      onClick={go}
      aria-label="카카오톡으로 보내기"
      className={`flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#FEE500] font-bold text-[#191600] active:brightness-95 disabled:opacity-40 sm:h-9 sm:hover:brightness-95 ${
        ready ? "px-4 ring-2 ring-[#191600]" : "w-11 sm:w-auto sm:px-3"
      }`}
    >
      <KakaoIcon className={`h-6 w-6 sm:h-5 sm:w-5 ${busy ? "animate-pulse" : ""}`} />
      {/* 폰: 아이콘만. 한 번 더 눌러야 할 때만 글자를 보여준다. PC: 글자도 함께 */}
      {ready ? (
        <span className="text-lg">보내기</span>
      ) : (
        <span className="hidden text-base sm:inline">{busy ? "준비 중…" : "카톡"}</span>
      )}
    </button>
  );
}

/** PC 에서 링크를 복사한 뒤 뜨는 안내 — 카카오 키가 있으면 전송 버튼도 */
export function KakaoSheet({
  docs,
  onClose,
}: {
  docs: DocView[];
  onClose: () => void;
}) {
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
  const [links, setLinks] = useState<string[]>([]);

  useEffect(() => {
    setLinks(docs.map((d) => `${window.location.origin}/s/${d.id}`));
  }, [docs]);

  function sendKakao() {
    const kakao = window.Kakao;
    if (!kakaoKey || !kakao || links.length === 0) return;
    if (!kakao.isInitialized()) kakao.init(kakaoKey);

    const first = docs[0];
    kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: docs.length === 1 ? first.title : `문서 ${docs.length}개`,
        description: first.memo ?? `${(first.file_type ?? "").toUpperCase()} 문서`,
        imageUrl: "",
        link: { mobileWebUrl: links[0], webUrl: links[0] },
      },
      buttons: [{ title: "문서 열기", link: { mobileWebUrl: links[0], webUrl: links[0] } }],
    });
    onClose();
  }

  return (
    <div
      className="fade-in fixed inset-0 z-40 flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="sheet-in w-full rounded-t-3xl bg-paper p-5 pb-8 shadow-2xl sm:max-w-md sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold">
          링크 {links.length}개가 복사되었습니다
        </h2>
        <p className="mb-4 truncate text-base text-zinc-500">{links[0]}</p>

        {kakaoKey ? (
          <button
            type="button"
            onClick={sendKakao}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] py-4 text-xl font-bold text-[#191600] active:brightness-95 sm:py-3 sm:hover:brightness-95"
          >
            <KakaoIcon className="h-6 w-6" />
            카카오톡으로 보내기
          </button>
        ) : (
          <p className="rounded-xl bg-zinc-100 px-4 py-4 text-base text-zinc-600">
            카톡 대화창에 붙여넣기(Ctrl+V) 하시면 됩니다.
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600 sm:py-2.5 sm:hover:bg-zinc-50"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
