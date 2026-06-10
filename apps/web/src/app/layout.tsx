import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import type { ReactNode } from 'react';

import { ReactQueryProvider } from '@/lib/providers';

import './globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  title: 'CodeFlow AI',
  description: 'A web IDE with an AI coding assistant.',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      className={`${geistSans.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <ReactQueryProvider>{children}</ReactQueryProvider>
      </body>
      <Script
        src="https://js.puter.com/v2/"
        strategy="afterInteractive"
      />
    </html>
  );
}
