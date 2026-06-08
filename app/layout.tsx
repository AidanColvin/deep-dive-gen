import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep Dive — Company Intelligence Reports",
  description:
    "Free, source-grounded company deep dive reports. Real financials from SEC EDGAR, no API keys, no cost.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
