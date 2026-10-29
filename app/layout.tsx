import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ReCut OS — Intelligent Material Recovery',
    template: '%s | ReCut OS',
  },
  description:
    'Remnant-first 2D guillotine sheet cutting planner for woodworking and fabrication workshops.Prioritize reusable offcuts with independently verified saw plans.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#0B1013] font-sans text-[#F2F0E9] selection:bg-[#29B49B]/30 selection:text-[#F2F0E9]">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-[#29B49B] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[#0B1013]"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
