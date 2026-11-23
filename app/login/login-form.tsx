"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { sendMagicLink, type LoginState } from "./actions";

const initialState: LoginState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(sendMagicLink, initialState);

  if (state.status === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p className="text-base font-semibold">로그인 링크를 보냈어요 📮</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{state.email}</span> 메일함을 확인하고
          링크를 눌러 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
        <form action={formAction}>
          <input type="hidden" name="email" value={state.email} />
          <input type="hidden" name="next" value={next ?? ""} />
          <Button type="submit" variant="outline" className="w-full" disabled={pending}>
            {pending ? "보내는 중…" : "링크 다시 보내기"}
          </Button>
        </form>
      </div>
    );
  }

  const defaultEmail = state.status === "error" ? state.email : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <label htmlFor="email" className="text-sm font-medium">
        이메일
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        defaultValue={defaultEmail}
        aria-invalid={state.status === "error" || undefined}
        aria-describedby={state.status === "error" ? "email-error" : undefined}
        className="h-12 rounded-lg border border-input bg-background px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
      />
      {state.status === "error" && (
        <p id="email-error" role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "보내는 중…" : "로그인 링크 받기"}
      </Button>
    </form>
  );
}
