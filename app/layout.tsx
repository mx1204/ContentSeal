import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ContentSeal | Screenshot provenance recovery",
  description:
    "Recover trusted sources from screenshots, reposts, compressed images, and cropped copies with lightweight proof receipts."
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
