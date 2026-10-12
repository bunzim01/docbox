import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth-server";
import { getDocument, withFileUrl } from "@/lib/documents";
import PdfViewer from "./pdf-viewer";

/**
 * 폰에서 PDF 를 누르면 오는 화면 — 앱 안에서 바로 보고, 맨 위 카톡 버튼으로 파일만 보낸다.
 * 폰 브라우저의 PDF 화면에서 [공유]를 누르면 크롬이 파일 주소 링크를 꼭 같이 붙여 보내서
 * (사이트에서 끌 수 없다) 앱 안에서 보여 주는 쪽으로 바꿨다.
 */
export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  await requireAuth();

  const { id } = await params;
  const doc = await getDocument(id).catch(() => null);
  if (!doc) notFound();

  const view = withFileUrl(doc);
  // PDF 가 아니면 원래대로 기기가 직접 연다
  if ((doc.file_type ?? "").toLowerCase() !== "pdf") redirect(view.downloadUrl);

  return <PdfViewer doc={view} />;
}
