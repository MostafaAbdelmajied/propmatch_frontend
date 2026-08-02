import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Providers } from "./providers";
import "./globals.css";

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
    <html lang="ar" dir="rtl" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-background text-ink font-sans" suppressHydrationWarning>
        <NextIntlClientProvider locale="ar" messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
