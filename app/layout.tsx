/**
 * Root layout component with error boundary
 * Wraps entire application with base HTML structure and error handling
 */

import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

/**
 * Page metadata
 */
export const metadata: Metadata = {
  title: 'Chess Coach - AI-Powered Chess Training',
  description: 'Learn chess with personalized AI coaching powered by Claude',
  keywords: ['chess', 'coaching', 'AI', 'training', 'learning'],
  authors: [{ name: 'Chess Coach Team' }],
};

/**
 * Root layout props
 */
interface RootLayoutProps {
  children: React.ReactNode;
}

/**
 * RootLayout component - base layout for entire application
 * Provides HTML structure, global styles, and error boundaries
 *
 * @param props - Layout props with children
 * @returns React component
 */
export default function RootLayout({ children }: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AI-powered chess coaching application" />
      </head>
      <body>
        <div id="root" className="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}
