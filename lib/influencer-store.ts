/**
 * (서버 전용) 셀러 명단 저장 — 데이터베이스 표를 새로 만들지 않고, 저장소(docs 버킷)에 작은 JSON 파일 하나로 둔다.
 * (표를 만들려면 사용자가 Supabase 에서 SQL 을 직접 돌려야 해서 이렇게 했다)
 * 파일이 없으면 시작 명단(lib/influencers.ts INFLUENCERS)으로 시작한다.
 */
import { BUCKET, supabase } from "./supabase";
import { INFLUENCERS, type Influencer } from "./influencers";

const PATH = "_data/influencers.json";

export async function readInfluencers(): Promise<Influencer[]> {
  const { data, error } = await supabase().storage.from(BUCKET).download(PATH);
  if (error || !data) return INFLUENCERS; // 아직 파일이 없음 → 시작 명단
  try {
    const list = JSON.parse(await data.text());
    if (!Array.isArray(list)) return INFLUENCERS;
    return list.filter(
      (p): p is Influencer => p && typeof p.name === "string" && typeof p.handle === "string",
    );
  } catch {
    return INFLUENCERS;
  }
}

export async function writeInfluencers(list: Influencer[]): Promise<string | null> {
  const body = new Blob([JSON.stringify(list, null, 2)], { type: "application/json" });
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(PATH, body, { upsert: true, contentType: "application/json", cacheControl: "0" });
  return error ? error.message : null;
}
