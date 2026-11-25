import { z } from "zod";

import { DAILY_LIMIT_MAX, DAILY_LIMIT_MIN } from "./constants";

export const settingsSchema = z.object({
  // 체크박스는 켜져 있을 때만 "on" 이 온다
  email_enabled: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  daily_limit: z.coerce
    .number({ error: "숫자로 입력해 주세요." })
    .int("정수로 입력해 주세요.")
    .min(DAILY_LIMIT_MIN, `${DAILY_LIMIT_MIN}장 이상으로 입력해 주세요.`)
    .max(DAILY_LIMIT_MAX, `${DAILY_LIMIT_MAX}장 이하로 입력해 주세요.`),
});

export type SettingsInput = z.output<typeof settingsSchema>;
