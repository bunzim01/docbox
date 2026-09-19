"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  isCorrectPassword,
  makeSessionToken,
} from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!process.env.APP_PASSWORD) {
    return { error: "서버에 APP_PASSWORD 가 설정되어 있지 않습니다." };
  }
  if (!isCorrectPassword(password)) {
    return { error: "비밀번호가 맞지 않습니다." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, makeSessionToken(process.env.APP_PASSWORD), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
