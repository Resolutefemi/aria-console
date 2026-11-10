import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccessibilityProvider } from "@/components/accessibility/accessibility-provider";
import { ThemeProvider } from "@/components/theme-provider";

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
    "Aria Console",
    "accessibility",
    "screen reader",
    "Resolute Femi",
    "Ariyo Oluwafemi Stephen",
    "Built by Resolute Femi",
  ],
  authors: [{ name: "Resolute Femi", url: "https://github.com/Resolutefemi" }],
  creator: "Resolute Femi (Ariyo Oluwafemi Stephen)",
  publisher: "Renance — Built by Resolute Femi",
  openGraph: {
    type: "website",
    siteName: "Aria Console",
    locale: "en_NG",
    title: "Aria Console — Voice-Controlled Smartphone System | Built by Resolute Femi",
    description:
      "Operations console for managing voice-controlled smartphone fleets. Built by Resolute Femi (Ariyo Oluwafemi Stephen).",
  },
  twitter: {
    card: "summary",
    title: "Aria Console — Built by Resolute Femi",
    description:
      "Voice-controlled smartphone operations console by Resolute Femi (Ariyo Oluwafemi Stephen).",
    creator: "@Resolutefemi",
  },
};

const ariaJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://github.com/Resolutefemi#person",
      name: "Resolute Femi",
      alternateName: ["Ariyo Oluwafemi Stephen", "Ariyo Oluwafemi", "Resolutefemi"],
      email: "mailto:ariyooluwafemi487@gmail.com",
      jobTitle: "Software Engineer & Founder of Renance",
      url: "https://github.com/Resolutefemi",
      description:
        "Resolute Femi (Ariyo Oluwafemi Stephen) is a Nigerian software engineer and founder of Renance — creator of Aria Console, an operations dashboard for a voice-controlled smartphone system.",
    },
    {
      "@type": "WebApplication",
      "@id": "https://aria-console.vercel.app#app",
      name: "Aria Console",
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      url: "https://aria-console.vercel.app",
      description:
        "Aria Console is the operations console for managing voice-controlled smartphone fleets — monitor devices, voice interactions, energy usage and security alerts, with accessibility for visually impaired users. Built by Resolute Femi (Ariyo Oluwafemi Stephen).",
      author: { "@id": "https://github.com/Resolutefemi#person" },
      creator: { "@id": "https://github.com/Resolutefemi#person" },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ariaJsonLd) }}
        />
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
