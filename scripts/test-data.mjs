// 테스트 문서를 넣고 지우는 유일한 통로.
// 실제 사이트와 같은 DB 를 쓰므로, 테스트 데이터는 반드시 표시(memo = "__TEST__")를 달고
// 지울 때도 그 표시가 있는 것만 지운다. 표시 없는 문서·폴더는 절대 건드리지 않는다.
//
//   node scripts/test-data.mjs add <폴더이름|-> "제목:확장자" ["제목:확장자" ...]
//   node scripts/test-data.mjs addfile <폴더이름|-> <파일경로> "제목"      ← 진짜 파일 (영상 확인용)
//   node scripts/test-data.mjs clean
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const MARK = "__TEST__";
const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => /^[A-Z]/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "add") {
  const [folderName, ...items] = args;
  let folderId = null;
  if (folderName && folderName !== "-") {
    const { data } = await sb.from("folders").select("id").eq("name", folderName).limit(1).maybeSingle();
    folderId = data?.id ?? null;
  }
  for (const item of items) {
    const [title, ext = "pdf"] = item.split(":");
    const path = `${crypto.randomUUID()}.${ext}`;
    await sb.storage.from("docs").upload(path, Buffer.from("%PDF-1.4 test"));
    await sb.from("documents").insert({
      title, file_path: path, file_type: ext, file_size: 1200000,
      tags: ["테스트"], memo: MARK, folder_id: folderId,
    });
    console.log("넣음:", title);
  }
  if (folderId) console.log("FOLDER_ID=" + folderId);
} else if (cmd === "addfile") {
  // 진짜 파일을 그대로 올린다 (영상이 실제로 재생되는지 확인할 때).
  // 다른 테스트 데이터와 똑같이 memo = "__TEST__" 표시를 달아 두므로 clean 으로 지워진다.
  const [folderName, filePath, title] = args;
  let folderId = null;
  if (folderName && folderName !== "-") {
    const { data } = await sb.from("folders").select("id").eq("name", folderName).limit(1).maybeSingle();
    folderId = data?.id ?? null;
  }
  const ext = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  const types = { mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v", webm: "video/webm", pdf: "application/pdf" };
  const buf = fs.readFileSync(filePath);
  const path = `${crypto.randomUUID()}.${ext}`;
  const up = await sb.storage.from("docs").upload(path, buf, { contentType: types[ext] ?? "application/octet-stream" });
  if (up.error) { console.error("올리기 실패:", up.error.message); process.exit(1); }
  const { data } = await sb.from("documents").insert({
    title: title ?? "테스트", file_path: path, file_type: ext, file_size: buf.length,
    tags: ["테스트"], memo: MARK, folder_id: folderId,
  }).select("id").single();
  console.log("넣음:", title, "·", (buf.length / 1048576).toFixed(1) + "MB");
  console.log("DOC_ID=" + data.id);
} else if (cmd === "clean") {
  const { data } = await sb.from("documents").select("id,title,file_path").eq("memo", MARK);
  if (data?.length) {
    await sb.storage.from("docs").remove(data.map((d) => d.file_path));
    await sb.from("documents").delete().in("id", data.map((d) => d.id));
  }
  (data ?? []).forEach((d) => console.log("지움(테스트):", d.title));
  const { count } = await sb.from("documents").select("id", { count: "exact", head: true });
  console.log(`테스트 ${data?.length ?? 0}개 삭제 · 사용자 문서 ${count}개는 그대로`);
} else {
  console.log("사용법: add <폴더|-> 제목:확장자 ... | clean");
}
