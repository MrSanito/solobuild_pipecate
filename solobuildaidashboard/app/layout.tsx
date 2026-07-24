import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/layout/auth-wrapper";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://voiceai.example.com'),
  title: {
    default: "VoiceAI — AI Voice Calling Dashboard",
    template: "%s | VoiceAI"
  },
  description:
    "AI-powered voice calling dashboard for managing campaigns, agents, and call analytics.",
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "VoiceAI — AI Voice Calling Dashboard",
    description: "AI-powered voice calling dashboard for managing campaigns, agents, and call analytics.",
    url: 'https://voiceai.example.com',
    siteName: 'VoiceAI',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "VoiceAI — AI Voice Calling Dashboard",
    description: "AI-powered voice calling dashboard for managing campaigns, agents, and call analytics.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ClerkProvider>
          {/* <AuthWrapper> */}
          {children}
          {/* </AuthWrapper> */}
        </ClerkProvider>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}

