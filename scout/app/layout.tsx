import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Founder — Build Smarter",
  description: "Find what to build, validate your idea, and get an exact plan. AI-powered business intelligence for founders at every stage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
