import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "./auth";

/**
 * 서버 액션·페이지에서 로그인 여부를 다시 확인한다.
 * proxy.ts 의 검사만 믿지 않는다 — 서버 액션은 주소와 상관없이 호출될 수 있어서
 * 각 동작마다 직접 확인해야 안전하다.
 */
export async function requireAuth(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSession(token)) {
    throw new Error("로그인이 필요합니다.");
  }
}
