"use client";

import { useEffect, useState } from "react";
import type { DocView } from "@/lib/documents";
import { canShareFiles, copyShareLinks, shareFiles } from "@/lib/share";
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

  useEffect(() => {
    setMode(canShareFiles() ? "file" : "link");
  }, []);

  async function go() {
    setBusy(true);
    try {
      if (mode === "file") {
        const result = await shareFiles([doc]);
        if (result.status === "shared") {
          await markSent(doc.id);
          onDone();
          return;
        }
        if (result.status === "cancelled") return;
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
      className="shrink-0 rounded-xl bg-zinc-900 px-5 py-3 text-lg font-semibold text-white active:bg-zinc-700 disabled:opacity-40"
    >
      {busy ? "준비 중…" : mode === "link" ? "링크 복사" : "공유"}
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
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-xl font-bold">
          링크 {links.length}개가 복사되었습니다
        </h2>
        <p className="mb-4 truncate text-base text-zinc-500">{links[0]}</p>

        {kakaoKey ? (
          <button
            type="button"
            onClick={sendKakao}
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
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-zinc-300 py-4 text-xl font-semibold text-zinc-600"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
