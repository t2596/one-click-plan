import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { NotificationService } from "@/components/notification-service";
import { PwaRegister } from "@/components/pwa-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "一键计划 - AI 学习计划管理",
  description: "用 AI 一键创建学习计划，智能管理日程与复习",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "一键计划",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <TooltipProvider>
          <NotificationService />
          <PwaRegister />
          <Sidebar />
          <main className="ml-16 flex-1 overflow-auto transition-all duration-300">
            {children}
          </main>
          <Toaster position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  );
}
