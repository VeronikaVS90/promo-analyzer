import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { NextThemeProvider } from "./theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Promo Analyzer",
  description: "Analyze your promotional content effectiveness",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} transition-colors`}>
        <Providers>
          <NextThemeProvider>{children}</NextThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
