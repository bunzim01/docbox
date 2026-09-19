// 테스트 문서를 넣고 지우는 유일한 통로.
// 실제 사이트와 같은 DB 를 쓰므로, 테스트 데이터는 반드시 표시(memo = "__TEST__")를 달고
// 지울 때도 그 표시가 있는 것만 지운다. 표시 없는 문서·폴더는 절대 건드리지 않는다.
//
//   node scripts/test-data.mjs add <폴더이름|-> "제목:확장자" ["제목:확장자" ...]
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
