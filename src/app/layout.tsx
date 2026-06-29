import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityProvider } from "@/components/accessibility/accessibility-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aria Console — Voice-Controlled Smartphone System",
  description:
    "Operations console for managing voice-controlled smartphone fleets. Monitor devices, voice interactions, energy usage, and security alerts. Built with accessibility for visually impaired users.",
  keywords: [
    "voice control",
    "smartphone",
    "device management",
    "console",
    "Aria",
    "accessibility",
    "screen reader",
  ],
  authors: [{ name: "Resolutefemi" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <AccessibilityProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AccessibilityProvider>
        <Toaster />
      </body>
    </html>
  );
}
