import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const STAFF_SESSION_COOKIE = "unboxmed_checkin_session";
export const STAFF_SESSION_MAX_AGE = 12 * 60 * 60;

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getSessionValue() {
  const pin = process.env.STAFF_CHECKIN_PIN;
  const secret = process.env.CHECKIN_SESSION_SECRET;
  if (!pin || !secret) return null;
  return createHmac("sha256", secret).update(pin).digest("hex");
}

export function verifyStaffPin(pin: string) {
  const configuredPin = process.env.STAFF_CHECKIN_PIN;
  return configuredPin ? safeEqual(pin, configuredPin) : false;
}

export async function hasStaffSession() {
  const expected = getSessionValue();
  const actual = (await cookies()).get(STAFF_SESSION_COOKIE)?.value;
  return Boolean(expected && actual && safeEqual(actual, expected));
}

export function createStaffSessionValue() {
  const value = getSessionValue();
  if (!value) throw new Error("Staff check-in secrets are not configured.");
  return value;
}
