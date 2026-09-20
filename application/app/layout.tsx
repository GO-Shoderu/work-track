import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Work Track",
  description: "A focused recruitment workspace.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
