/**
 * 큰 PDF 를 브라우저에서 줄인다.
 *
 * 사용자의 제안서·상세페이지는 쪽마다 전면 이미지 한 장인 PDF 이고(글꼴 0개),
 * 그 이미지가 품질 100에 가깝게 저장돼 있어 장당 2MB 가 넘는다.
 * 그래서 **해상도는 그대로 두고 JPEG 품질만 정상 수준으로 다시 저장**하면
 * 눈에 띄는 차이 없이 1/4~1/5 로 줄어든다.
 *
 * pdf.js 로 쪽을 그린 뒤 JPEG 로 다시 굽고, 그 JPEG 들로 PDF 를 새로 엮는다.
 * (PDF 바이트를 직접 고쳐 쓰면 고객에게 보낼 문서가 깨질 위험이 있어 그렇게 하지 않는다)
 */

/** JPEG 품질 — 0.8 이면 품질 100짜리 원본과 눈으로 구분이 잘 안 된다 */
const QUALITY = 0.8;

/**
 * 그릴 해상도의 상한 (DPI). 300 은 인쇄 품질이라 이보다 위는 의미가 없다.
 * A4 한 쪽이 약 2480x3508px 이 된다.
 */
const DPI_CAP = 300;

/**
 * PDF 안에 박힌 이미지 중 가장 큰 가로 픽셀 수를 원본 바이트에서 읽는다 (못 찾으면 0).
 *
 * 왜 이렇게 하나:
 *  - 쪽 크기(포인트)만 보고 그리면 안 된다. A4(842pt) 쪽 안에 8001px 이미지가 든 문서가 있어서
 *    쪽 크기대로 그렸다가 6배 축소돼 확대하면 흐려졌다.
 *  - pdf.js 로 알아내려 해도 안 된다. getOperatorList 만으론 이미지 객체가 안 풀리고,
 *    작게 한 번 그려 풀면 pdf.js 가 캔버스에 맞춰 줄여 디코딩해서 원본 크기가 안 잡힌다.
 *  - 기준점은 반드시 "/Subtype /Image" 로 잡는다. /Width 를 기준으로 훑으면
 *    압축된 바이너리에서 엉뚱한 숫자를 물어 온다. /Width 는 사전 안에서 앞에 올 수도 있어 양쪽을 본다.
 */
function maxImageWidth(bytes: Uint8Array): number {
  let s: string;
  try {
    s = new TextDecoder("latin1").decode(bytes);
  } catch {
    return 0;
  }
  const found: number[] = [];
  for (const m of s.matchAll(/\/Subtype\s*\/Image/g)) {
    const at = m.index ?? 0;
    const win = s.slice(Math.max(0, at - 500), at + 500);
    const w = win.match(/\/Width\s+(\d+)/);
    const h = win.match(/\/Height\s+(\d+)/);
    if (!w || !h) continue; // 이미지 사전이면 둘 다 있다
    const n = Number(w[1]);
    if (n >= 16 && n <= 30000) found.push(n);
  }
  return found.length ? Math.max(...found) : 0;
}

/**
 * 이 크기를 넘는 PDF 만 줄여 본다.
 * 50MB 제한 때문만이 아니라, 큰 파일은 카톡으로 보낼 때도 느려서 10초 목표를 못 맞춘다.
 */
export const COMPRESS_OVER = 10 * 1024 * 1024;

/** 이만큼 아래로 줄어야 압축본을 쓴다. 조금밖에 안 줄면 원본이 낫다 */
const KEEP_IF_UNDER = 0.75;

/** 이 파일을 줄여 볼 만한가 (확실한 건 열어 봐야 안다 — compressPdf 가 최종 판단) */
export function shouldCompress(file: File): boolean {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  return isPdf && file.size > COMPRESS_OVER;
}

/**
 * 글자가 이만큼 들어 있으면 '진짜 텍스트 문서' 로 보고 손대지 않는다.
 * 쪽을 이미지로 다시 굽는 방식이라, 텍스트가 있는 문서를 줄이면
 * 글자 선택·검색이 사라지고 확대했을 때 흐려진다. 고객에게 보낼 제안서라 그러면 안 된다.
 * (제품 상세페이지·소개서는 쪽마다 전면 이미지라 글자가 0이다 — 그래서 안전하다)
 */
const TEXT_LIMIT = 40;

/** 몇 쪽만 들춰 봐서 진짜 글자가 있는 문서인지 본다 */
async function hasRealText(doc: {
  numPages: number;
  getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }>;
}): Promise<boolean> {
  const total = doc.numPages;
  const picks = new Set<number>([1, Math.ceil(total / 2), total, 2, total - 1]);
  let chars = 0;
  for (const n of picks) {
    if (n < 1 || n > total) continue;
    const page = await doc.getPage(n);
    const text = await page.getTextContent();
    for (const item of text.items) {
      const str = (item as { str?: string }).str ?? "";
      chars += str.trim().length;
      if (chars > TEXT_LIMIT) return true;
    }
  }
  return false;
}

export type CompressResult = {
  file: File;
  before: number;
  after: number;
};

