import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { CampaignProvider } from "@/lib/campaign-store";
import { AuthWrapper } from "@/components/layout/auth-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VoiceAI — AI Voice Calling Dashboard",
  description:
    "AI-powered voice calling dashboard for managing campaigns, agents, and call analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <CampaignProvider>
          <AuthWrapper>
            <div className="flex min-h-screen">
              <Sidebar />
              <div className="flex-1 pl-64">
                <Navbar />
                <main className="p-8 page-enter">{children}</main>
              </div>
            </div>
          </AuthWrapper>
        </CampaignProvider>
      </body>
    </html>
  );
}

