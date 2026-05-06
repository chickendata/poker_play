import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "@/i18n/LocaleContext";

export const metadata: Metadata = {
  title: "Poker Play",
  description: "Multiplayer Texas Hold'em",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
