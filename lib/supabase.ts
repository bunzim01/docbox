import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** 파일을 넣어두는 Storage 버킷 이름 */
export const BUCKET = "docs";

let cached: SupabaseClient | null = null;

/**
 * 서버 전용 Supabase 클라이언트.
 * service_role 키를 쓰므로 절대 브라우저 코드에서 import 하지 말 것.
 */
export function supabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      ".env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 넣어주세요.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
