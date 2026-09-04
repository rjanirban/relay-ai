'use client';

import { useState } from 'react';
import { AgoraRTCProvider, default as AgoraRTC } from 'agora-rtc-react';

/**
 * Stable, named component that wraps the Agora RTC client.
 * Extracted from the inline dynamic factory in LandingPage to avoid
 * React error #130 (element type `undefined`) in minified production builds.
 *
 * In the previous inline-factory pattern, the minified prod bundle
 * tree-shook the hoisted function inside the async arrow, resolving the
 * dynamic default as `undefined`. This standalone module exports a plain
 * function component whose default export is unambiguous to the bundler.
 */
export default function AgoraProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  // useState lazy initializer runs once — same semantics as useRef but lint-safe.
  const [client] = useState(() =>
    AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }),
  );
  return (
    <AgoraRTCProvider client={client}>
      {children}
    </AgoraRTCProvider>
  );
}