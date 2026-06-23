import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentSeal",
  description: "Layered media provenance verification for images"
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
