"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <form action={formAction} className="w-full max-w-sm">
        <h1 className="mb-1 text-3xl font-bold text-zinc-900">라이크웨이 자료실</h1>
        <p className="mb-8 text-base text-zinc-500">
          제안서를 모아두고 카톡으로 바로 보내기
        </p>

        <label htmlFor="password" className="mb-2 block text-base text-zinc-600">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3.5 text-lg outline-none focus:border-zinc-900"
        />

        {state.error && (
          <p className="mt-3 text-base text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-xl bg-zinc-900 py-4 text-xl font-semibold text-white active:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "확인 중…" : "들어가기"}
        </button>
      </form>
    </main>
  );
}
