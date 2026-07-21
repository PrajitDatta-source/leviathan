import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/modules/theme/ThemeContext';
import { IconThemeProvider } from '@/modules/icons/IconThemeContext';
import Lockscreen from '@/components/auth/Lockscreen';

export const metadata: Metadata = {
  title: 'Iris OS | Zero-Knowledge Web OS',
  description: 'Device-independent, encrypted web operating system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="bg-[#0a0a0c] text-slate-200 antialiased overflow-hidden min-h-full flex flex-col">
        <ThemeProvider>
          <IconThemeProvider>
            <Lockscreen>
              {children}
            </Lockscreen>
          </IconThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
