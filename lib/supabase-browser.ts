import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * 브라우저용 Supabase 클라이언트 (공개 anon 키).
 * 파일을 서버를 거치지 않고 Storage 로 바로 올릴 때만 쓴다.
 * 실제 업로드 권한은 서버가 발급한 1회용 서명 URL 이 준다.
 */
export function supabaseBrowser(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return cached;
}
