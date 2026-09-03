'use client';

import type { RelaySessionRecord } from '@/types/relay';
import { cn } from '@/lib/utils';

function aggregateSessions(sessions: RelaySessionRecord[]) {
  const total = sessions.length;
  const escalated = sessions.filter((s) => s.status === 'escalated').length;
  const autoResolved = total - escalated;
  const confidences = sessions
    .map((s) => s.rollup.overallConfidence)
    .filter((c): c is number => c !== null);
  const avgConfidence = confidences.length
    ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length)
    : null;
  const totalCallerTurns = sessions.reduce((acc, s) => acc + s.rollup.turns.user, 0);
  return { total, escalated, autoResolved, avgConfidence, totalCallerTurns };
}

export function RelayAnalyticsPanel({
  sessions,
}: {
  sessions: RelaySessionRecord[];
}) {
  const agg = aggregateSessions(sessions);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">Conversation Intelligence</h2>
        <p className="text-sm text-muted-foreground">
          Aggregated from completed, real Agora sessions.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sessions" value={String(agg.total)} />
        <Stat
          label="Escalated"
          value={String(agg.escalated)}
          tone={agg.escalated > 0 ? 'amber' : 'default'}
        />
        <Stat label="Auto-resolved" value={String(agg.autoResolved)} tone="cyan" />
        <Stat
          label="Avg confidence"
          value={agg.avgConfidence === null ? '—' : `${agg.avgConfidence}%`}
        />
      </div>

      <div className="rounded-xl border border-border/80 bg-card/30 px-4 py-3">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Total caller turns captured
        </div>
        <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {agg.totalCallerTurns}
        </div>
      </div>

      {agg.avgConfidence !== null && (
        <div className="rounded-xl border border-border/80 bg-card/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Average overall confidence
            </div>
            <span
              className={cn(
                'text-lg font-semibold tabular-nums',
                agg.avgConfidence < 60
                  ? 'text-destructive'
                  : agg.avgConfidence < 75
                    ? 'text-amber-400'
                    : 'text-cyan-400',
              )}
            >
              {agg.avgConfidence}%
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/60">
            <div
              className={cn(
                'h-full rounded-full',
                agg.avgConfidence < 60
                  ? 'bg-destructive'
                  : agg.avgConfidence < 75
                    ? 'bg-amber-400'
                    : 'bg-cyan-400',
              )}
              style={{ width: `${agg.avgConfidence}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'cyan' | 'amber';
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card/30 px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'cyan'
            ? 'text-cyan-400'
            : tone === 'amber'
              ? 'text-amber-400'
              : 'text-foreground',
        )}
      >
        {value}
      </div>
    </div>
  );
}