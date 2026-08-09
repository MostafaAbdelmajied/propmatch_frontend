import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PropMatch AI",
  description: "استأجر مباشرة من المالك. بدون سمسار، وبدون عمولة.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="ar" dir="rtl" className={`h-full antialiased ${cairo.variable}`} suppressHydrationWarning>
      <body className={`min-h-full flex flex-col bg-background text-ink font-sans ${cairo.className}`} suppressHydrationWarning>
        <NextIntlClientProvider locale="ar" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
