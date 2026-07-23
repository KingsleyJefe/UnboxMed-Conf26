import type { Metadata } from "next";
import { hasStaffSession } from "@/lib/staff-session";
import { RaffleExperience } from "./RaffleExperience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unbox the Winner",
  robots: { index: false, follow: false },
};

export default async function StaffRafflePage() {
  return <RaffleExperience initiallyAuthenticated={await hasStaffSession()} />;
}
