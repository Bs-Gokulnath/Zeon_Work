import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './globals.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Zeon Charging',
  description: 'Zeon Charging — Project Management Platform',
  icons: {
    icon: '/zeon-icon.jpeg',
    shortcut: '/zeon-icon.jpeg',
    apple: '/zeon-icon.jpeg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${roboto.variable} font-roboto antialiased`}>{children}</body>
    </html>
  );
}
