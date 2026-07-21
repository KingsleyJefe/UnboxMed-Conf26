import type { Metadata } from "next";
import { hasStaffSession } from "@/lib/staff-session";
import { StaffScanner } from "./StaffScanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff check-in",
  robots: { index: false, follow: false },
};

export default async function StaffCheckinPage() {
  return <StaffScanner initiallyAuthenticated={await hasStaffSession()} />;
}
