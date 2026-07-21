import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createStaffSessionValue,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE,
  verifyStaffPin,
} from "@/lib/staff-session";

const pinSchema = z.object({ pin: z.string().min(1).max(128) });

export async function POST(request: Request) {
  if (!process.env.STAFF_CHECKIN_PIN || !process.env.CHECKIN_SESSION_SECRET) {
    return NextResponse.json({ message: "Staff check-in is not configured." }, { status: 503 });
  }

  const parsed = pinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !verifyStaffPin(parsed.data.pin)) {
    return NextResponse.json({ message: "That PIN is not correct." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(STAFF_SESSION_COOKIE, createStaffSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
