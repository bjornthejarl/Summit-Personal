import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { NextAuthProvider } from "@/components/NextAuthProvider";
import { MFAEnforcement Modal } from "@/components/MFAEnforcementModal";


export const metadata: Metadata = {
  title: {
    template: '%s - vAlpha',
    default: 'vAlpha',
  },
  description: "Financial essentials, nothing more.",
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico"
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-icon.png"
    },
    {
      rel: "manifest",
      url: "/site.webmanifest"
    },
  ],
  openGraph: {
    images: 'https://summit.kugie.dev/og-image.png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'vAlpha',
    description: 'Financial essentials, nothing more.',
    creator: 'vAlpha',
    images: ['/og-image.png'],
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto p-4">
              {children}
            </main>
          </div>
        </div>
        <MFAEnforcementModal />
        <Toaster />
      </ThemeProvider>
    </NextAuthProvider>
  )
}
