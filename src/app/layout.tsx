import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TopNav } from "@/components/nav/top-nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SF Housing — reviews, threads, and roommates",
  description:
    "Reddit-style forum for finding housing in San Francisco. Reviews of every neighborhood, roommate threads, and where-to-live planning for students and post-grads.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-platinum text-ink antialiased">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
