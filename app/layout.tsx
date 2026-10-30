import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/theme/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ReCut OS — Intelligent Material Recovery',
    template: '%s | ReCut OS',
  },
  description:
    'Remnant-first 2D guillotine sheet cutting planner for woodworking and fabrication workshops. Prioritize reusable offcuts with independently verified saw plans.',
};

const themeInitScript = `(() => {
  try {
    const saved = window.localStorage.getItem('recut-theme');
    document.documentElement.dataset.theme = saved === 'dark' ? 'dark' : 'light';
  } catch {
    document.documentElement.dataset.theme = 'light';
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-bg-page font-sans text-fg selection:bg-accent-soft selection:text-fg">
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
          >
            Skip to main content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
