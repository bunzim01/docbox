/** 파일 종류별 아이콘 — 탐색기처럼 문서 모양 + 종류 띠 */
import { isVideo } from "@/lib/format";

type Spec = { label: string; color: string };

function spec(fileType: string | null): Spec {
  const t = (fileType ?? "").toLowerCase();
  if (t === "pdf") return { label: "PDF", color: "#E5484D" };
  if (t === "ppt" || t === "pptx") return { label: "PPT", color: "#E8590C" };
  if (t === "doc" || t === "docx") return { label: "DOC", color: "#2B6CB0" };
  if (t === "xls" || t === "xlsx") return { label: "XLS", color: "#2F9E44" };
  if (t === "hwp" || t === "hwpx") return { label: "HWP", color: "#0B7285" };
  if (isVideo(t)) return { label: "영상", color: "#7048E8" };
  return { label: (t || "FILE").toUpperCase().slice(0, 4), color: "#71717A" };
}

export default function FileIcon({
  fileType,
  className = "h-10 w-8",
}: {
  fileType: string | null;
  className?: string;
}) {
  const { label, color } = spec(fileType);
  const video = isVideo(fileType);

  return (
    <svg viewBox="0 0 32 40" className={className} aria-label={label} role="img">
      {/* 종이 */}
      <path
        d="M3 1.5h17.5L29 10v28.5a1.5 1.5 0 0 1-1.5 1.5h-24A1.5 1.5 0 0 1 2 38.5v-35A1.5 1.5 0 0 1 3.5 1.5z"
        fill="#ffffff"
        stroke="#d4d4d8"
        strokeWidth="1.5"
      />
      {/* 접힌 모서리 */}
      <path d="M20.5 1.5L29 10h-8.5z" fill="#e4e4e7" stroke="#d4d4d8" strokeWidth="1.5" />
      {/* 영상은 종이 위에 재생 표시를 하나 더 둔다 */}
      {video && <path d="M12 11.5l6.5 4-6.5 4z" fill={color} />}
      {/* 종류 띠 */}
      <rect x="1" y="21" width="27" height="13" rx="2.5" fill={color} />
      <text
        x="14.5"
        y="30.5"
        textAnchor="middle"
        fontSize="9.5"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="system-ui, sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}
