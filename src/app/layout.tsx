import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/sonner";

const body = Barlow({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Box Box",
  description: "Fantasy F1 for your group chat. One pick a race, every driver once.",
};

export const viewport: Viewport = {
  themeColor: "#101216",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${body.variable} ${display.variable} ${mono.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
            {children}
          </main>
          <footer className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 flex items-center justify-between">
            <span className="t-eyebrow">Box Box · 2026 season</span>
            <span className="t-eyebrow">Scored from official results</span>
          </footer>
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "!bg-asphalt-700 !border-asphalt-500 !text-chalk font-sans",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
