"use client";

import { useActionState } from "react";
import { Mail, Send } from "lucide-react";

import { sendTestEmail, updateSettings, type ActionMessage } from "@/app/(main)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DAILY_LIMIT_MAX, DAILY_LIMIT_MIN } from "@/lib/settings/constants";

const idle: ActionMessage = { status: "idle" };

function Notice({ state }: { state: ActionMessage }) {
  if (state.status === "idle") return null;
  return (
    <p
      role={state.status === "error" ? "alert" : "status"}
      className={
        state.status === "error"
          ? "rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          : "rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground"
      }
    >
      {state.message}
    </p>
  );
}

export function SettingsForm({ emailEnabled, dailyLimit }: { emailEnabled: boolean; dailyLimit: number }) {
  const [state, formAction, pending] = useActionState(updateSettings, idle);
  const fieldErrors = state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
        <span className="flex flex-col">
          <span className="font-medium">복습 메일 받기</span>
          <span className="text-sm text-muted-foreground">매일 오전 7시대, 복습할 카드가 있을 때만</span>
        </span>
        <input
          type="checkbox"
          name="email_enabled"
          defaultChecked={emailEnabled}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/30 transition-colors after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-primary peer-checked:after:translate-x-5 peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50"
        />
      </label>

      <div className="flex flex-col gap-2">
        <Label htmlFor="daily_limit">하루 최대 카드 수</Label>
        <div className="flex items-center gap-2">
          <Input
            id="daily_limit"
            name="daily_limit"
            type="number"
            inputMode="numeric"
            min={DAILY_LIMIT_MIN}
            max={DAILY_LIMIT_MAX}
            defaultValue={dailyLimit}
            className="w-28"
            aria-invalid={!!fieldErrors.daily_limit || undefined}
          />
          <span className="text-muted-foreground">장</span>
        </div>
        <p className="text-sm text-muted-foreground">
          밀린 카드가 많아도 하루에 이만큼만 복습·메일에 보여줘요 ({DAILY_LIMIT_MIN}~{DAILY_LIMIT_MAX})
        </p>
        {fieldErrors.daily_limit && <p className="text-sm text-destructive">{fieldErrors.daily_limit}</p>}
      </div>

      <Notice state={state} />
      <Button type="submit" disabled={pending} className="sm:w-fit">
        {pending ? "저장하는 중…" : "저장"}
      </Button>
    </form>
  );
}

export function TestEmailButton() {
  const [state, formAction, pending] = useActionState(sendTestEmail, idle);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Button type="submit" variant="outline" disabled={pending} className="sm:w-fit">
        {pending ? <Mail className="animate-pulse" /> : <Send />}
        {pending ? "보내는 중…" : "지금 테스트 메일 받기"}
      </Button>
      <Notice state={state} />
    </form>
  );
}
