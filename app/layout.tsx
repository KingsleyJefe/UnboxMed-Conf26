import type { Metadata, Viewport } from "next";
import { Chewy, Geist, Martian_Mono } from "next/font/google";
import "./globals.css";

const chewy = Chewy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-body",
});

const martianMono = Martian_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://unboxmed-conference.vercel.app"),
  title: {
    default: "Beyond the Syllabus — UnboxMed Conference 2026",
    template: "%s — UnboxMed Conference 2026",
  },
  description:
    "A gathering for students and young professionals proving that excellence in your field and ambition beyond it can grow together.",
  keywords: [
    "UnboxMed",
    "Beyond the Syllabus",
    "conference",
    "Aba",
    "students",
    "young professionals",
  ],
  openGraph: {
    title: "Beyond the Syllabus — UnboxMed Conference 2026",
    description:
      "Your degree was never the finish line. Join us in Aba on 15 August 2026.",
    type: "website",
    locale: "en_NG",
    siteName: "UnboxMed Conference",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond the Syllabus — UnboxMed Conference 2026",
    description: "Come curious. Leave inspired.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e0552a",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${chewy.variable} ${geist.variable} ${martianMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
