'use client';

import { useEffect, useState } from 'react';
import type { RelaySessionRecord } from '@/types/relay';
import { cn } from '@/lib/utils';

// Relative "time ago" labels are client-only: we snapshot `now` in an effect rather
// than calling Date.now() during render, keeping server and client HTML identical to
// avoid react-hydration errors while still showing fresh relative timestamps.
const RELATIVE_TIME_MS = 30_000;

function timeAgo(ts: number, now: number): string {
  if (!ts) return '';
  // now === 0 is the pre-mount sentinel shared by server + first client render,
  // keeping hydrated HTML identical until the client effect stamps the real time.
  if (now <= 0) return '';
  const ms = now - ts;
  if (ms < 60_000) return 'just now';
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function RelayCasesPanel({
  sessions,
}: {
  sessions: RelaySessionRecord[];
}) {
  // Stable across server + first client render -> no hydration mismatch.
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), RELATIVE_TIME_MS);
    return () => clearInterval(id);
  }, []);
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="rounded-2xl border border-border/80 bg-card/40 px-5 py-4">
          <p className="text-sm font-medium text-foreground">No completed sessions yet</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Completed or handed-off conversations will appear here with their real transcript
            rollup, captured fields, and confidence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/30">
      <div className="flex h-12 items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
        <span className="text-xs text-muted-foreground">{sessions.length} recorded</span>
      </div>
      <div className="divide-y divide-border/70">
        {sessions.map((session) => {
          const avgConfidence = session.rollup.overallConfidence;
          return (
            <div key={session.id} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{session.id}</span>
                <span
                  className={cn(
                    'rounded-md border px-2 py-0.5 text-xs font-medium',
                    session.status === 'escalated'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
                  )}
                >
                  {session.status === 'escalated' ? 'Escalated' : 'Completed'}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{timeAgo(session.createdAt, now)}</span>
                <span>
                  {session.rollup.turns.user} caller / {session.rollup.turns.agent} agent turns
                </span>
                <span>
                  {session.rollup.language.detected === 'hing'
                    ? 'Hindi + English'
                    : session.rollup.language.detected === 'hi'
                      ? 'Hindi'
                      : session.rollup.language.detected === 'en'
                        ? 'English'
                        : 'Language not detected'}
                </span>
                <span>
                  Confidence:{' '}
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      avgConfidence === null
                        ? 'text-muted-foreground'
                        : avgConfidence < 60
                          ? 'text-destructive'
                          : avgConfidence < 75
                            ? 'text-amber-400'
                            : 'text-cyan-400',
                    )}
                  >
                    {avgConfidence === null ? '—' : `${avgConfidence}%`}
                  </span>
                </span>
              </div>
              {session.captured.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {session.captured.map((f) =>
                    f.detection.status === 'detected' ? (
                      <span
                        key={f.key}
                        className="rounded-md border border-border/70 bg-card/40 px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {f.label}: {f.detection.value}
                      </span>
                    ) : null,
                  )}
                </div>
              )}
              {session.escalationReason && (
                <div className="mt-2 text-xs text-amber-400/90">
                  {session.escalationReason}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}