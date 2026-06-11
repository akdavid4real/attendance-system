import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Attendly",
  description: "Selfie and location attendance built with Next.js and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
