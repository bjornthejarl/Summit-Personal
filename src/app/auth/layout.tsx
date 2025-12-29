import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { NextAuthProvider } from "@/components/NextAuthProvider";

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

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="light"
                enableSystem
                disableTransitionOnChange
            >
                {/* Clean standalone auth pages - no sidebar, no header */}
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                    {children}
                </div>
                <Toaster />
            </ThemeProvider>
        </NextAuthProvider>
    )
}
