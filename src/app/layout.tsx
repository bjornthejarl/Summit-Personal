import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    template: '%s | vAlpha',
    default: 'vAlpha',
  },
  description: 'Invoice and accounting management system',
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico"
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
} 