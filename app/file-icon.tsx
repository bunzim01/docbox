/**
 * 파일 종류별 아이콘 — 윈도우 파일 탐색기 느낌.
 * 흰 종이(접힌 모서리) 위에 종류마다 다른 내용 그림(글줄·표·슬라이드·지퍼…)을 옅게 그리고,
 * 왼쪽 아래에 색 배지 + 글자 하나를 튀어나오게 붙인다. 작게(폰 목록 22px) 줄여도 종류가 구별되게
 * 배지는 크게, 글자는 한두 자로. 실제 프로그램(오피스·어도비 등) 로고는 따라 그리지 않는다.
 */
import { isArchive, isVideo } from "@/lib/format";

type Kind = "pdf" | "ppt" | "doc" | "xls" | "hwp" | "video" | "zip" | "other";

type Spec = { kind: Kind; label: string; color: string; name: string };

function spec(fileType: string | null): Spec {
  const t = (fileType ?? "").toLowerCase();
  if (t === "pdf") return { kind: "pdf", label: "PDF", color: "#D93636", name: "PDF" };
  if (t === "ppt" || t === "pptx") return { kind: "ppt", label: "P", color: "#D9601F", name: "PPT" };
  if (t === "doc" || t === "docx") return { kind: "doc", label: "W", color: "#2563B0", name: "워드" };
  if (t === "xls" || t === "xlsx") return { kind: "xls", label: "X", color: "#1F8A4C", name: "엑셀" };
  if (t === "hwp" || t === "hwpx") return { kind: "hwp", label: "한", color: "#0A7C8C", name: "한글" };
  if (isVideo(t)) return { kind: "video", label: "", color: "#6D44D9", name: "영상" };
  if (isArchive(t)) return { kind: "zip", label: t.toUpperCase(), color: "#A8691A", name: "압축" };
  return { kind: "other", label: (t || "?").toUpperCase().slice(0, 3), color: "#71717A", name: "파일" };
}

/** 종이 위 내용 그림 (옅게) */
function Content({ kind, color }: { kind: Kind; color: string }) {
  const line = "#cfd3da";
  switch (kind) {
    case "xls":
      // 표 칸
      return (
        <g stroke={color} strokeOpacity="0.45" strokeWidth="1">
          <rect x="11.5" y="7.5" width="14" height="11" fill={color} fillOpacity="0.08" />
          <path d="M11.5 11.2h14M11.5 14.8h14M16.2 7.5v11M20.8 7.5v11" />
        </g>
      );
    case "ppt":
      // 슬라이드 한 장 + 막대
      return (
        <g>
          <rect x="11" y="7" width="15" height="10" rx="1" fill={color} fillOpacity="0.12" stroke={color} strokeOpacity="0.5" />
          <path d="M14.5 15v-3M18 15v-5M21.5 15v-2" stroke={color} strokeOpacity="0.7" strokeWidth="1.6" />
        </g>
      );
    case "zip":
      // 가운데 지퍼
      return (
        <g fill={color} fillOpacity="0.75">
          <rect x="18" y="3" width="3" height="2.4" />
          <rect x="15" y="5.4" width="3" height="2.4" />
          <rect x="18" y="7.8" width="3" height="2.4" />
          <rect x="15" y="10.2" width="3" height="2.4" />
          <rect x="18" y="12.6" width="3" height="2.4" />
          <rect x="15.2" y="15.4" width="5.6" height="4" rx="1" fill={color} fillOpacity="1" />
        </g>
      );
    case "video":
      return (
        <g>
          <rect x="10" y="9" width="17" height="12" rx="2" fill={color} fillOpacity="0.12" />
          <path d="M16 11.8l5.6 3.2-5.6 3.2z" fill={color} />
        </g>
      );
    default:
      // 글줄
      return (
        <g stroke={line} strokeWidth="1.4" strokeLinecap="round">
          <path d="M11 9h11M11 12.5h14M11 16h14M11 19.5h9" />
        </g>
      );
  }
}

export default function FileIcon({
  fileType,
  className = "h-10 w-8",
}: {
  fileType: string | null;
  className?: string;
}) {
  const { kind, label, color, name } = spec(fileType);
  const long = label.length >= 3;

  return (
    <svg viewBox="0 0 32 40" className={className} aria-label={name} role="img">
      {/* 종이 — 배지가 왼쪽으로 튀어나오게 오른쪽으로 비켜 둔다 */}
      <path
        d="M8.5 1.5h14.5L30.5 9v28.5a1.5 1.5 0 0 1-1.5 1.5H8.5A1.5 1.5 0 0 1 7 37.5v-34.5A1.5 1.5 0 0 1 8.5 1.5z"
        fill="#ffffff"
        stroke="#c9ccd3"
        strokeWidth="1.2"
      />
      {/* 접힌 모서리 */}
      <path d="M23 1.5L30.5 9H24.5A1.5 1.5 0 0 1 23 7.5z" fill="#e6e8ec" stroke="#c9ccd3" strokeWidth="1.2" strokeLinejoin="round" />

      <Content kind={kind} color={color} />

      {/* 종류 배지 */}
      <rect x="1" y="22" width={long ? 22 : 17} height="15" rx="3" fill={color} />
      <rect x="1" y="22" width={long ? 22 : 17} height="7.5" rx="3" fill="#ffffff" fillOpacity="0.12" />
      {kind === "video" ? (
        <path d="M7 25.5l6.5 4-6.5 4z" fill="#ffffff" />
      ) : (
        <text
          x={long ? 12 : 9.5}
          y={long ? 32.6 : 33.6}
          textAnchor="middle"
          fontSize={long ? 8 : 11.5}
          fontWeight="800"
          fill="#ffffff"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          letterSpacing={long ? "-0.2" : "0"}
        >
          {label}
        </text>
      )}
    </svg>
  );
}
