import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentSeal | Human-accountable content proof",
  description:
    "Create proof receipts and verify digital media with provenance, integrity, AI usage, and trust context."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
