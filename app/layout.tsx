import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/components/providers/ThemeProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import AuthProvider from '@/components/providers/AuthProvider';

const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat' });

export const metadata: Metadata = {
  title: 'STEAMhives RMS',
  description: 'Result Management System',
  icons: {
    icon: [
      { url: '/favicon/favicon.ico',        sizes: 'any' },
      { url: '/favicon/favicon-16x16.png',  sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png',  sizes: '32x32', type: 'image/png' },
    ],
    apple: '/favicon/apple-touch-icon.png',
    other: [
      {
        rel: 'manifest',
        url: '/favicon/site.webmanifest',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Explicit fallback links for older browsers / non-Next renderers */}
        <link rel="icon"             href="/favicon/favicon.ico"       sizes="any" />
        <link rel="icon"             href="/favicon/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon"             href="/favicon/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link rel="manifest"         href="/favicon/site.webmanifest" />
        <meta name="theme-color"     content="#f97316" />
      </head>
      <body className={montserrat.variable}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
