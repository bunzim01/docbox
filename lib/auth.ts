import { createHmac, timingSafeEqual } from "node:crypto";

/** 로그인 상태를 담는 쿠키 이름 */
export const SESSION_COOKIE = "docbox_session";

/** 쿠키 유효기간: 1년 (폰에서 매번 로그인하지 않게) */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * 비밀번호에서 세션 토큰을 만든다.
 * 비밀번호 자체는 쿠키에 절대 넣지 않는다.
 * APP_PASSWORD 를 바꾸면 기존 로그인은 전부 무효가 된다.
 */
export function makeSessionToken(password: string): string {
  return createHmac("sha256", password).update("docbox-session-v1").digest("hex");
}

/** 두 문자열을 길이/내용 노출 없이 비교 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(createHmac("sha256", "cmp").update(a).digest());
  const bufB = Buffer.from(createHmac("sha256", "cmp").update(b).digest());
  return timingSafeEqual(bufA, bufB);
}

/** 입력한 비밀번호가 APP_PASSWORD 와 같은지 */
export function isCorrectPassword(input: string): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword) return false;
  return safeEqual(input, appPassword);
}

/** 쿠키에 들어있는 토큰이 유효한지 */
export function isValidSession(token: string | undefined): boolean {
  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword || !token) return false;
  return safeEqual(token, makeSessionToken(appPassword));
}