/** 브라우저에서만 쓴다. 못 줄이거나 실패하면 null */
export async function compressPdf(file: File): Promise<CompressResult | null> {
  try {
    // 무거운 라이브러리라 큰 PDF 를 만났을 때만 불러온다
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();

    const bytes = new Uint8Array(await file.arrayBuffer());
    // pdf.js 는 넘긴 버퍼의 소유권을 워커로 가져가 버린다(bytes 가 빈 배열이 된다).
    // 그러니 원본 해상도는 반드시 getDocument 보다 먼저 읽어야 한다.
    const native = maxImageWidth(bytes);

    const task = pdfjs.getDocument({ data: bytes });
    const doc = await task.promise;

    // 진짜 글자가 든 문서는 건드리지 않는다 (이미지로 구우면 글자를 잃는다)
    if (await hasRealText(doc)) {
      await task.destroy();
      return null;
    }

    const pages: { jpeg: Uint8Array; w: number; h: number; boxW: number; boxH: number }[] = [];

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const base = page.getViewport({ scale: 1 });
      // 원본 이미지 해상도에 맞춘다 — 어느 쪽도 원본보다 해상도가 낮아지지 않게.
      // 쪽 크기보다 작게 줄이지 않고(>=1), 300 DPI 를 넘기지도 않는다.
      // 해상도를 못 알아냈으면 흐려지는 쪽보다 커지는 쪽이 안전하므로 상한까지 올린다.
      const cap = DPI_CAP / 72;
      const wanted = native > 0 ? native / base.width : cap;
      const scale = Math.min(Math.max(wanted, 1), cap);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return null;
      // JPEG 는 투명을 모르므로 흰 바탕을 먼저 깐다
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", QUALITY),
      );
      if (!blob) return null;

      pages.push({
        jpeg: new Uint8Array(await blob.arrayBuffer()),
        w: canvas.width,
        h: canvas.height,
        boxW: base.width, // 쪽 크기(포인트)는 원본 그대로 유지한다
        boxH: base.height,
      });

      canvas.width = 0; // 폰 메모리를 아낀다
      canvas.height = 0;
    }

    await task.destroy();

    const out = buildPdf(pages);
    // 눈에 띄게 줄지 않으면(4분의 1 미만) 원본을 그대로 쓴다 — 괜히 화질만 깎을 이유가 없다
    if (out.length > file.size * KEEP_IF_UNDER) return null;

    const name = file.name;
    return {
      file: new File([out as BlobPart], name, { type: "application/pdf" }),
      before: file.size,
      after: out.length,
    };
  } catch {
    return null; // 압축에 실패해도 업로드 자체는 원본으로 이어간다
  }
}

/* ---------------- JPEG 쪽들로 PDF 엮기 ---------------- */

/**
 * 쪽마다 JPEG 한 장인 아주 단순한 PDF 를 만든다.
 * JPEG 는 /DCTDecode 로 그대로 넣으므로 다시 압축하지 않는다.
 */
function buildPdf(
  pages: { jpeg: Uint8Array; w: number; h: number; boxW: number; boxH: number }[],
): Uint8Array {
  const chunks: Uint8Array[] = [];
  const enc = new TextEncoder();
  let length = 0;
  const offsets: number[] = []; // offsets[번호] = 그 객체가 시작하는 위치

  const put = (data: Uint8Array | string) => {
    const b = typeof data === "string" ? enc.encode(data) : data;
    chunks.push(b);
    length += b.length;
  };
  const startObj = (num: number) => {
    offsets[num] = length;
    put(`${num} 0 obj\n`);
  };

  // 1 = 목차, 2 = 쪽 모음, 이후 쪽마다 3개씩 (쪽 / 내용 / 그림)
  const pageNum = (i: number) => 3 + i * 3;
  const contentNum = (i: number) => 4 + i * 3;
  const imageNum = (i: number) => 5 + i * 3;

  put("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  startObj(1);
  put("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObj(2);
  put(
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages
      .map((_, i) => `${pageNum(i)} 0 R`)
      .join(" ")}] >>\nendobj\n`,
  );

  pages.forEach((p, i) => {
    const boxW = Math.round(p.boxW * 100) / 100;
    const boxH = Math.round(p.boxH * 100) / 100;

    startObj(pageNum(i));
    put(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${boxW} ${boxH}] ` +
        `/Resources << /XObject << /X0 ${imageNum(i)} 0 R >> >> ` +
        `/Contents ${contentNum(i)} 0 R >>\nendobj\n`,
    );

    // 그림을 쪽 전체에 채운다
    const content = `q ${boxW} 0 0 ${boxH} 0 0 cm /X0 Do Q\n`;
    startObj(contentNum(i));
    put(`<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

    startObj(imageNum(i));
    put(
      `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
        `/Length ${p.jpeg.length} >>\nstream\n`,
    );
    put(p.jpeg);
    put("\nendstream\nendobj\n");
  });

  const count = 3 + pages.length * 3; // 0번(빈칸) + 실제 객체들
  const xrefAt = length;
  put(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) {
    put(`${String(offsets[n] ?? 0).padStart(10, "0")} 00000 n \n`);
  }
  put(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}
