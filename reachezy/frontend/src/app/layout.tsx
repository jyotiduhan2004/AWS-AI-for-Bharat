import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ReachEzy — AI Media Kit for Indian Creators',
  description:
    'Free AI-powered media kit generator for nano-influencers. Get professional portfolios, rate benchmarks, and content analytics.',
  openGraph: {
    title: 'ReachEzy — AI Media Kit for Indian Creators',
    description:
      'Free AI-powered media kit generator for nano-influencers. Get professional portfolios, rate benchmarks, and content analytics.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">{children}</main>
      </body>
    </html>
  );
}
