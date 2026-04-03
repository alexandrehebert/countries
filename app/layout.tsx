import type { Metadata, Viewport } from 'next';
import type { ReactElement, ReactNode } from 'react';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#020617',
};

export const metadata: Metadata = {
  title: 'Countries Atlas',
  description: 'A standalone exhaustive catalog of countries and flags built with the same stack as Atlas Guesser.',
  applicationName: 'Countries Atlas',
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return children as ReactElement;
}
