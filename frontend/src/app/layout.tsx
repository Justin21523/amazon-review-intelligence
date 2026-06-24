import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ShellClient from '@/components/layout/ShellClient';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Amazon Review Intelligence',
  description: 'Analytics platform for Amazon Home & Kitchen product reviews',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <ShellClient>{children}</ShellClient>
      </body>
    </html>
  );
}
