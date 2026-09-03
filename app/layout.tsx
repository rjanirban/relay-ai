import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Relay AI — Voice Operations & Conversation Intelligence',
  description:
    "Relay AI: a multilingual conversation-intelligence switchboard with confidence-aware routing and human escalation, powered by Agora Conversational AI.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
    other: [
      {
        url: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full min-h-screen">
        {/*
          Strip attributes that browser extensions (e.g. Dark Reader) inject onto the
          hydrated <html> DOM before React reconciles. They are not part of the
          server-rendered HTML and otherwise cause react-hydration-error warnings.
          The removal also re-runs on DOMContentLoaded to catch late-injected attributes,
          while React hydration (which happens after the first removal) sees a clean tree.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: [
              '(function () {',
              '  var strip = function () {',
              '    try {',
              '      var el = document.documentElement;',
              '      if (el && el.removeAttribute) {',
              '        ["data-darkreader-mode", "data-darkreader-scheme", "data-darkreader-proxy-injected", "data-darkreader-grayscale"].forEach(function (attr) { el.removeAttribute(attr); });',
              '      }',
              '    } catch (e) {}',
              '  };',
              '  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", strip); }',
              '  else { strip(); }',
              '})();',
            ].join('\n'),
          }}
        />
        {children}
      </body>
    </html>
  );
}
