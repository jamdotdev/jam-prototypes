import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jam Sharepage',
  description: 'jam.dev sharepage prototype',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
