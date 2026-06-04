import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/custom-cursor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://analystos-terminal.vercel.app"),
  title: {
    default: "AnalystOS — AI Financial Research Terminal",
    template: "%s | AnalystOS",
  },
  description: "A premium AI-powered financial operating system and equity research terminal designed for next-generation investors. Live DCF models, AI Investment Committee consensus, and 3D market metrics.",
  manifest: "/manifest.json",
  keywords: [
    "AnalystOS",
    "financial terminal",
    "equity research",
    "Bloomberg Terminal alternative",
    "AI investment analyzer",
    "DCF calculator",
    "portfolio valuation",
    "hedge fund terminal",
    "financial operating system",
    "stock market news"
  ],
  authors: [{ name: "AnalystOS Team" }],
  creator: "AnalystOS",
  publisher: "AnalystOS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://analystos-terminal.vercel.app",
    title: "AnalystOS — AI Financial Research Terminal",
    description: "A premium AI-powered financial operating system and equity research terminal. Live DCF models, AI Investment Committee consensus, and 3D market metrics.",
    siteName: "AnalystOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "AnalystOS — AI Financial Research Terminal",
    description: "Premium AI-powered financial operating system. Live DCF models and AI Investment Committee consensus.",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    yandex: process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION || "",
    yahoo: process.env.NEXT_PUBLIC_YAHOO_SITE_VERIFICATION || "",
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
      "baidu-site-verification": process.env.NEXT_PUBLIC_BAIDU_SITE_VERIFICATION || "",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}

