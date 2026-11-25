import { timingSafeEqual } from "node:crypto";

/** Vercel Cron 은 `Authorization: Bearer ${CRON_SECRET}` 를 보낸다. 비밀값이 비어 있으면 항상 거부 */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
