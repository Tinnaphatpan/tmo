import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Noto_Sans_Thai } from "next/font/google";
import { I18nProvider, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import "./globals.css";

// SPEC §3.3 — single font system-wide, Thai + Latin subsets.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  title: "TMO Grading Queue",
  description: "ระบบจัดการคิวตรวจข้อสอบ TMO",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale: Locale = (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "th";
  return (
    <html lang={locale} className={`${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider initialLocale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
