import type { Metadata } from "next";
import { Noto_Kufi_Arabic, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { AppProvider } from "@/app/providers/app-provider";
import { NavHeader } from "@/components/nav-header";

const notoKufi = Noto_Kufi_Arabic({
  variable: "--font-sans",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "فليكس فين | منصة التحليل المالي",
  description: "ارفع بيانات الحسابات المدينة والدائنة والأستاذ العام واحصل على تحليل مالي فوري مع توقعات 12 شهر ونمذجة السيناريوهات.",
  authors: [{ name: "FlexFin" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${notoKufi.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppProvider>
            <NavHeader />
            <main className="min-h-[calc(100vh-3.5rem)]">
              {children}
            </main>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
