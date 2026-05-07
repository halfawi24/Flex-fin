import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/app/providers/theme-provider";
import { AppProvider } from "@/app/providers/app-provider";
import { NavHeader } from "@/components/nav-header";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "FlexFinToolkit | Financial Analysis Suite",
  description: "Upload AR/AP/GL data and get instant financial analysis with 12-month forecasts, scenario modeling, and executive reports.",
  authors: [{ name: "FlexFinToolkit" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
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
