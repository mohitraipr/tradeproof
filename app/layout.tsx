import type { Metadata } from "next";
import { Outfit, DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TradeProof | B2B Fashion Intelligence",
  description: "Data-backed wholesale fashion marketplace. See what's selling online, stock your store with confidence. 31,000+ verified products.",
  keywords: ["B2B fashion", "wholesale clothing", "fashion marketplace", "bulk order"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <TooltipProvider delayDuration={0}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
